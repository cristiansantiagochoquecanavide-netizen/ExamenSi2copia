import os, zlib, urllib.request

puml_code = '''@startuml Diagrama_Secuencia_CU02
skinparam style strictuml
skinparam roundcorner 10
skinparam defaultFontName Arial
skinparam sequenceMessageAlign center
skinparam lifelineStrategy nosolid

skinparam actor {
    BackgroundColor #FFF9C4
    BorderColor #F57F17
}

skinparam participant {
    BackgroundColor #B2EBF2
    BorderColor #00838F
    FontColor #004D40
    FontStyle bold
}

skinparam sequence {
    LifeLineBorderColor #78909C
    LifeLineBackgroundColor #E0F7FA
    ArrowColor #37474F
    ArrowThickness 1.2
    GroupBorderThickness 1.5
    GroupBorderColor #4CAF50
    GroupHeaderFontColor #1B5E20
    GroupBackgroundColor transparent
    GroupBodyBackgroundColor transparent
}

autonumber 1 "<b>0.</b>"

actor "Superadministrador SaaS" as Staff
participant "UI_RegistroTenant" as UI
participant "ControladorTenant" as Controller
participant "PlanSuscripcion" as Plan
participant "Empresa" as Empresa
participant "Suscripcion" as Suscripcion
participant "Usuario" as Usuario
participant "BitacoraAuditoria" as Bitacora

title sd Diagrama de secuencia CU02 - Registrar Empresa Contratante Tenant

activate Staff
Staff -> UI: solicitarRegistroEmpresa(datosEmpresa)
activate UI

opt [verificacionPreviaSubdominio == true]
    UI -> Controller: verificarDisponibilidadSubdominio(subdominio, plan_id)
    activate Controller
    Controller -> Empresa: validarUnicidadSubdominio(subdominio)
    activate Empresa
    Empresa --> Controller: subdominioDisponible: bool()
    deactivate Empresa
    Controller -> Plan: consultarLimitesPermitidos(plan_id)
    activate Plan
    Plan --> Controller: planActivo: bool()
    deactivate Plan
    Controller --> UI: 200 OK (subdominioYPlanValidos)
    deactivate Controller
    UI --> Staff: mostrarDisponibilidadSubdominio(valido=true)
end

Staff -> UI: confirmarCreacionTenant()
UI -> Controller: procesarRegistroTenant(datosValidados)
activate Controller

Controller -> Empresa: validarUnicidadSubdominioYNit(subdominio, nit)
activate Empresa
Empresa --> Controller: datosDisponibles: bool()
deactivate Empresa

Controller -> Plan: validarPlanActivo(plan_id)
activate Plan
Plan --> Controller: planConfirmado: PlanSuscripcion()
deactivate Plan

alt [subdominioDisponible == true && nitDisponible == true && plan.activo == true]
    Controller -> Empresa: crearRegistroEmpresa(datos)
    activate Empresa
    Empresa --> Controller: nuevaEmpresa: Empresa (id, subdominio)
    deactivate Empresa

    Controller -> Suscripcion: crearSuscripcionInicial(empresa_id, plan_id, 365_dias)
    activate Suscripcion
    Suscripcion --> Controller: suscripcionActiva: Suscripcion (id, estado='ACTIVA')
    deactivate Suscripcion

    Controller -> Usuario: crearUsuarioAdminTenant(datosAdmin, passwordHash)
    activate Usuario
    Usuario --> Controller: adminCreado: Usuario (id, rol='ADMINISTRADOR')
    deactivate Usuario

    Controller -> Bitacora: registrarEventoAuditoria('ALTA_TENANT', empresa_id)
    activate Bitacora
    Bitacora --> Controller: auditoriaRegistrada: bool()
    deactivate Bitacora

    Controller --> UI: 201 Created (empresaResponse)
    deactivate Controller
    UI --> Staff: notificarResultadoRegistro('Tenant registrado exitosamente')
    deactivate UI
end

@enduml
'''

def plantuml_encode(text):
    zlibbed = zlib.compress(text.encode('utf-8'))[2:-4]
    charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    res = ""
    i = 0
    while i < len(zlibbed):
        b1 = zlibbed[i]
        b2 = zlibbed[i+1] if i+1 < len(zlibbed) else 0
        b3 = zlibbed[i+2] if i+2 < len(zlibbed) else 0
        c1 = b1 >> 2
        c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
        c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
        c4 = b3 & 0x3F
        res += charset[c1] + charset[c2] + charset[c3] + charset[c4]
        i += 3
    return res

encoded = plantuml_encode(puml_code)
server_url = f"http://www.plantuml.com/plantuml/png/{encoded}"
server_url_svg = f"http://www.plantuml.com/plantuml/svg/{encoded}"

out_dir = r"C:\Users\HP\.gemini\antigravity\brain\9d8c9a7f-040e-427b-8d00-df2abd7a1ae5"
png_path = os.path.join(out_dir, "diagrama_secuencia_CU02.png")
svg_path = os.path.join(out_dir, "diagrama_secuencia_CU02.svg")

print(f"Descargando PNG desde: {server_url[:60]}...")
req = urllib.request.Request(server_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    with open(png_path, 'wb') as f:
        f.write(resp.read())

print(f"Descargando SVG desde: {server_url_svg[:60]}...")
req = urllib.request.Request(server_url_svg, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    with open(svg_path, 'wb') as f:
        f.write(resp.read())

print("¡Completado exitosamente!")
