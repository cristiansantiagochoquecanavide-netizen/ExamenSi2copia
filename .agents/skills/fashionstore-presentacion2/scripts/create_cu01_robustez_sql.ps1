# ==============================================================================
# SCRIPT DE CREACION DIAGRAMA DE ROBUSTEZ / COMUNICACION CU01 (JET OLEDB + EA COM)
# CU01: Registrar Empresa Contratante (Tenant)
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImg = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU01.png"

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
    0, True, True, True, 'L', 2400, 1100, 100,
    NOW(), NOW(), True, True, True,
    False, '$diagGuid'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Creado diagrama: $diagName con ID: $diagId" -ForegroundColor Green
    } else {
        Write-Host "Diagrama existente ID: $diagId. Limpiando diagramobjects y diagramlinks..." -ForegroundColor Yellow
        $cmd.CommandText = "UPDATE t_diagram SET [cx] = 2400, [cy] = 1100 WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # 2. Asegurar elementos BCE estrictamente mapeados al Diagrama de Clases
    $idActor = Ensure-Object "Superadministrador SaaS" "Actor" "" $pkgId
    $idBoundary = Ensure-Object "UI_RegistroTenant" "Class" "boundary" $pkgId
    $idControl = Ensure-Object "ControladorTenant" "Class" "control" $pkgId
    $idEmpresa = Ensure-Object "Empresa" "Class" "entity" $pkgId
    $idPlan = Ensure-Object "PlanSuscripcion" "Class" "entity" $pkgId
    $idSuscripcion = Ensure-Object "Suscripcion" "Class" "entity" $pkgId
    $idUsuario = Ensure-Object "Usuario" "Class" "entity" $pkgId
    $idBitacora = Ensure-Object "BitacoraAuditoria" "Class" "entity" $pkgId

    # 3. Colocar en DiagramObjects con espaciado amplio y balanceado
    $layout = @(
        @{ Id = $idActor;       L = 60;   T = -260; R = 150;  B = -370; Seq = 1 },
        @{ Id = $idBoundary;    L = 360;  T = -275; R = 450;  B = -355; Seq = 2 },
        @{ Id = $idControl;     L = 980;  T = -275; R = 1070; B = -355; Seq = 3 },
        @{ Id = $idEmpresa;     L = 1680; T = -50;  R = 1770; B = -130; Seq = 4 },
        @{ Id = $idPlan;        L = 1680; T = -160; R = 1770; B = -240; Seq = 5 },
        @{ Id = $idSuscripcion; L = 1680; T = -270; R = 1770; B = -350; Seq = 6 },
        @{ Id = $idUsuario;     L = 1680; T = -380; R = 1770; B = -460; Seq = 7 },
        @{ Id = $idBitacora;    L = 1680; T = -490; R = 1770; B = -570; Seq = 8 }
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
    Write-Host "Colocados los 8 elementos BCE en el diagrama CU01." -ForegroundColor Green

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

    # Enlaces y mensajes jerárquicos para CU01
    $c1 = Add-ConnectorMsg $idActor $idBoundary "1: solicitarRegistroEmpresa(datosEmpresa)`n2: confirmarCreacionTenant()"
    $c2 = Add-ConnectorMsg $idBoundary $idControl "1.1: validarDatosFormulario(datosEmpresa)`n1.2: verificarDisponibilidadSubdominio(subdominio)`n2.1: procesarRegistroTenant(datosValidados)`n2.2: notificarResultadoRegistro()"
    $c3 = Add-ConnectorMsg $idControl $idEmpresa "2.1.1: validarUnicidadSubdominio(subdominio)`n2.1.2: crearRegistroEmpresa(datos)`n2.1.3: configurarContextoTenant(subdominio)"
    $c4 = Add-ConnectorMsg $idControl $idPlan "1.2.1: obtenerPlanPorCodigo(plan_codigo)`n1.2.2: consultarLimitesPermitidos()"
    $c5 = Add-ConnectorMsg $idControl $idSuscripcion "2.1.4: crearSuscripcionInicial(empresa_id, plan_id)`n2.1.5: calcularVigenciaSuscripcion(periodo)"
    $c6 = Add-ConnectorMsg $idControl $idUsuario "2.1.6: crearUsuarioAdminTenant(datosAdmin)`n2.1.7: encriptarContrasena(password)"
    $c7 = Add-ConnectorMsg $idControl $idBitacora "2.1.8: registrarEventoAuditoria(ALTA_TENANT)"

    Write-Host "Conectores y mensajes enlazados exitosamente para CU01." -ForegroundColor Green

} finally {
    $conn.Close()
}

# 5. Exportar imagen de alta resolución mediante EA COM
Write-Host "Exportando imagen mediante EA COM..." -ForegroundColor Cyan
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$opened = $repo.OpenFile($eapPath)

$project = $repo.GetProjectInterface()
$diag = $repo.GetDiagramByID($diagId)
$project.PutDiagramImageToFile($diag.DiagramGUID, $outImg, 1)

$repo.CloseFile()
$repo.Exit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($repo) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ea) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Diagrama de Robustez CU01 exportado exitosamente a: $outImg" -ForegroundColor Green
