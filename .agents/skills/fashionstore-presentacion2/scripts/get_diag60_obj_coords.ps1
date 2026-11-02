if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$repo.OpenFile($eapPath)
$diag = $repo.GetDiagramByID(60)
if ($diag) {
    Write-Host "Diagram Name: " $diag.Name
    # Let's inspect diagramlinks geometry or diagram objects
    foreach ($do in $diag.DiagramObjects) {
        $obj = $repo.GetObjectByID($do.ObjectID)
        Write-Host ("Obj: " + $obj.Name + " | Top: " + $do.top + " | Bottom: " + $do.bottom + " | Left: " + $do.left + " | Right: " + $do.right)
    }
}
$repo.CloseFile()
$repo.Exit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
