# ==============================================================================
# SCRIPT DE CREACION DIAGRAMA DE ROBUSTEZ / COMUNICACION CU03 (JET OLEDB + EA COM)
# CU03: Gestionar Suscripción y Estado de Cuenta
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImgCu03 = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU03.png"

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
    $diagName = "Diagrama de robustez CU03"

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID, ea_guid FROM t_diagram WHERE [Name] = '$diagName' AND Package_ID = $pkgId"
    $reader = $cmd.ExecuteReader()
    $diagId = 0
    if ($reader.Read()) {
        $diagId = [int]$reader["Diagram_ID"]
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
    0, True, True, True, 'L', 2600, 1100, 100,
    NOW(), NOW(), True, True, True,
    False, '$diagGuid'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Creado diagrama: $diagName con ID: $diagId" -ForegroundColor Green
    } else {
        Write-Host "Diagrama existente ID: $diagId. Limpiando diagramobjects y diagramlinks..." -ForegroundColor Yellow
        $cmd.CommandText = "UPDATE t_diagram SET [cx] = 2600, [cy] = 1100 WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # Elementos
    $idActor = Ensure-Object "Administrador del Tenant" "Actor" "" $pkgId
    $idBoundary = Ensure-Object "UI_EstadoCuentaSuscripcion" "Class" "boundary" $pkgId
    $idControl = Ensure-Object "SuscripcionTenantController" "Class" "control" $pkgId
    $idSuscripcion = Ensure-Object "Suscripcion" "Class" "entity" $pkgId
    $idPlan = Ensure-Object "PlanSuscripcion" "Class" "entity" $pkgId
    $idSucursal = Ensure-Object "Sucursal" "Class" "entity" $pkgId
    $idBitacora = Ensure-Object "BitacoraAuditoria" "Class" "entity" $pkgId

    # Layout horizontal balanceado
    $layout = @(
        @{ Id = $idActor;       L = 60;   T = -260; R = 150;  B = -370; Seq = 1 },
        @{ Id = $idBoundary;    L = 460;  T = -275; R = 550;  B = -355; Seq = 2 },
        @{ Id = $idControl;     L = 1080; T = -275; R = 1170; B = -355; Seq = 3 },
        @{ Id = $idSuscripcion; L = 1800; T = -70;  R = 1890; B = -150; Seq = 4 },
        @{ Id = $idPlan;        L = 1800; T = -200; R = 1890; B = -280; Seq = 5 },
        @{ Id = $idSucursal;    L = 1800; T = -330; R = 1890; B = -410; Seq = 6 },
        @{ Id = $idBitacora;    L = 1800; T = -460; R = 1890; B = -540; Seq = 7 }
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

    function Add-ConnectorMsg([int]$src, [int]$dst, [string]$msg, [int]$targetDiagId) {
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

        $instId = Get-NextId "t_diagramlinks" "Instance_ID"
        $geo = "EDGE=2;=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;"
        $style = "Mode=3;Color=-1;LWidth=0;"
        $cmd.CommandText = "INSERT INTO t_diagramlinks ([DiagramID], [ConnectorID], [Geometry], [Style], [Hidden], [Instance_ID]) VALUES ($targetDiagId, $cid, '$geo', '$style', False, $instId)"
        $cmd.ExecuteNonQuery() | Out-Null
        return $cid
    }

    # Conexiones y mensajes para CU03
    $c1 = Add-ConnectorMsg $idActor $idBoundary "1: consultarEstadoSuscripcion()`n2: solicitarCambioPlan(nuevo_plan_id)`n3: solicitarRenovacionPeriodo()" $diagId
    $c2 = Add-ConnectorMsg $idBoundary $idControl "1.1: obtenerEstadoCuenta(empresa_id)`n2.1: procesarCambioPlan(empresa_id, nuevo_plan_id)`n3.1: procesarRenovacion(empresa_id)" $diagId
    $c3 = Add-ConnectorMsg $idControl $idSuscripcion "1.1.1: findByEmpresaId(empresa_id)`n2.1.3: actualizarPlanId(nuevo_plan_id)`n3.1.1: extenderVigenciaPeriodo(365_dias)" $diagId
    $c4 = Add-ConnectorMsg $idControl $idPlan "1.1.2: getPlanDetails(plan_id)`n2.1.1: validarPlanActivo(nuevo_plan_id)`n2.1.2: consultarLimiteSucursales()" $diagId
    $c5 = Add-ConnectorMsg $idControl $idSucursal "1.1.3: contarSucursalesActivas(empresa_id)`n2.1.2.1: verificarCuotaSucursales(actuales, limite)" $diagId
    $c6 = Add-ConnectorMsg $idControl $idBitacora "2.1.4: registrarAuditoria(CAMBIO_PLAN_MIGRACION)`n3.1.2: registrarAuditoria(RENOVACION_SUSCRIPCION)" $diagId

    Write-Host "Conectores y mensajes enlazados exitosamente para CU03." -ForegroundColor Green

} finally {
    $conn.Close()
}

$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$opened = $repo.OpenFile($eapPath)
$project = $repo.GetProjectInterface()
$diagCu03 = $repo.GetDiagramByID($diagId)
$project.PutDiagramImageToFile($diagCu03.DiagramGUID, $outImgCu03, 1)
$repo.CloseFile()
$repo.Exit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($repo) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ea) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Diagrama CU03 exportado exitosamente a: $outImgCu03" -ForegroundColor Green
