import os, zlib, urllib.request

puml_code = '''@startuml Diagrama_Secuencia_CU12
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

actor "Encargado de Sucursal" as Staff
participant "IU_FormularioTraspaso" as UI
participant "TraspasoWorkflowController" as Controller
participant "Sucursal" as Sucursal
participant "InventarioStock" as Stock
participant "MovimientoInventario" as Movimiento
participant "TraspasoInventario" as Traspaso
participant "DetalleTraspaso" as Detalle

title sd Diagrama de secuencia CU12 - Solicitar y Despachar Traspaso de Inventario (Fase 1)

activate Staff
Staff -> UI: ingresarDatosTraspaso(sucursalDestino, motivo, items)
activate UI
Staff -> UI: confirmarDespachoTraspaso()

' ====================================================================
' 1. FRAGMENTO ALT: Inicia en UI y se extiende hasta DetalleTraspaso
' ====================================================================
alt [origen_id != destino_id && stockDisponible >= cantidad]
    UI -> Controller: solicitarYDespacharTraspaso(datosTraspaso)
    activate Controller

    Controller -> Sucursal: validarSucursalesDistintas(origen_id, destino_id)
    activate Sucursal
    Sucursal --> Controller: validacionOk: bool
    deactivate Sucursal

    ' ====================================================================
    ' 2. FRAGMENTO LOOP: Iteracion sobre cada item del despacho
    ' Regla estricta: Comienza en Controller y abarca solo las Entidades participantes
    ' ====================================================================
    loop [para cada item en datosTraspaso.items]
        Controller -> Stock: verificarYDescontarStock(origen_id, variante_id, cantidad)
        activate Stock
        Stock --> Controller: stockActualizado: InventarioStock
        deactivate Stock

        Controller -> Movimiento: registrarSalidaKardex(stock_id, -cantidad, "TRASPASO_SALIDA")
        activate Movimiento
        Movimiento --> Controller: movimientoRegistrado: MovimientoInventario
        deactivate Movimiento
    end

    Controller -> Traspaso: crearOrdenTraspasoEnTransito(datosCabecera)
    activate Traspaso
    Traspaso --> Controller: traspaso: TraspasoInventario (estado="EN_TRANSITO")
    deactivate Traspaso

    loop [para cada item en datosTraspaso.items]
        Controller -> Detalle: guardarDetalleDespacho(traspaso_id, variante_id, cantidad)
        activate Detalle
        Detalle --> Controller: detalleGuardado: DetalleTraspaso
        deactivate Detalle
    end

    Controller --> UI: 201 Created (codigoTraspaso, estado="EN_TRANSITO")
    deactivate Controller
    UI --> Staff: mostrarConfirmacion("Traspaso despachado en estado EN_TRANSITO")

else [origen_id == destino_id || stockDisponible < cantidad (Validación Fallida)]
    UI -> Controller: solicitarYDespacharTraspaso(datosTraspaso)
    activate Controller
    Controller --> UI: 400 Bad Request ("Sucursales iguales o Stock insuficiente")
    deactivate Controller
    UI --> Staff: mostrarErrorValidacion("No se puede despachar el traspaso")
end

' ====================================================================
' 3. FRAGMENTO OPT: Emisión de Guía de Remisión y Notificación
' Regla estricta: Inicia en UI y se extiende hasta TraspasoInventario
' ====================================================================
opt [generar_guia_remision == true]
    Staff -> UI: solicitarImpresionGuiaRemision(codigoTraspaso)
    UI -> Controller: obtenerDatosGuiaDespacho(codigoTraspaso)
    activate Controller
    Controller -> Traspaso: consultarDetalleOrdenTraspaso(codigoTraspaso)
    activate Traspaso
    Traspaso --> Controller: datosOrdenTraspaso: TraspasoInventario
    deactivate Traspaso
    Controller --> UI: 200 OK (documentoGuiaRemision)
    deactivate Controller
    UI --> Staff: imprimirGuiaRemisionFisica(documentoGuiaRemision)
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

puml_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU12.puml'
png_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU12.png'
svg_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU12.svg'

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
