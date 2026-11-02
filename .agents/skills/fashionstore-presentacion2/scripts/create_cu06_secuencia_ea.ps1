# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU06 (ENTERPRISE ARCHITECT)
# CU06: Administrar Catálogo de Prendas y Guía de Medidas
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         ALT y OPT inician en UI (L=210) hacia Entidades (R=1730)
#         LOOP inicia en Controlador (L=440) hacia PrendaVariante (R=1160)
#         Separacion en cuadros diferentes para alt, loop y opt
#         CERO COLISIONES: Coordenadas milimetricas con etiquetas cortas y margenes amplios

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU06_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU06 con calibracion milimetrica en: $eapPath" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

function Get-NextId([string]$table, [string]$col) {
    $cmd.CommandText = "SELECT MAX($col) FROM $table"
    $val = $cmd.ExecuteScalar()
    if ($null -eq $val -or [DBNull]::Value.Equals($val)) { return 1 }
    return [int]$val + 1
}

function New-GuidStr {
    return "{" + [System.Guid]::NewGuid().ToString().ToUpper() + "}"
}

# 1. Asegurar o crear objetos participantes con forma rectangular (Stereotype='')
function Ensure-LifelineObject([string]$name, [string]$type, [int]$pkgId, [int]$backColor = 15921906) {
    $escName = $name.Replace("'", "''")
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$escName' AND Package_ID = $pkgId"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $objId = [int]$val
        $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '', [Backcolor] = $backColor, [Bordercolor] = 9405184, [Object_Type] = '$type' WHERE Object_ID = $objId"
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }
    $objId = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version], 
    [Package_ID], [Complexity], [Backcolor], [Bordercolor], [ea_guid], [Stereotype]
) VALUES (
    $objId, '$type', 0, '$escName', 'Antigravity', '1.0', 
    $pkgId, '1', $backColor, 9405184, '$guid', ''
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $objId
}

# 2. Asegurar o crear fragmento combinado transparente
# NType: 0 = alt, 1 = opt, 4 = loop
function Ensure-FragmentObject([string]$name, [string]$stereotype, [int]$pkgId, [int]$nType = 0) {
    $escName = $name.Replace("'", "''")
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$escName' AND Package_ID = $pkgId AND [Object_Type] = 'InteractionFragment'"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $objId = [int]$val
        $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '$stereotype', [NType] = $nType, [Backcolor] = -1, [Bordercolor] = 4960064 WHERE Object_ID = $objId"
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }
    $objId = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version], 
    [Package_ID], [Complexity], [Backcolor], [Bordercolor], [ea_guid], [Stereotype], [NType]
) VALUES (
    $objId, 'InteractionFragment', 0, '$escName', 'Antigravity', '1.0', 
    $pkgId, '1', -1, 4960064, '$guid', '$stereotype', $nType
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $objId
}

