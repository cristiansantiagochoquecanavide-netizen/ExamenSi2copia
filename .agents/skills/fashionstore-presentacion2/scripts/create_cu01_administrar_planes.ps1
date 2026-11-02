# ==============================================================================
# SCRIPT PARA CU01: Administrar Planes de Suscripción (JET OLEDB + EA COM)
# Espaciado optimizado de alta legibilidad
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImgCu01 = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU01.png"

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
    $diagName = "Diagrama de robustez CU01"

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID, ea_guid FROM t_diagram WHERE [Name] = '$diagName' AND Package_ID = $pkgId"
    $reader = $cmd.ExecuteReader()
    $diagId = 0
    if ($reader.Read()) {
        $diagId = [int]$reader["Diagram_ID"]
    }
    $reader.Close()

    $cmd.CommandText = "UPDATE t_diagram SET [cx] = 2600, [cy] = 1100 WHERE Diagram_ID = $diagId"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
    $cmd.ExecuteNonQuery() | Out-Null

    # Elementos
    $idActor = Ensure-Object "Superadministrador SaaS" "Actor" "" $pkgId
    $idBoundary = Ensure-Object "UI_GestionPlanesSaaS" "Class" "boundary" $pkgId
    $idControl = Ensure-Object "PlanSuscripcionController" "Class" "control" $pkgId
    $idPlan = Ensure-Object "PlanSuscripcion" "Class" "entity" $pkgId
    $idSuscripcion = Ensure-Object "Suscripcion" "Class" "entity" $pkgId
    $idBitacora = Ensure-Object "BitacoraAuditoria" "Class" "entity" $pkgId

    # Layout amplio
    $layout = @(
        @{ Id = $idActor;       L = 60;   T = -220; R = 150;  B = -330; Seq = 1 },
        @{ Id = $idBoundary;    L = 460;  T = -235; R = 550;  B = -315; Seq = 2 },
        @{ Id = $idControl;     L = 1080; T = -235; R = 1170; B = -315; Seq = 3 },
        @{ Id = $idPlan;        L = 1800; T = -90;  R = 1890; B = -170; Seq = 4 },
        @{ Id = $idSuscripcion; L = 1800; T = -235; R = 1890; B = -315; Seq = 5 },
        @{ Id = $idBitacora;    L = 1800; T = -380; R = 1890; B = -460; Seq = 6 }
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

    $c1 = Add-ConnectorMsg $idActor $idBoundary "1: solicitarGestionPlanes()`n2: registrarNuevoPlan(datosPlan)`n3: modificarPlan(plan_id, nuevosDatos)`n4: inhabilitarPlan(plan_id)" $diagId
    $c2 = Add-ConnectorMsg $idBoundary $idControl "1.1: listarPlanes()`n2.1: validarDatosPlan(datosPlan)`n3.1: procesarActualizacion(plan_id, datos)`n4.1: procesarInhabilitacion(plan_id)" $diagId
    $c3 = Add-ConnectorMsg $idControl $idPlan "1.1.1: consultarPlanesDisponibles()`n2.1.1: validarUnicidadCodigo(codigo)`n2.1.2: crearPlan(datosPlan)`n3.1.1: findById(plan_id)`n3.1.2: actualizarLimitesYPrecios(datos)`n4.1.2: setActivo(false)" $diagId
    $c4 = Add-ConnectorMsg $idControl $idSuscripcion "4.1.1: contarEmpresasSuscritasActivas(plan_id)" $diagId
    $c5 = Add-ConnectorMsg $idControl $idBitacora "2.1.3: registrarAuditoria(CREAR_PLAN)`n3.1.3: registrarAuditoria(MODIFICAR_PLAN)`n4.1.3: registrarAuditoria(INHABILITAR_PLAN)" $diagId

} finally {
    $conn.Close()
}

$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$opened = $repo.OpenFile($eapPath)
$project = $repo.GetProjectInterface()
$diagCu01 = $repo.GetDiagramByID($diagId)
$project.PutDiagramImageToFile($diagCu01.DiagramGUID, $outImgCu01, 1)
$repo.CloseFile()
$repo.Exit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($repo) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ea) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Diagrama CU01 re-exportado exitosamente." -ForegroundColor Green
