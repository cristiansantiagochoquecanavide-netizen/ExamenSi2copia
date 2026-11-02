if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT dl.ConnectorID, c.SeqNo, c.Name, dl.Geometry, dl.Style FROM t_diagramlinks dl INNER JOIN t_connector c ON dl.ConnectorID = c.Connector_ID WHERE dl.DiagramID = 63 ORDER BY c.SeqNo"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("Seq: " + $reader["SeqNo"] + " | Name: " + $reader["Name"] + " | Geo: " + $reader["Geometry"] + " | Style: " + $reader["Style"])
}
$conn.Close()
