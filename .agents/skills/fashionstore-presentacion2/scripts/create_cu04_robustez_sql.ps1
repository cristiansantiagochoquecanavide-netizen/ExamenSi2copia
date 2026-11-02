# ==============================================================================
# SCRIPT DE CREACION DIAGRAMA DE ROBUSTEZ / COMUNICACION CU04 (JET OLEDB + EA COM)
# CU04: Administrar Sucursales con Control de Límites (Espaciado Mejorado)
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImgCu04 = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU04.png"

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
    $diagName = "Diagrama de robustez CU04"

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID, ea_guid FROM t_diagram WHERE [Name] = '$diagName' AND Package_ID = $pkgId"
    $reader = $cmd.ExecuteReader()
    $diagId = 0
    if ($reader.Read()) {
        $diagId = [int]$reader["Diagram_ID"]
    }
    $reader.Close()

    $cmd.CommandText = "UPDATE t_diagram SET [cx] = 2700, [cy] = 1300 WHERE Diagram_ID = $diagId"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
    $cmd.ExecuteNonQuery() | Out-Null

    # Elementos
    $idActor = Ensure-Object "Administrador del Tenant" "Actor" "" $pkgId
    $idBoundary = Ensure-Object "UI_GestionSucursales" "Class" "boundary" $pkgId
    $idControl = Ensure-Object "SucursalTenantController" "Class" "control" $pkgId
    $idSuscripcion = Ensure-Object "Suscripcion" "Class" "entity" $pkgId
    $idPlan = Ensure-Object "PlanSuscripcion" "Class" "entity" $pkgId
    $idSucursal = Ensure-Object "Sucursal" "Class" "entity" $pkgId
    $idCiudad = Ensure-Object "Ciudad" "Class" "entity" $pkgId
    $idBitacora = Ensure-Object "BitacoraAuditoria" "Class" "entity" $pkgId

    # Layout amplio
    $layout = @(
        @{ Id = $idActor;       L = 60;   T = -260; R = 150;  B = -370; Seq = 1 },
        @{ Id = $idBoundary;    L = 400;  T = -275; R = 490;  B = -355; Seq = 2 },
        @{ Id = $idControl;     L = 920;  T = -275; R = 1010; B = -355; Seq = 3 },
        @{ Id = $idSuscripcion; L = 1850; T = -50;  R = 1940; B = -130; Seq = 4 },
        @{ Id = $idPlan;        L = 1850; T = -170; R = 1940; B = -250; Seq = 5 },
        @{ Id = $idSucursal;    L = 1850; T = -290; R = 1940; B = -370; Seq = 6 },
        @{ Id = $idCiudad;      L = 1850; T = -410; R = 1940; B = -490; Seq = 7 },
        @{ Id = $idBitacora;    L = 1850; T = -530; R = 1940; B = -610; Seq = 8 }
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

    # Conectores y mensajes para CU04
    $c1 = Add-ConnectorMsg $idActor $idBoundary "1: solicitarListadoSucursales()`n2: registrarNuevaSucursal(datosSucursal)`n3: editarSucursal(sucursal_id, datosActualizados)`n4: desactivarSucursal(sucursal_id)" $diagId
    $c2 = Add-ConnectorMsg $idBoundary $idControl "1.1: listarSucursalesTenant(tenant_id)`n2.1: procesarRegistroSucursal(datosSucursal)`n3.1: procesarModificacionSucursal(sucursal_id, datos)`n4.1: procesarBajaSucursal(sucursal_id)" $diagId
    $c3 = Add-ConnectorMsg $idControl $idSuscripcion "2.1.1: obtenerSuscripcionActiva(empresa_id)" $diagId
    $c4 = Add-ConnectorMsg $idControl $idPlan "2.1.2: consultarLimiteSucursales()" $diagId
    $c5 = Add-ConnectorMsg $idControl $idSucursal "1.1.1: findByEmpresaId(empresa_id)`n2.1.3: contarSucursalesActivas(empresa_id)`n2.1.5: crearRegistroSucursal(datos, ciudad_id)`n3.1.1: findById(sucursal_id)`n3.1.2: actualizarDatos(datos)`n4.1.1: setActivo(false)" $diagId
    $c6 = Add-ConnectorMsg $idControl $idCiudad "2.1.4: resolverCiudadId(nombreCiudad)" $diagId
    $c7 = Add-ConnectorMsg $idControl $idBitacora "2.1.6: registrarAuditoria(ALTA_SUCURSAL)`n3.1.3: registrarAuditoria(MODIFICAR_SUCURSAL)`n4.1.2: registrarAuditoria(DESACTIVAR_SUCURSAL)" $diagId

} finally {
    $conn.Close()
}

$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$opened = $repo.OpenFile($eapPath)
$project = $repo.GetProjectInterface()
$diagCu04 = $repo.GetDiagramByID($diagId)
$project.PutDiagramImageToFile($diagCu04.DiagramGUID, $outImgCu04, 1)
$repo.CloseFile()
$repo.Exit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($repo) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ea) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Diagrama CU04 re-exportado exitosamente." -ForegroundColor Green
