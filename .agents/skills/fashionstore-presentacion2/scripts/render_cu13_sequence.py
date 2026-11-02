import os, zlib, urllib.request

puml_code = '''@startuml Diagrama_Secuencia_CU13
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
participant "IU_RecepcionTraspaso" as UI
participant "TraspasoWorkflowController" as Controller
participant "TraspasoInventario" as Traspaso
participant "DetalleTraspaso" as Detalle
participant "InventarioStock" as Stock
participant "MovimientoInventario" as Movimiento

title sd Diagrama de secuencia CU13 - Confirmar Recepción de Traspaso en Destino (Fase 2)

activate Staff
Staff -> UI: seleccionarTraspasoEnTransito(traspaso_id)
activate UI
Staff -> UI: ingresarConteoFisico(items_confirmados)

UI -> Controller: confirmarRecepcionTraspaso(traspaso_id, recepcion)
activate Controller

Controller -> Traspaso: findByIdWithDetalles(traspaso_id)
activate Traspaso
Traspaso --> Controller: traspaso: TraspasoInventario
deactivate Traspaso

alt#transparent #transparent traspaso != null && traspaso.estado == 'EN_TRANSITO'
    Controller -> Traspaso: actualizarEstadoRecepcionado(usuario_recibe_id, fecha)
    activate Traspaso
    Traspaso --> Controller: traspasoActualizado: TraspasoInventario (estado='RECEPCIONADO')
    deactivate Traspaso

    loop#transparent #transparent para cada item en traspaso.detalles
        Controller -> Detalle: registrarCantidadRecibida(variante_id, cantidad_recibida)
        activate Detalle
        Detalle --> Controller: detalleActualizado: DetalleTraspaso
        deactivate Detalle

        Controller -> Stock: incrementarStockDestino(sucursal_destino_id, variante_id, cantidad_recibida)
        activate Stock
        Stock --> Controller: stockActualizado: InventarioStock (cantidad_disponible)
        deactivate Stock

        Controller -> Movimiento: registrarIngresoKardex(stock_id, cant_rec, 'TRASPASO_INGRESO')
        activate Movimiento
        Movimiento --> Controller: movimientoRegistrado: MovimientoInventario
        deactivate Movimiento
    end

    Controller --> UI: 200 OK (traspaso_id, estado='RECEPCIONADO', mensaje)
    deactivate Controller

    UI --> Staff: mostrarConfirmacion('Recepción conforme confirmada. Mercadería ingresada a stock.')
    deactivate UI
else#transparent #transparent traspaso == null || traspaso.estado != 'EN_TRANSITO'
    activate Controller
    Controller --> UI: 400 Bad Request ('El traspaso no se encuentra en estado EN_TRANSITO')
    deactivate Controller
    activate UI
    UI --> Staff: mostrarError(mensaje)
    deactivate UI
end

opt#transparent #transparent generar_acta_recepcion == true
    Staff -> UI: solicitarActaRecepcionFisica(traspaso_id)
    activate UI
    UI -> Controller: obtenerComprobanteRecepcion(traspaso_id)
    activate Controller
    Controller -> Traspaso: consultarActaRecepcion(traspaso_id)
    activate Traspaso
    Traspaso --> Controller: datosActa: TraspasoInventario
    deactivate Traspaso
    Controller --> UI: 200 OK (documentoActaRecepcion)
    deactivate Controller
    UI --> Staff: imprimirActaRecepcionFisica(documentoActaRecepcion)
    deactivate UI
end

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

puml_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU13.puml'
png_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU13.png'
svg_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU13.svg'

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
