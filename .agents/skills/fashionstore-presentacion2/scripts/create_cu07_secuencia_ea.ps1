# SCRIPT DE CREACION Y EXPORTACION DIAGRAMA DE SECUENCIA CU07 (ENTERPRISE ARCHITECT)
# CU07: Consultar y Filtrar Catálogo Multidimensional
# Destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# REGLAS: Participantes Rectangulares (Stereotype vacio, Backcolor = 15921906, Light Cyan)
#         Actor a la izquierda (Pale Yellow, Backcolor = 12975871)
#         Fragmentos Transparentes con bordes limpios (BCol=-1;BFmt=0;trans=1;)
#         ALT [totalPrendas > 0] inicia en UI (L=210) hacia Entidades (R=1550)
#         LOOP [para cada prenda] anidado en ALT, inicia en Controlador (L=440) hacia InventarioStock (R=1350)
#         OPT inicia en UI (L=210) hacia Entidades
#         CERO COLISIONES: Coordenadas analiticas calibradas, pestañas cortas que terminan antes de UI (X < 290)

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outPng = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU07_secuencia_EA.png"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Procesando CU07 con ALT, LOOP y OPT en: $eapPath" -ForegroundColor Cyan
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
    $diagName = "Diagrama de secuencia CU07"

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
    'Diagrama de secuencia UML 2.5 para CU07: Consultar y Filtrar Catálogo Multidimensional', '', '$diagGuid', 'Sequence'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "Nuevo diagrama CU07 creado con ID: $diagId" -ForegroundColor Green
    }

    # Limpiar conectores huerfanos con DiagID=0
    $cmd.CommandText = "DELETE FROM t_connector WHERE DiagramID = 0 AND (Name LIKE '%aplicarFiltrosCatalogo%' OR Name LIKE '%seleccionarFichaPrenda%' OR Name LIKE '%consultarGuiaMedidasCm%')"
    $cmd.ExecuteNonQuery() | Out-Null

    # Crear participantes (1 a 1 con Robustez 56)
    $idActor       = Ensure-LifelineObject "Cliente" "Actor" $pkgId 12975871 # Pale Yellow
    $idUI          = Ensure-LifelineObject "UI_CatalogoMultidimensional" "Sequence" $pkgId 15921906 # Light Cyan
    $idCtrl        = Ensure-LifelineObject "CatalogoConsultaController" "Sequence" $pkgId 15921906
    $idPrenda      = Ensure-LifelineObject "Prenda" "Sequence" $pkgId 15921906
    $idCategoria   = Ensure-LifelineObject "Categoria" "Sequence" $pkgId 15921906
    $idVariante    = Ensure-LifelineObject "PrendaVariante" "Sequence" $pkgId 15921906
    $idStock       = Ensure-LifelineObject "InventarioStock" "Sequence" $pkgId 15921906
    $idGuia        = Ensure-LifelineObject "GuiaMedida" "Sequence" $pkgId 15921906

    # Crear fragmentos combinados:
    # 1. ALT: Si la busqueda arroja prendas [totalPrendas > 0]
    $idAlt1  = Ensure-FragmentObject "[totalPrendas > 0]" "alt" $pkgId 0
    # 2. LOOP: Iteracion de prendas para recuperar Categoria, Variantes y Stock de Sucursal (anidado en ALT)
    $idLoop1 = Ensure-FragmentObject "[para cada prenda]" "loop" $pkgId 4
    # 3. OPT: Ficha Detallada de Prenda con Stock y Variantes
    $idOpt1  = Ensure-FragmentObject "[fichaDetallada]" "opt" $pkgId 1
    # 4. OPT: Consulta de Guia Anatomica de Medidas en cm
    $idOpt2  = Ensure-FragmentObject "[guiaMedidas]" "opt" $pkgId 1

    # Coordenadas calibradas con precision analitica (Formula: Y(N) = -(93.3 + N * 35.2)):
    # - ALT 1: Inicia en UI (L=210) hasta Entidades (R=1550). Top = -245, Bottom = -530
    #   Msg 4 a -234.1 (10.9 EA arriba), Msg 12 a -515.7 (14.3 EA adentro del fondo).
    #   Pestaña [totalPrendas > 0] a X: 210..340.
    #   - LOOP 1 (anidado): Inicia en Ctrl (L=440) hasta Stock (R=1350). Top = -255, Bottom = -460
    #     Pestaña [para cada prenda] a X: 440..560 (completamente separada de pestaña ALT a X: 210..340!).
    #     Msg 5 a -269.3 adentro de LOOP, Msg 10 a -445.3 adentro.
    #     Msg 11 a -480.5 y Msg 12 a -515.7 adentro de ALT pero fuera de LOOP!
    # - Gap amplio entre ALT 1 y OPT 1: Mensaje 13 a -550.9 viaja libre entre Actor y UI!
    # - OPT 1: Inicia en UI (L=210) hasta PrendaVariante (R=1350). Top = -560, Bottom = -815
    #   Msg 13 a -550.9 (9.1 EA arriba de Top), Msg 14 a -586.1 (6.1 EA abajo de pestaña).
    #   Pestaña [fichaDetallada] termina a X=285 (antes de UI X=290).
    #   Msg 20 a -797.3 (17.7 EA arriba de Bottom).
    # - Gap amplio entre OPT 1 y OPT 2: Mensaje 21 a -832.5 viaja libre entre Actor y UI!
    # - OPT 2: Inicia en UI (L=210) hasta GuiaMedida (R=1550). Top = -842, Bottom = -1040
    #   Msg 21 a -832.5 (9.5 EA arriba de Top), Msg 22 a -867.7 (5.7 EA abajo de pestaña).
    #   Pestaña [guiaMedidas] termina a X=285 (antes de UI X=290).
    #   Msg 26 a -1008.5 (31.5 EA arriba de Bottom).
    # - Lifelines Bottom: -1080

    $layout = @(
        @{ Id = $idAlt1;      L = 210;  T = -245;  R = 1550; B = -530;   Seq = 1; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idLoop1;     L = 440;  T = -255;  R = 1350; B = -460;   Seq = 2; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt1;      L = 210;  T = -560;  R = 1350; B = -815;   Seq = 3; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idOpt2;      L = 210;  T = -842;  R = 1550; B = -1040;  Seq = 4; Style = "BCol=-1;BFmt=0;trans=1;" },
        @{ Id = $idActor;     L = 60;   T = -50;   R = 150;  B = -1080;  Seq = 10; Style = "" },
        @{ Id = $idUI;        L = 230;  T = -50;   R = 350;  B = -1080;  Seq = 11; Style = "" },
        @{ Id = $idCtrl;      L = 440;  T = -50;   R = 560;  B = -1080;  Seq = 12; Style = "" },
        @{ Id = $idPrenda;    L = 650;  T = -50;   R = 760;  B = -1080;  Seq = 13; Style = "" },
        @{ Id = $idCategoria; L = 840;  T = -50;   R = 950;  B = -1080;  Seq = 14; Style = "" },
        @{ Id = $idVariante;  L = 1030; T = -50;   R = 1140; B = -1080;  Seq = 15; Style = "" },
        @{ Id = $idStock;     L = 1220; T = -50;   R = 1330; B = -1080;  Seq = 16; Style = "" },
        @{ Id = $idGuia;      L = 1410; T = -50;   R = 1520; B = -1080;  Seq = 17; Style = "" }
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
    Write-Host "Participantes rectangulares y fragmentos con ALT y LOOP colocados para CU07." -ForegroundColor Green

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
    # BLOQUE 1: Solicitud y Busqueda de Catalogo (Seq 1 a 4)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "1. aplicarFiltrosCatalogo(temporada, categoria, ocasion, sucursal)" 1 "Call" | Out-Null
    Add-SeqMessage $idUI          $idCtrl        "2. filtrarPrendasMultidimensional(criteriosFiltro)" 2 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idPrenda      "3. consultarPrendasFiltradas(filtros, empresa_id)" 3 "Call" | Out-Null
    Add-SeqMessage $idPrenda      $idCtrl        "4. listaPrendas: List[Prenda]" 4 "Return" | Out-Null

    # =========================================================================
    # DENTRO DE ALT [totalPrendas > 0] (Seq 5 a 12)
    # =========================================================================
    # Sub-bloque: LOOP [para cada prenda] (Seq 5 a 10)
    Add-SeqMessage $idCtrl        $idCategoria   "5. filtrarPorSectorYEstilo(categoria_id, sector)" 5 "Call" | Out-Null
    Add-SeqMessage $idCategoria   $idCtrl        "6. categoriaInfo: Categoria" 6 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idVariante    "7. obtenerVariantesTallaColor(prenda_id)" 7 "Call" | Out-Null
    Add-SeqMessage $idVariante    $idCtrl        "8. variantes: List[PrendaVariante]" 8 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idStock       "9. verificarDisponibilidadSucursal(sucursal_id)" 9 "Call" | Out-Null
    Add-SeqMessage $idStock       $idCtrl        "10. stockDisponible: int()" 10 "Return" | Out-Null
    # Fin LOOP

    Add-SeqMessage $idCtrl        $idUI          "11. 200 OK (catalogoPaginado, totalRegistros)" 11 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "12. mostrarCatalogoFiltrado(prendas)" 12 "Return" | Out-Null
    # Fin ALT

    # =========================================================================
    # BLOQUE 2: Ficha Detallada de Prenda con Stock y Variantes (Seq 13 a 20)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "13. seleccionarFichaPrenda(prenda_id)" 13 "Call" | Out-Null

    # Dentro de OPT [fichaDetallada]
    Add-SeqMessage $idUI          $idCtrl        "14. obtenerDetallePrenda(prenda_id)" 14 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idPrenda      "15. findByIdWithRelations(prenda_id)" 15 "Call" | Out-Null
    Add-SeqMessage $idPrenda      $idCtrl        "16. detallePrenda: Prenda" 16 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idVariante    "17. listarVariantesDisponibles(prenda_id)" 17 "Call" | Out-Null
    Add-SeqMessage $idVariante    $idCtrl        "18. listaVariantesConStock: List[Variante]" 18 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "19. 200 OK (prendaCompleta, multimedia, stock)" 19 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "20. mostrarFichaPrenda(infoDetallada)" 20 "Return" | Out-Null
    # Fin OPT 1

    # =========================================================================
    # BLOQUE 3: Consulta de Guia Anatomica de Medidas en cm (Seq 21 a 26)
    # =========================================================================
    Add-SeqMessage $idActor       $idUI          "21. consultarGuiaMedidasCm(prenda_id)" 21 "Call" | Out-Null

    # Dentro de OPT [guiaMedidas]
    Add-SeqMessage $idUI          $idCtrl        "22. obtenerMedidasCorporales(prenda_id)" 22 "Call" | Out-Null
    Add-SeqMessage $idCtrl        $idGuia        "23. consultarMedidasAnatomicasPorTalla(producto_id)" 23 "Call" | Out-Null
    Add-SeqMessage $idGuia        $idCtrl        "24. tablaMedidasCm: GuiaMedidasProducto" 24 "Return" | Out-Null
    Add-SeqMessage $idCtrl        $idUI          "25. 200 OK (medidasPechoCinturaCaderaCm)" 25 "Return" | Out-Null
    Add-SeqMessage $idUI          $idActor       "26. mostrarModalGuiaMedidas(tablaCm)" 26 "Return" | Out-Null
    # Fin OPT 2

    Write-Host "26 mensajes de secuencia creados exitosamente para CU07 con ALT, LOOP y OPT." -ForegroundColor Green
}
finally {
    $conn.Close()
}

# Exportar imagen oficial desde Enterprise Architect
Write-Host ">>> Exportando diagrama CU07 desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    $repo.OpenFile($eapPath)
    $diag = $repo.GetDiagramByID($diagId)
    if ($diag) {
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
        Write-Host "Diagrama CU07 exportado exitosamente a: $outPng" -ForegroundColor Green
    }
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
    Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
}
