import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from apps.core.config import settings

# Attempt to import passlib / bcrypt, else secure fallback
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
except ImportError:
    try:
        import bcrypt
        def hash_password(password: str) -> str:
            salt = bcrypt.gensalt()
            return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
        def verify_password(plain_password: str, hashed_password: str) -> bool:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ImportError:
        def hash_password(password: str) -> str:
            salt = secrets.token_hex(16)
            key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
            return f"pbkdf2_sha256${salt}${key.hex()}"
        def verify_password(plain_password: str, hashed_password: str) -> bool:
            try:
                parts = hashed_password.split("$")
                if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
                    return False
                salt = parts[1]
                expected_key = parts[2]
                key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
                return hmac.compare_digest(key.hex(), expected_key)
            except Exception:
                return False

# Attempt to import jose or PyJWT, else robust HMAC-SHA256 JWT implementation
try:
    from jose import jwt, JWTError
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "iat": now})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            return None
except ImportError:
    try:
        import jwt
        def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
            to_encode = data.copy()
            now = datetime.now(timezone.utc)
            if expires_delta:
                expire = now + expires_delta
            else:
                expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            to_encode.update({"exp": expire, "iat": now})
            return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
            try:
                return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            except jwt.PyJWTError:
                return None
    except ImportError:
        def b64url_encode(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")
        def b64url_decode(data: str) -> bytes:
            padding = "=" * ((4 - len(data) % 4) % 4)
            return base64.urlsafe_b64decode((data + padding).encode("utf-8"))

        def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
            now = datetime.now(timezone.utc)
            expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
            payload = data.copy()
            payload.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})
            
            header = {"alg": "HS256", "typ": "JWT"}
            h_b64 = b64url_encode(json.dumps(header).encode("utf-8"))
            p_b64 = b64url_encode(json.dumps(payload).encode("utf-8"))
            signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
            signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
            s_b64 = b64url_encode(signature)
            return f"{h_b64}.{p_b64}.{s_b64}"

        def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
            try:
                parts = token.split(".")
                if len(parts) != 3:
                    return None
                h_b64, p_b64, s_b64 = parts
                signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
                expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
                actual_sig = b64url_decode(s_b64)
                if not hmac.compare_digest(expected_sig, actual_sig):
                    return None
                payload = json.loads(b64url_decode(p_b64).decode("utf-8"))
                exp = payload.get("exp")
                if exp and datetime.now(timezone.utc).timestamp() > exp:
                    return None
                return payload
            except Exception:
                return None
