if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$repo.OpenFile($eapPath)
$diag = $repo.GetDiagramByID(63)
if ($diag) {
    Write-Host "=== DIAGRAM OBJECTS IN DIAGRAM 63 ==="
    foreach ($do in $diag.DiagramObjects) {
        $obj = $repo.GetElementByID($do.ElementID)
        Write-Host ("Element: " + $obj.Name + " (" + $obj.Type + ") | Top=" + $do.top + " Bottom=" + $do.bottom + " Left=" + $do.left + " Right=" + $do.right)
    }

    Write-Host "`n=== DIAGRAM LINKS / CONNECTORS IN DIAGRAM 63 ==="
    foreach ($dl in $diag.DiagramLinks) {
        $con = $repo.GetConnectorByID($dl.ConnectorID)
        Write-Host ("Seq: " + $con.SequenceNo + " | Geometry: " + $dl.Geometry + " | Name: " + $con.Name)
    }
}
$repo.CloseFile()
$repo.Exit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
