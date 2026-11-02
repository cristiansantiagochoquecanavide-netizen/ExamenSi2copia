# ==============================================================================
# SCRIPT MAESTRO DE AJUSTE EXACTO DE DIAGRAMAS DE SECUENCIA (CU08, CU11, CU12)
# Aplica NType (0=alt, 1=opt, 4=loop)
# Ajusta coordenadas milimétricas para que los fragmentos envuelvan exactamente sus mensajes
# Exporta las imágenes finales limpias y sin solapamiento
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$dir = "C:\Users\HP\Documents\SI2\2doParcial"
$eapFiles = Get-ChildItem -Path $dir -Filter "*.eap" | Select-Object -ExpandProperty FullName

foreach ($eapPath in $eapFiles) {
    Write-Host ">>> Procesando: $eapPath" -ForegroundColor Cyan
    $conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
    $conn.Open()

    # ----------------------------------------------------
    # 1. CU12: Solicitar y Despachar Traspaso
    # ----------------------------------------------------
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU12'"
    $diagId = [int]$cmd.ExecuteScalar()

    if ($diagId -gt 0) {
        Write-Host "Ajustando CU12 (Diagram_ID = $diagId)..." -ForegroundColor Yellow

        # Corregir NTypes
        $cmd.CommandText = "UPDATE t_object SET NType = 0, Stereotype = 'alt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[origen_id != destino_id && stockDisponible >= cantidad]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 4, Stereotype = 'loop', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[para cada item en datosTraspaso.items]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 1, Stereotype = 'opt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[generar_guia_remision == true]'"
        $cmd.ExecuteNonQuery() | Out-Null

        # IDs
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[origen_id != destino_id && stockDisponible >= cantidad]'"
        $idAlt = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[para cada item en datosTraspaso.items]'"
        $idLoop = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[generar_guia_remision == true]'"
        $idOpt = [int]$cmd.ExecuteScalar()

        # Coordenadas CU12:
        # Alt 1: De UI (L=220) a DetalleTraspaso (R=1650). Top=-160 (Msg 3 empieza en -175), Bottom=-635 (después de Msg 15 en -595)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -160, RectBottom = -635, RectLeft = 220, RectRight = 1650, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idAlt"
        $cmd.ExecuteNonQuery() | Out-Null

        # Loop: Anidado en Alt, de Controller (L=440) a DetalleTraspaso (R=1645). Top=-400 (Msg 10 empieza en -420), Bottom=-615 (cubre hasta Msg 15 en -595)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -400, RectBottom = -615, RectLeft = 440, RectRight = 1645, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idLoop"
        $cmd.ExecuteNonQuery() | Out-Null

        # Opt: De UI (L=220) a TraspasoInventario (R=1430). Top=-650 (Msg 17 empieza en -670), Bottom=-835 (Msg 20 termina en -775, Msg 21 en -810)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -650, RectBottom = -835, RectLeft = 220, RectRight = 1430, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idOpt"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # ----------------------------------------------------
    # 2. CU11: Consultar Disponibilidad Multi-sucursal
    # ----------------------------------------------------
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU11'"
    $diagId11 = [int]$cmd.ExecuteScalar()

    if ($diagId11 -gt 0) {
        Write-Host "Ajustando CU11 (Diagram_ID = $diagId11)..." -ForegroundColor Yellow

        # NTypes
        $cmd.CommandText = "UPDATE t_object SET NType = 0, Stereotype = 'alt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[Disponibilidad de Sucursales]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 4, Stereotype = 'loop', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[para cada sucursal en sucursales]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 1, Stereotype = 'opt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[stock_disponible > 0 en sucursal remota]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[Disponibilidad de Sucursales]'"
        $idAlt11 = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[para cada sucursal en sucursales]'"
        $idLoop11 = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[stock_disponible > 0 en sucursal remota]'"
        $idOpt11 = [int]$cmd.ExecuteScalar()

        # Coordenadas CU11:
        # Alt: UI (L=220) a InventarioStock (R=1640). Top=-160, Bottom=-560 (cubre mensajes 3 al 13)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -160, RectBottom = -560, RectLeft = 220, RectRight = 1640, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId11 AND Object_ID = $idAlt11"
        $cmd.ExecuteNonQuery() | Out-Null

        # Loop: Controller (L=440) a InventarioStock (R=1635). Top=-475, Bottom=-545 (cubre mensajes 12 y 13)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -475, RectBottom = -545, RectLeft = 440, RectRight = 1635, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId11 AND Object_ID = $idLoop11"
        $cmd.ExecuteNonQuery() | Out-Null

        # Opt: UI (L=220) a InventarioStock (R=1640). Top=-580, Bottom=-760 (cubre mensajes 15 al 19)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -580, RectBottom = -760, RectLeft = 220, RectRight = 1640, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId11 AND Object_ID = $idOpt11"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # ----------------------------------------------------
    # 3. CU08: Descargar y Almacenar Catálogo
    # ----------------------------------------------------
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU08'"
    $diagId08 = [int]$cmd.ExecuteScalar()

    if ($diagId08 -gt 0) {
        Write-Host "Ajustando CU08 (Diagram_ID = $diagId08)..." -ForegroundColor Yellow

        $cmd.CommandText = "UPDATE t_object SET NType = 0, Stereotype = 'alt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[Sincronizacion Catalogo Local]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 4, Stereotype = 'loop', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[para cada prenda activa y variante]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 1, Stereotype = 'opt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[guia_personalizada == null (Medidas Default)]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_object SET NType = 1, Stereotype = 'opt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[consulta fuera de linea / red no disponible]'"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[Sincronizacion Catalogo Local]'"
        $idAlt08 = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[para cada prenda activa y variante]'"
        $idLoop08 = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[guia_personalizada == null (Medidas Default)]'"
        $idOpt08A = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[consulta fuera de linea / red no disponible]'"
        $idOpt08B = [int]$cmd.ExecuteScalar()

        # Coordenadas CU08
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -140, RectBottom = -470, RectLeft = 220, RectRight = 1640, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId08 AND Object_ID = $idAlt08"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -375, RectBottom = -455, RectLeft = 440, RectRight = 1635, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId08 AND Object_ID = $idLoop08"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -580, RectBottom = -730, RectLeft = 220, RectRight = 1430, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId08 AND Object_ID = $idOpt08A"
        $cmd.ExecuteNonQuery() | Out-Null

        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -750, RectBottom = -910, RectLeft = 220, RectRight = 1640, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId08 AND Object_ID = $idOpt08B"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    $conn.Close()
}

Write-Host ">>> Exportando diagramas desde Enterprise Architect..." -ForegroundColor Cyan
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    foreach ($eapPath in $eapFiles) {
        $repo.OpenFile($eapPath)
        $pkg = $repo.GetPackageByID(14)
        $base = [System.IO.Path]::GetFileNameWithoutExtension($eapPath)
        foreach ($diag in $pkg.Diagrams) {
            $cu = ""
            if ($diag.Name -like "*CU08*") { $cu = "CU08" }
            elseif ($diag.Name -like "*CU11*") { $cu = "CU11" }
            elseif ($diag.Name -like "*CU12*") { $cu = "CU12" }
            if ($cu -ne "") {
                $outPng = Join-Path $dir "$($base)_$($cu)_secuencia_EA.png"
                $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
                Write-Host "Exportado: $outPng" -ForegroundColor Green
            }
        }
        $repo.CloseFile()
    }
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
} catch {
    Write-Warning "Fallo al exportar con EA COM: $_"
}
