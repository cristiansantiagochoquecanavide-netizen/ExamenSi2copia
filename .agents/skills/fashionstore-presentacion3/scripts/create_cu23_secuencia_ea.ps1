# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU23 (ENTERPRISE ARCHITECT)
# CU23: Entrenar y Evaluar Modelos de Machine Learning
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# Paquete: Paquete 48 (3.3. Diagramas de secuencia (P3)) - Diagram_ID: 75
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15920050, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         ALT [permite_ia == true && registrosHistoricos >= 30] inicia en UI (L=220) hacia Entidades (R=1530)
#         LOOP [k en 2..6 (K-Means++)] anidado en Controller hacia ModeloAnaliticoML (L=450 a R=1250)
#         CERO COLISIONES: Coordenadas analiticas calibradas con precision milimetrica

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU23_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU23 con calibracion milimetrica en: $eapPath" -ForegroundColor Cyan
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
function Ensure-LifelineObject([string]$name, [string]$type, [int]$pkgId, [int]$backColor = 15920050) {
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
    $pkgId = 48 # Paquete 48: 3.3. Diagramas de secuencia (P3)
    $diagId = 75
    $diagName = "Diagrama de secuencia CU23"

    # Verificar o asegurar diagrama
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE Diagram_ID = $diagId"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        Write-Host "Limpiando diagrama existente (ID: $diagId)..." -ForegroundColor Yellow
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "UPDATE t_diagram SET [Name] = '$diagName', [Package_ID] = $pkgId, [Orientation] = 'L', [cx] = 2200, [cy] = 1400 WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
    } else {
        $diagId = Get-NextId "t_diagram" "Diagram_ID"
        $diagGuid = New-GuidStr
        $cmd.CommandText = @"
INSERT INTO t_diagram (
    [Diagram_ID], [Package_ID], [Name], [Version], [Author], [ShowDetails], 
    [Notes], [Stereotype], [ea_guid], [Diagram_Type], [Orientation], [cx], [cy]
) VALUES (
    $diagId, $pkgId, '$diagName', '1.0', 'Antigravity', 0, 
    'Diagrama de secuencia UML 2.5 para CU23: Entrenar y Evaluar Modelos de Machine Learning', '', '$diagGuid', 'Sequence', 'L', 2200, 1400
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU23 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar conectores huerfanos con DiagID=0 de CU23
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%solicitarEntrenamiento%' OR Name LIKE '%ejecutarPipelineML%' OR Name LIKE '%validarVolumen%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Clases y Robustez 72: SIN adaptadores externos)
    $idActor       = Ensure-LifelineObject "SuperAdministrador Tenant" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI          = Ensure-LifelineObject "UI_PanelControlModelosML" "Sequence" $pkgId 15920050 # Light Cyan (#B2EBF2)
    $idCtrl        = Ensure-LifelineObject "EntrenamientoModelosMLController" "Sequence" $pkgId 15920050
    $idVenta       = Ensure-LifelineObject "Venta" "Sequence" $pkgId 15920050
    $idStock       = Ensure-LifelineObject "InventarioStock" "Sequence" $pkgId 15920050
    $idModelo      = Ensure-LifelineObject "ModeloAnaliticoML" "Sequence" $pkgId 15920050
    $idBitacora    = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15920050

    # Crear fragmentos combinados transparentes:
    # 1. ALT: Si el plan habilita analitica y hay masa critica de datos [permite_ia == true && registrosHistoricos >= 30]
    $idAlt1  = Ensure-FragmentObject "[permite_ia == true && registrosHistoricos >= 30]" "alt" $pkgId 0
    # 2. LOOP: Iteracion de evaluacion de clusters y curva de codo [k en 2..6 (K-Means++)]
    $idLoop1 = Ensure-FragmentObject "[k en 2..6 (K-Means++)]" "loop" $pkgId 4

    # Coordenadas calibradas con precision analitica (Formula: Y(N) = -(93.3 + N * 35.2)):
    # - Participantes: 7 líneas de vida distribuidas equidistantemente de X=60 a X=1510.
    # - Actor: L=60, R=150 (Fuera de ALT y LOOP, a la izquierda).
    # - ALT 1: Inicia en UI (L=220) hasta Bitácora (R=1530). Top = -250, Bottom = -755.
    #   Msg 4 a -234.1 (15.9 EA arriba), Msg 5 a -269.3 (debajo de pestaña).
    #   Mensajes 5 a 18 dentro de ALT (N=5..18, Y ≈ -269 a -727).
    # - LOOP 1: Inicia en Controller (L=450) hasta ModeloAnaliticoML (R=1250). Top = -460, Bottom = -530.
    #   Msg 10 a -445.3 (14.7 EA arriba de Top=-460).
    #   Pestaña [k en 2..6 (K-Means++)] a X: 450..630 (de -460 a -475).
    #   Msg 11 a -480.5 (Controller -> Modelo, 5.5 EA abajo de pestaña).
    #   Msg 12 a -515.7 (Modelo -> Controller, 14.3 EA arriba de Bottom=-530).
    #   Msg 13 a -550.9 (20.9 EA abajo de Bottom=-530).
    # - Msg 18 a -726.9 (UI -> Actor, 28.1 EA arriba de Bottom=-755).
    # - Lifelines Bottom: -790.

    $cyanStyle = "BCol=15920050;BFmt=0;LCol=9405184;"
    $actStyle  = "BCol=12975871;BFmt=0;LCol=9405184;"

    $layout = @(
        @{ Id = $idAlt1;      L = 220;  T = -250;  R = 1530; B = -755;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idLoop1;     L = 450;  T = -460;  R = 1250; B = -530;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;     L = 60;   T = -50;   R = 150;  B = -790;  Seq = 10; Style = $actStyle },
        @{ Id = $idUI;        L = 240;  T = -50;   R = 360;  B = -790;  Seq = 11; Style = $cyanStyle },
        @{ Id = $idCtrl;      L = 470;  T = -50;   R = 590;  B = -790;  Seq = 12; Style = $cyanStyle },
        @{ Id = $idVenta;     L = 700;  T = -50;   R = 820;  B = -790;  Seq = 13; Style = $cyanStyle },
        @{ Id = $idStock;     L = 930;  T = -50;   R = 1050; B = -790;  Seq = 14; Style = $cyanStyle },
        @{ Id = $idModelo;    L = 1160; T = -50;   R = 1280; B = -790;  Seq = 15; Style = $cyanStyle },
        @{ Id = $idBitacora;  L = 1390; T = -50;   R = 1510; B = -790;  Seq = 16; Style = $cyanStyle }
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
    Write-Host "Participantes rectangulares y fragmentos calibrados colocados para CU23." -ForegroundColor Green

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

    # =========================================================================
    # BLOQUE 1: Peticion de Pipeline ML y Validacion de Masa Critica (Seq 1 a 4) - Pre-validacion
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "1. solicitarEntrenamientoModelos(algoritmo, num_clusters)" 1 "Call" | Out-Null
    Add-SeqMessage $idUI          $idCtrl        "2. ejecutarPipelineML(tenant_id, algoritmo, k)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idVenta       "3. validarVolumenTransacciones(tenant_id, min_registros=30)" 3 "Call" | Out-Null
    Add-SeqMessage $idVenta       $idCtrl        "4. volumenValido: bool(totalTransacciones >= 30)" 4 "Return" | Out-Null

    # =========================================================================
    # BLOQUE 2: Dentro de ALT [permite_ia == true && registrosHistoricos >= 30] (Seq 5 a 18)
    # =========================================================================
    # Fase 2.1: Modelo Supervisado (Prediccion Demanda de Stock)
    Add-SeqMessage $idCtrl        $idVenta       "5. extraerDatasetHistorico(tenant_id, dias=90)" 5 "Call" | Out-Null
    Add-SeqMessage $idVenta       $idCtrl        "6. datasetVentas: List[VentaItem]()" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idStock       "7. consultarStockDisponiblePorSucursal(tenant_id)" 7 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "8. stockActual: List[InventarioStockItem]()" 8 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idModelo      "9. persistirModeloSupervisado(tenant_id, 'RANDOM_FOREST', R2, MAE, RMSE)" 9 "Call" | Out-Null
    Add-SeqMessage $idModelo      $idCtrl        "10. modeloSupervisadoId: int(id)" 10 "Return" | Out-Null

    # Fase 2.2: Modelo No Supervisado (Segmentacion RFM) con LOOP K-Means++
    Add-SeqMessage $idCtrl        $idModelo      "11. evaluarInerciaWCSS(k, X_rfm, num_clusters)" 11 "Call" | Out-Null
    Add-SeqMessage $idModelo      $idCtrl        "12. metricaCluster: Dict(k, wcss, silhouette_score)" 12 "Return"
    # Fin LOOP

    Add-SeqMessage $idCtrl        $idModelo      "13. persistirModeloNoSupervisado(tenant_id, 'KMEANS_RFM', silhouette, wcss)" 13 "Call" | Out-Null
    Add-SeqMessage $idModelo      $idCtrl        "14. modeloNoSupervisadoId: int(id)" 14 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "15. registrarAuditoria('ENTRENAMIENTO_MODELOS_ML', tenant_id)" 15 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "16. auditoriaRegistrada: bool()" 16 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "17. 200 OK (modeloSupervisadoId, modeloNoSupervisadoId, metricas)" 17 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "18. renderizarCurvasR2ScatterRFMYTablaStock(metricas)" 18 "Return" | Out-Null
    # Fin ALT

    Write-Host "18 mensajes de secuencia creados exitosamente para CU23." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU23 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU23 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
