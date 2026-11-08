# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU22 (ENTERPRISE ARCHITECT)
# CU22: Exportar Reportes Dinámicos de IA (PDF / Excel)
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# Paquete: Paquete 48 (3.3. Diagramas de secuencia (P3)) - Diagram_ID: 74
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15920050, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         ALT [reporte.empresa_id == tenant.empresa_id] inicia en UI (L=220) hacia Entidades (R=1360)
#         OPT [exportarExcel == true] inicia en UI (L=220) hacia Entidades (R=1360)
#         CERO COLISIONES: Coordenadas analiticas calibradas con precision milimetrica

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU22_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU22 con calibracion milimetrica en: $eapPath" -ForegroundColor Cyan
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
    $diagId = 74
    $diagName = "Diagrama de secuencia CU22"

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
    'Diagrama de secuencia UML 2.5 para CU22: Exportar Reportes Dinamicos de IA (PDF / Excel)', '', '$diagGuid', 'Sequence', 'L', 2200, 1400
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU22 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar conectores huerfanos con DiagID=0 de CU22
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%clicExportar%' OR Name LIKE '%exportarReporte%' OR Name LIKE '%obtenerDatosMembrete%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Clases y Robustez 71: SIN adaptadores externos)
    $idActor       = Ensure-LifelineObject "SuperAdministrador Tenant" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI          = Ensure-LifelineObject "UI_VisorReportesExportacion" "Sequence" $pkgId 15920050 # Light Cyan (#B2EBF2)
    $idCtrl        = Ensure-LifelineObject "ExportadorReportesIAController" "Sequence" $pkgId 15920050
    $idEmpresa     = Ensure-LifelineObject "Empresa" "Sequence" $pkgId 15920050
    $idReporte     = Ensure-LifelineObject "ReporteGenerativoIA" "Sequence" $pkgId 15920050
    $idBitacora    = Ensure-LifelineObject "BitacoraAuditoria" "Sequence" $pkgId 15920050

    # Crear fragmentos combinados transparentes:
    # 1. ALT: Si el reporte pertenece al tenant autenticado [reporte.empresa_id == tenant.empresa_id]
    $idAlt1  = Ensure-FragmentObject "[reporte.empresa_id == tenant.empresa_id]" "alt" $pkgId 0
    # 2. OPT: Exportacion alternativa a libro Excel [exportarExcel == true]
    $idOpt1  = Ensure-FragmentObject "[exportarExcel == true]" "opt" $pkgId 1

    # Coordenadas calibradas con precision analitica (Formula: Y(N) = -(93.3 + N * 35.2)):
    # - Participantes: 6 líneas de vida distribuidas equidistantemente de X=60 a X=1330.
    # - Actor: L=60, R=150 (Fuera de ALT y OPT, a la izquierda).
    # - ALT 1: Inicia en UI (L=220) hasta Bitácora (R=1360). Top = -250, Bottom = -530.
    #   Msg 4 a -234.1 (15.9 EA arriba), Msg 5 a -269.3 (debajo de pestaña).
    #   Mensajes 5 a 12 dentro de ALT (N=5..12, Y ≈ -269 a -516).
    #   Msg 12 a -515.7 (14.3 EA arriba de Bottom=-530).
    # - Msg 13 en GAP LIBRE: Y = -550.9 (clicExportarExcel Actor -> UI).
    # - OPT 1: Inicia estrictamente en UI (L=220) hasta Bitácora (R=1360). Top = -560, Bottom = -755.
    #   Msg 13 queda 9.1 EA units ARRIBA del Top de OPT (-560).
    #   Pestaña compacta [exportarExcel == true] a X: 220..360 (de -560 a -575).
    #   Msg 14 a -586.1 (UI -> Ctrl, 11.1 EA abajo de la pestaña).
    #   Mensajes 14 a 18 dentro de OPT (N=14..18, Y ≈ -586 a -727).
    #   Msg 18 a -726.9 (UI -> Actor, 28.1 EA arriba de Bottom=-755).
    # - Lifelines Bottom: -790.

    $cyanStyle = "BCol=15920050;BFmt=0;LCol=9405184;"
    $actStyle  = "BCol=12975871;BFmt=0;LCol=9405184;"

    $layout = @(
        @{ Id = $idAlt1;      L = 220;  T = -250;  R = 1360; B = -530;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;      L = 220;  T = -560;  R = 1360; B = -755;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;     L = 60;   T = -50;   R = 150;  B = -790;  Seq = 10; Style = $actStyle },
        @{ Id = $idUI;        L = 250;  T = -50;   R = 370;  B = -790;  Seq = 11; Style = $cyanStyle },
        @{ Id = $idCtrl;      L = 490;  T = -50;   R = 610;  B = -790;  Seq = 12; Style = $cyanStyle },
        @{ Id = $idEmpresa;   L = 730;  T = -50;   R = 850;  B = -790;  Seq = 13; Style = $cyanStyle },
        @{ Id = $idReporte;   L = 970;  T = -50;   R = 1090; B = -790;  Seq = 14; Style = $cyanStyle },
        @{ Id = $idBitacora;  L = 1210; T = -50;   R = 1330; B = -790;  Seq = 15; Style = $cyanStyle }
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
    Write-Host "Participantes rectangulares y fragmentos calibrados colocados para CU22." -ForegroundColor Green

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
    # BLOQUE 1: Peticion de Exportacion PDF y Carga de Membrete (Seq 1 a 4) - Pre-validacion
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "1. clicExportarPDF(reporte_id)" 1 "Call" | Out-Null
    Add-SeqMessage $idUI          $idCtrl        "2. exportarReportePDF(reporte_id, tenant_id)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idEmpresa     "3. obtenerDatosMembreteTenant(tenant_id)" 3 "Call" | Out-Null
    Add-SeqMessage $idEmpresa     $idCtrl        "4. empresaInfo: Empresa(razon_social, nit)" 4 "Return" | Out-Null

    # =========================================================================
    # BLOQUE 2: Dentro de ALT [reporte.empresa_id == tenant.empresa_id] (Seq 5 a 12)
    # =========================================================================
    Add-SeqMessage $idCtrl        $idReporte     "5. obtenerReporteHidratado(reporte_id, tenant_id)" 5 "Call" | Out-Null
    Add-SeqMessage $idReporte     $idCtrl        "6. datosReporte: ReporteGenerativoIA(datosTabulares, resumen)" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idReporte     "7. actualizarFormatoExportacion(reporte_id, 'PDF')" 7 "Call" | Out-Null
    Add-SeqMessage $idReporte     $idCtrl        "8. formatoActualizado: bool()" 8 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "9. registrarAuditoria('DESCARGA_PDF', reporte_id)" 9 "Call" | Out-Null
    Add-SeqMessage $idBitacora    $idCtrl        "10. auditoriaRegistrada: bool()" 10 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "11. 200 OK StreamingResponse(blobPDF, filename)" 11 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "12. descargarArchivoPDF(Reporte_IA.pdf)" 12 "Return" | Out-Null
    # Fin ALT

    # =========================================================================
    # BLOQUE 3: Subflujo Opcional de Exportacion a Excel (Seq 13 a 18)
    # =========================================================================
    # Accion del usuario en el GAP LIBRE:
    Add-SeqMessage $idActor       $idUI          "13. clicExportarExcel(reporte_id)" 13 "Call" | Out-Null

    # Dentro de OPT [exportarExcel == true] (Inicia en UI y cubre hasta BitacoraAuditoria):
    Add-SeqMessage $idUI          $idCtrl        "14. exportarReporteExcel(reporte_id, tenant_id)" 14 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idReporte     "15. actualizarFormatoExportacion(reporte_id, 'EXCEL')" 15 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idBitacora    "16. registrarAuditoria('DESCARGA_EXCEL', reporte_id)" 16 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "17. 200 OK StreamingResponse(blobXLSX, filename)" 17 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "18. descargarArchivoExcel(Reporte_IA.xlsx)" 18 "Return" | Out-Null
    # Fin OPT

    Write-Host "18 mensajes de secuencia creados exitosamente para CU22." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU22 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU22 exportado exitosamente a: $outPng" -ForegroundColor Green
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
