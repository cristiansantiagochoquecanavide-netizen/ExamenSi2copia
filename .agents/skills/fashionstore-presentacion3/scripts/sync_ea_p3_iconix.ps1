# ==============================================================================
# SCRIPT INTEGRAL DE SINCRONIZACION ICONIX: PRESENTACION 3 (CU21, CU22, CU23)
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# INF412 - Sistemas de Informacion 2 (MSc. Ing. Angelica Garzon Cuellar)
# Cubre:
#   1. Especificacion y Diagramas de Casos de Uso (CU21, CU22, CU23) en Paquete 2
#   2. Clases ReporteGenerativoIA y ModeloAnaliticoML + Diagrama de Clases P3 (Paquete 12)
#   3. Diagramas de Robustez BCE (CU21, CU22, CU23) en Paquete 44
#   4. Diagramas de Secuencia UML con fragmentos ALT/OPT/LOOP (CU21, CU22, CU23)
#   5. Exportacion PNG automatica mediante EA.App COM y copia al workspace
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$workspaceEap = "c:\Users\HP\Documents\SI2\FashionStore\Examen1-Si2\diagramas_2doparcial.eap"
$exportDir = "C:\Users\HP\Documents\SI2\2doParcial\exports_p3_ea"

if (-not (Test-Path $eapPath)) {
    if (Test-Path $workspaceEap) {
        $eapPath = $workspaceEap
    } else {
        Write-Host "[WARN] No se encontro archivo .eap." -ForegroundColor Yellow
        exit 0
    }
}

New-Item -ItemType Directory -Force -Path $exportDir | Out-Null

Write-Host "Conectando al repositorio Enterprise Architect ($eapPath)..." -ForegroundColor Cyan
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

function Sql-Str([string]$val) {
    if ([string]::IsNullOrWhiteSpace($val)) { return "NULL" }
    return "'" + $val.Replace("'", "''") + "'"
}

function Ensure-Package([string]$name, [int]$parentId) {
    $esc = $name.Replace("'", "''")
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Package_ID FROM t_package WHERE [Name] = '$esc' AND Parent_ID = $parentId"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        return [int]$val
    }
    $pkgId = Get-NextId "t_package" "Package_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_package (
    [Package_ID], [Name], [Parent_ID], [CreatedDate], [ModifiedDate],
    [ea_guid], [IsControlled], [LogXML], [Protected], [UseDTD]
) VALUES (
    $pkgId, '$esc', $parentId, NOW(), NOW(),
    '$guid', False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $pkgId
}

function Ensure-CleanDiagram([int]$pkgId, [string]$name, [string]$diagType, [int]$cx = 2200, [int]$cy = 1400) {
    $esc = $name.Replace("'", "''")
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID, ea_guid FROM t_diagram WHERE [Name] = '$esc' AND Package_ID = $pkgId"
    $r = $cmd.ExecuteReader()
    $diagId = 0
    $guid = ""
    if ($r.Read()) {
        $diagId = [int]$r["Diagram_ID"]
        $guid = [string]$r["ea_guid"]
    }
    $r.Close()

    if ($diagId -eq 0) {
        $diagId = Get-NextId "t_diagram" "Diagram_ID"
        $guid = New-GuidStr
        $cmd.CommandText = @"
INSERT INTO t_diagram (
    [Diagram_ID], [Package_ID], [ParentID], [Diagram_Type], [Name], [Version], [Author],
    [ShowDetails], [AttPub], [AttPri], [AttPro], [Orientation], [cx], [cy], [Scale],
    [CreatedDate], [ModifiedDate], [ShowForeign], [ShowBorder], [ShowPackageContents],
    [Locked], [ea_guid]
) VALUES (
    $diagId, $pkgId, 0, '$diagType', '$esc', '3.0', 'Grupo 6',
    0, True, True, True, 'L', $cx, $cy, 100,
    NOW(), NOW(), True, True, True,
    False, '$guid'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
    } else {
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagId"
        $cmd.ExecuteNonQuery() | Out-Null
        if ($diagType -eq "Sequence") {
            $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = $diagId"
            $cmd.ExecuteNonQuery() | Out-Null
        }
    }
    return @{ Id = $diagId; Guid = $guid }
}

function Ensure-Element([string]$name, [string]$objType, [string]$stereo, [int]$pkgId, [string]$note = "") {
    $escName = $name.Replace("'", "''")
    $sqlStereo = Sql-Str $stereo
    $sqlNote = Sql-Str $note
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$escName' AND Package_ID = $pkgId AND [Object_Type] = '$objType'"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $oid = [int]$val
        $cmd.CommandText = "UPDATE t_object SET [Stereotype] = $sqlStereo, [Note] = $sqlNote WHERE Object_ID = $oid"
        $cmd.ExecuteNonQuery() | Out-Null
        return $oid
    }
    $oid = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Note], [Author], [Version],
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor],
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract],
    [Scope], [Stereotype], [ea_guid], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $oid, '$objType', 0, '$escName', $sqlNote, 'Grupo 6', '1.0',
    $pkgId, '1', -1, -1, -1,
    -1, NOW(), NOW(), 'Approved', '0',
    'Public', $sqlStereo, '$guid', False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $oid
}

