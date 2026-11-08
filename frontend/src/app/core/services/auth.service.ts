import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse, UsuarioResponse } from '../../dashboard/usuarios/usuarios.models';

export interface TenantInfo {
  empresaId: number;
  subdominio: string;
  planCodigo: string;
  nombreEmpresa: string;
  permiteOffline: boolean;
  permiteIa: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/usuarios/auth`;

  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'current_user';

  readonly currentUser = signal<UsuarioResponse | null>(this.getStoredUser());
  readonly isAuthenticated = signal<boolean>(!!this.getToken());
  readonly currentTenant = signal<TenantInfo>(this.extractTenantFromToken());

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((res) => {
        this.setSession(res);
      })
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
        error: () => {}
      });
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get userRole(): string {
    return (this.currentUser()?.rol?.nombre || '').toUpperCase();
  }

  hasRole(...roles: string[]): boolean {
    const current = this.userRole;
    return roles.some(r => r.toUpperCase() === current);
  }

  isAdmin(): boolean {
    return this.userRole === 'ADMINISTRADOR' || this.userRole === 'ADMIN';
  }

  isEncargado(): boolean {
    return this.userRole === 'ENCARGADO' || this.userRole === 'ENCARGADO_SUCURSAL';
  }

  isCajero(): boolean {
    return this.userRole === 'CAJERO';
  }

  isCliente(): boolean {
    return !this.isStaff() || this.userRole === 'CLIENTE';
  }

  isStaff(): boolean {
    return this.isAdmin() || this.isEncargado() || this.isCajero();
  }

  extractTenantFromToken(): TenantInfo {
    const token = this.getToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const raw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(raw);
          const empId = payload.empresa_id || (payload.email && payload.email.includes('urban') ? 2 : 1);
          const sub = payload.subdominio || (empId === 2 ? 'urbanstyle' : 'elegance');
          const plan = payload.plan_codigo || (empId === 2 ? 'BASICO' : 'INTERMEDIO');
          const nom = payload.nombre_empresa || (empId === 2 ? 'Urban Style Trend Bolivia' : (empId === 1 ? 'Elegance Boutique S.R.L.' : `Empresa #${empId}`));
          return {
            empresaId: empId,
            subdominio: sub,
            planCodigo: plan,
            nombreEmpresa: nom,
            permiteOffline: !!payload.permite_offline,
            permiteIa: !!payload.permite_ia
          };
        }
      } catch (e) {
        console.warn('Error al decodificar claims de tenant en token:', e);
      }
    }
    return {
      empresaId: 1,
      subdominio: 'elegance',
      planCodigo: 'INTERMEDIO',
      nombreEmpresa: 'Elegance Boutique S.R.L.',
      permiteOffline: true,
      permiteIa: true
    };
  }

  private getStoredUser(): UsuarioResponse | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private setSession(authResult: TokenResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.usuario));
    this.currentUser.set(authResult.usuario);
    this.isAuthenticated.set(true);
    this.currentTenant.set(this.extractTenantFromToken());
  }

  updateToken(newToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, newToken);
    this.currentTenant.set(this.extractTenantFromToken());
  }

  updateTenantInfo(tenantInfo: Partial<TenantInfo>): void {
    const current = this.currentTenant();
    this.currentTenant.set({
      ...current,
      ...tenantInfo
    });
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.currentTenant.set(this.extractTenantFromToken());
  }
}
