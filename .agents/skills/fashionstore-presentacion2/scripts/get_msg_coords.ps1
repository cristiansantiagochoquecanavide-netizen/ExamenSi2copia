if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$repo.OpenFile($eapPath)
$diag = $repo.GetDiagramByID(59)
if ($diag) {
    Write-Host "Diagram Name: " $diag.Name
    foreach ($dl in $diag.DiagramLinks) {
        $con = $repo.GetConnectorByID($dl.ConnectorID)
        Write-Host ("Seq: " + $con.SequenceNo + " | CID: " + $con.ConnectorID + " | Geometry: " + $dl.Geometry + " | Name: " + $con.Name)
    }
}
$repo.CloseFile()
$repo.Exit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