function Place-OnDiagram([int]$diagId, [int]$objId, [int]$l, [int]$t, [int]$r, [int]$b, [int]$seq, [string]$style = "") {
    $instId = Get-NextId "t_diagramobjects" "Instance_ID"
    $sqlStyle = Sql-Str $style
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
INSERT INTO t_diagramobjects (
    [Diagram_ID], [Object_ID], [RectTop], [RectLeft], [RectRight], [RectBottom], [Sequence], [ObjectStyle], [Instance_ID]
) VALUES (
    $diagId, $objId, $t, $l, $r, $b, $seq, $sqlStyle, $instId
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
}

function Add-Attribute([int]$objId, [string]$name, [string]$type, [int]$pos) {
    $attId = Get-NextId "t_attribute" "ID"
    $guid = New-GuidStr
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
INSERT INTO t_attribute (
    [Object_ID], [Name], [Scope], [Containment], [IsStatic], [IsCollection], [IsOrdered],
    [AllowDuplicates], [Derived], [ID], [Pos], [Const], [Type], [ea_guid]
) VALUES (
    $objId, '$name', 'Public', 'Not Specified', 0, 0, 0,
    0, 0, $attId, $pos, 0, '$type', '$guid'
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
}

function Ensure-ConnectorAndLink([int]$diagId, [int]$src, [int]$dst, [string]$connType, [string]$msg, [string]$stereo = "", [string]$srcCard = "", [string]$dstCard = "") {
    $sqlMsg = Sql-Str $msg
    $sqlStereo = Sql-Str $stereo
    $sqlSrcCard = Sql-Str $srcCard
    $sqlDstCard = Sql-Str $dstCard
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Connector_ID FROM t_connector WHERE Start_Object_ID = $src AND End_Object_ID = $dst AND Connector_Type = '$connType'"
    $val = $cmd.ExecuteScalar()
    if ($null -eq $val -or [DBNull]::Value.Equals($val)) {
        $cid = Get-NextId "t_connector" "Connector_ID"
        $guid = New-GuidStr
        $dir = "Source -> Destination"
        $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [Name], [Direction], [Notes], [Connector_Type], [Stereotype],
    [SourceCard], [DestCard], [SourceAccess], [DestAccess],
    [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SourceStyle], [DestStyle]
) VALUES (
    $cid, $sqlMsg, '$dir', $sqlMsg, '$connType', $sqlStereo,
    $sqlSrcCard, $sqlDstCard, 'Public', 'Public',
    $src, $dst, 3, -1,
    '$guid', False, True, False, False, False,
    'Navigable=Unspecified;', 'Navigable=Navigable;'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
    } else {
        $cid = [int]$val
        $cmd.CommandText = "UPDATE t_connector SET [Name] = $sqlMsg, [Notes] = $sqlMsg, [Stereotype] = $sqlStereo, [SourceCard] = $sqlSrcCard, [DestCard] = $sqlDstCard WHERE Connector_ID = $cid"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    $cmd.CommandText = "SELECT COUNT(*) FROM t_diagramlinks WHERE DiagramID = $diagId AND ConnectorID = $cid"
    if ([int]$cmd.ExecuteScalar() -eq 0) {
        $instId = Get-NextId "t_diagramlinks" "Instance_ID"
        $geo = "EDGE=2;=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;"
        $style = "Mode=3;Color=-1;LWidth=0;"
        $cmd.CommandText = "INSERT INTO t_diagramlinks ([DiagramID], [ConnectorID], [Geometry], [Style], [Hidden], [Instance_ID]) VALUES ($diagId, $cid, '$geo', '$style', False, $instId)"
        $cmd.ExecuteNonQuery() | Out-Null
    }
    return $cid
}

function Ensure-Lifeline([string]$name, [string]$type, [int]$pkgId, [int]$backColor = 15921906) {
    $esc = $name.Replace("'", "''")
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$esc' AND Package_ID = $pkgId AND [Object_Type] = '$type'"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $oid = [int]$val
        $cmd.CommandText = "UPDATE t_object SET [Stereotype] = NULL, [Backcolor] = $backColor, [Bordercolor] = 9405184 WHERE Object_ID = $oid"
        $cmd.ExecuteNonQuery() | Out-Null
        return $oid
    }
    $oid = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version],
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor],
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract],
    [Scope], [Stereotype], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $oid, '$type', 0, '$esc', 'Grupo 6', '1.0',
    $pkgId, '1', $backColor, 1, 0,
    9405184, NOW(), NOW(), 'Approved', '0',
    'Public', NULL, '$guid', 0, False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $oid
}

function Ensure-Fragment([string]$name, [string]$stereo, [int]$ntype, [int]$pkgId) {
    $esc = $name.Replace("'", "''")
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$esc' AND Package_ID = $pkgId AND [Object_Type] = 'InteractionFragment'"
    $val = $cmd.ExecuteScalar()
    if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
        $oid = [int]$val
        $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '$stereo', [NType] = $ntype, [Backcolor] = -1, [Bordercolor] = 5104464 WHERE Object_ID = $oid"
        $cmd.ExecuteNonQuery() | Out-Null
        return $oid
    }
    $oid = Get-NextId "t_object" "Object_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_object (
    [Object_ID], [Object_Type], [Diagram_ID], [Name], [Author], [Version],
    [Package_ID], [Complexity], [Backcolor], [BorderWidth], [Fontcolor],
    [Bordercolor], [CreatedDate], [ModifiedDate], [Status], [Abstract],
    [Scope], [Stereotype], [NType], [ea_guid], [Classifier], [IsActive], [IsLeaf], [IsRoot], [IsSpec]
) VALUES (
    $oid, 'InteractionFragment', 0, '$esc', 'Grupo 6', '1.0',
    $pkgId, '1', -1, 1, 0,
    5104464, NOW(), NOW(), 'Approved', '0',
    'Public', '$stereo', $ntype, '$guid', 0, False, False, False, False
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $oid
}

function Add-SeqMsg([int]$diagId, [int]$src, [int]$dst, [string]$msg, [int]$seq, [string]$subType = "Call") {
    $cid = Get-NextId "t_connector" "Connector_ID"
    $guid = New-GuidStr
    $esc = $msg.Replace("'", "''")
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [DiagramID], [Name], [Direction], [Notes], [Connector_Type], [SubType],
    [SourceAccess], [DestAccess], [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SeqNo], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SourceStyle], [DestStyle]
) VALUES (
    $cid, $diagId, '$esc', 'Source -> Destination', '$esc', 'Sequence', '$subType',
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
}

