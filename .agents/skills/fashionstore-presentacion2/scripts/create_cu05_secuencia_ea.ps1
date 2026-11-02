# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU05 (ENTERPRISE ARCHITECT)
# CU05: Autenticar Usuario y Establecer Contexto de Tenant
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         ALT y OPT inician en UI (L=210) hacia Entidades
#         Separacion en cuadros diferentes para alt y opt
#         CERO COLISIONES: Margenes milimetricos y organizacion impecable

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU05_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU05 en archivo EA: $eapPath" -ForegroundColor Cyan
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
    $diagName = "Diagrama de secuencia CU05"

    # Verificar o crear diagrama de secuencia
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
    'Diagrama de secuencia UML 2.5 para CU05: Autenticar Usuario y Establecer Contexto de Tenant', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU05 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar cualquier conector huerfano con DiagID=0
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%ingresarCredenciales%' OR Name LIKE '%solicitarCierreSesion%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Robustez 54)
    $idActor     = Ensure-LifelineObject "Usuario del Sistema" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI        = Ensure-LifelineObject "UI_LoginTenant" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl      = Ensure-LifelineObject "AutenticacionTenantController" "Sequence" $pkgId 15921906
    $idUsuario   = Ensure-LifelineObject "Usuario" "Sequence" $pkgId 15921906
    $idEmpresa   = Ensure-LifelineObject "Empresa" "Sequence" $pkgId 15921906
    $idPlan      = Ensure-LifelineObject "PlanSuscripcion" "Sequence" $pkgId 15921906
    $idBlacklist = Ensure-LifelineObject "TokenBlacklist" "Sequence" $pkgId 15921906
    $idBitacora  = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # Crear fragmentos
    $idAlt1 = Ensure-FragmentObject "[hashValido == true && esActivo == true]" "alt" $pkgId 0 # NType=0 (alt)
    $idOpt1 = Ensure-FragmentObject "[logout]" "opt" $pkgId 1                                  # NType=1 (opt)

    # Layout horizontal:
    # Actor:      L=60,   R=150
    # UI:         L=230,  R=350
    # Ctrl:       L=440,  R=560
    # Usuario:    L=640,  R=750
    # Empresa:    L=820,  R=930
    # Plan:       L=1000, R=1110
    # Blacklist:  L=1180, R=1290
    # Bitacora:   L=1360, R=1470
    #
    # Coordenadas verticales milimetricas (Y(N) = -(50 + N * 35)):
    # - ALT: Inicia en UI (L=210) a Bitacora (R=1490). Top=-382, Bottom=-660
    #   Mensaje 8 a -365 (17px arriba), Mensaje 9 a -400 (18px abajo)
    #   Pestaña ALT: -382 a -407 (entre UI y Ctrl, Mensaje 9 empieza a X=440 a la derecha)
    #   Mensajes 9 a 16 dentro de ALT (N=9 a 16, Y ≈ -400 a -645)
    #   Fondo de ALT a -660 (15px debajo de Mensaje 16)
    # - Gap amplio entre ALT y OPT: 40px (de -660 a -700)
    #   Mensaje 17 a -680 viaja limpio en el gap entre ambos marcos
    # - OPT: Inicia en UI (L=210) a Bitacora (R=1490). Top=-700, Bottom=-960
    #   Pestaña corta [logout] termina antes de X=285 (libre de Mensaje 18 a X=290)
    #   Mensajes 18 a 24 dentro de OPT (N=18 a 24, Y ≈ -715 a -925)
    #   Fondo de OPT a -960 (35px debajo de Mensaje 24)
    # - Lifelines Bottom: -1010

    $layout = @(
        @{ Id = $idAlt1;      L = 210;  T = -382;  R = 1490; B = -660;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;      L = 210;  T = -700;  R = 1490; B = -960;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;     L = 60;   T = -50;   R = 150;  B = -1010; Seq = 10; Style = "" },
        @{ Id = $idUI;        L = 230;  T = -50;   R = 350;  B = -1010; Seq = 11; Style = "" },
        @{ Id = $idCtrl;      L = 440;  T = -50;   R = 560;  B = -1010; Seq = 12; Style = "" },
        @{ Id = $idUsuario;   L = 640;  T = -50;   R = 750;  B = -1010; Seq = 13; Style = "" },
        @{ Id = $idEmpresa;   L = 820;  T = -50;   R = 930;  B = -1010; Seq = 14; Style = "" },
        @{ Id = $idPlan;      L = 1000; T = -50;   R = 1110; B = -1010; Seq = 15; Style = "" },
        @{ Id = $idBlacklist; L = 1180; T = -50;   R = 1290; B = -1010; Seq = 16; Style = "" },
        @{ Id = $idBitacora;  L = 1360; T = -50;   R = 1470; B = -1010; Seq = 17; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU05." -ForegroundColor Green

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

    # Bloque 1: Autenticacion y Verificacion de Credenciales (Seq 1 a 8)
    Add-SeqMessage $idActor    $idUI        "1. ingresarCredenciales(email, password)" 1 "Call" | Out-Null
    Add-SeqMessage $idUI       $idCtrl      "2. autenticarYResolverTenant(credenciales)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idUsuario   "3. findByEmail(email)" 3 "Call" | Out-Null
    Add-SeqMessage $idUsuario  $idCtrl      "4. usuario: Usuario (id, passwordHash, estado)" 4 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUsuario   "5. verificarPasswordHash(password)" 5 "Call" | Out-Null
    Add-SeqMessage $idUsuario  $idCtrl      "6. hashValido: bool()" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUsuario   "7. validarEstadoActivo()" 7 "Call" | Out-Null
    Add-SeqMessage $idUsuario  $idCtrl      "8. esActivo: bool()" 8 "Return" | Out-Null

    # Bloque 2: Dentro de ALT [hashValido == true && esActivo == true] (Seq 9 a 16)
    Add-SeqMessage $idCtrl     $idEmpresa   "9. obtenerDatosTenant(empresa_id)" 9 "Call" | Out-Null
    Add-SeqMessage $idEmpresa  $idCtrl      "10. tenantInfo: Empresa (subdominio, activo=true)" 10 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idPlan      "11. consultarCapacidadesPlan(plan_id)" 11 "Call" | Out-Null
    Add-SeqMessage $idPlan     $idCtrl      "12. plan: PlanSuscripcion (codigo, permiteOffline, permiteIA)" 12 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora  "13. registrarAuditoria('LOGIN_EXITOSO', usuario.id)" 13 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl      "14. auditoriaRegistrada: bool()" 14 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI        "15. 200 OK (jwtToken, tenantContext)" 15 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor     "16. mostrarDashboardTenant(sesionActiva)" 16 "Return" | Out-Null
    # Fin ALT

    # Bloque 3: Cierre de Sesion e Invalidacion (Seq 17 a 24)
    Add-SeqMessage $idActor    $idUI        "17. solicitarCierreSesion(token)" 17 "Call" | Out-Null
    
    # Dentro de OPT [logout]
    Add-SeqMessage $idUI       $idCtrl      "18. procesarLogout(token)" 18 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idBlacklist "19. registrarTokenRevocado(token, user_id)" 19 "Call" | Out-Null
    Add-SeqMessage $idBlacklist $idCtrl     "20. tokenRevocado: bool()" 20 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora  "21. registrarAuditoria('LOGOUT', user_id)" 21 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl      "22. confirmacionAuditoria: bool()" 22 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI        "23. 200 OK (logoutExitoso)" 23 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor     "24. mostrarConfirmacionLogout('Sesion cerrada correctamente')" 24 "Return" | Out-Null
    # Fin OPT

    Write-Host "24 mensajes de secuencia creados exitosamente para CU05." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU05 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU05 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
