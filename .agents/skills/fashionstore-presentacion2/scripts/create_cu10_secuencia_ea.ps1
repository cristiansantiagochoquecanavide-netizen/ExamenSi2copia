# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU10 (ENTERPRISE ARCHITECT)
# CU10: Administrar Existencias de Inventario por Sucursal
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         LOOP inicia en Controlador (L=440) hacia InventarioStock (R=1160)
#         OPT inicia en UI (L=210) hacia Entidades (R=1550)
#         ALT [saldoValido >= 0] inicia en UI (L=210) hacia Entidades (R=1550)
#         CERO COLISIONES: Coordenadas analiticas calibradas con precision milimetrica

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU10_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU10 con LOOP, OPT y ALT en: $eapPath" -ForegroundColor Cyan
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
    $diagName = "Diagrama de secuencia CU10"

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
    'Diagrama de secuencia UML 2.5 para CU10: Administrar Existencias de Inventario por Sucursal', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU10 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar conectores huerfanos con DiagID=0
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%consultarStockSucursal%' OR Name LIKE '%registrarIngresoInicial%' OR Name LIKE '%registrarAjustePorMermaOFisico%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Robustez 57)
    $idActor       = Ensure-LifelineObject "Encargado de Sucursal" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI          = Ensure-LifelineObject "UI_ControlInventarioSucursal" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl        = Ensure-LifelineObject "InventarioStockController" "Sequence" $pkgId 15921906
    $idSucursal    = Ensure-LifelineObject "Sucursal" "Sequence" $pkgId 15921906
    $idVariante    = Ensure-LifelineObject "PrendaVariante" "Sequence" $pkgId 15921906
    $idStock       = Ensure-LifelineObject "InventarioStock" "Sequence" $pkgId 15921906
    $idMovimiento  = Ensure-LifelineObject "MovimientoInventario" "Sequence" $pkgId 15921906
    $idBitacora    = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # Crear fragmentos combinados:
    # 1. LOOP: Iteracion de variantes para recuperar existencias y punto de reorden
    $idLoop1 = Ensure-FragmentObject "[para cada variante]" "loop" $pkgId 4
    # 2. OPT: Ingreso de stock / Carga inicial
    $idOpt1  = Ensure-FragmentObject "[ingresoStock]" "opt" $pkgId 1
    # 3. ALT: Validacion de saldo resultante no negativo en ajuste
    $idAlt1  = Ensure-FragmentObject "[saldoValido >= 0]" "alt" $pkgId 0

    # Coordenadas calibradas con precision analitica (Formula: Y(N) = -(93.3 + N * 35.2)):
    # - LOOP 1: Inicia en Ctrl (L=440) hasta InventarioStock (R=1160). Top = -248, Bottom = -463
    #   Msg 4 a -234.1 (13.9 EA arriba), Msg 5 a -269.3 (abajo de pestaña).
    #   Pestaña [para cada variante] a X: 440..560.
    #   Msg 10 a -445.3 (17.7 EA arriba del fondo), Msg 11 a -480.5 (libre abajo).
    # - Gap amplio entre Bloque 1 y OPT 1: Mensaje 13 a -550.9 viaja libre entre Actor y UI!
    # - OPT 1: Inicia en UI (L=210) hasta Bitacora (R=1550). Top = -560, Bottom = -1096
    #   Msg 13 a -550.9 (9.1 EA arriba de Top), Msg 14 a -586.1 (6.1 EA abajo de pestaña).
    #   Pestaña [ingresoStock] termina a X=285 (antes de UI X=290).
    #   Msg 28 a -1078.9 (17.1 EA arriba de Bottom).
    # - Gap amplio entre OPT 1 y ALT 1: Mensaje 29 a -1114.1 viaja libre entre Actor y UI!
    #   Mensajes 30, 31, 32 ejecutan la verificacion antinegativo antes del bloque condicional.
    # - ALT 1: Inicia en UI (L=210) hasta Bitacora (R=1550). Top = -1230, Bottom = -1530
    #   Msg 32 a -1219.7 (10.3 EA arriba de Top), Msg 33 a -1254.9 (4.9 EA abajo de pestaña).
    #   Pestaña [saldoValido >= 0] a X: 210..320.
    #   Msg 40 a -1501.3 (28.7 EA arriba de Bottom).
    # - Lifelines Bottom: -1580

    $layout = @(
        @{ Id = $idLoop1;      L = 440;  T = -248;  R = 1160; B = -463;   Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;       L = 210;  T = -560;  R = 1550; B = -1096;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idAlt1;       L = 210;  T = -1230; R = 1550; B = -1530;  Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;      L = 60;   T = -50;   R = 150;  B = -1580;  Seq = 10; Style = "" },
        @{ Id = $idUI;         L = 230;  T = -50;   R = 350;  B = -1580;  Seq = 11; Style = "" },
        @{ Id = $idCtrl;       L = 440;  T = -50;   R = 560;  B = -1580;  Seq = 12; Style = "" },
        @{ Id = $idSucursal;   L = 650;  T = -50;   R = 760;  B = -1580;  Seq = 13; Style = "" },
        @{ Id = $idVariante;   L = 840;  T = -50;   R = 950;  B = -1580;  Seq = 14; Style = "" },
        @{ Id = $idStock;      L = 1030; T = -50;   R = 1140; B = -1580;  Seq = 15; Style = "" },
        @{ Id = $idMovimiento; L = 1220; T = -50;   R = 1330; B = -1580;  Seq = 16; Style = "" },
        @{ Id = $idBitacora;   L = 1410; T = -50;   R = 1520; B = -1580;  Seq = 17; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos con LOOP, OPT y ALT colocados para CU10." -ForegroundColor Green

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
    # BLOQUE 1: Consulta de Stock de Sucursal y Alertas de Reorden (Seq 1 a 12)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "1. consultarStockSucursal(sucursal_id)" 1 "Call" | Out-Null
    Add-SeqMessage $idUI          $idCtrl        "2. obtenerExistenciasYAlertas(sucursal_id)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idSucursal    "3. findById(sucursal_id)" 3 "Call" | Out-Null
    Add-SeqMessage $idSucursal    $idCtrl        "4. sucursal: Sucursal(activo=true)" 4 "Return" | Out-Null

    # Sub-bloque: LOOP [para cada variante] (Seq 5 a 10)
    Add-SeqMessage $idCtrl        $idStock       "5. consultarStockSucursal(sucursal_id)" 5 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "6. stock: InventarioStock(disponible, minimo)" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idVariante    "7. obtenerDetallesVariante(variante_id)" 7 "Call" | Out-Null
    Add-SeqMessage $idVariante    $idCtrl        "8. infoVariante: PrendaVariante(sku, talla, color)" 8 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idStock       "9. verificarPuntoReorden()" 9 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "10. alertaBajoStock: bool()" 10 "Return" | Out-Null
    # Fin LOOP

    Add-SeqMessage $idCtrl        $idUI          "11. 200 OK (listaExistencias, alertas)" 11 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "12. mostrarGrillaInventario(existencias)" 12 "Return" | Out-Null

    # =========================================================================
    # BLOQUE 2: Ingreso de Stock / Carga Inicial (Seq 13 a 28)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "13. registrarIngresoInicial(variante_id, cantidad)" 13 "Call" | Out-Null

    # Dentro de OPT [ingresoStock]
    Add-SeqMessage $idUI          $idCtrl        "14. procesarIngresoStock(datosIngreso)" 14 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idSucursal    "15. validarSucursalActiva(sucursal_id)" 15 "Call" | Out-Null
    Add-SeqMessage $idSucursal    $idCtrl        "16. sucursalActiva: bool()" 16 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idVariante    "17. findById(variante_id)" 17 "Call" | Out-Null
    Add-SeqMessage $idVariante    $idCtrl        "18. varianteValida: PrendaVariante" 18 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idStock       "19. findOrInitStock(variante_id)" 19 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "20. stockActual: InventarioStock" 20 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idStock       "21. actualizarStock(nuevaCantidad)" 21 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "22. stockActualizado: InventarioStock" 22 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idMovimiento  "23. registrarMovimientoKardex(stock_id, INGRESO_INICIAL)" 23 "Call" | Out-Null
    Add-SeqMessage $idMovimiento  $idCtrl        "24. movimientoRegistrado: MovimientoInventario" 24 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "25. registrarAuditoria('ALTA_STOCK_SUCURSAL', stock_id)" 25 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "26. auditoriaRegistrada: bool()" 26 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "27. 201 Created (stock, movimiento)" 27 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "28. mostrarConfirmacionIngreso('Stock ingresado exitosamente')" 28 "Return" | Out-Null
    # Fin OPT

    # =========================================================================
    # BLOQUE 3: Ajuste por Merma o Inventario Fisico (Seq 29 a 40)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "29. registrarAjustePorMermaOFisico(variante_id, cantidad, motivo)" 29 "Call" | Out-Null
    Add-SeqMessage $idUI          $idCtrl        "30. procesarAjusteInventario(datosAjuste)" 30 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idStock       "31. validarStockNoNegativo()" 31 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "32. esNoNegativo: bool()" 32 "Return" | Out-Null

    # Dentro de ALT [saldoValido >= 0]
    Add-SeqMessage $idCtrl        $idStock       "33. actualizarSaldoFisico(saldo)" 33 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "34. saldoActualizado: InventarioStock" 34 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idMovimiento  "35. registrarMovimientoKardex(stock_id, MERMA_O_AJUSTE)" 35 "Call" | Out-Null
    Add-SeqMessage $idMovimiento  $idCtrl        "36. kardexRegistrado: MovimientoInventario" 36 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "37. registrarAuditoria('AJUSTE_INVENTARIO', stock_id)" 37 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "38. auditoriaRegistrada: bool()" 38 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "39. 200 OK (ajusteProcesado)" 39 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "40. mostrarConfirmacionAjuste('Ajuste de inventario aplicado con exito')" 40 "Return" | Out-Null
    # Fin ALT

    Write-Host "40 mensajes de secuencia creados exitosamente para CU10." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU10 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU10 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
