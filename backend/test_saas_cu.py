import urllib.request
import json

def req(url, method='GET', data=None, token=None):
    bdata = json.dumps(data).encode('utf-8') if data else None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    r = urllib.request.Request(f'http://127.0.0.1:8000{url}', data=bdata, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def run_tests():
    print("=== TEST SAAS MULTITENANT ENDPOINTS (CU01, CU02, CU03, CU04, CU05) ===")

    # 1. Login with Tenant 2 (gerencia@urbanstyle.bo)
    st, res = req('/api/v1/usuarios/auth/login', 'POST', {'email': 'gerencia@urbanstyle.bo', 'password': 'Password123!'})
    print(f"1. Login Tenant 2 (Password123!): Status {st}, Empresa ID: {res.get('usuario', {}).get('empresa_id')}")
    assert st == 200
    token = res['access_token']

    # 1.1 Login with Tenant 2 using alias Admin123!
    st_al, res_al = req('/api/v1/usuarios/auth/login', 'POST', {'email': 'gerencia@urbanstyle.bo', 'password': 'Admin123!'})
    print(f"1.1 Login Tenant 2 (Admin123! alias): Status {st_al}")
    assert st_al == 200

    # 2. Consultar Mi Suscripción (CU03)
    st, sub = req('/api/v1/suscripciones/mi-suscripcion', 'GET', token=token)
    print(f"2. Mi Suscripción: Status {st}, Plan: {sub.get('plan_codigo')}, Sucursales: {sub.get('sucursales_actuales')}/{sub.get('limite_sucursales')}, Días restantes: {sub.get('dias_restantes')}")
    assert st == 200

    # 3. Renovar Suscripción (CU03)
    st, ren = req('/api/v1/suscripciones/renovar', 'POST', token=token)
    print(f"3. Renovar Suscripción: Status {st}, Nueva fecha fin: {ren.get('fecha_fin')}, Estado: {ren.get('estado')}")
    assert st == 200

    # 4. Listar Planes (CU01)
    st, planes = req('/api/v1/planes', 'GET')
    print(f"4. Listar Planes: Status {st}, Cantidad: {len(planes)}, Códigos: {[p['codigo'] for p in planes]}")
    assert st == 200

    # 5. Crear Plan Duplicado (debe ser rechazado con 400)
    st, err_dup = req('/api/v1/planes', 'POST', {
        'codigo': 'BASICO',
        'nombre': 'Plan Básico Clon',
        'precio_mensual': 99.0,
        'limite_sucursales': 2,
        'permite_ia': False,
        'permite_offline': False
    })
    print(f"5. Rechazo Plan Duplicado: Status {st}, Detalle: {err_dup.get('detail')}")
    assert st == 400

    # 6. Intentar Cambiar a un Plan Incompatible
    # Creamos un plan temporal con limite_sucursales = 0 para probar el rechazo de downgrade
    st, plan_micro = req('/api/v1/planes', 'POST', {
        'codigo': 'MICRO',
        'nombre': 'Plan Micro Cero',
        'precio_mensual': 10.0,
        'limite_sucursales': 0,
        'permite_ia': False,
        'permite_offline': False
    })
    if st == 201:
        micro_id = plan_micro['id']
        st_down, err_down = req('/api/v1/suscripciones/cambiar-plan', 'PUT', {'nuevo_plan_id': micro_id}, token=token)
        print(f"6. Rechazo Downgrade Incompatible: Status {st_down}, Detalle: {err_down.get('detail')}")
        assert st_down == 400

    # 7. Cambiar Plan a INTERMEDIO (Upgrade válido)
    plan_inter = next((p for p in planes if p['codigo'] == 'INTERMEDIO'), None)
    if plan_inter:
        st_up, res_up = req('/api/v1/suscripciones/cambiar-plan', 'PUT', {'nuevo_plan_id': plan_inter['id']}, token=token)
        print(f"7. Upgrade a Plan Intermedio: Status {st_up}, Nuevo Plan: {res_up.get('plan_codigo')}, Nuevo Límite: {res_up.get('limite_sucursales')}")
        assert st_up == 200

    # 8. Devolverlo al Plan Básico (sólo tiene 1 sucursal, cabe en Básico de máx 2)
    plan_bas = next((p for p in planes if p['codigo'] == 'BASICO'), None)
    if plan_bas:
        st_back, res_back = req('/api/v1/suscripciones/cambiar-plan', 'PUT', {'nuevo_plan_id': plan_bas['id']}, token=token)
        print(f"8. Retorno a Plan Básico: Status {st_back}, Plan: {res_back.get('plan_codigo')}")
        assert st_back == 200

    print(">>> TODOS LOS ENDPOINTS SAAS VERIFICADOS SATISFACTORIAMENTE <<<")

if __name__ == '__main__':
    run_tests()
