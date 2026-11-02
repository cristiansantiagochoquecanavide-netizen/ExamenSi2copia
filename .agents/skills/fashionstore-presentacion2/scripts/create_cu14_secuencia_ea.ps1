# ==============================================================================
# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU14 (ENTERPRISE ARCHITECT)
# CU14: Registrar Reserva Offline para Ensayo en Tienda (Probador Sin Pago)
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

function Setup-SequenceDiagramCU14([string]$eapPath) {
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "Procesando CU14 en archivo EA: $eapPath" -ForegroundColor Cyan
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
        $diagName = "Diagrama de secuencia CU14"

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
        $idActor    = Ensure-LifelineObject "Vendedor" "Actor" $pkgId 16773824
        $idUI       = Ensure-LifelineObject "IU_ApartadoProbador" "Sequence" $pkgId 15921906
        $idCtrl     = Ensure-LifelineObject "ReservaProbadorOfflineController" "Sequence" $pkgId 15921906
        $idVariante = Ensure-LifelineObject "PrendaVariante" "Sequence" $pkgId 15921906
        $idSucursal = Ensure-LifelineObject "Sucursal" "Sequence" $pkgId 15921906
        $idReserva  = Ensure-LifelineObject "Reserva" "Sequence" $pkgId 15921906
        $idDetalle  = Ensure-LifelineObject "DetalleReserva" "Sequence" $pkgId 15921906
        $idSync     = Ensure-LifelineObject "SincronizacionOffline" "Sequence" $pkgId 15921906

        # 3. Fragmentos combinados con NType exacto:
        $idAlt1  = Ensure-FragmentObject "[capacidadDisponible == true && variante.activa == true]" "alt" 0 $pkgId
        $idLoop1 = Ensure-FragmentObject "[para cada prenda en itemsApartado]" "loop" 4 $pkgId
        $idOpt1  = Ensure-FragmentObject "[generar_comprobante_probador == true]" "opt" 1 $pkgId

        # Posicionamiento horizontal:
        # Actor:      L=60, R=150
        # UI:         L=240, R=370
        # Ctrl:       L=460, R=590
        # Variante:   L=680, R=790
        # Sucursal:   L=890, R=1000
        # Reserva:    L=1100, R=1210
        # Detalle:    L=1310, R=1420
        # Sync:       L=1520, R=1630
        #
        # Coordenadas verticales sin colisiones:
        # - ALT:  Inicia en UI (L=220) a Sync (R=1640). Top=-340, Bottom=-665
        # - LOOP: Inicia en Controller (L=440) a Detalle (R=1430). Top=-410, Bottom=-485
        # - OPT:  Inicia en UI (L=220) a Reserva (R=1220). Top=-715, Bottom=-890

        $layout = @(
            @{ Id = $idAlt1;     L = 220;  T = -340; R = 1640; B = -665;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idLoop1;    L = 440;  T = -410; R = 1430; B = -485;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idOpt1;     L = 220;  T = -715; R = 1220; B = -890;  Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idActor;    L = 60;   T = -50;  R = 150;  B = -1180; Seq = 10; Style = "" },
            @{ Id = $idUI;       L = 240;  T = -50;  R = 370;  B = -1180; Seq = 11; Style = "" },
            @{ Id = $idCtrl;     L = 460;  T = -50;  R = 590;  B = -1180; Seq = 12; Style = "" },
            @{ Id = $idVariante; L = 680;  T = -50;  R = 790;  B = -1180; Seq = 13; Style = "" },
            @{ Id = $idSucursal; L = 890;  T = -50;  R = 1000; B = -1180; Seq = 14; Style = "" },
            @{ Id = $idReserva;  L = 1100; T = -50;  R = 1210; B = -1180; Seq = 15; Style = "" },
            @{ Id = $idDetalle;  L = 1310; T = -50;  R = 1420; B = -1180; Seq = 16; Style = "" },
            @{ Id = $idSync;     L = 1520; T = -50;  R = 1630; B = -1180; Seq = 17; Style = "" }
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
        Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU14." -ForegroundColor Green

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

        # Flujo estricto CU14:
        Add-SeqMessage $idActor    $idUI       "1. seleccionarPrendaYProbador(variante_id, hora_ensayo)" 1 "Call" | Out-Null
        Add-SeqMessage $idActor    $idUI       "2. apartarPrendaSinPago()" 2 "Call" | Out-Null
        Add-SeqMessage $idUI       $idCtrl     "3. registrarReservaProbadorOffline(datosApartado)" 3 "Call" | Out-Null
        Add-SeqMessage $idCtrl     $idVariante "4. verificarPrendaParaEnsayo(variante_id)" 4 "Call" | Out-Null
        Add-SeqMessage $idVariante $idCtrl     "5. variante: PrendaVariante (activa=true)" 5 "Return" | Out-Null
        Add-SeqMessage $idCtrl     $idSucursal "6. validarCapacidadProbadores(sucursal_id)" 6 "Call" | Out-Null
        Add-SeqMessage $idSucursal $idCtrl     "7. capacidadDisponible: bool" 7 "Return" | Out-Null

        # Dentro de ALT:
        Add-SeqMessage $idCtrl     $idReserva  "8. crearReservaProbadorSinPago(datosReserva, uuid)" 8 "Call" | Out-Null
        Add-SeqMessage $idReserva  $idCtrl     "9. reserva: Reserva (estado='CONFIRMADA', anticipo=0.00)" 9 "Return" | Out-Null

        # Dentro de LOOP:
        Add-SeqMessage $idCtrl     $idDetalle  "10. agregarDetallePrenda(reserva_id, variante_id, cantidad)" 10 "Call" | Out-Null
        Add-SeqMessage $idDetalle  $idCtrl     "11. detalleGuardado: DetalleReserva" 11 "Return" | Out-Null

        # Cierre dentro de ALT:
        Add-SeqMessage $idCtrl     $idSync     "12. encolarReservaOffline(uuid, payload_json)" 12 "Call" | Out-Null
        Add-SeqMessage $idSync     $idCtrl     "13. confirmacionEncolado: bool" 13 "Return" | Out-Null
        Add-SeqMessage $idCtrl     $idUI       "14. 201 Created (uuid, codigo_reserva, estado='CONFIRMADA')" 14 "Return" | Out-Null
        Add-SeqMessage $idUI       $idUI       "15. guardarReservaLocal(uuid, reserva) [IndexedDB/SQLite]" 15 "Call" | Out-Null
        Add-SeqMessage $idUI       $idActor    "16. mostrarConfirmacion('Prenda apartada para probador sin costo.')" 16 "Return" | Out-Null

        # Dentro de OPT:
        Add-SeqMessage $idActor    $idUI       "17. solicitarFichaProbador(codigo_reserva)" 17 "Call" | Out-Null
        Add-SeqMessage $idUI       $idCtrl     "18. obtenerFichaProbador(codigo_reserva)" 18 "Call" | Out-Null
        Add-SeqMessage $idCtrl     $idReserva  "19. consultarDatosReserva(codigo_reserva)" 19 "Call" | Out-Null
        Add-SeqMessage $idReserva  $idCtrl     "20. datosFicha: Reserva" 20 "Return" | Out-Null
        Add-SeqMessage $idCtrl     $idUI       "21. 200 OK (fichaProbadorQR)" 21 "Return" | Out-Null
        Add-SeqMessage $idUI       $idActor    "22. imprimirFichaProbador(fichaProbadorQR)" 22 "Return" | Out-Null

        Write-Host "22 mensajes de secuencia creados exitosamente para CU14." -ForegroundColor Green
    }
    finally {
        $conn.Close()
    }
}

# Ejecutar en ambos archivos .eap
foreach ($f in $eapFiles) {
    Setup-SequenceDiagramCU14 $f
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
            if ($diag.Name -like "*CU14*") {
                $outPng = Join-Path $dir "$($base)_CU14_secuencia_EA.png"
                $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
                Write-Host "Exportado CU14: $outPng" -ForegroundColor Green
            }
        }
        $repo.CloseFile()
    }
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
    Write-Host "Exportación completada exitosamente." -ForegroundColor Green
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