$exportedGuids = @()

try {
    # ==========================================================================
    # 1. CASOS DE USO P3 EN PAQUETE 2 (CU21, CU22, CU23)
    # ==========================================================================
    Write-Host "`n1. Sincronizando Casos de Uso CU21, CU22 y CU23 en Paquete 2..." -ForegroundColor Yellow

    $ucs = @(
        @{
            PkgName = "CU21 - Consultar Reportes por Lenguaje Natural (Texto/Voz)"
            DiagName = "CU21. Consultar Reportes por Lenguaje Natural (Texto/Voz)"
            Actor = "Gerente / Administrador"
            MainUC = "CU21: Consultar Reportes por Lenguaje Natural (Texto/Voz)"
            Note = "Permite al usuario gerencial formular consultas comerciales mediante teclado o dictado de voz (Web Speech API), traducidas por Google Gemini a SQL SELECT de solo lectura con aislamiento multitenant obligatorio (WHERE empresa_id = :tenant_id) y validacion de suscripcion activa (permite_ia = TRUE)."
            Includes = @(
                "Validar Plan de Suscripcion con Acceso IA",
                "Auditar Sentencia SQL Read-Only por Tenant"
            )
            Extends = @(
                "Capturar Dictado por Voz en Espanol"
            )
        },
        @{
            PkgName = "CU22 - Exportar Reportes Dinamicos de IA (PDF / Excel)"
            DiagName = "CU22. Exportar Reportes Dinamicos de IA (PDF / Excel)"
            Actor = "Gerente / Administrador"
            MainUC = "CU22: Exportar Reportes Dinamicos de IA (PDF / Excel)"
            Note = "Transforma los resultados tabulares y la sintesis ejecutiva de un reporte de IA en documentos corporativos PDF (ReportLab Platypus) o libros Excel XLSX con formulas SUM y autofiltros (OpenPyXL), verificando estrictamente la propiedad multitenant del reporte."
            Includes = @(
                "Verificar Propiedad Multitenant del Reporte"
            )
            Extends = @(
                "Generar Documento Ejecutivo PDF (ReportLab)",
                "Generar Libro Corporativo Excel (OpenPyXL)"
            )
        },
        @{
            PkgName = "CU23 - Entrenar y Evaluar Modelos de Machine Learning"
            DiagName = "CU23. Entrenar y Evaluar Modelos de Machine Learning"
            Actor = "Administrador / Analista BI"
            MainUC = "CU23: Entrenar y Evaluar Modelos de Machine Learning"
            Note = "Ejecuta pipelines analiticos aislados por empresa_id: Aprendizaje Supervisado (RandomForestRegressor para Prediccion de Demanda de Stock con MAE, RMSE y R2 >= 0.70) y Aprendizaje No Supervisado (Segmentacion RFM de Clientes con K-Means++, StandardScaler, Silhouette Score > 0.25 e Inercia WCSS)."
            Includes = @(
                "Entrenar Regresor Supervisado de Demanda (MAE, RMSE, R2)",
                "Segmentar Clientes RFM con K-Means (Silhouette, WCSS)"
            )
            Extends = @(
                "Persistir Metricas en ModeloAnaliticoML"
            )
        }
    )

    foreach ($uc in $ucs) {
        $uPkg = Ensure-Package $uc.PkgName 2
        $dInfo = Ensure-CleanDiagram $uPkg $uc.DiagName "Use Case" 1800 1100
        $idAct = Ensure-Element $uc.Actor "Actor" "" $uPkg ""
        $idMain = Ensure-Element $uc.MainUC "UseCase" "" $uPkg $uc.Note

        Place-OnDiagram $dInfo.Id $idAct 90 -180 170 -310 1
        Place-OnDiagram $dInfo.Id $idMain 380 -195 660 -305 2
        Ensure-ConnectorAndLink $dInfo.Id $idAct $idMain "UseCase" "" "" "" "" | Out-Null

        $yTop = -70
        $seqU = 3
        foreach ($inc in $uc.Includes) {
            $idInc = Ensure-Element $inc "UseCase" "" $uPkg ""
            Place-OnDiagram $dInfo.Id $idInc 830 $yTop 1090 ($yTop - 95) $seqU
            Ensure-ConnectorAndLink $dInfo.Id $idMain $idInc "Dependency" "" "include" "" "" | Out-Null
            $yTop -= 130
            $seqU++
        }
        foreach ($ext in $uc.Extends) {
            $idExt = Ensure-Element $ext "UseCase" "" $uPkg ""
            Place-OnDiagram $dInfo.Id $idExt 830 $yTop 1090 ($yTop - 95) $seqU
            Ensure-ConnectorAndLink $dInfo.Id $idExt $idMain "Dependency" "" "extend" "" "" | Out-Null
            $yTop -= 130
            $seqU++
        }
        Write-Host "  [OK] Caso de Uso sincronizado: $($uc.PkgName)" -ForegroundColor Green
    }

    # ==========================================================================
    # 2. CLASES P3 Y DIAGRAMA DE CLASES DEDICADO EN PAQUETE 12
    # ==========================================================================
    Write-Host "`n2. Actualizando ReporteGenerativoIA (126), ModeloAnaliticoML (127) y Diagrama de Clases P3..." -ForegroundColor Yellow

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "UPDATE t_object SET [Name] = 'ReporteGenerativoIA', [Note] = 'Bitacora y persistencia de reportes dinamicos generados por lenguaje natural (Texto/Voz) con Google Gemini y exportacion PDF/Excel (CU21, CU22).' WHERE Object_ID = 126"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "DELETE FROM t_attribute WHERE Object_ID = 126"
    $cmd.ExecuteNonQuery() | Out-Null

    $p = 0
    Add-Attribute 126 "id" "INTEGER [PK]" ($p++)
    Add-Attribute 126 "empresa_id" "INTEGER [FK]" ($p++)
    Add-Attribute 126 "usuario_id" "INTEGER [FK]" ($p++)
    Add-Attribute 126 "prompt_consulta" "TEXT" ($p++)
    Add-Attribute 126 "tipo_entrada" "VARCHAR(20)" ($p++)
    Add-Attribute 126 "sql_generado" "TEXT" ($p++)
    Add-Attribute 126 "respuesta_resumen" "TEXT" ($p++)
    Add-Attribute 126 "formato_exportacion" "VARCHAR(20)" ($p++)
    Add-Attribute 126 "fecha_consulta" "TIMESTAMP" ($p++)

    $cmd.CommandText = "UPDATE t_object SET [Name] = 'ModeloAnaliticoML', [Note] = 'Registro de modelos entrenados de Machine Learning Supervisado (Demanda R2/MAE/RMSE) y No Supervisado (Segmentacion RFM K-Means Silhouette/WCSS) por empresa_id (CU23).' WHERE Object_ID = 127"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "DELETE FROM t_attribute WHERE Object_ID = 127"
    $cmd.ExecuteNonQuery() | Out-Null

    $p = 0
    Add-Attribute 127 "id" "INTEGER [PK]" ($p++)
    Add-Attribute 127 "empresa_id" "INTEGER [FK]" ($p++)
    Add-Attribute 127 "nombre_modelo" "VARCHAR(100)" ($p++)
    Add-Attribute 127 "tipo_aprendizaje" "VARCHAR(50)" ($p++)
    Add-Attribute 127 "variable_objetivo" "VARCHAR(50)" ($p++)
    Add-Attribute 127 "precision_metrica" "NUMERIC(6,4)" ($p++)
    Add-Attribute 127 "parametros_json" "JSON" ($p++)
    Add-Attribute 127 "fecha_entrenamiento" "TIMESTAMP" ($p++)
    Add-Attribute 127 "activo" "BOOLEAN" ($p++)

    $clsDiag = Ensure-CleanDiagram 12 "Diagrama de clases - Subsistema IA Generativa y Machine Learning (P3)" "Logical" 2200 1500
    $clsLayout = @(
        @{ Id = 119; L = 60;   T = -60;  R = 340;  B = -260 }, # PlanSuscripcion
        @{ Id = 120; L = 60;   T = -330; R = 340;  B = -530 }, # Suscripcion
        @{ Id = 121; L = 460;  T = -80;  R = 750;  B = -320 }, # Empresa
        @{ Id = 84;  L = 460;  T = -390; R = 750;  B = -670 }, # Usuario
        @{ Id = 105; L = 460;  T = -740; R = 750;  B = -1060 },# Venta
        @{ Id = 126; L = 900;  T = -60;  R = 1230; B = -320 }, # ReporteGenerativoIA
        @{ Id = 127; L = 900;  T = -390; R = 1230; B = -660 }, # ModeloAnaliticoML
        @{ Id = 106; L = 900;  T = -740; R = 1200; B = -930 }, # DetalleVenta
        @{ Id = 96;  L = 1310; T = -740; R = 1600; B = -940 }  # InventarioStock
    )
    $sC = 1
    foreach ($it in $clsLayout) {
        Place-OnDiagram $clsDiag.Id $it.Id $it.L $it.T $it.R $it.B $sC
        $sC++
    }
    Ensure-ConnectorAndLink $clsDiag.Id 119 120 "Association" "" "" "1" "*" | Out-Null
    Ensure-ConnectorAndLink $clsDiag.Id 121 120 "Association" "" "" "1" "*" | Out-Null
    Ensure-ConnectorAndLink $clsDiag.Id 121 126 "Association" "" "" "1" "*" | Out-Null
    Ensure-ConnectorAndLink $clsDiag.Id 84  126 "Association" "" "" "1" "*" | Out-Null
    Ensure-ConnectorAndLink $clsDiag.Id 121 127 "Association" "" "" "1" "*" | Out-Null
    Ensure-ConnectorAndLink $clsDiag.Id 121 105 "Association" "" "" "1" "*" | Out-Null
    Ensure-ConnectorAndLink $clsDiag.Id 105 106 "Association" "contiene_items" "" "1" "*" | Out-Null

    # Ajustar alturas de cajas 126 y 127 en el Diagrama General (ID 10) para mostrar los 9 atributos sin cortes
    $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -1510, RectBottom = -1745 WHERE Diagram_ID = 10 AND Object_ID = 126"
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -1775, RectBottom = -2010 WHERE Diagram_ID = 10 AND Object_ID = 127"
    $cmd.ExecuteNonQuery() | Out-Null
    $exportedGuids += @{ Guid = $clsDiag.Guid; File = "$exportDir\clases_P3_IA_ML.png" }
    Write-Host "  [OK] Clases ReporteGenerativoIA y ModeloAnaliticoML sincronizadas con BD." -ForegroundColor Green

    # ==========================================================================
    # 3. DIAGRAMAS DE ROBUSTEZ ICONIX (BCE) EN PAQUETE 44
    # ==========================================================================
    Write-Host "`n3. Generando Diagramas de Robustez BCE (CU21, CU22, CU23)..." -ForegroundColor Yellow
    $robPkgId = Ensure-Package "3.2. Diagramas de robustez (P3)" 1

    # --- ROBUSTEZ CU21 ---
    $rob21 = Ensure-CleanDiagram $robPkgId "Diagrama de robustez CU21" "Analysis" 1900 1100
    $r21_act  = Ensure-Element "Gerente / Administrador" "Actor" "" $robPkgId
    $r21_ui   = Ensure-Element "IU_ConsultaReporteIA" "Class" "boundary" $robPkgId
    $r21_ctrl = Ensure-Element "ConsultaLenguajeNaturalController" "Class" "control" $robPkgId
    $r21_gem  = Ensure-Element "GeminiNLQService" "Class" "control" $robPkgId
    $r21_aud  = Ensure-Element "SQLSecurityAuditor" "Class" "control" $robPkgId
    $r21_susc = Ensure-Element "Suscripcion" "Class" "entity" $robPkgId
    $r21_vta  = Ensure-Element "Venta" "Class" "entity" $robPkgId
    $r21_rep  = Ensure-Element "ReporteGenerativoIA" "Class" "entity" $robPkgId

    Place-OnDiagram $rob21.Id $r21_act  60  -250 150  -360 1
    Place-OnDiagram $rob21.Id $r21_ui   310 -265 420  -345 2
    Place-OnDiagram $rob21.Id $r21_ctrl 620 -265 730  -345 3
    Place-OnDiagram $rob21.Id $r21_gem  620 -70  730  -150 4
    Place-OnDiagram $rob21.Id $r21_aud  620 -460 730  -540 5
    Place-OnDiagram $rob21.Id $r21_susc 1020 -90  1130 -170 6
    Place-OnDiagram $rob21.Id $r21_vta  1020 -265 1130 -345 7
    Place-OnDiagram $rob21.Id $r21_rep  1020 -440 1130 -520 8

    Ensure-ConnectorAndLink $rob21.Id $r21_act  $r21_ui   "Association" "1: ingresarPromptTextoOVoz(prompt, tipo_entrada)" | Out-Null
    Ensure-ConnectorAndLink $rob21.Id $r21_ui   $r21_ctrl "Association" "1.1: POST /api/v1/ia/consultar" | Out-Null
    Ensure-ConnectorAndLink $rob21.Id $r21_ctrl $r21_susc "Association" "1.2: validarPermiteIA(empresa_id)" | Out-Null
    Ensure-ConnectorAndLink $rob21.Id $r21_ctrl $r21_gem  "Association" "1.3: traducirNLQaSQLYSintetizar(prompt, schema)" | Out-Null
    Ensure-ConnectorAndLink $rob21.Id $r21_ctrl $r21_aud  "Association" "1.4: auditarSelectYForzarTenant(sql, empresa_id)" | Out-Null
    Ensure-ConnectorAndLink $rob21.Id $r21_ctrl $r21_vta  "Association" "1.5: ejecutarSelectReadOnly(sql_seguro)" | Out-Null
    Ensure-ConnectorAndLink $rob21.Id $r21_ctrl $r21_rep  "Association" "1.6: guardarReporteIA(empresa_id, sql, resumen)" | Out-Null
    $exportedGuids += @{ Guid = $rob21.Guid; File = "$exportDir\robustez_CU21.png" }

    # --- ROBUSTEZ CU22 ---
    $rob22 = Ensure-CleanDiagram $robPkgId "Diagrama de robustez CU22" "Analysis" 1900 1100
    $r22_ui   = Ensure-Element "IU_VisorReportesExportacion" "Class" "boundary" $robPkgId
    $r22_ctrl = Ensure-Element "ExportadorReportesIAController" "Class" "control" $robPkgId
    $r22_pdf  = Ensure-Element "ReportLabPDFGenerator" "Class" "control" $robPkgId
    $r22_xls  = Ensure-Element "OpenPyXLExcelGenerator" "Class" "control" $robPkgId
    $r22_emp  = Ensure-Element "Empresa" "Class" "entity" $robPkgId

    Place-OnDiagram $rob22.Id $r21_act  60  -250 150  -360 1
    Place-OnDiagram $rob22.Id $r22_ui   310 -265 420  -345 2
    Place-OnDiagram $rob22.Id $r22_ctrl 620 -265 730  -345 3
    Place-OnDiagram $rob22.Id $r22_pdf  620 -80  730  -160 4
    Place-OnDiagram $rob22.Id $r22_xls  620 -450 730  -530 5
    Place-OnDiagram $rob22.Id $r22_emp  1020 -170 1130 -250 6
    Place-OnDiagram $rob22.Id $r21_rep  1020 -360 1130 -440 7

    Ensure-ConnectorAndLink $rob22.Id $r21_act  $r22_ui   "Association" "1: solicitarDescarga(reporte_id, formato)" | Out-Null
    Ensure-ConnectorAndLink $rob22.Id $r22_ui   $r22_ctrl "Association" "1.1: GET /ia/reportes/{id}/exportar/{formato}" | Out-Null
    Ensure-ConnectorAndLink $rob22.Id $r22_ctrl $r22_emp  "Association" "1.2: obtenerMembreteTenant(empresa_id)" | Out-Null
    Ensure-ConnectorAndLink $rob22.Id $r22_ctrl $r21_rep  "Association" "1.3: verificarPropiedadYActualizarFormato(id, empresa_id)" | Out-Null
    Ensure-ConnectorAndLink $rob22.Id $r22_ctrl $r22_pdf  "Association" "1.4a: construirPDFPlatypus(datos, resumen)" | Out-Null
    Ensure-ConnectorAndLink $rob22.Id $r22_ctrl $r22_xls  "Association" "1.4b: construirWorkbookXLSXConFormulas(datos)" | Out-Null
    $exportedGuids += @{ Guid = $rob22.Guid; File = "$exportDir\robustez_CU22.png" }

    # --- ROBUSTEZ CU23 ---
    $rob23 = Ensure-CleanDiagram $robPkgId "Diagrama de robustez CU23" "Analysis" 1900 1100
    $r23_act  = Ensure-Element "Administrador / Analista BI" "Actor" "" $robPkgId
    $r23_ui   = Ensure-Element "IU_PanelControlModelosML" "Class" "boundary" $robPkgId
    $r23_ctrl = Ensure-Element "EntrenamientoModelosMLController" "Class" "control" $robPkgId
    $r23_sup  = Ensure-Element "RandomForestDemandEngine" "Class" "control" $robPkgId
    $r23_rfm  = Ensure-Element "KMeansRFMClusterEngine" "Class" "control" $robPkgId
    $r23_stk  = Ensure-Element "InventarioStock" "Class" "entity" $robPkgId
    $r23_mod  = Ensure-Element "ModeloAnaliticoML" "Class" "entity" $robPkgId

    Place-OnDiagram $rob23.Id $r23_act  60  -250 150  -360 1
    Place-OnDiagram $rob23.Id $r23_ui   310 -265 420  -345 2
    Place-OnDiagram $rob23.Id $r23_ctrl 620 -265 730  -345 3
    Place-OnDiagram $rob23.Id $r23_sup  620 -80  730  -160 4
    Place-OnDiagram $rob23.Id $r23_rfm  620 -450 730  -530 5
    Place-OnDiagram $rob23.Id $r21_vta  1020 -90  1130 -170 6
    Place-OnDiagram $rob23.Id $r23_stk  1020 -265 1130 -345 7
    Place-OnDiagram $rob23.Id $r23_mod  1020 -440 1130 -520 8

    Ensure-ConnectorAndLink $rob23.Id $r23_act  $r23_ui   "Association" "1: ejecutarPipelineML(algoritmo, num_clusters)" | Out-Null
    Ensure-ConnectorAndLink $rob23.Id $r23_ui   $r23_ctrl "Association" "1.1: POST /api/v1/ml/entrenar-todo" | Out-Null
    Ensure-ConnectorAndLink $rob23.Id $r23_ctrl $r21_vta  "Association" "1.2: extraerDatasetHistoricoTenant(empresa_id)" | Out-Null
    Ensure-ConnectorAndLink $rob23.Id $r23_ctrl $r23_sup  "Association" "1.3: entrenarDemandaYEvaluar(MAE, RMSE, R2)" | Out-Null
    Ensure-ConnectorAndLink $rob23.Id $r23_ctrl $r23_stk  "Association" "1.4: proyectarQuiebreStock7Dias(empresa_id)" | Out-Null
    Ensure-ConnectorAndLink $rob23.Id $r23_ctrl $r23_rfm  "Association" "1.5: segmentarClientesRFM(StandardScaler, Silhouette)" | Out-Null
    Ensure-ConnectorAndLink $rob23.Id $r23_ctrl $r23_mod  "Association" "1.6: persistirMetricasModelo(ModeloAnaliticoML)" | Out-Null
    $exportedGuids += @{ Guid = $rob23.Guid; File = "$exportDir\robustez_CU23.png" }
    Write-Host "  [OK] 3 Diagramas de Robustez BCE creados en Paquete $robPkgId." -ForegroundColor Green

    # ==========================================================================
    # 4. DIAGRAMAS DE SECUENCIA UML P3 EN PAQUETE '3.3. Diagramas de secuencia (P3)'
    # ==========================================================================
    Write-Host "`n4. Generando Diagramas de Secuencia UML (CU21, CU22, CU23)..." -ForegroundColor Yellow
    $seqPkgId = Ensure-Package "3.3. Diagramas de secuencia (P3)" 1

    # --- SECUENCIA CU21 ---
    $seq21 = Ensure-CleanDiagram $seqPkgId "Diagrama de secuencia CU21" "Sequence" 2400 1500
    $s21_act  = Ensure-Lifeline "Gerente / Administrador" "Actor" $seqPkgId 16773824
    $s21_ui   = Ensure-Lifeline "IU_ConsultaReporteIA" "Sequence" $seqPkgId 15921906
    $s21_ctrl = Ensure-Lifeline "ConsultaLenguajeNaturalController" "Sequence" $seqPkgId 15921906
    $s21_susc = Ensure-Lifeline "Suscripcion" "Sequence" $seqPkgId 15921906
    $s21_gem  = Ensure-Lifeline "GeminiNLQService" "Sequence" $seqPkgId 15921906
    $s21_vta  = Ensure-Lifeline "Venta" "Sequence" $seqPkgId 15921906
    $s21_rep  = Ensure-Lifeline "ReporteGenerativoIA" "Sequence" $seqPkgId 15921906

    $f21_alt = Ensure-Fragment "[permite_ia == true && sqlSoloLectura == true]" "alt" 0 $seqPkgId
    $f21_opt = Ensure-Fragment "[reproducir_sintesis_voz == true]" "opt" 1 $seqPkgId

    Place-OnDiagram $seq21.Id $f21_alt  220  -254 1465 -592  1  "BCol=-1;BFmt=0;trans=1;"
    Place-OnDiagram $seq21.Id $f21_opt  45   -600 390  -695  2  "BCol=-1;BFmt=0;trans=1;"
    Place-OnDiagram $seq21.Id $s21_act  60   -50  150  -920  10
    Place-OnDiagram $seq21.Id $s21_ui   240  -50  370  -920  11
    Place-OnDiagram $seq21.Id $s21_ctrl 460  -50  600  -920  12
    Place-OnDiagram $seq21.Id $s21_susc 680  -50  800  -920  13
    Place-OnDiagram $seq21.Id $s21_gem  890  -50  1020 -920  14
    Place-OnDiagram $seq21.Id $s21_vta  1110 -50  1220 -920  15
    Place-OnDiagram $seq21.Id $s21_rep  1310 -50  1450 -920  16

    Add-SeqMsg $seq21.Id $s21_act  $s21_ui   "1. ingresarConsultaLenguajeNatural(prompt, tipo_entrada)" 1 "Call"
    Add-SeqMsg $seq21.Id $s21_ui   $s21_ctrl "2. POST /api/v1/ia/consultar (prompt, tipo_entrada, JWT)" 2 "Call"
    Add-SeqMsg $seq21.Id $s21_ctrl $s21_susc "3. validarPlanSuscripcionIA(empresa_id)" 3 "Call"
    Add-SeqMsg $seq21.Id $s21_susc $s21_ctrl "4. planInfo (permite_ia=true, razon_social)" 4 "Return"
    Add-SeqMsg $seq21.Id $s21_ctrl $s21_gem  "5. generarSQLReadOnly(prompt, empresa_id)" 5 "Call"
    Add-SeqMsg $seq21.Id $s21_gem  $s21_ctrl "6. sqlAuditado (SELECT ... WHERE empresa_id = :id LIMIT 50)" 6 "Return"
    Add-SeqMsg $seq21.Id $s21_ctrl $s21_vta  "7. ejecutarConsultaAisladaReadOnly(sqlAuditado)" 7 "Call"
    Add-SeqMsg $seq21.Id $s21_vta  $s21_ctrl "8. datosTabulares: List[Dict]" 8 "Return"
    Add-SeqMsg $seq21.Id $s21_ctrl $s21_gem  "9. sintetizarRespuestaEjecutiva(prompt, datosTabulares)" 9 "Call"
    Add-SeqMsg $seq21.Id $s21_gem  $s21_ctrl "10. respuestaResumen: str" 10 "Return"
    Add-SeqMsg $seq21.Id $s21_ctrl $s21_rep  "11. guardarReporteIA(empresa_id, prompt, sqlAuditado, respuestaResumen)" 11 "Call"
    Add-SeqMsg $seq21.Id $s21_rep  $s21_ctrl "12. reportePersistido (reporte_id)" 12 "Return"
    Add-SeqMsg $seq21.Id $s21_ctrl $s21_ui   "13. 200 OK (ConsultaIAResponse)" 13 "Return"
    Add-SeqMsg $seq21.Id $s21_ui   $s21_act  "14. renderizarSintesisYTablaDinamica(datosTabulares)" 14 "Return"
    Add-SeqMsg $seq21.Id $s21_act  $s21_ui   "15. activarLecturaVozTTS(respuestaResumen)" 15 "Call"
    Add-SeqMsg $seq21.Id $s21_ui   $s21_act  "16. reproducirAudioSintesisEspanol()" 16 "Return"
    $exportedGuids += @{ Guid = $seq21.Guid; File = "$exportDir\secuencia_CU21.png" }

    # --- SECUENCIA CU22 ---
    $seq22 = Ensure-CleanDiagram $seqPkgId "Diagrama de secuencia CU22" "Sequence" 2200 1400
    $s22_ui   = Ensure-Lifeline "IU_VisorReportesExportacion" "Sequence" $seqPkgId 15921906
    $s22_ctrl = Ensure-Lifeline "ExportadorReportesIAController" "Sequence" $seqPkgId 15921906
    $s22_emp  = Ensure-Lifeline "Empresa" "Sequence" $seqPkgId 15921906
    $s22_exp  = Ensure-Lifeline "ReportExportService" "Sequence" $seqPkgId 15921906

    $f22_alt = Ensure-Fragment "[reporte.empresa_id == tenant.empresa_id]" "alt" 0 $seqPkgId

    Place-OnDiagram $seq22.Id $f22_alt  220  -268 1245 -565  1  "BCol=-1;BFmt=0;trans=1;"
    Place-OnDiagram $seq22.Id $s21_act  60   -50  150  -760  10
    Place-OnDiagram $seq22.Id $s22_ui   240  -50  370  -760  11
    Place-OnDiagram $seq22.Id $s22_ctrl 460  -50  600  -760  12
    Place-OnDiagram $seq22.Id $s22_emp  680  -50  800  -760  13
    Place-OnDiagram $seq22.Id $s21_rep  890  -50  1030 -760  14
    Place-OnDiagram $seq22.Id $s22_exp  1110 -50  1230 -760  15

    Add-SeqMsg $seq22.Id $s21_act  $s22_ui   "1. clicExportarDocumento(reporte_id, formato='PDF'|'EXCEL')" 1 "Call"
    Add-SeqMsg $seq22.Id $s22_ui   $s22_ctrl "2. GET /api/v1/ia/reportes/{id}/exportar/{formato}" 2 "Call"
    Add-SeqMsg $seq22.Id $s22_ctrl $s22_emp  "3. obtenerDatosMembreteTenant(empresa_id)" 3 "Call"
    Add-SeqMsg $seq22.Id $s22_emp  $s22_ctrl "4. empresaInfo (razon_social, nit)" 4 "Return"
    Add-SeqMsg $seq22.Id $s22_ctrl $s21_rep  "5. obtenerReporteHidratadoYValidarTenant(reporte_id, empresa_id)" 5 "Call"
    Add-SeqMsg $seq22.Id $s21_rep  $s22_ctrl "6. datosReporte (columnas, datos_tabulares, resumen)" 6 "Return"
    Add-SeqMsg $seq22.Id $s22_ctrl $s22_exp  "7. generar FlujoBinario(formato, datosReporte, empresaInfo)" 7 "Call"
    Add-SeqMsg $seq22.Id $s22_exp  $s22_ctrl "8. bytesDocumento (%PDF-1.4 / XLSX OpenXML)" 8 "Return"
    Add-SeqMsg $seq22.Id $s22_ctrl $s21_rep  "9. actualizarFormatoExportacion(reporte_id, formato)" 9 "Call"
    Add-SeqMsg $seq22.Id $s22_ctrl $s22_ui   "10. 200 OK StreamingResponse (Attachment Blob)" 10 "Return"
    Add-SeqMsg $seq22.Id $s22_ui   $s21_act  "11. descargarArchivoCorporativo(Reporte_IA.pdf | .xlsx)" 11 "Return"
    $exportedGuids += @{ Guid = $seq22.Guid; File = "$exportDir\secuencia_CU22.png" }

    # --- SECUENCIA CU23 ---
    $seq23 = Ensure-CleanDiagram $seqPkgId "Diagrama de secuencia CU23" "Sequence" 2400 1500
    $s23_act  = Ensure-Lifeline "Administrador / Analista BI" "Actor" $seqPkgId 16773824
    $s23_ui   = Ensure-Lifeline "IU_PanelControlModelosML" "Sequence" $seqPkgId 15921906
    $s23_ctrl = Ensure-Lifeline "EntrenamientoModelosMLController" "Sequence" $seqPkgId 15921906
    $s23_ml   = Ensure-Lifeline "MachineLearningService" "Sequence" $seqPkgId 15921906
    $s23_stk  = Ensure-Lifeline "InventarioStock" "Sequence" $seqPkgId 15921906
    $s23_mod  = Ensure-Lifeline "ModeloAnaliticoML" "Sequence" $seqPkgId 15921906

    $f23_alt  = Ensure-Fragment "[permite_ia == true && registrosHistoricos >= 30]" "alt" 0 $seqPkgId
    $f23_loop = Ensure-Fragment "[k en 2..6 (K-Means++)]" "loop" 4 $seqPkgId

    Place-OnDiagram $seq23.Id $f23_alt  220  -268 1455 -635  1  "BCol=-1;BFmt=0;trans=1;"
    Place-OnDiagram $seq23.Id $f23_loop 445  -400 1035 -498  2  "BCol=-1;BFmt=0;trans=1;"
    Place-OnDiagram $seq23.Id $s23_act  60   -50  150  -860  10
    Place-OnDiagram $seq23.Id $s23_ui   240  -50  370  -860  11
    Place-OnDiagram $seq23.Id $s23_ctrl 460  -50  600  -860  12
    Place-OnDiagram $seq23.Id $s21_vta  680  -50  790  -860  13
    Place-OnDiagram $seq23.Id $s23_ml   880  -50  1020 -860  14
    Place-OnDiagram $seq23.Id $s23_stk  1110 -50  1230 -860  15
    Place-OnDiagram $seq23.Id $s23_mod  1310 -50  1440 -860  16

    Add-SeqMsg $seq23.Id $s23_act  $s23_ui   "1. iniciarEntrenamientoModelos(algoritmo, num_clusters)" 1 "Call"
    Add-SeqMsg $seq23.Id $s23_ui   $s23_ctrl "2. POST /api/v1/ml/entrenar-todo (JWT Tenant)" 2 "Call"
    Add-SeqMsg $seq23.Id $s23_ctrl $s21_vta  "3. consultarTransacciones90Dias(empresa_id)" 3 "Call"
    Add-SeqMsg $seq23.Id $s21_vta  $s23_ctrl "4. datasetVentasYClientesRFM" 4 "Return"
    Add-SeqMsg $seq23.Id $s23_ctrl $s23_ml   "5. entrenarSupervisadoDemanda(X_train, y_train, X_test)" 5 "Call"
    Add-SeqMsg $seq23.Id $s23_ml   $s23_ctrl "6. metricasSupervisadas (MAE, RMSE, R2 >= 0.70)" 6 "Return"
    Add-SeqMsg $seq23.Id $s23_ctrl $s23_stk  "7. proyectarDemanda7DiasPorSKU(empresa_id)" 7 "Call"
    Add-SeqMsg $seq23.Id $s23_stk  $s23_ctrl "8. proyeccionesStock: List[ProyeccionStockItem]" 8 "Return"
    Add-SeqMsg $seq23.Id $s23_ctrl $s23_ml   "9. ajustarStandardScalerYKMeansRFM(X_rfm, k)" 9 "Call"
    Add-SeqMsg $seq23.Id $s23_ml   $s23_ctrl "10. clustersRFM (Silhouette > 0.25, WCSS, perfiles)" 10 "Return"
    Add-SeqMsg $seq23.Id $s23_ctrl $s23_mod  "11. registrarModelosEntrenados(SUPERVISADO, NO_SUPERVISADO)" 11 "Call"
    Add-SeqMsg $seq23.Id $s23_mod  $s23_ctrl "12. modelosPersistidosIds" 12 "Return"
    Add-SeqMsg $seq23.Id $s23_ctrl $s23_ui   "13. 200 OK (MLEntrenarTodoResponse)" 13 "Return"
    Add-SeqMsg $seq23.Id $s23_ui   $s23_act  "14. renderizarCurvasR2ScatterRFMYTablaStock()" 14 "Return"
    $exportedGuids += @{ Guid = $seq23.Guid; File = "$exportDir\secuencia_CU23.png" }

    Write-Host "  [OK] 3 Diagramas de Secuencia UML creados en Paquete $seqPkgId." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# ==============================================================================
# 5. EXPORTACION DE IMAGENES PNG VIA EA COM Y SINCRONIZACION DE ARCHIVO .EAP
# ==============================================================================
Write-Host "`n5. Exportando diagramas P3 a PNG mediante Enterprise Architect COM..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $proj = $repo.GetProjectInterface()
    foreach ($item in $exportedGuids) {
        $proj.PutDiagramImageToFile($item.Guid, $item.File, 1) | Out-Null
        Write-Host "  -> Exportado: $($item.File)" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Nota COM EA (archivo .eap ya actualizado via Jet OLEDB): $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}

if ($eapPath -ne $workspaceEap) {
    Copy-Item -Path $eapPath -Destination $workspaceEap -Force
    Write-Host "  [OK] Copia sincronizada en workspace: $workspaceEap" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " SINCRONIZACION ICONIX P3 COMPLETADA AL 100%" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
