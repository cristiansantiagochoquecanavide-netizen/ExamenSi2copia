# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU02 (ENTERPRISE ARCHITECT)
# CU02: Registrar Empresa Contratante (Tenant)
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         Separacion en cuadros diferentes para alt y opt
#         ALT y OPT cubren desde UI (L=210) hasta las Entidades
#         CERO COLISIONES: Margenes milimetricos entre pestanas y flechas de mensajes

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU02_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU02 en archivo EA: $eapPath" -ForegroundColor Cyan
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
    $diagName = "Diagrama de secuencia CU02"

    # Limpiar diagrama existente si existe
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
    'Diagrama de secuencia UML 2.5 para CU02: Registrar Empresa Contratante Tenant', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU02 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar cualquier conector huerfano con DiagID=0 entre estos participantes
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%solicitarRegistroEmpresa%' OR Name LIKE '%verificarDisponibilidadSubdominio%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes
    $idActor    = Ensure-LifelineObject "Superadministrador SaaS" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI       = Ensure-LifelineObject "UI_RegistroTenant" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl     = Ensure-LifelineObject "ControladorTenant" "Sequence" $pkgId 15921906
    $idPlan     = Ensure-LifelineObject "PlanSuscripcion" "Sequence" $pkgId 15921906
    $idEmpresa  = Ensure-LifelineObject "Empresa" "Sequence" $pkgId 15921906
    $idSuscrip  = Ensure-LifelineObject "Suscripcion" "Sequence" $pkgId 15921906
    $idUsuario  = Ensure-LifelineObject "Usuario" "Sequence" $pkgId 15921906
    $idBitacora = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # Crear fragmentos
    $idOpt1 = Ensure-FragmentObject "[verificacionPreviaSubdominio == true]" "opt" $pkgId 1
    $idAlt1 = Ensure-FragmentObject "[datosValidos && plan.activo == true]" "alt" $pkgId 0

    # Layout horizontal:
    # Actor:      L=60,   R=150
    # UI:         L=230,  R=350
    # Ctrl:       L=430,  R=550
    # Plan:       L=630,  R=740
    # Empresa:    L=820,  R=930
    # Suscrip:    L=1010, R=1120
    # Usuario:    L=1200, R=1310
    # Bitacora:   L=1390, R=1500
    #
    # Coordenadas verticales sin colisiones:
    # - OPT: Inicia en UI (L=210) a Empresa (R=950). Top=-95, Bottom=-325
    # - ALT: Inicia en UI (L=210) a Bitacora (R=1520). Top=-565, Bottom=-880

    $layout = @(
        @{ Id = $idOpt1;     L = 210;  T = -95;  R = 950;  B = -325;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idAlt1;     L = 210;  T = -565; R = 1520; B = -880;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;    L = 60;   T = -50;  R = 150;  B = -960;  Seq = 10; Style = "" },
        @{ Id = $idUI;       L = 230;  T = -50;  R = 350;  B = -960;  Seq = 11; Style = "" },
        @{ Id = $idCtrl;     L = 430;  T = -50;  R = 550;  B = -960;  Seq = 12; Style = "" },
        @{ Id = $idPlan;     L = 630;  T = -50;  R = 740;  B = -960;  Seq = 13; Style = "" },
        @{ Id = $idEmpresa;  L = 820;  T = -50;  R = 930;  B = -960;  Seq = 14; Style = "" },
        @{ Id = $idSuscrip;  L = 1010; T = -50;  R = 1120; B = -960;  Seq = 15; Style = "" },
        @{ Id = $idUsuario;  L = 1200; T = -50;  R = 1310; B = -960;  Seq = 16; Style = "" },
        @{ Id = $idBitacora; L = 1390; T = -50;  R = 1500; B = -960;  Seq = 17; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU02." -ForegroundColor Green

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

    # Flujo 1: Solicitud inicial
    Add-SeqMessage $idActor $idUI   "1. solicitarRegistroEmpresa(datosEmpresa)" 1 "Call" | Out-Null

    # Dentro de OPT: verificacionPreviaSubdominio == true
    Add-SeqMessage $idUI    $idCtrl "2. verificarDisponibilidadSubdominio(subdominio, plan_id)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl  $idEmpresa "3. validarUnicidadSubdominio(subdominio)" 3 "Call" | Out-Null
    Add-SeqMessage $idEmpresa $idCtrl  "4. subdominioDisponible: bool()" 4 "Return" | Out-Null
    Add-SeqMessage $idCtrl  $idPlan "5. consultarLimitesPermitidos(plan_id)" 5 "Call" | Out-Null
    Add-SeqMessage $idPlan  $idCtrl "6. planActivo: bool()" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl  $idUI   "7. 200 OK (subdominioYPlanValidos)" 7 "Return" | Out-Null
    Add-SeqMessage $idUI    $idActor "8. mostrarDisponibilidadSubdominio(valido=true)" 8 "Return" | Out-Null

    # Flujo 2: Confirmación y validaciones previas al commit
    Add-SeqMessage $idActor $idUI   "9. confirmarCreacionTenant()" 9 "Call" | Out-Null
    Add-SeqMessage $idUI    $idCtrl "10. procesarRegistroTenant(datosValidados)" 10 "Call" | Out-Null
    Add-SeqMessage $idCtrl  $idEmpresa "11. validarUnicidadSubdominioYNit(subdominio, nit)" 11 "Call" | Out-Null
    Add-SeqMessage $idEmpresa $idCtrl  "12. datosDisponibles: bool()" 12 "Return" | Out-Null
    Add-SeqMessage $idCtrl  $idPlan "13. validarPlanActivo(plan_id)" 13 "Call" | Out-Null
    Add-SeqMessage $idPlan  $idCtrl "14. planConfirmado: PlanSuscripcion()" 14 "Return" | Out-Null

    # Dentro de ALT: subdominioDisponible == true && nitDisponible == true && plan.activo == true
    Add-SeqMessage $idCtrl     $idEmpresa  "15. crearRegistroEmpresa(datos)" 15 "Call" | Out-Null
    Add-SeqMessage $idEmpresa  $idCtrl     "16. nuevaEmpresa: Empresa (id, subdominio)" 16 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idSuscrip  "17. crearSuscripcionInicial(empresa_id, plan_id, 365_dias)" 17 "Call" | Out-Null
    Add-SeqMessage $idSuscrip  $idCtrl     "18. suscripcionActiva: Suscripcion (id, estado='ACTIVA')" 18 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUsuario  "19. crearUsuarioAdminTenant(datosAdmin, passwordHash)" 19 "Call" | Out-Null
    Add-SeqMessage $idUsuario  $idCtrl     "20. adminCreado: Usuario (id, rol='ADMINISTRADOR')" 20 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "21. registrarEventoAuditoria('ALTA_TENANT', empresa_id)" 21 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl     "22. auditoriaRegistrada: bool()" 22 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "23. 201 Created (empresaResponse)" 23 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "24. notificarResultadoRegistro('Tenant registrado exitosamente')" 24 "Return" | Out-Null

    Write-Host "24 mensajes de secuencia creados exitosamente para CU02." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU02 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU02 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
