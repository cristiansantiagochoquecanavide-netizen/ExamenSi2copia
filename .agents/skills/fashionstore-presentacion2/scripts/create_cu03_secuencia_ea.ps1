# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU03 (ENTERPRISE ARCHITECT)
# CU03: Gestionar Suscripcion y Estado de Cuenta (SaaS Multitenant)
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         Separacion en cuadros diferentes para opt y alt
#         ALT y OPT cubren desde UI (L=210) hasta las Entidades
#         CERO COLISIONES: Margenes verticales amplios entre pestanas y flechas

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU03_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU03 en archivo EA: $eapPath" -ForegroundColor Cyan
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
    $diagName = "Diagrama de secuencia CU03"

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
    'Diagrama de secuencia UML 2.5 para CU03: Gestionar Suscripcion y Estado de Cuenta', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU03 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar cualquier conector huerfano con DiagID=0
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%consultarEstadoSuscripcion%' OR Name LIKE '%solicitarRenovacion%' OR Name LIKE '%solicitarCambioPlan%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes
    $idActor    = Ensure-LifelineObject "Administrador del Tenant" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI       = Ensure-LifelineObject "UI_EstadoCuentaSuscripcion" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl     = Ensure-LifelineObject "SuscripcionTenantController" "Sequence" $pkgId 15921906
    $idSuscrip  = Ensure-LifelineObject "Suscripcion" "Sequence" $pkgId 15921906
    $idPlan     = Ensure-LifelineObject "PlanSuscripcion" "Sequence" $pkgId 15921906
    $idSucursal = Ensure-LifelineObject "Sucursal" "Sequence" $pkgId 15921906
    $idBitacora = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # Crear fragmentos
    $idOpt1 = Ensure-FragmentObject "[renovacion_solicitada == true]" "opt" $pkgId 1
    $idAlt1 = Ensure-FragmentObject "[cuotaValida == true && planValido == true]" "alt" $pkgId 0

    # Layout horizontal:
    # Actor:      L=60,   R=150
    # UI:         L=230,  R=350
    # Ctrl:       L=440,  R=560
    # Suscrip:    L=650,  R=760
    # Plan:       L=840,  R=950
    # Sucursal:   L=1030, R=1140
    # Bitacora:   L=1220, R=1330
    #
    # Coordenadas verticales calibradas milimetricamente segun Y(N) = -(50 + N * 35):
    # - Bloque 1: Mensajes 1 a 10 (N=1 a 10, Y ≈ -85 a -400)
    # - OPT: Top=-415, Bottom=-660 (L=210, R=1350)
    #   Pestaña OPT: -415 a -440 (ubicada entre UI y Ctrl)
    #   Mensaje 11 (N=11) a -435 (va de Actor a UI, a la izquierda de la pestaña)
    #   Mensajes 12 a 17 dentro de OPT (N=12 a 17, Y ≈ -470 a -645)
    #   Fondo de OPT a -660 (15px debajo de Mensaje 17)
    # - Mensaje 18 (N=18) a -680 (UI -> Actor, fuera de OPT)
    # - Mensajes 19 a 24 de validacion previa (N=19 a 24, Y ≈ -715 a -890)
    # - ALT: Top=-905, Bottom=-1080 (L=210, R=1350)
    #   Mensaje 24 a -890 (15px arriba de ALT)
    #   Pestaña ALT: -905 a -930 (entre UI y Ctrl, a la izquierda)
    #   Mensajes 25 a 29 dentro de ALT (N=25 a 29, Y ≈ -925 a -1065)
    #   Mensaje 25 va de Ctrl a Suscrip (X >= 440, a la derecha de la pestaña)
    #   Fondo de ALT a -1080 (15px debajo de Mensaje 29)
    # - Mensaje 30 (N=30) a -1100 (UI -> Actor, fuera de ALT)
    # - Lifelines Bottom: -1160

    $layout = @(
        @{ Id = $idOpt1;     L = 210;  T = -415;  R = 1350; B = -660;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idAlt1;     L = 210;  T = -905;  R = 1350; B = -1080; Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;    L = 60;   T = -50;   R = 150;  B = -1160; Seq = 10; Style = "" },
        @{ Id = $idUI;       L = 230;  T = -50;   R = 350;  B = -1160; Seq = 11; Style = "" },
        @{ Id = $idCtrl;     L = 440;  T = -50;   R = 560;  B = -1160; Seq = 12; Style = "" },
        @{ Id = $idSuscrip;  L = 650;  T = -50;   R = 760;  B = -1160; Seq = 13; Style = "" },
        @{ Id = $idPlan;     L = 840;  T = -50;   R = 950;  B = -1160; Seq = 14; Style = "" },
        @{ Id = $idSucursal; L = 1030; T = -50;   R = 1140; B = -1160; Seq = 15; Style = "" },
        @{ Id = $idBitacora; L = 1220; T = -50;   R = 1330; B = -1160; Seq = 16; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU03." -ForegroundColor Green

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

    # Bloque 1: Consulta Inicial de Estado de Cuenta (Seq 1 a 10)
    Add-SeqMessage $idActor    $idUI       "1. consultarEstadoSuscripcion()" 1 "Call" | Out-Null
    Add-SeqMessage $idUI       $idCtrl     "2. obtenerEstadoCuenta(empresa_id)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idSuscrip  "3. findByEmpresaId(empresa_id)" 3 "Call" | Out-Null
    Add-SeqMessage $idSuscrip  $idCtrl     "4. suscripcion: Suscripcion (plan_id, vigencia)" 4 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idPlan     "5. getPlanDetails(plan_id)" 5 "Call" | Out-Null
    Add-SeqMessage $idPlan     $idCtrl     "6. plan: PlanSuscripcion (limiteSucursales)" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idSucursal "7. contarSucursalesActivas(empresa_id)" 7 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "8. sucursalesActivas: int()" 8 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "9. 200 OK (estadoCuentaDetalle)" 9 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "10. mostrarEstadoCuenta(plan, vigencia, sucursales)" 10 "Return" | Out-Null

    # Bloque 2: Solicitud de Renovacion Anual (Seq 11 a 18)
    Add-SeqMessage $idActor    $idUI       "11. solicitarRenovacionPeriodo()" 11 "Call" | Out-Null
    
    # Dentro de OPT [renovacion_solicitada == true] (Seq 12 a 17)
    Add-SeqMessage $idUI       $idCtrl     "12. procesarRenovacion(empresa_id)" 12 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idSuscrip  "13. extenderVigenciaPeriodo(365_dias)" 13 "Call" | Out-Null
    Add-SeqMessage $idSuscrip  $idCtrl     "14. suscripcionRenovada: Suscripcion (fecha_fin, estado='ACTIVA')" 14 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "15. registrarAuditoria('RENOVACION_SUSCRIPCION', empresa_id)" 15 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl     "16. confirmacionAuditoria: bool()" 16 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "17. 200 OK (renovacionExitosa)" 17 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "18. mostrarConfirmacionRenovacion('Suscripcion extendida por 365 dias')" 18 "Return" | Out-Null

    # Bloque 3: Solicitud y Validaciones Previas de Cambio de Plan (Seq 19 a 24)
    Add-SeqMessage $idActor    $idUI       "19. solicitarCambioPlan(nuevo_plan_id)" 19 "Call" | Out-Null
    Add-SeqMessage $idUI       $idCtrl     "20. procesarCambioPlan(empresa_id, nuevo_plan_id)" 20 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idPlan     "21. validarPlanActivo(nuevo_plan_id)" 21 "Call" | Out-Null
    Add-SeqMessage $idPlan     $idCtrl     "22. planValido: bool()" 22 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idSucursal "23. verificarCuotaSucursales(actuales, limite)" 23 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "24. cuotaValida: bool()" 24 "Return" | Out-Null

    # Bloque 3b: Dentro de ALT [cuotaValida == true && planValido == true] (Seq 25 a 29)
    Add-SeqMessage $idCtrl     $idSuscrip  "25. actualizarPlanId(nuevo_plan_id)" 25 "Call" | Out-Null
    Add-SeqMessage $idSuscrip  $idCtrl     "26. suscripcionActualizada: Suscripcion (nuevo_plan_id)" 26 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "27. registrarAuditoria('CAMBIO_PLAN_MIGRACION', nuevo_plan_id)" 27 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl     "28. auditoriaRegistrada: bool()" 28 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "29. 200 OK (cambioPlanConfirmado)" 29 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "30. notificarResultadoCambio('Migracion de plan aplicada exitosamente')" 30 "Return" | Out-Null

    Write-Host "30 mensajes de secuencia creados exitosamente para CU03." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU03 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU03 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
