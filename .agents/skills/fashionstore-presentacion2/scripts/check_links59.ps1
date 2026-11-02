if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== TODOS LOS LINKS EN DIAGRAMA 59 ==="
$cmd.CommandText = @"
SELECT dl.ConnectorID, c.Name, c.SeqNo, c.DiagramID
FROM t_diagramlinks dl
LEFT JOIN t_connector c ON dl.ConnectorID = c.Connector_ID
WHERE dl.DiagramID = 59
ORDER BY dl.ConnectorID
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("CID: " + $reader["ConnectorID"] + " | Name: " + $reader["Name"] + " | Seq: " + $reader["SeqNo"] + " | C.DiagID: " + $reader["DiagramID"])
}
$reader.Close()
$conn.Close()
