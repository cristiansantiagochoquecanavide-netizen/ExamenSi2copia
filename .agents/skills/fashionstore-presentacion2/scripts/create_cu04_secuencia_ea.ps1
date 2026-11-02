# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU04 (ENTERPRISE ARCHITECT)
# CU04: Administrar Sucursales con Control de Limites (SaaS Multitenant / RN08)
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         LOOP inicia estrictamente en Controlador (L=440) hacia Entidades
#         ALT y OPT inician en UI (L=210) hacia Entidades
#         Separacion en cuadros diferentes para loop, alt y opt
#         CERO COLISIONES: Margenes milimetricos y organizacion impecable

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU04_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU04 en archivo EA: $eapPath" -ForegroundColor Cyan
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
    $diagName = "Diagrama de secuencia CU04"

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
    'Diagrama de secuencia UML 2.5 para CU04: Administrar Sucursales con Control de Limites', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU04 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar cualquier conector huerfano con DiagID=0
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%solicitarListadoSucursales%' OR Name LIKE '%registrarNuevaSucursal%' OR Name LIKE '%desactivarSucursal%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Robustez 53)
    $idActor    = Ensure-LifelineObject "Administrador del Tenant" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI       = Ensure-LifelineObject "UI_GestionSucursales" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl     = Ensure-LifelineObject "SucursalTenantController" "Sequence" $pkgId 15921906
    $idSuscrip  = Ensure-LifelineObject "Suscripcion" "Sequence" $pkgId 15921906
    $idPlan     = Ensure-LifelineObject "PlanSuscripcion" "Sequence" $pkgId 15921906
    $idSucursal = Ensure-LifelineObject "Sucursal" "Sequence" $pkgId 15921906
    $idCiudad   = Ensure-LifelineObject "Ciudad" "Sequence" $pkgId 15921906
    $idBitacora = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # Crear fragmentos
    $idLoop1 = Ensure-FragmentObject "[para cada sucursal en rows]" "loop" $pkgId 4 # NType=4 (loop)
    $idAlt1  = Ensure-FragmentObject "[sucursalesActivas < limiteSucursales]" "alt" $pkgId 0  # NType=0 (alt)
    $idOpt1  = Ensure-FragmentObject "[bajaSucursal]" "opt" $pkgId 1                          # NType=1 (opt)

    # Layout horizontal:
    # Actor:      L=60,   R=150
    # UI:         L=230,  R=350
    # Ctrl:       L=440,  R=560
    # Suscrip:    L=640,  R=750
    # Plan:       L=820,  R=930
    # Sucursal:   L=1000, R=1110
    # Ciudad:     L=1180, R=1290
    # Bitacora:   L=1360, R=1470
    #
    # Coordenadas verticales milimetricas y organizadas (Y(N) = -(50 + N * 35)):
    # - LOOP: Inicia en Controlador (L=440) a Ciudad (R=1300). Top=-210, Bottom=-385
    #   Cubre mensajes 5 a 8 (N=5 a 8, Y ≈ -225 a -330)
    #   Mensaje 4 a -190 (20px arriba), Mensaje 9 a -400 (15px abajo)
    # - ALT: Inicia en UI (L=210) a Bitacora (R=1490). Top=-712, Bottom=-995
    #   Cubre mensajes 19 a 26 (N=19 a 26, Y ≈ -730 a -975)
    #   Mensaje 18 a -695 (17px arriba), Mensaje 26 dentro a -975 (20px arriba de fondo)
    # - Gap amplio entre ALT y OPT: 55px (de -995 a -1050)
    #   Mensaje 27 a -1030 viaja libre en el gap entre ambos marcos (20px arriba de OPT)
    # - OPT: Inicia en UI (L=210) a Bitacora (R=1490). Top=-1050, Bottom=-1315
    #   Pestaña corta [bajaSucursal] termina antes de X=290, libre de Mensaje 28
    #   Cubre mensajes 28 a 34 (N=28 a 34, Y ≈ -1070 a -1290)
    # - Lifelines Bottom: -1360

    $layout = @(
        @{ Id = $idLoop1;    L = 440;  T = -210;  R = 1300; B = -385;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idAlt1;     L = 210;  T = -712;  R = 1490; B = -995;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;     L = 210;  T = -1050; R = 1490; B = -1315; Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;    L = 60;   T = -50;   R = 150;  B = -1360; Seq = 10; Style = "" },
        @{ Id = $idUI;       L = 230;  T = -50;   R = 350;  B = -1360; Seq = 11; Style = "" },
        @{ Id = $idCtrl;     L = 440;  T = -50;   R = 560;  B = -1360; Seq = 12; Style = "" },
        @{ Id = $idSuscrip;  L = 640;  T = -50;   R = 750;  B = -1360; Seq = 13; Style = "" },
        @{ Id = $idPlan;     L = 820;  T = -50;   R = 930;  B = -1360; Seq = 14; Style = "" },
        @{ Id = $idSucursal; L = 1000; T = -50;   R = 1110; B = -1360; Seq = 15; Style = "" },
        @{ Id = $idCiudad;   L = 1180; T = -50;   R = 1290; B = -1360; Seq = 16; Style = "" },
        @{ Id = $idBitacora; L = 1360; T = -50;   R = 1470; B = -1360; Seq = 17; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU04." -ForegroundColor Green

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

    # Bloque 1: Listado de Sucursales con LOOP (Seq 1 a 10)
    Add-SeqMessage $idActor    $idUI       "1. solicitarListadoSucursales()" 1 "Call" | Out-Null
    Add-SeqMessage $idUI       $idCtrl     "2. listarSucursalesTenant(tenant_id)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idSucursal "3. findByEmpresaId(empresa_id)" 3 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "4. rows: List[Sucursal]()" 4 "Return" | Out-Null

    # Dentro de LOOP [para cada sucursal en rows] (Inicia en Ctrl L=440)
    Add-SeqMessage $idCtrl     $idSucursal "5. getDetallesSucursal()" 5 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "6. datosSucursal: Sucursal()" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idCiudad   "7. getCiudadNombre(ciudad_id)" 7 "Call" | Out-Null
    Add-SeqMessage $idCiudad   $idCtrl     "8. ciudadNombre: str()" 8 "Return" | Out-Null
    # Fin LOOP

    Add-SeqMessage $idCtrl     $idUI       "9. 200 OK (listaSucursales)" 9 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "10. mostrarListadoSucursales(listaSucursales)" 10 "Return" | Out-Null

    # Bloque 2: Registro de Sucursal y Validacion de Limites (Seq 11 a 18)
    Add-SeqMessage $idActor    $idUI       "11. registrarNuevaSucursal(datosSucursal)" 11 "Call" | Out-Null
    Add-SeqMessage $idUI       $idCtrl     "12. procesarRegistroSucursal(datosSucursal)" 12 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idSuscrip  "13. obtenerSuscripcionActiva(empresa_id)" 13 "Call" | Out-Null
    Add-SeqMessage $idSuscrip  $idCtrl     "14. suscripcionActiva: Suscripcion (plan_id)" 14 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idPlan     "15. consultarLimiteSucursales(plan_id)" 15 "Call" | Out-Null
    Add-SeqMessage $idPlan     $idCtrl     "16. limiteSucursales: int()" 16 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idSucursal "17. contarSucursalesActivas(empresa_id)" 17 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "18. sucursalesActivas: int()" 18 "Return" | Out-Null

    # Bloque 2b: Dentro de ALT [sucursalesActivas < limiteSucursales] (Seq 19 a 26)
    Add-SeqMessage $idCtrl     $idCiudad   "19. resolverCiudadId(nombreCiudad)" 19 "Call" | Out-Null
    Add-SeqMessage $idCiudad   $idCtrl     "20. ciudadId: int()" 20 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idSucursal "21. crearRegistroSucursal(datos, ciudadId)" 21 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "22. nuevaSucursal: Sucursal (id, activo=true)" 22 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "23. registrarAuditoria('ALTA_SUCURSAL', nuevaSucursal.id)" 23 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl     "24. auditoriaRegistrada: bool()" 24 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "25. 201 Created (nuevaSucursal)" 25 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "26. mostrarExito('Sucursal registrada exitosamente')" 26 "Return" | Out-Null
    # Fin ALT

    # Bloque 3: Desactivacion de Sucursal y Liberacion de Cuota (Seq 27 a 34)
    Add-SeqMessage $idActor    $idUI       "27. desactivarSucursal(sucursal_id)" 27 "Call" | Out-Null
    
    # Dentro de OPT [desactivar_sucursal == true]
    Add-SeqMessage $idUI       $idCtrl     "28. procesarBajaSucursal(sucursal_id)" 28 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idSucursal "29. setActivo(false)" 29 "Call" | Out-Null
    Add-SeqMessage $idSucursal $idCtrl     "30. sucursalDesactivada: bool()" 30 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "31. registrarAuditoria('DESACTIVAR_SUCURSAL', sucursal_id)" 31 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl     "32. confirmacionAuditoria: bool()" 32 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "33. 200 OK (sucursalDesactivada)" 33 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "34. mostrarConfirmacion('Sucursal desactivada, cuota liberada')" 34 "Return" | Out-Null
    # Fin OPT

    Write-Host "34 mensajes de secuencia creados exitosamente para CU04." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU04 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU04 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
