# ==============================================================================
# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU01 (ENTERPRISE ARCHITECT)
# CU01: Administrar Planes de Suscripción (SaaS Multitenant)
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         NType: 0=alt, 4=loop, 1=opt
#         ALT y OPT cubren desde UI (L=220) hasta las Entidades
#         CERO COLISIONES: Márgenes milimétricos entre pestañas y flechas de mensajes
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU01_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU01 en archivo EA: $eapPath" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

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

# Asegurar objeto con rectangulo puro (Stereotype = '')
function Ensure-LifelineObject([string]$name, [string]$type, [int]$pkgId, [int]$backColor = 15921906) {
    $escName = $name.Replace("'", "''")
    $cmd = $conn.CreateCommand()
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
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor], 
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract], 
    [Scope], [Stereotype], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, '$type', 0, '$escName', 'Grupo 6', '1.0',
    $pkgId, '1', $backColor, 1, 0,
    9405184, NOW(), NOW(), 'Proposed', '0',
    'Public', '', '$guid', 0, False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $objId
}

# Asegurar fragmento con NType correcto (0=alt, 1=opt, 4=loop)
function Ensure-FragmentObject([string]$name, [string]$stereo, [int]$ntype, [int]$pkgId) {
    $escName = $name.Replace("'", "''")
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$escName' AND Package_ID = $pkgId"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $objId = [int]$val
        $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '$stereo', [NType] = $ntype, [Backcolor] = -1, [Bordercolor] = 5104464 WHERE Object_ID = $objId"
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }
    $objId = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version], 
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor], 
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract], 
    [Scope], [Stereotype], [NType], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $objId, 'InteractionFragment', 0, '$escName', 'Grupo 6', '1.0',
    $pkgId, '1', -1, 1, 0,
    5104464, NOW(), NOW(), 'Proposed', '0',
    'Public', '$stereo', $ntype, '$guid', 0, False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $objId
}

