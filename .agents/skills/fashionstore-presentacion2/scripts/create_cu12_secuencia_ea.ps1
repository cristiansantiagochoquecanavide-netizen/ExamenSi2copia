# ==============================================================================
# SCRIPT DE CREACION DIAGRAMA DE SECUENCIA CU12 EN ENTERPRISE ARCHITECT
# CU12: Solicitar y Despachar Traspaso de Inventario (Fase 1)
# REGLAS: Participantes Rectangulares (sin iconos circulares BCE)
#         Fragmentos Transparentes con bordes limpios y separados verticalmente
#         ALT y OPT cubren desde UI (L=220) hasta las Entidades
#         LOOP inicia estrictamente en Controller (L=440) hacia las Entidades
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$dir = "C:\Users\HP\Documents\SI2\2doParcial"
$eapFiles = Get-ChildItem -Path $dir -Filter "*.eap" | Select-Object -ExpandProperty FullName

function Setup-SequenceDiagramCU12([string]$eapPath) {
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "Procesando CU12 en archivo EA: $eapPath" -ForegroundColor Cyan
    Write-Host "====================================================" -ForegroundColor Cyan

    $conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
    $conn.Open()

    function Get-NextId([string]$table, [string]$col) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT MAX($col) FROM $table"
        $val = $cmd.ExecuteScalar()
        if ($null -eq $val -or [DBNull]::Value.Equals($val)) { return 1 }
        return [int]$val + 1
    }

    function New-GuidStr {
        return "{" + [System.Guid]::NewGuid().ToString().ToUpper() + "}"
    }

    # Asegurar objeto con rectangulo puro (Stereotype = '')
    function Ensure-LifelineObject([string]$name, [string]$type, [int]$pkgId, [int]$backColor = 15921906) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$name' AND Package_ID = $pkgId"
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
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor], 
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract], 
    [Scope], [Stereotype], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, '$type', 0, '$name', 'Grupo 6', '1.0',
    $pkgId, '1', $backColor, 1, 0,
    9405184, NOW(), NOW(), 'Proposed', '0',
    'Public', '', '$guid', 0, False, False, False, False
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }

    # Asegurar fragmento con nombre limpio sin anteponer el tipo
    function Ensure-FragmentObject([string]$name, [string]$stereo, [int]$pkgId) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$name' AND Package_ID = $pkgId"
        $val = $cmd.ExecuteScalar()
        if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
            $objId = [int]$val
            $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '$stereo', [Backcolor] = -1, [Bordercolor] = 5104464 WHERE Object_ID = $objId"
            $cmd.ExecuteNonQuery() | Out-Null
            return $objId
        }
        $objId = Get-NextId "t_object" "Object_ID"
        $guid = New-GuidStr
        $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version], 
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor], 
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract], 
    [Scope], [Stereotype], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, 'InteractionFragment', 0, '$name', 'Grupo 6', '1.0',
    $pkgId, '1', -1, 1, 0,
    5104464, NOW(), NOW(), 'Proposed', '0',
    'Public', '$stereo', '$guid', 0, False, False, False, False
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }

    try {
        $pkgId = 14 # 3.3. Diagramas de secuencia (P2)
        $diagName = "Diagrama de secuencia CU12"

        # 1. Obtener o crear diagrama
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Diagram_ID, ea_guid FROM t_diagram WHERE [Name] = '$diagName' AND Package_ID = $pkgId"
        $reader = $cmd.ExecuteReader()
        $diagId = 0
        $diagGuid = ""
        if ($reader.Read()) {
            $diagId = [int]$reader["Diagram_ID"]
            $diagGuid = [string]$reader["ea_guid"]
        }
        $reader.Close()

        if ($diagId -eq 0) {
            $diagId = Get-NextId "t_diagram" "Diagram_ID"
            $diagGuid = New-GuidStr
            $cmd.CommandText = @"
INSERT INTO t_diagram (
    [Diagram_ID], [Package_ID], [ParentID], [Diagram_Type], [Name], [Version], [Author],
    [ShowDetails], [AttPub], [AttPri], [AttPro], [Orientation], [cx], [cy], [Scale],
    [CreatedDate], [ModifiedDate], [ShowForeign], [ShowBorder], [ShowPackageContents],
    [Locked], [ea_guid]
) VALUES (
    $diagId, $pkgId, 0, 'Sequence', '$diagName', '1.0', 'Grupo 6',
    0, True, True, True, 'L', 2400, 1600, 100,
    NOW(), NOW(), True, True, True,
    False, '$diagGuid'
)
"@
            $cmd.ExecuteNonQuery() | Out-Null
            Write-Host "Creado diagrama: $diagName (ID: $diagId)" -ForegroundColor Green
        } else {
            Write-Host "Limpiando diagrama existente (ID: $diagId)..." -ForegroundColor Yellow
            $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
            $cmd.ExecuteNonQuery() | Out-Null
            $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
            $cmd.ExecuteNonQuery() | Out-Null
            $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = $diagId"
            $cmd.ExecuteNonQuery() | Out-Null
        }

        # 2. Participantes rectangulares (Stereotype vacio, Backcolor celeste claro)
        $idActor    = Ensure-LifelineObject "Encargado de Sucursal" "Actor" $pkgId 16773824
        $idUI       = Ensure-LifelineObject "IU_FormularioTraspaso" "Sequence" $pkgId 15921906
        $idCtrl     = Ensure-LifelineObject "TraspasoWorkflowController" "Sequence" $pkgId 15921906
        $idSucursal = Ensure-LifelineObject "Sucursal" "Sequence" $pkgId 15921906
        $idStock    = Ensure-LifelineObject "InventarioStock" "Sequence" $pkgId 15921906
        $idMov      = Ensure-LifelineObject "MovimientoInventario" "Sequence" $pkgId 15921906
        $idTraspaso = Ensure-LifelineObject "TraspasoInventario" "Sequence" $pkgId 15921906
        $idDetalle  = Ensure-LifelineObject "DetalleTraspaso" "Sequence" $pkgId 15921906

        # 3. Fragmentos combinados: Nombre limpio sin anteponer el tipo
        $idAlt1  = Ensure-FragmentObject "[origen_id != destino_id && stockDisponible >= cantidad]" "alt" $pkgId
        $idLoop1 = Ensure-FragmentObject "[para cada item en datosTraspaso.items]" "loop" $pkgId
        $idOpt1  = Ensure-FragmentObject "[generar_guia_remision == true]" "opt" $pkgId

        # Posicionamiento:
        # Participantes horizontales:
        # Actor:      L=60, R=150
        # UI:         L=240, R=370
        # Ctrl:       L=460, R=590
        # Sucursal:   L=680, R=790
        # Stock:      L=890, R=1000
        # Movimiento: L=1100, R=1210
        # Traspaso:   L=1310, R=1420
        # Detalle:    L=1520, R=1630
        #
        # Reglas Estrictas:
        # - ALT:  Inicia en UI (L=220) y llega hasta DetalleTraspaso (R=1640)
        # - LOOP: Inicia en Controller (L=440) y llega hasta DetalleTraspaso (R=1640)
        # - OPT:  Inicia en UI (L=220) y llega hasta TraspasoInventario (R=1430)

        $layout = @(
            @{ Id = $idAlt1;     L = 220;  T = -180; R = 1640; B = -580;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idLoop1;    L = 440;  T = -610; R = 1640; B = -780;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idOpt1;     L = 220;  T = -810; R = 1430; B = -1010; Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idActor;    L = 60;   T = -50;  R = 150;  B = -1180; Seq = 10; Style = "" },
            @{ Id = $idUI;       L = 240;  T = -50;  R = 370;  B = -1180; Seq = 11; Style = "" },
            @{ Id = $idCtrl;     L = 460;  T = -50;  R = 590;  B = -1180; Seq = 12; Style = "" },
            @{ Id = $idSucursal; L = 680;  T = -50;  R = 790;  B = -1180; Seq = 13; Style = "" },
            @{ Id = $idStock;    L = 890;  T = -50;  R = 1000; B = -1180; Seq = 14; Style = "" },
            @{ Id = $idMov;      L = 1100; T = -50;  R = 1210; B = -1180; Seq = 15; Style = "" },
            @{ Id = $idTraspaso; L = 1310; T = -50;  R = 1420; B = -1180; Seq = 16; Style = "" },
            @{ Id = $idDetalle;  L = 1520; T = -50;  R = 1630; B = -1180; Seq = 17; Style = "" }
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
        Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU12." -ForegroundColor Green

        # 4. Mensajes de secuencia
        function Add-SeqMsg([int]$src, [int]$dst, [string]$msg, [int]$order, [string]$subType = "Call") {
            $cid = Get-NextId "t_connector" "Connector_ID"
            $guid = New-GuidStr
            $escMsg = $msg.Replace("'", "''")
            $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [Name], [Direction], [Notes], [Connector_Type],
    [SourceAccess], [DestAccess], [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SeqNo], [SubType], [DiagramID]
) VALUES (
    $cid, '$escMsg', 'Source -> Destination', '$escMsg', 'Sequence',
    'Public', 'Public', $src, $dst, 3, -1,
    '$guid', False, True, False, False, False,
    $order, '$subType', $diagId
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

        # Mensajes de solicitud y validacion inicial
        $null = Add-SeqMsg $idActor $idUI       "1. ingresarDatosTraspaso(sucursalDestino, motivo, items)" 1 "Call"
        $null = Add-SeqMsg $idActor $idUI       "2. confirmarDespachoTraspaso()" 2 "Call"
        $null = Add-SeqMsg $idUI    $idCtrl     "3. solicitarYDespacharTraspaso(datosTraspaso)" 3 "Call"
        $null = Add-SeqMsg $idCtrl  $idSucursal "4. validarSucursalesDistintas(origen_id, destino_id)" 4 "Call"
        $null = Add-SeqMsg $idSucursal $idCtrl  "5. validacionOk: bool" 5 "Return"

        # Bloque 1: ALT - Despacho exitoso vs Validación fallida
        $null = Add-SeqMsg $idCtrl  $idTraspaso "6. crearOrdenTraspasoEnTransito(datosCabecera)" 6 "Call"
        $null = Add-SeqMsg $idTraspaso $idCtrl  "7. traspaso: TraspasoInventario (estado='EN_TRANSITO')" 7 "Return"
        $null = Add-SeqMsg $idCtrl  $idUI       "8. 201 Created (codigoTraspaso, estado='EN_TRANSITO')" 8 "Return"
        $null = Add-SeqMsg $idUI    $idActor    "9. mostrarConfirmacion('Traspaso despachado en estado EN_TRANSITO')" 9 "Return"

        # Bloque 2: LOOP - Iteracion real sobre los items despachados
        $null = Add-SeqMsg $idCtrl  $idStock    "10. verificarYDescontarStock(origen_id, variante_id, cantidad)" 10 "Call"
        $null = Add-SeqMsg $idStock $idCtrl     "11. stockActualizado: InventarioStock" 11 "Return"
        $null = Add-SeqMsg $idCtrl  $idMov      "12. registrarSalidaKardex(stock_id, -cantidad, 'TRASPASO_SALIDA')" 12 "Call"
        $null = Add-SeqMsg $idMov   $idCtrl     "13. movimientoRegistrado: MovimientoInventario" 13 "Return"
        $null = Add-SeqMsg $idCtrl  $idDetalle  "14. guardarDetalleDespacho(traspaso_id, variante_id, cantidad)" 14 "Call"
        $null = Add-SeqMsg $idDetalle $idCtrl   "15. detalleGuardado: DetalleTraspaso" 15 "Return"

        # Bloque 3: OPT - Emisión de Guía de Remisión Física
        $null = Add-SeqMsg $idActor $idUI       "16. solicitarImpresionGuiaRemision(codigoTraspaso)" 16 "Call"
        $null = Add-SeqMsg $idUI    $idCtrl     "17. obtenerDatosGuiaDespacho(codigoTraspaso)" 17 "Call"
        $null = Add-SeqMsg $idCtrl  $idTraspaso "18. consultarDetalleOrdenTraspaso(codigoTraspaso)" 18 "Call"
        $null = Add-SeqMsg $idTraspaso $idCtrl  "19. datosOrdenTraspaso: TraspasoInventario" 19 "Return"
        $null = Add-SeqMsg $idCtrl  $idUI       "20. 200 OK (documentoGuiaRemision)" 20 "Return"
        $null = Add-SeqMsg $idUI    $idActor    "21. imprimirGuiaRemisionFisica(documentoGuiaRemision)" 21 "Return"

        Write-Host "21 mensajes de secuencia creados para CU12." -ForegroundColor Green
    }
    finally {
        $conn.Close()
    }

    # Exportar a imagen PNG usando EA COM
    try {
        Write-Host "Exportando imagen desde EA COM para $eapPath..." -ForegroundColor Cyan
        $ea = New-Object -ComObject "EA.App"
        $repo = $ea.Repository
        $repo.OpenFile($eapPath)
        $proj = $repo.GetProjectInterface()
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($eapPath)
        $outImg = Join-Path $dir "${baseName}_CU12_secuencia_EA.png"
        $proj.PutDiagramImageToFile($diagGuid, $outImg, 1)
        $repo.CloseFile()
        $repo.Exit()
        Write-Host "Diagrama CU12 exportado exitosamente a: $outImg" -ForegroundColor Green
    } catch {
        Write-Host "Aviso exportando imagen con EA COM: $_" -ForegroundColor Yellow
    }
}

foreach ($f in $eapFiles) {
    Setup-SequenceDiagramCU12 $f
}

Write-Host "CU12 COMPLETADO EXITOSAMENTE PARA TODOS LOS ARCHIVOS EA." -ForegroundColor Green
