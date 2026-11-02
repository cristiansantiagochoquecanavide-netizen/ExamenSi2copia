# ==============================================================================
# SCRIPT DE ACTUALIZACION DIAGRAMA DE SECUENCIA CU08 EN ENTERPRISE ARCHITECT
# REGLAS: Participantes Rectangulares (sin iconos circulares BCE)
#         Fragmentos Transparentes con bordes limpios y separados verticalmente
#         Todos los fragmentos ALT y OPT inician en UI (L=220) y cubren hasta las Entidades
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$dir = "C:\Users\HP\Documents\SI2\2doParcial"
$eapFiles = Get-ChildItem -Path $dir -Filter "*.eap" | Select-Object -ExpandProperty FullName

function Setup-SequenceDiagram([string]$eapPath) {
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "Actualizando archivo EA: $eapPath" -ForegroundColor Cyan
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
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$name' AND Package_ID = $pkgId"
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
    $objId, '$type', 0, '$name', 'Grupo 6', '1.0',
    $pkgId, '1', $backColor, 1, 0,
    9405184, NOW(), NOW(), 'Proposed', '0',
    'Public', '', '$guid', 0, False, False, False, False
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }

    # Asegurar fragmento con nombre limpio y fondo transparente
    function Ensure-FragmentObject([string]$name, [string]$stereo, [int]$pkgId) {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '$name' AND Package_ID = $pkgId"
        $val = $cmd.ExecuteScalar()
        if ($null -ne $val -and -not [DBNull]::Value.Equals($val)) {
            $objId = [int]$val
            $cmd.CommandText = "UPDATE t_object SET [Stereotype] = '$stereo', [Backcolor] = -1, [Bordercolor] = 5104464 WHERE Object_ID = $objId"
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
    $objId, 'InteractionFragment', 0, '$name', 'Grupo 6', '1.0',
    $pkgId, '1', -1, 1, 0,
    5104464, NOW(), NOW(), 'Proposed', '0',
    'Public', '$stereo', '$guid', 0, False, False, False, False
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        return $objId
    }

    try {
        $pkgId = 14 # 3.3. Diagramas de secuencia (P2)
        $diagName = "Diagrama de secuencia CU08"

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
    0, True, True, True, 'L', 2200, 1500, 100,
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

        # 2. Participantes rectangulares (Stereotype vacio, Backcolor celeste claro)
        $idActor = Ensure-LifelineObject "Vendedor" "Actor" $pkgId 16773824
        $idUI    = Ensure-LifelineObject "UI_SincronizacionCatalogo" "Sequence" $pkgId 15921906
        $idCtrl  = Ensure-LifelineObject "CatalogoSyncController" "Sequence" $pkgId 15921906
        $idPrenda= Ensure-LifelineObject "Prenda" "Sequence" $pkgId 15921906
        $idStock = Ensure-LifelineObject "InventarioStock" "Sequence" $pkgId 15921906
        $idGuia  = Ensure-LifelineObject "GuiaMedida" "Sequence" $pkgId 15921906
        $idSync  = Ensure-LifelineObject "SincronizacionOffline" "Sequence" $pkgId 15921906

        # 3. Fragmentos combinados: Nombre limpio sin anteponer el tipo
        $idAlt1  = Ensure-FragmentObject "[Sincronizacion Catalogo Local]" "alt" $pkgId
        $idLoop1 = Ensure-FragmentObject "[para cada prenda activa y variante]" "loop" $pkgId
        $idOpt1  = Ensure-FragmentObject "[guia_personalizada == null (Medidas Default)]" "opt" $pkgId
        $idOpt2  = Ensure-FragmentObject "[consulta fuera de linea / red no disponible]" "opt" $pkgId

        # Posicionamiento:
        # Participantes horizontales:
        # Actor: L=60, R=150
        # UI:    L=240, R=370
        # Ctrl:  L=460, R=590
        # Prenda:L=680, R=790
        # Stock: L=890, R=1000
        # Guia:  L=1100, R=1200
        # Sync:  L=1300, R=1410
        #
        # Reglas Estrictas de Inicio y Fin Horizontal:
        # - ALT:  Inicia en UI (L=220) y llega hasta SincronizacionOffline (R=1420)
        # - LOOP: Inicia en Controller (L=440) y llega hasta GuiaMedida (R=1220)
        # - OPT1: Inicia en UI (L=220) y llega hasta GuiaMedida (R=1220)
        # - OPT2: Inicia en UI (L=220) y llega hasta SincronizacionOffline (R=1420)

        $layout = @(
            @{ Id = $idAlt1;  L = 220; T = -180; R = 1420; B = -540;  Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idLoop1; L = 440; T = -570; R = 1220; B = -730;  Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idOpt1;  L = 220; T = -760; R = 1220; B = -920;  Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idOpt2;  L = 220; T = -960; R = 1420; B = -1160; Seq = 4; Style = "BCol=-1;BFmt=0;trans=1;" },
            @{ Id = $idActor; L = 60;   T = -50;  R = 150;  B = -1250; Seq = 10; Style = "" },
            @{ Id = $idUI;    L = 240;  T = -50;  R = 370;  B = -1250; Seq = 11; Style = "" },
            @{ Id = $idCtrl;  L = 460;  T = -50;  R = 590;  B = -1250; Seq = 12; Style = "" },
            @{ Id = $idPrenda;L = 680;  T = -50;  R = 790;  B = -1250; Seq = 13; Style = "" },
            @{ Id = $idStock; L = 890;  T = -50;  R = 1000; B = -1250; Seq = 14; Style = "" },
            @{ Id = $idGuia;  L = 1100; T = -50;  R = 1200; B = -1250; Seq = 15; Style = "" },
            @{ Id = $idSync;  L = 1300; T = -50;  R = 1410; B = -1250; Seq = 16; Style = "" }
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
        Write-Host "Participantes rectangulares y fragmentos transparentes colocados desde UI hasta las Entidades." -ForegroundColor Green

        # 4. Mensajes de secuencia
        function Add-SeqMsg([int]$src, [int]$dst, [string]$msg, [int]$order, [string]$subType = "Call") {
            $cid = Get-NextId "t_connector" "Connector_ID"
            $guid = New-GuidStr
            $escMsg = $msg.Replace("'", "''")
            $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [Name], [Direction], [Notes], [Connector_Type],
    [SourceAccess], [DestAccess], [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SeqNo], [SubType], [DiagramID]
) VALUES (
    $cid, '$escMsg', 'Source -> Destination', '$escMsg', 'Sequence',
    'Public', 'Public', $src, $dst, 3, -1,
    '$guid', False, True, False, False, False,
    $order, '$subType', $diagId
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

        # Bloque 1: ALT - Descarga de catalogo (Inicia en UI y cubre hasta SincronizacionOffline)
        $null = Add-SeqMsg $idActor $idUI     "1. solicitarSincronizacion()" 1 "Call"
        $null = Add-SeqMsg $idUI    $idCtrl   "2. descargarYSincronizarCatalogo(empresa_id)" 2 "Call"
        $null = Add-SeqMsg $idCtrl  $idPrenda "3. obtenerPrendasActivas(empresa_id)" 3 "Call"
        $null = Add-SeqMsg $idPrenda $idCtrl  "4. prendasActivas: List[Prenda]" 4 "Return"
        $null = Add-SeqMsg $idCtrl  $idGuia   "5. obtenerMedidasPorTalla(empresa_id)" 5 "Call"
        $null = Add-SeqMsg $idGuia  $idCtrl   "6. guiasMedidas: List[GuiaMedida]" 6 "Return"
        $null = Add-SeqMsg $idCtrl  $idSync   "7. registrarSincronizacionOffline(empresa_id, payload)" 7 "Call"
        $null = Add-SeqMsg $idSync  $idCtrl   "8. confirmacionRegistro: bool" 8 "Return"
        $null = Add-SeqMsg $idCtrl  $idUI     "9. 200 OK (itemsCatalogo: List[PrendaSyncItem])" 9 "Return"
        $null = Add-SeqMsg $idUI    $idActor  "10. mostrarConfirmacion('Catalogo sincronizado')" 10 "Return"

        # Bloque 2: LOOP - Iteracion real en backend (Inicia en Controller y cubre hasta GuiaMedida)
        $null = Add-SeqMsg $idCtrl  $idStock  "11. consultarStockDisponible(variante_id)" 11 "Call"
        $null = Add-SeqMsg $idStock $idCtrl   "12. stockDisponible: int" 12 "Return"
        $null = Add-SeqMsg $idCtrl  $idGuia   "13. obtenerMedidasPorTalla(prenda_id, talla_id)" 13 "Call"
        $null = Add-SeqMsg $idGuia  $idCtrl   "14. medidas: GuiaMedida" 14 "Return"

        # Bloque 3: OPT - Fallback medidas anatomicas (Inicia en UI y cubre hasta GuiaMedida)
        $null = Add-SeqMsg $idActor $idUI     "15. consultarGuiaMedida(prenda_id, talla_id)" 15 "Call"
        $null = Add-SeqMsg $idUI    $idCtrl   "16. verificarMedidasAnatomicas(talla_codigo)" 16 "Call"
        $null = Add-SeqMsg $idCtrl  $idGuia   "17. obtenerMedidasPorTalla(prenda_id, talla_id)" 17 "Call"
        $null = Add-SeqMsg $idGuia  $idCtrl   "18. null" 18 "Return"
        $null = Add-SeqMsg $idCtrl  $idUI     "19. 200 OK (medidasDefault: (pecho_cm, cintura_cm))" 19 "Return"
        $null = Add-SeqMsg $idUI    $idActor  "20. mostrarMedidasEstandar(medidasDefault)" 20 "Return"

        # Bloque 4: OPT - Consulta fuera de linea (Inicia en UI y cubre hasta SincronizacionOffline)
        $null = Add-SeqMsg $idActor $idUI     "21. consultarCatalogoOffline()" 21 "Call"
        $null = Add-SeqMsg $idUI    $idCtrl   "22. obtenerCatalogoLocal()" 22 "Call"
        $null = Add-SeqMsg $idCtrl  $idSync   "23. consultarUltimaSincronizacion()" 23 "Call"
        $null = Add-SeqMsg $idSync  $idCtrl   "24. ultimaSync: datetime" 24 "Return"
        $null = Add-SeqMsg $idCtrl  $idUI     "25. 200 OK (prendasLocales: List[PrendaLocal])" 25 "Return"
        $null = Add-SeqMsg $idUI    $idActor  "26. mostrarCatalogoOffline(prendasLocales)" 26 "Return"

        Write-Host "26 mensajes de secuencia ordenados creados." -ForegroundColor Green
    }
    finally {
        $conn.Close()
    }

    # Exportar a imagen PNG usando EA COM
    try {
        Write-Host "Exportando imagen desde EA COM para $eapPath..." -ForegroundColor Cyan
        $ea = New-Object -ComObject "EA.App"
        $repo = $ea.Repository
        $repo.OpenFile($eapPath)
        $proj = $repo.GetProjectInterface()
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($eapPath)
        $outImg = Join-Path $dir "${baseName}_CU08_secuencia_EA.png"
        $proj.PutDiagramImageToFile($diagGuid, $outImg, 1)
        $repo.CloseFile()
        $repo.Exit()
        Write-Host "Diagrama exportado exitosamente a: $outImg" -ForegroundColor Green
    } catch {
        Write-Host "Aviso exportando imagen con EA COM: $_" -ForegroundColor Yellow
    }
}

foreach ($f in $eapFiles) {
    Setup-SequenceDiagram $f
}

Write-Host "ACTUALIZACION EXITOSA: OPT CUBRE DESDE UI HASTA LAS ENTIDADES PARTICIPANTES." -ForegroundColor Green
