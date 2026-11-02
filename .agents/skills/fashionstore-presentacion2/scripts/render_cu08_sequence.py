import os, zlib, urllib.request

puml_code = '''@startuml Diagrama_Secuencia_CU08
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
participant "UI_SincronizacionCatalogo" as UI
participant "CatalogoSyncController" as Controller
participant "Prenda" as Prenda
participant "InventarioStock" as Stock
participant "GuiaMedida" as Guia
participant "SincronizacionOffline" as Sync

title sd Diagrama de secuencia CU08 - Descargar y Almacenar Catálogo en Memoria Local

activate Staff
Staff -> UI: solicitarSincronizacion()
activate UI

' ====================================================================
' 1. FRAGMENTO ALT: Inicia en UI y se extiende hasta SincronizacionOffline
' ====================================================================
alt [prendasActivas.length > 0]
    UI -> Controller: descargarYSincronizarCatalogo(empresa_id)
    activate Controller

    Controller -> Prenda: obtenerPrendasActivas(empresa_id)
    activate Prenda
    Prenda --> Controller: prendasActivas: List[Prenda]
    deactivate Prenda

    Controller -> Guia: obtenerMedidasPorTalla(empresa_id)
    activate Guia
    Guia --> Controller: guiasMedidas: List[GuiaMedida]
    deactivate Guia

    Controller -> Sync: registrarSincronizacionOffline(empresa_id, payload)
    activate Sync
    Sync --> Controller: confirmacionRegistro: bool
    deactivate Sync

    Controller --> UI: 200 OK (itemsCatalogo: List[PrendaSyncItem])
    deactivate Controller

    UI -> UI: guardarCatalogoLocal(prendas) [IndexedDB / SQLite]

else [prendasActivas.length == 0 (Catálogo Inicial Resiliente)]
    UI -> Controller: descargarYSincronizarCatalogo(empresa_id)
    activate Controller

    Controller --> UI: 200 OK (catalogoMuestraBase: List[PrendaSyncItem])
    deactivate Controller

    UI -> UI: guardarCatalogoLocal(catalogoMuestraBase)
end

UI --> Staff: mostrarConfirmacion("Catálogo local sincronizado correctamente")
deactivate UI

' ====================================================================
' 2. FRAGMENTO LOOP: Iteracion real de existencias y medidas
' Regla estricta: Comienza en Controller y abarca solo las Entidades participantes
' ====================================================================
loop [para cada prenda activa y variante]
    Controller -> Stock: consultarStockDisponible(variante_id)
    activate Stock
    Stock --> Controller: stockDisponible: int
    deactivate Stock

    Controller -> Guia: obtenerMedidasPorTalla(prenda_id, talla_id)
    activate Guia
    Guia --> Controller: medidas: GuiaMedida
    deactivate Guia
end

' ====================================================================
' 3. FRAGMENTO OPT: Fallback de medidas anatomicas
' Regla estricta: Cubre desde UI hasta la Entidad GuiaMedida
' ====================================================================
Staff -> UI: consultarGuiaMedida(prenda_id, talla_id)
activate UI
opt [guia_personalizada == null]
    UI -> Controller: verificarMedidasAnatomicas(talla_codigo)
    activate Controller
    Controller -> Guia: obtenerMedidasPorTalla(prenda_id, talla_id)
    activate Guia
    Guia --> Controller: null
    deactivate Guia
    Controller -> Controller: aplicarMedidasDefault(talla_codigo)
    Controller --> UI: 200 OK (medidasDefault: (pecho_cm, cintura_cm))
    deactivate Controller
end
UI --> Staff: mostrarMedidasEstandar(medidasDefault)
deactivate UI

' ====================================================================
' 4. FRAGMENTO OPT: Consulta fuera de linea (Offline) en contingencia
' Regla estricta: Cubre desde UI hasta la Entidad SincronizacionOffline
' ====================================================================
Staff -> UI: consultarCatalogoOffline()
activate UI
opt [consulta fuera de línea / red no disponible]
    UI -> Controller: obtenerCatalogoLocal()
    activate Controller
    Controller -> Sync: consultarUltimaSincronizacion()
    activate Sync
    Sync --> Controller: ultimaSync: datetime
    deactivate Sync
    Controller --> UI: 200 OK (prendasLocales: List[PrendaLocal]) [IndexedDB/SQLite]
    deactivate Controller
end
UI --> Staff: mostrarCatalogoOffline(prendasLocales)
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

puml_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU08.puml'
png_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU08.png'
svg_path = r'C:\Users\HP\Documents\SI2\2doParcial\diagrama_secuencia_CU08.svg'

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