try {
    $pkgId = 14 # 3.3. Diagramas de secuencia (P2)
    $diagName = "Diagrama de secuencia CU01"

    # 1. Obtener o crear diagrama
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
    $diagId, $pkgId, 0, 'Sequence', '$diagName', '1.0', 'Grupo 6',
    0, True, True, True, 'L', 2400, 1600, 100,
    NOW(), NOW(), True, True, True,
    False, '$diagGuid'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Creado diagrama: $diagName (ID: $diagId)" -ForegroundColor Green
    } else {
        Write-Host "Limpiando diagrama existente (ID: $diagId)..." -ForegroundColor Yellow
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # 2. Participantes rectangulares (Stereotype vacio, Backcolor celeste claro 15921906)
    $idActor    = Ensure-LifelineObject "Superadministrador SaaS" "Actor" $pkgId 16773824
    $idUI       = Ensure-LifelineObject "UI_GestionPlanesSaaS" "Sequence" $pkgId 15921906
    $idCtrl     = Ensure-LifelineObject "PlanSuscripcionController" "Sequence" $pkgId 15921906
    $idPlan     = Ensure-LifelineObject "PlanSuscripcion" "Sequence" $pkgId 15921906
    $idSuscrip  = Ensure-LifelineObject "Suscripcion" "Sequence" $pkgId 15921906
    $idBitacora = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15921906

    # 3. Fragmentos combinados con NType exacto:
    $idAlt1 = Ensure-FragmentObject "[codigoDisponible == true && limiteSucursales > 0]" "alt" 0 $pkgId
    $idOpt1 = Ensure-FragmentObject "[inhabilitar_plan == true]" "opt" 1 $pkgId

    # Posicionamiento horizontal:
    # Actor:      L=60, R=150
    # UI:         L=240, R=370
    # Ctrl:       L=460, R=590
    # Plan:       L=680, R=790
    # Suscrip:    L=890, R=1000
    # Bitacora:   L=1100, R=1210
    #
    # Coordenadas verticales sin colisiones:
    # - ALT: Inicia en UI (L=220) a Bitacora (R=1220). Top=-445, Bottom=-665
    # - OPT: Inicia en UI (L=220) a Bitacora (R=1220). Top=-700, Bottom=-960

    $layout = @(
        @{ Id = $idAlt1;     L = 220;  T = -445; R = 1220; B = -665;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;     L = 220;  T = -700; R = 1220; B = -960;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;    L = 60;   T = -50;  R = 150;  B = -1180; Seq = 10; Style = "" },
        @{ Id = $idUI;       L = 240;  T = -50;  R = 370;  B = -1180; Seq = 11; Style = "" },
        @{ Id = $idCtrl;     L = 460;  T = -50;  R = 590;  B = -1180; Seq = 12; Style = "" },
        @{ Id = $idPlan;     L = 680;  T = -50;  R = 790;  B = -1180; Seq = 13; Style = "" },
        @{ Id = $idSuscrip;  L = 890;  T = -50;  R = 1000; B = -1180; Seq = 14; Style = "" },
        @{ Id = $idBitacora; L = 1100; T = -50;  R = 1210; B = -1180; Seq = 15; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos transparentes colocados para CU01." -ForegroundColor Green

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

    # Flujo estricto CU01:
    Add-SeqMessage $idActor $idUI    "1. solicitarGestionPlanes()" 1 "Call" | Out-Null
    Add-SeqMessage $idUI    $idCtrl  "2. listarPlanes()" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl  $idPlan  "3. consultarPlanesDisponibles()" 3 "Call" | Out-Null
    Add-SeqMessage $idPlan  $idCtrl  "4. planes: List[PlanSuscripcion]" 4 "Return" | Out-Null
    Add-SeqMessage $idCtrl  $idUI    "5. 200 OK (planes)" 5 "Return" | Out-Null
    Add-SeqMessage $idUI    $idActor "6. mostrarCatalogoPlanes(planes)" 6 "Return" | Out-Null
    Add-SeqMessage $idActor $idUI    "7. registrarNuevoPlan(datosPlan)" 7 "Call" | Out-Null
    Add-SeqMessage $idUI    $idCtrl  "8. validarYCrearPlan(datosPlan)" 8 "Call" | Out-Null
    Add-SeqMessage $idCtrl  $idPlan  "9. validarUnicidadCodigo(codigo)" 9 "Call" | Out-Null
    Add-SeqMessage $idPlan  $idCtrl  "10. codigoDisponible: bool" 10 "Return" | Out-Null

    # Dentro de ALT:
    Add-SeqMessage $idCtrl     $idPlan     "11. crearPlan(datosPlan)" 11 "Call" | Out-Null
    Add-SeqMessage $idPlan     $idCtrl     "12. nuevoPlan: PlanSuscripcion (id, activo=true)" 12 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "13. registrarAuditoria('CREAR_PLAN', nuevoPlan.id)" 13 "Call" | Out-Null
    Add-SeqMessage $idBitacora $idCtrl     "14. confirmacionAuditoria: bool" 14 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "15. 201 Created (nuevoPlan)" 15 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "16. mostrarExito('Plan de suscripcion registrado exitosamente')" 16 "Return" | Out-Null

    # Dentro de OPT:
    Add-SeqMessage $idActor    $idUI       "17. inhabilitarPlan(plan_id)" 17 "Call" | Out-Null
    Add-SeqMessage $idUI       $idCtrl     "18. procesarInhabilitacion(plan_id)" 18 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idSuscrip  "19. contarEmpresasSuscritasActivas(plan_id)" 19 "Call" | Out-Null
    Add-SeqMessage $idSuscrip  $idCtrl     "20. empresasActivas: int" 20 "Return" | Out-Null
    Add-SeqMessage $idCtrl     $idPlan     "21. inhabilitarPlan(plan_id, activo=false)" 21 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idBitacora "22. registrarAuditoria('INHABILITAR_PLAN', plan_id)" 22 "Call" | Out-Null
    Add-SeqMessage $idCtrl     $idUI       "23. 200 OK (planInhabilitado)" 23 "Return" | Out-Null
    Add-SeqMessage $idUI       $idActor    "24. mostrarConfirmacion('Plan inhabilitado exitosamente')" 24 "Return" | Out-Null

    Write-Host "24 mensajes de secuencia creados exitosamente para CU01." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU01 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU01 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
