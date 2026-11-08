# ==============================================================================
# SCRIPT DE CREACION/ACTUALIZACION DIAGRAMA DE ROBUSTEZ CU21 (JET OLEDB + EA COM)
# CU21: Consultar Reportes por Lenguaje Natural Texto/Voz con Google Gemini y blindaje tenant_id
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImgCu21 = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU21.png"

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
    $pkgId = 44 # 3.2. Diagramas de robustez (P3)
    $diagName = "Diagrama de robustez CU21"

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID, ea_guid FROM t_diagram WHERE Diagram_ID = 70 OR ([Name] = '$diagName' AND Package_ID = $pkgId)"
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
    0, True, True, True, 'L', 2700, 1300, 100,
    NOW(), NOW(), True, True, True,
    False, '$diagGuid'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Creado diagrama: $diagName con ID: $diagId" -ForegroundColor Green
    } else {
        Write-Host "Diagrama existente ID: $diagId. Limpiando diagramobjects y diagramlinks..." -ForegroundColor Yellow
        $cmd.CommandText = "UPDATE t_diagram SET [cx] = 2700, [cy] = 1300, [Diagram_Type] = 'Analysis', [Name] = '$diagName', [Package_ID] = $pkgId WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # Elementos en Package 44
    $idActor = Ensure-Object "Administrador del Tenant" "Actor" "" $pkgId
    $idBoundary = Ensure-Object "UI_AsistenteReportesIA" "Class" "boundary" $pkgId
    $idControl = Ensure-Object "ReporteIAController" "Class" "control" $pkgId
    $idPlan = Ensure-Object "PlanSuscripcion" "Class" "entity" $pkgId
    $idVenta = Ensure-Object "Venta" "Class" "entity" $pkgId
    $idReporte = Ensure-Object "ReporteGenerativoIA" "Class" "entity" $pkgId
    $idBitacora = Ensure-Object "BitacoraAuditoria" "Class" "entity" $pkgId

    # Layout horizontal armónico de cuatro capas (mismo espaciado probado y pulido)
    $layout = @(
        @{ Id = $idActor;     L = 60;   T = -260; R = 150;  B = -370; Seq = 1 },
        @{ Id = $idBoundary;  L = 400;  T = -275; R = 490;  B = -355; Seq = 2 },
        @{ Id = $idControl;   L = 920;  T = -275; R = 1010; B = -355; Seq = 3 },
        @{ Id = $idPlan;      L = 1850; T = -80;  R = 1940; B = -160; Seq = 4 },
        @{ Id = $idVenta;     L = 1850; T = -220; R = 1940; B = -300; Seq = 5 },
        @{ Id = $idReporte;   L = 1850; T = -360; R = 1940; B = -440; Seq = 6 },
        @{ Id = $idBitacora;  L = 1850; T = -500; R = 1940; B = -580; Seq = 7 }
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

    # Conectores y mensajes jerarquicos UML para CU21
    $c1 = Add-ConnectorMsg $idActor $idBoundary "1: ingresarPromptTextoOVoz(prompt, canal)`n2: consultarHistorialReportes(tenant_id)" $diagId
    $c2 = Add-ConnectorMsg $idBoundary $idControl "1.1: procesarConsultaIA(prompt, canal, tenant_id)`n2.1: obtenerHistorialTenant(tenant_id, limit)" $diagId
    $c3 = Add-ConnectorMsg $idControl $idPlan "1.2: validarSuscripcionEIA(tenant_id)`n1.2.1: verificarPermiteIA()" $diagId
    $c4 = Add-ConnectorMsg $idControl $idVenta "1.3: ejecutarSQLReadOnly(sql_blindado, tenant_id)`n1.3.1: aplicarTimeout5sYTransactionReadOnly()`n1.3.2: extraerMetricasTabulares()" $diagId
    $c5 = Add-ConnectorMsg $idControl $idReporte "1.4: guardarReporteGenerativo(tenant_id, prompt, sql, resumen)`n1.4.1: persistirEntidadReporte()`n2.1.1: findByEmpresaId(tenant_id)" $diagId
    $c6 = Add-ConnectorMsg $idControl $idBitacora "1.5: registrarAuditoria(CONSULTA_REPORTE_IA)" $diagId

    Write-Host "Conectores y mensajes enlazados exitosamente para CU21." -ForegroundColor Green

} finally {
    $conn.Close()
}

$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$opened = $repo.OpenFile($eapPath)
$project = $repo.GetProjectInterface()
$diagCu21 = $repo.GetDiagramByID($diagId)
$project.PutDiagramImageToFile($diagCu21.DiagramGUID, $outImgCu21, 1)
$repo.CloseFile()
$repo.Exit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($repo) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ea) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Diagrama CU21 exportado exitosamente a: $outImgCu21" -ForegroundColor Green
