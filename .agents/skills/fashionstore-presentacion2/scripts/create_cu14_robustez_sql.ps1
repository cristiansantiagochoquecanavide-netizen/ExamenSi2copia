# ==============================================================================
# SCRIPT DE CREACION DIAGRAMA DE ROBUSTEZ / COMUNICACION CU14 (JET OLEDB + EA COM)
# CU14: Registrar Reserva Offline para Ensayo en Tienda (Probador Sin Pago)
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImg = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU14.png"

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

function Ensure-Object([string]$name, [string]$type, [string]$stereo, [int]$pkgId) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$name' AND Package_ID = $pkgId"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        if ($stereo) {
            $cmd.CommandText = "UPDATE t_object SET Stereotype = '$stereo' WHERE Object_ID = " + [int]$val
            $cmd.ExecuteNonQuery() | Out-Null
        }
        return [int]$val
    }
    $objId = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version], 
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor], 
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract], 
    [Scope], [Stereotype], [ea_guid], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, '$type', 0, '$name', 'Grupo 6', '1.0',
    $pkgId, '1', -1, -1, -1,
    -1, NOW(), NOW(), 'Proposed', '0',
    'Public', '$stereo', '$guid', False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $objId
}

try {
    $pkgId = 13 # 3.2. Diagramas de robustez (P2)
    $diagName = "Diagrama de robustez CU14"

    # 1. Verificar o crear diagrama
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
    $diagId, $pkgId, 0, 'Analysis', '$diagName', '1.0', 'Grupo 6',
    0, True, True, True, 'L', 1900, 1100, 100,
    NOW(), NOW(), True, True, True,
    False, '$diagGuid'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Creado diagrama: $diagName con ID: $diagId" -ForegroundColor Green
    } else {
        Write-Host "Diagrama existente ID: $diagId. Limpiando diagramobjects y diagramlinks..." -ForegroundColor Yellow
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # 2. Asegurar elementos BCE estrictamente mapeados al Diagrama de Clases
    $idActor = Ensure-Object "Vendedor" "Actor" "" $pkgId
    $idBoundary = Ensure-Object "IU_ApartadoProbador" "Class" "boundary" $pkgId
    $idControl = Ensure-Object "ReservaProbadorOfflineController" "Class" "control" $pkgId
    $idVariante = Ensure-Object "PrendaVariante" "Class" "entity" $pkgId
    $idSucursal = Ensure-Object "Sucursal" "Class" "entity" $pkgId
    $idReserva = Ensure-Object "Reserva" "Class" "entity" $pkgId
    $idDetalleRes = Ensure-Object "DetalleReserva" "Class" "entity" $pkgId
    $idSync = Ensure-Object "SincronizacionOffline" "Class" "entity" $pkgId

    # 3. Colocar en DiagramObjects
    $layout = @(
        @{ Id = $idActor;      L = 60;   T = -260; R = 150;  B = -370; Seq = 1 },
        @{ Id = $idBoundary;   L = 340;  T = -275; R = 430;  B = -355; Seq = 2 },
        @{ Id = $idControl;    L = 680;  T = -275; R = 770;  B = -355; Seq = 3 },
        @{ Id = $idVariante;   L = 1080; T = -50;  R = 1170; B = -130; Seq = 4 },
        @{ Id = $idSucursal;   L = 1080; T = -160; R = 1170; B = -240; Seq = 5 },
        @{ Id = $idReserva;    L = 1080; T = -270; R = 1170; B = -350; Seq = 6 },
        @{ Id = $idDetalleRes; L = 1080; T = -380; R = 1170; B = -460; Seq = 7 },
        @{ Id = $idSync;       L = 1080; T = -490; R = 1170; B = -570; Seq = 8 }
    )

    foreach ($item in $layout) {
        $instId = Get-NextId "t_diagramobjects" "Instance_ID"
        $oid = $item.Id; $l = $item.L; $t = $item.T; $r = $item.R; $b = $item.B; $seq = $item.Seq
        $cmd.CommandText = @"
INSERT INTO t_diagramobjects (
    [Diagram_ID], [Object_ID], [RectTop], [RectLeft], [RectRight], [RectBottom], [Sequence], [Instance_ID]
) VALUES (
    $diagId, $oid, $t, $l, $r, $b, $seq, $instId
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
    }
    Write-Host "Colocados los 8 elementos BCE en el diagrama CU14." -ForegroundColor Green

    # 4. Crear o actualizar conectores con mensajes jerárquicos
    function Add-ConnectorMsg([int]$src, [int]$dst, [string]$msg) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Connector_ID FROM t_connector WHERE Start_Object_ID = $src AND End_Object_ID = $dst"
        $cid = $cmd.ExecuteScalar()
        if ($null -eq $cid -or [DBNull]::Value.Equals($cid)) {
            $cid = Get-NextId "t_connector" "Connector_ID"
            $guid = New-GuidStr
            $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [Name], [Direction], [Notes], [Connector_Type],
    [SourceAccess], [DestAccess], [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SourceStyle], [DestStyle]
) VALUES (
    $cid, '$msg', 'Source -> Destination', '$msg', 'Association',
    'Public', 'Public', $src, $dst, 3, -1,
    '$guid', False, True, False, False, False,
    'Navigable=Unspecified;', 'Navigable=Navigable;'
)
"@
            $cmd.ExecuteNonQuery() | Out-Null
        } else {
            $cid = [int]$cid
            $cmd.CommandText = "UPDATE t_connector SET [Name] = '$msg', [Notes] = '$msg', [Connector_Type] = 'Association', [Direction] = 'Source -> Destination' WHERE Connector_ID = $cid"
            $cmd.ExecuteNonQuery() | Out-Null
        }

        # Enlazar al diagrama
        $instId = Get-NextId "t_diagramlinks" "Instance_ID"
        $geo = "EDGE=2;=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;"
        $style = "Mode=3;Color=-1;LWidth=0;"
        $cmd.CommandText = "INSERT INTO t_diagramlinks ([DiagramID], [ConnectorID], [Geometry], [Style], [Hidden], [Instance_ID]) VALUES ($diagId, $cid, '$geo', '$style', False, $instId)"
        $cmd.ExecuteNonQuery() | Out-Null
        return $cid
    }

    $c1 = Add-ConnectorMsg $idActor $idBoundary "1: seleccionarPrendaYProbador(variante_id, hora_ensayo)`n2: apartarPrendaSinPago()"
    $c2 = Add-ConnectorMsg $idBoundary $idControl "1.1: registrarReservaProbadorOffline(datosApartado)"
    $c3 = Add-ConnectorMsg $idControl $idVariante "1.2: verificarPrendaParaEnsayo(variante_id)"
    $c4 = Add-ConnectorMsg $idControl $idSucursal "1.3: validarCapacidadProbadores(sucursal_id)"
    $c5 = Add-ConnectorMsg $idControl $idReserva "1.4: crearReservaProbadorSinPago(datosReserva, uuid)"
    $c6 = Add-ConnectorMsg $idControl $idDetalleRes "1.5: agregarDetallePrenda(reserva_id, variante_id)"
    $c7 = Add-ConnectorMsg $idControl $idSync "1.6: encolarReservaOffline(uuid, payload_json)"

    Write-Host "Conectores y mensajes enlazados exitosamente para CU14." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# 5. Exportar a imagen PNG usando EA COM
Write-Host "Exportando imagen mediante EA COM..." -ForegroundColor Cyan
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$repo.OpenFile($eapPath)
$proj = $repo.GetProjectInterface()
$proj.PutDiagramImageToFile($diagGuid, $outImg, 1)
$repo.CloseFile()
$repo.Exit()
Write-Host "Diagrama de Robustez CU14 exportado exitosamente a: $outImg" -ForegroundColor Green
