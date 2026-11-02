# ==============================================================================
# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU13 (ENTERPRISE ARCHITECT)
# CU13: Confirmar Recepcion de Traspaso en Destino (Fase 2)
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         NType: 0=alt, 4=loop, 1=opt
#         ALT y OPT cubren desde UI (L=220) hasta las Entidades
#         LOOP inicia estrictamente en Controller (L=440) hacia las Entidades
#         CERO COLISIONES: Márgenes milimétricos entre pestañas y flechas de mensajes
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$dir = "C:\Users\HP\Documents\SI2\2doParcial"
$eapFiles = Get-ChildItem -Path $dir -Filter "*.eap" | Select-Object -ExpandProperty FullName

function Setup-SequenceDiagramCU13([string]$eapPath) {
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "Procesando CU13 en archivo EA: $eapPath" -ForegroundColor Cyan
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
        $escName = $name.Replace("'", "''")
        $cmd = $conn.CreateCommand()
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
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor], 
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract], 
    [Scope], [Stereotype], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, '$type', 0, '$escName', 'Grupo 6', '1.0',
    $pkgId, '1', $backColor, 1, 0,
    9405184, NOW(), NOW(), 'Proposed', '0',
    'Public', '', '$guid', 0, False, False, False, False
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }

    # Asegurar fragmento con NType correcto (0=alt, 1=opt, 4=loop)
    function Ensure-FragmentObject([string]$name, [string]$stereo, [int]$ntype, [int]$pkgId) {
        $escName = $name.Replace("'", "''")
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$escName' AND Package_ID = $pkgId"
        $val = $cmd.ExecuteScalar()
        if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
            $objId = [int]$val
            $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '$stereo', [NType] = $ntype, [Backcolor] = -1, [Bordercolor] = 5104464 WHERE Object_ID = $objId"
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
    [Scope], [Stereotype], [NType], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, 'InteractionFragment', 0, '$escName', 'Grupo 6', '1.0',
    $pkgId, '1', -1, 1, 0,
    5104464, NOW(), NOW(), 'Proposed', '0',
    'Public', '$stereo', $ntype, '$guid', 0, False, False, False, False
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }

    try {
        $pkgId = 14 # 3.3. Diagramas de secuencia (P2)
        $diagName = "Diagrama de secuencia CU13"

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

        # 2. Participantes rectangulares (Stereotype vacio, Backcolor celeste claro 15921906)
        $idActor    = Ensure-LifelineObject "Encargado de Sucursal" "Actor" $pkgId 16773824
        $idUI       = Ensure-LifelineObject "IU_RecepcionTraspaso" "Sequence" $pkgId 15921906
        $idCtrl     = Ensure-LifelineObject "TraspasoWorkflowController" "Sequence" $pkgId 15921906
        $idTraspaso = Ensure-LifelineObject "TraspasoInventario" "Sequence" $pkgId 15921906
        $idDetalle  = Ensure-LifelineObject "DetalleTraspaso" "Sequence" $pkgId 15921906
        $idStock    = Ensure-LifelineObject "InventarioStock" "Sequence" $pkgId 15921906
        $idMov      = Ensure-LifelineObject "MovimientoInventario" "Sequence" $pkgId 15921906

        # 3. Fragmentos combinados con NType exacto:
        $idAlt1  = Ensure-FragmentObject "[traspaso != null && traspaso.estado == 'EN_TRANSITO']" "alt" 0 $pkgId
        $idLoop1 = Ensure-FragmentObject "[para cada item en traspaso.detalles]" "loop" 4 $pkgId
        $idOpt1  = Ensure-FragmentObject "[generar_acta_recepcion == true]" "opt" 1 $pkgId

        # Posicionamiento:
        # Participantes horizontales:
        # Actor:      L=60, R=150
        # UI:         L=240, R=370
        # Ctrl:       L=460, R=590
        # Traspaso:   L=680, R=790
        # Detalle:    L=890, R=1000
        # Stock:      L=1100, R=1210
        # Movimiento: L=1310, R=1420
        #
        # Coordenadas verticales sin colisiones:
        # - ALT:  Inicia en UI (L=220) a Movimiento (R=1435). Top=-270, Bottom=-620
        # - LOOP: Inicia en Controller (L=440) a Movimiento (R=1430). Top=-345, Bottom=-555
        # - OPT:  Inicia en UI (L=220) a Traspaso (R=800). Top=-655, Bottom=-835

        $layout = @(
            @{ Id = $idAlt1;     L = 220;  T = -270; R = 1435; B = -620;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idLoop1;    L = 440;  T = -345; R = 1430; B = -555;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idOpt1;     L = 220;  T = -655; R = 800;  B = -835;  Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idActor;    L = 60;   T = -50;  R = 150;  B = -1180; Seq = 10; Style = "" },
            @{ Id = $idUI;       L = 240;  T = -50;  R = 370;  B = -1180; Seq = 11; Style = "" },
            @{ Id = $idCtrl;     L = 460;  T = -50;  R = 590;  B = -1180; Seq = 12; Style = "" },
            @{ Id = $idTraspaso; L = 680;  T = -50;  R = 790;  B = -1180; Seq = 13; Style = "" },
            @{ Id = $idDetalle;  L = 890;  T = -50;  R = 1000; B = -1180; Seq = 14; Style = "" },
            @{ Id = $idStock;    L = 1100; T = -50;  R = 1210; B = -1180; Seq = 15; Style = "" },
            @{ Id = $idMov;      L = 1310; T = -50;  R = 1420; B = -1180; Seq = 16; Style = "" }
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
        Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU13." -ForegroundColor Green

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

        # Flujo estricto CU13:
        Add-SeqMessage $idActor    $idUI       "1. seleccionarTraspasoEnTransito(traspaso_id)" 1 "Call" | Out-Null
        Add-SeqMessage $idActor    $idUI       "2. ingresarConteoFisico(items_confirmados)" 2 "Call" | Out-Null
        Add-SeqMessage $idUI       $idCtrl     "3. confirmarRecepcionTraspaso(traspaso_id, recepcion)" 3 "Call" | Out-Null
        Add-SeqMessage $idCtrl     $idTraspaso "4. findByIdWithDetalles(traspaso_id)" 4 "Call" | Out-Null
        Add-SeqMessage $idTraspaso $idCtrl     "5. traspaso: TraspasoInventario" 5 "Return" | Out-Null

        # Dentro de ALT:
        Add-SeqMessage $idCtrl     $idTraspaso "6. actualizarEstadoRecepcionado(usuario_recibe_id, fecha)" 6 "Call" | Out-Null
        Add-SeqMessage $idTraspaso $idCtrl     "7. traspasoActualizado: TraspasoInventario (estado='RECEPCIONADO')" 7 "Return" | Out-Null

        # Dentro de LOOP:
        Add-SeqMessage $idCtrl     $idDetalle  "8. registrarCantidadRecibida(variante_id, cantidad_recibida)" 8 "Call" | Out-Null
        Add-SeqMessage $idDetalle  $idCtrl     "9. detalleActualizado: DetalleTraspaso" 9 "Return" | Out-Null
        Add-SeqMessage $idCtrl     $idStock    "10. incrementarStockDestino(sucursal_destino_id, variante_id, cantidad_recibida)" 10 "Call" | Out-Null
        Add-SeqMessage $idStock    $idCtrl     "11. stockActualizado: InventarioStock (cantidad_disponible)" 11 "Return" | Out-Null
        Add-SeqMessage $idCtrl     $idMov      "12. registrarIngresoKardex(stock_id, cant_rec, 'TRASPASO_INGRESO')" 12 "Call" | Out-Null
        Add-SeqMessage $idMov      $idCtrl     "13. movimientoRegistrado: MovimientoInventario" 13 "Return" | Out-Null

        # Cierre de ALT:
        Add-SeqMessage $idCtrl     $idUI       "14. 200 OK (traspaso_id, estado='RECEPCIONADO', mensaje)" 14 "Return" | Out-Null
        Add-SeqMessage $idUI       $idActor    "15. mostrarConfirmacion('Recepción conforme confirmada. Mercadería ingresada a stock.')" 15 "Return" | Out-Null

        # Dentro de OPT:
        Add-SeqMessage $idActor    $idUI       "16. solicitarActaRecepcionFisica(traspaso_id)" 16 "Call" | Out-Null
        Add-SeqMessage $idUI       $idCtrl     "17. obtenerComprobanteRecepcion(traspaso_id)" 17 "Call" | Out-Null
        Add-SeqMessage $idCtrl     $idTraspaso "18. consultarActaRecepcion(traspaso_id)" 18 "Call" | Out-Null
        Add-SeqMessage $idTraspaso $idCtrl     "19. datosActa: TraspasoInventario" 19 "Return" | Out-Null
        Add-SeqMessage $idCtrl     $idUI       "20. 200 OK (documentoActaRecepcion)" 20 "Return" | Out-Null
        Add-SeqMessage $idUI       $idActor    "21. imprimirActaRecepcionFisica(documentoActaRecepcion)" 21 "Return" | Out-Null

        Write-Host "21 mensajes de secuencia creados exitosamente para CU13." -ForegroundColor Green

        # 5. Fix CU12 collision in this EAP as well:
        $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU12'"
        $diagId12 = [int]$cmd.ExecuteScalar()
        if ($diagId12 -gt 0) {
            $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[origen_id != destino_id && stockDisponible >= cantidad]'"
            $idAlt12 = [int]$cmd.ExecuteScalar()
            # Alt starts at Top = -200 (completely below Arrow 3 which is at -185) so Arrow 3 never collides with Alt tab!
            $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -200, RectBottom = -635, RectLeft = 220, RectRight = 1650, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId12 AND Object_ID = $idAlt12"
            $cmd.ExecuteNonQuery() | Out-Null
            Write-Host "Corregida colisión de pestaña Alt en CU12 (Diagram_ID = $diagId12)." -ForegroundColor Green
        }
    }
    finally {
        $conn.Close()
    }
}

# Ejecutar en ambos archivos .eap
foreach ($f in $eapFiles) {
    Setup-SequenceDiagramCU13 $f
}

# Exportar imágenes PNG oficiales desde Enterprise Architect
Write-Host ">>> Exportando diagramas desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    foreach ($eapPath in $eapFiles) {
        $repo.OpenFile($eapPath)
        $pkg = $repo.GetPackageByID(14)
        $base = [System.IO.Path]::GetFileNameWithoutExtension($eapPath)
        foreach ($diag in $pkg.Diagrams) {
            if ($diag.Name -like "*CU13*") {
                $outPng = Join-Path $dir "$($base)_CU13_secuencia_EA.png"
                $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
                Write-Host "Exportado CU13: $outPng" -ForegroundColor Green
            } elseif ($diag.Name -like "*CU12*") {
                $outPng = Join-Path $dir "$($base)_CU12_secuencia_EA.png"
                $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
                Write-Host "Reexportado CU12 corregido: $outPng" -ForegroundColor Green
            }
        }
        $repo.CloseFile()
    }
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Write-Host "Exportación completada exitosamente." -ForegroundColor Green
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
}