try {
    $pkgId = 14 # Paquete 14: 3.3. Diagramas de secuencia (P2)
    $diagName = "Diagrama de secuencia CU06"

    # Verificar o crear diagrama de secuencia
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = '$diagName' AND Package_ID = $pkgId"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $diagId = [int]$val
        Write-Host "Limpiando diagrama existente (ID: $diagId)..." -ForegroundColor Yellow
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    } else {
        $diagId = Get-NextId "t_diagram" "Diagram_ID"
        $diagGuid = New-GuidStr
        $cmd.CommandText = @"
INSERT INTO t_diagram (
    [Diagram_ID], [Package_ID], [Name], [Version], [Author], [ShowDetails], 
    [Notes], [Stereotype], [ea_guid], [Diagram_Type]
) VALUES (
    $diagId, $pkgId, '$diagName', '1.0', 'Antigravity', 0, 
    'Diagrama de secuencia UML 2.5 para CU06: Administrar Catálogo de Prendas y Guía de Medidas', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU06 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar conectores huerfanos con DiagID=0
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%registrarPrenda%' OR Name LIKE '%configurarGuiaMedidas%' OR Name LIKE '%actualizarPreciosPrenda%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Robustez 55)
    $idActor       = Ensure-LifelineObject "Administrador del Tenant" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI          = Ensure-LifelineObject "UI_GestionCatalogoPrendas" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl        = Ensure-LifelineObject "CatalogoPrendaController" "Sequence" $pkgId 15921906
    $idPrenda      = Ensure-LifelineObject "Prenda" "Sequence" $pkgId 15921906
    $idProveedor   = Ensure-LifelineObject "Proveedor" "Sequence" $pkgId 15921906
    $idVariante    = Ensure-LifelineObject "PrendaVariante" "Sequence" $pkgId 15921906
    $idGuia        = Ensure-LifelineObject "GuiaMedida" "Sequence" $pkgId 15921906
    $idMultimedia  = Ensure-LifelineObject "PrendaMultimedia" "Sequence" $pkgId 15921906
    $idBitacora    = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # Crear fragmentos combinados con etiquetas concisas que evitan cualquier desborde horizontal:
    # 1. ALT: Alta de Prenda si SKU y Proveedor son validos
    $idAlt1  = Ensure-FragmentObject "[skuDisponible && proveedorActivo]" "alt" $pkgId 0
    # 2. LOOP: Iteracion de Variantes de la Prenda (dentro de ALT)
    $idLoop1 = Ensure-FragmentObject "[para cada variante]" "loop" $pkgId 4
    # 3. OPT: Configuracion de Guia Anatomica de Medidas en cm
    $idOpt1  = Ensure-FragmentObject "[guiaMedidas]" "opt" $pkgId 1
    # 4. OPT: Actualizacion de Precios de la Prenda
    $idOpt2  = Ensure-FragmentObject "[actualizarPrecio]" "opt" $pkgId 1

    # Coordenadas calibradas con precision analitica (Formula: Y(N) = -(93.3 + N * 35.2)):
    # - Msg 6 a -304.5, Msg 7 a -339.7   --> ALT 1 Top = -314 (Msg 6 queda arriba, Msg 7 abajo)
    # - Msg 8 a -374.9, Msg 9 a -410.1   --> LOOP 1 Top = -386 (Msg 8 queda libre y arriba de LOOP!)
    # - Msg 10 a -445.3, Msg 11 a -480.5 --> LOOP 1 Bottom = -458 (Msg 10 adentro, Msg 11 libre abajo)
    # - Msg 16 a -656.5, Msg 17 a -691.7 --> ALT 1 Bottom = -670 (Msg 16 adentro)
    # - Msg 17 a -691.7, Msg 18 a -726.9 --> OPT 1 Top = -700 (Msg 17 viaja en el gap libre, pestaña termina a X=285)
    # - Msg 24 a -938.1, Msg 25 a -973.3 --> OPT 1 Bottom = -950 (Msg 24 adentro)
    # - Msg 25 a -973.3, Msg 26 a -1008.5 --> OPT 2 Top = -980 (Msg 25 viaja en el gap libre, pestaña termina a X=285)
    # - Msg 34 a -1290.1                 --> OPT 2 Bottom = -1320 (Msg 34 adentro con 30px de margen)
    # - Lifelines Bottom: -1360

    $layout = @(
        @{ Id = $idAlt1;       L = 210;  T = -314;  R = 1730; B = -670;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idLoop1;      L = 440;  T = -386;  R = 1160; B = -458;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;       L = 210;  T = -700;  R = 1730; B = -950;  Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt2;       L = 210;  T = -980;  R = 1730; B = -1320; Seq = 4; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;      L = 60;   T = -50;   R = 150;  B = -1360; Seq = 10; Style = "" },
        @{ Id = $idUI;         L = 230;  T = -50;   R = 350;  B = -1360; Seq = 11; Style = "" },
        @{ Id = $idCtrl;       L = 440;  T = -50;   R = 560;  B = -1360; Seq = 12; Style = "" },
        @{ Id = $idPrenda;     L = 650;  T = -50;   R = 760;  B = -1360; Seq = 13; Style = "" },
        @{ Id = $idProveedor;  L = 840;  T = -50;   R = 950;  B = -1360; Seq = 14; Style = "" },
        @{ Id = $idVariante;   L = 1030; T = -50;   R = 1140; B = -1360; Seq = 15; Style = "" },
        @{ Id = $idGuia;       L = 1220; T = -50;   R = 1330; B = -1360; Seq = 16; Style = "" },
        @{ Id = $idMultimedia; L = 1410; T = -50;   R = 1520; B = -1360; Seq = 17; Style = "" },
        @{ Id = $idBitacora;   L = 1600; T = -50;   R = 1710; B = -1360; Seq = 18; Style = "" }
    )

    foreach ($item in $layout) {
        $instId = Get-NextId "t_diagramobjects" "Instance_ID"
        $oid = $item.Id; $l = $item.L; $t = $item.T; $r = $item.R; $b = $item.B; $seq = $item.Seq
        $style = $item.Style
        $cmd.CommandText = @"
INSERT INTO t_diagramobjects (
    [Diagram_ID], [Object_ID], [RectTop], [RectLeft], [RectRight], [RectBottom], [Sequence], [ObjectStyle], [Instance_ID]
) VALUES (
    $diagId, $oid, $t, $l, $r, $b, $seq, '$style', $instId
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
    }
    Write-Host "Participantes rectangulares y fragmentos calibrados colocados para CU06." -ForegroundColor Green

    # 4. Mensajes numerados de secuencia en t_connector y t_diagramlinks
    function Add-SeqMessage([int]$src, [int]$dst, [string]$msg, [int]$seq, [string]$subType = "Call") {
        $cid = Get-NextId "t_connector" "Connector_ID"
        $guid = New-GuidStr
        $dir = "Source -> Destination"
        $escMsg = $msg.Replace("'", "''")

        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [DiagramID], [Name], [Direction], [Notes], [Connector_Type], [SubType],
    [SourceAccess], [DestAccess], [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SeqNo], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SourceStyle], [DestStyle]
) VALUES (
    $cid, $diagId, '$escMsg', '$dir', '$escMsg', 'Sequence', '$subType',
    'Public', 'Public', $src, $dst, 3, -1,
    '$guid', $seq, False, True, False, False, False,
    'Navigable=Unspecified;', 'Navigable=Navigable;'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null

        $instId = Get-NextId "t_diagramlinks" "Instance_ID"
        $geo = "EDGE=2;=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;"
        $style = "Mode=3;Color=-1;LWidth=0;"
        $cmd.CommandText = "INSERT INTO t_diagramlinks ([DiagramID], [ConnectorID], [Geometry], [Style], [Hidden], [Instance_ID]) VALUES ($diagId, $cid, '$geo', '$style', False, $instId)"
        $cmd.ExecuteNonQuery() | Out-Null
        return $cid
    }

    # =========================================================================
    # BLOQUE 1: Solicitud de Alta y Validaciones de Unicidad y Proveedor (Seq 1 a 6)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "1. registrarPrenda(datosPrenda, variantes)" 1 "Call" | Out-Null
    Add-SeqMessage $idUI          $idCtrl        "2. procesarAltaPrenda(datosPrenda, variantes)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idPrenda      "3. validarUnicidadSku(sku)" 3 "Call" | Out-Null
    Add-SeqMessage $idPrenda      $idCtrl        "4. skuDisponible: bool()" 4 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idProveedor   "5. validarProveedorActivo(proveedor_id)" 5 "Call" | Out-Null
    Add-SeqMessage $idProveedor   $idCtrl        "6. proveedorActivo: bool()" 6 "Return" | Out-Null

    # =========================================================================
    # BLOQUE 2: Dentro de ALT [skuDisponible && proveedorActivo] (Seq 7 a 16)
    # =========================================================================
    Add-SeqMessage $idCtrl        $idPrenda      "7. crearRegistroPrenda(datosPrenda, empresa_id)" 7 "Call" | Out-Null
    Add-SeqMessage $idPrenda      $idCtrl        "8. prendaCreada: Prenda(id, sku)" 8 "Return" | Out-Null

    # Sub-bloque: LOOP [para cada variante] (Seq 9 a 10)
    Add-SeqMessage $idCtrl        $idVariante    "9. crearVariantes(talla_id, color_id, sku_var)" 9 "Call" | Out-Null
    Add-SeqMessage $idVariante    $idCtrl        "10. varianteGuardada: PrendaVariante" 10 "Return" | Out-Null
    # Fin LOOP

    Add-SeqMessage $idCtrl        $idMultimedia  "11. registrarRecursoMultimedia(prenda_id, url, tipo)" 11 "Call" | Out-Null
    Add-SeqMessage $idMultimedia  $idCtrl        "12. multimediaRegistrada: bool()" 12 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "13. registrarAuditoria('ALTA_PRENDA', prenda.id)" 13 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "14. auditoriaRegistrada: bool()" 14 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "15. 201 Created (prenda, variantes)" 15 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "16. mostrarPrendaRegistrada(catalogo)" 16 "Return" | Out-Null
    # Fin ALT

    # =========================================================================
    # BLOQUE 3: Configuracion de Guia Anatomica de Medidas (Seq 17 a 24)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "17. configurarGuiaMedidas(prenda_id, datosMedidas)" 17 "Call" | Out-Null

    # Dentro de OPT [guiaMedidas]
    Add-SeqMessage $idUI          $idCtrl        "18. procesarGuiaMedidas(prenda_id, datosMedidas)" 18 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idGuia        "19. registrarMedidasCm(producto_id, talla_id, medidas)" 19 "Call" | Out-Null
    Add-SeqMessage $idGuia        $idCtrl        "20. guiaMedidaGuardada: GuiaMedida" 20 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "21. registrarAuditoria('REGISTRO_GUIA_MEDIDA', producto_id)" 21 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "22. auditoriaRegistrada: bool()" 22 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "23. 200 OK (guiaMedidasRegistrada)" 23 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "24. mostrarGuiaMedidasConfirmada()" 24 "Return" | Out-Null
    # Fin OPT 1

    # =========================================================================
    # BLOQUE 4: Actualizacion de Precios de la Prenda (Seq 25 a 34)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "25. actualizarPreciosPrenda(prenda_id, nuevoPrecio)" 25 "Call" | Out-Null

    # Dentro de OPT [actualizarPrecio]
    Add-SeqMessage $idUI          $idCtrl        "26. procesarActualizacionPrenda(prenda_id, nuevoPrecio)" 26 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idPrenda      "27. findById(prenda_id)" 27 "Call" | Out-Null
    Add-SeqMessage $idPrenda      $idCtrl        "28. prendaActual: Prenda" 28 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idPrenda      "29. actualizarPrecioBase(nuevoPrecio)" 29 "Call" | Out-Null
    Add-SeqMessage $idPrenda      $idCtrl        "30. precioActualizadoOk: bool()" 30 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "31. registrarAuditoria('ACTUALIZAR_PRECIO_PRENDA', prenda_id)" 31 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "32. auditoriaRegistrada: bool()" 32 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "33. 200 OK (prendaActualizada)" 33 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "34. mostrarPrecioActualizado('Precio base actualizado con exito')" 34 "Return" | Out-Null
    # Fin OPT 2

    Write-Host "34 mensajes de secuencia creados exitosamente para CU06." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU06 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU06 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
