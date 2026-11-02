import os, zlib, urllib.request

puml_code = '''@startuml Diagrama_Secuencia_CU11
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

actor "Vendedor" as Staff
participant "IU_ConsultaStockMultisucursal" as UI
participant "StockMultisucursalController" as Controller
participant "Empresa" as Empresa
participant "Sucursal" as Sucursal
participant "PrendaVariante" as Variante
participant "InventarioStock" as Stock

title sd Diagrama de secuencia CU11 - Consultar Disponibilidad de Inventario Multi-sucursal

activate Staff
Staff -> UI: seleccionarPrendaVariante(variante_id)
activate UI
Staff -> UI: solicitarDisponibilidadSucursales()

UI -> Controller: consultarStockMultisucursal(variante_id, empresa_id)
activate Controller

Controller -> Empresa: validarContextoTenant(empresa_id)
activate Empresa
Empresa --> Controller: empresaActiva: bool
deactivate Empresa

Controller -> Variante: verificarVarianteActiva(variante_id)
activate Variante
Variante --> Controller: variante: PrendaVariante
deactivate Variante

Controller -> Sucursal: obtenerSucursalesActivas(empresa_id)
activate Sucursal
Sucursal --> Controller: sucursales: List[Sucursal]
deactivate Sucursal

' ====================================================================
' 1. FRAGMENTO ALT: Inicia en UI y se extiende hasta InventarioStock
' ====================================================================
alt [sucursales.length > 0]
    ' ====================================================================
    ' 2. FRAGMENTO LOOP: Iteracion real de existencias por cada sucursal
    ' Regla estricta: Comienza en Controller y abarca solo InventarioStock
    ' ====================================================================
    loop [para cada sucursal en sucursales]
        Controller -> Stock: consultarStockPorSucursal(sucursal_id, variante_id)
        activate Stock
        Stock --> Controller: stock: InventarioStock
        deactivate Stock
    end

    Controller --> UI: 200 OK (resultados: List[StockSucursalItem])
    deactivate Controller
    UI --> Staff: mostrarMatrizStockSucursales(resultados)

else [sucursales.length == 0 (Tenant Inicial / Contingencia)]
    activate Controller
    Controller --> UI: 200 OK (stockMuestraDefault: List[StockSucursalItem])
    deactivate Controller
    UI --> Staff: mostrarAlerta("Sin sucursales registradas. Mostrando sedes base")
end

' ====================================================================
' 3. FRAGMENTO OPT: Habilitacion de Solicitud de Traspaso (CU12)
' Regla estricta: Cubre desde UI hasta la Entidad InventarioStock
' ====================================================================
opt [stock_disponible > 0 en sucursal remota]
    Staff -> UI: solicitarTraspasoInterSucursal(sucursal_origen_id, variante_id)
    UI -> Controller: verificarStockSuficiente(sucursal_origen_id, variante_id)
    activate Controller
    Controller -> Stock: consultarStockPorSucursal(sucursal_origen_id, variante_id)
    activate Stock
    Stock --> Controller: stockDisponible: int
    deactivate Stock
    Controller --> UI: 200 OK (disponibleParaTraspaso: bool)
    deactivate Controller
    UI --> Staff: habilitarBotonDespachoTraspaso()
end

deactivate UI
deactivate Staff

@enduml
'''

def deflate_and_encode(plantuml_text):
    zlibbed_str = zlib.compress(plantuml_text.encode('utf-8'))
    compressed_string = zlibbed_str[2:-4]
    plantuml_alphabet = '''0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'''
    def encode_3bytes(b1, b2, b3):
        c1 = b1 >> 2
        c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
        c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
        c4 = b3 & 0x3F
        return plantuml_alphabet[c1] + plantuml_alphabet[c2] + plantuml_alphabet[c3] + plantuml_alphabet[c4]

    res = ''
    i = 0
    while i < len(compressed_string):
        b1 = compressed_string[i]
        b2 = compressed_string[i+1] if i+1 < len(compressed_string) else 0
        b3 = compressed_string[i+2] if i+2 < len(compressed_string) else 0
        res += encode_3bytes(b1, b2, b3)
        i += 3
    return res

code = deflate_and_encode(puml_code)
png_url = f'http://www.plantuml.com/plantuml/png/~1{code}'
svg_url = f'http://www.plantuml.com/plantuml/svg/~1{code}'

puml_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU11.puml'
png_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU11.png'
svg_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU11.svg'

with open(puml_path, 'w', encoding='utf-8') as f:
    f.write(puml_code)
print('Saved PUML to:', puml_path)

req = urllib.request.Request(png_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    with open(png_path, 'wb') as f:
        f.write(resp.read())
print('Saved PNG to:', png_path)

req = urllib.request.Request(svg_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    with open(svg_path, 'wb') as f:
        f.write(resp.read())
print('Saved SVG to:', svg_path)
