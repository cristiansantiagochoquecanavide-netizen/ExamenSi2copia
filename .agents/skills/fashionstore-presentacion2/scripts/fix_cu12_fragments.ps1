# ==============================================================================
# SCRIPT DE REFINAMIENTO DE CU12 EN ENTERPRISE ARCHITECT
# Corrige NType (0=alt, 1=opt, 4=loop)
# Ajusta coordenadas exactas para que los fragmentos envuelvan exactamente a sus mensajes
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$dir = "C:\Users\HP\Documents\SI2\2doParcial"
$eapFiles = @(
    "C:\Users\HP\Documents\SI2\2doParcial\Grupo #6 -2daPresentación.eap",
    "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
)

foreach ($eapPath in $eapFiles) {
    if (-not (Test-Path $eapPath)) { continue }
    Write-Host "Ajustando coordenadas y NType en: $eapPath" -ForegroundColor Cyan
    $conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
    $conn.Open()

    $cmd = $conn.CreateCommand()
    # 1. Obtener ID del diagrama CU12
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU12'"
    $diagId = [int]$cmd.ExecuteScalar()

    if ($diagId -gt 0) {
        # 2. Corregir NType y Stereotype de fragmentos
        # Alt: NType = 0
        $cmd.CommandText = "UPDATE t_object SET NType = 0, Stereotype = 'alt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[origen_id != destino_id && stockDisponible >= cantidad]'"
        $cmd.ExecuteNonQuery() | Out-Null

        # Loop: NType = 4
        $cmd.CommandText = "UPDATE t_object SET NType = 4, Stereotype = 'loop', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[para cada item en datosTraspaso.items]'"
        $cmd.ExecuteNonQuery() | Out-Null

        # Opt: NType = 1
        $cmd.CommandText = "UPDATE t_object SET NType = 1, Stereotype = 'opt', Backcolor = -1, Bordercolor = 5104464 WHERE [Name] = '[generar_guia_remision == true]'"
        $cmd.ExecuteNonQuery() | Out-Null

        # 3. Obtener Object_IDs
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[origen_id != destino_id && stockDisponible >= cantidad]'"
        $idAlt = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[para cada item en datosTraspaso.items]'"
        $idLoop = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[generar_guia_remision == true]'"
        $idOpt = [int]$cmd.ExecuteScalar()

        # 4. Actualizar RectTop y RectBottom en t_diagramobjects
        # Alt 1: Cubre desde UI (L=220) hasta DetalleTraspaso (R=1650), desde antes de Msg 3 (T=-150) hasta el final del loop (B=-615)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -150, RectBottom = -615, RectLeft = 220, RectRight = 1650, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idAlt"
        $cmd.ExecuteNonQuery() | Out-Null

        # Loop: Anidado dentro del Alt, desde Controller (L=440) hasta DetalleTraspaso (R=1645), desde antes de Msg 10 (T=-400) hasta después de Msg 15 (B=-605)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -400, RectBottom = -605, RectLeft = 440, RectRight = 1645, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idLoop"
        $cmd.ExecuteNonQuery() | Out-Null

        # Opt: Cubre desde UI (L=220) hasta TraspasoInventario (R=1430), desde antes de Msg 17 (T=-635) hasta después de Msg 21 (B=-830)
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -635, RectBottom = -830, RectLeft = 220, RectRight = 1430, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idOpt"
        $cmd.ExecuteNonQuery() | Out-Null

        Write-Host "Coordenadas actualizadas para Diagram_ID = $diagId" -ForegroundColor Green
    }

    $conn.Close()
}

# Exportar imagenes con EA COM
try {
    $ea = New-Object -ComObject "EA.App"
    $repo = $ea.Repository
    foreach ($eapPath in $eapFiles) {
        if (-not (Test-Path $eapPath)) { continue }
        $repo.OpenFile($eapPath)
        $pkg = $repo.GetPackageByID(14)
        foreach ($diag in $pkg.Diagrams) {
            if ($diag.Name -eq "Diagrama de secuencia CU12") {
                $base = [System.IO.Path]::GetFileNameWithoutExtension($eapPath)
                $outPng = Join-Path $dir "$($base)_CU12_secuencia_EA.png"
                $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $outPng, 1)
                Write-Host "Exportado: $outPng" -ForegroundColor Green
            }
        }
        $repo.CloseFile()
    }
    $repo.Exit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
} catch {
    Write-Warning "No se pudo exportar con EA COM: $_"
}
