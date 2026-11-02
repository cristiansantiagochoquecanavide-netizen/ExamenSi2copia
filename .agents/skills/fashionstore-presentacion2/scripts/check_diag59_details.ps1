if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== CONECTORES EN DIAGRAMA 59 ==="
$cmd.CommandText = "SELECT Connector_ID, Name, SeqNo, Start_Object_ID, End_Object_ID FROM t_connector WHERE DiagramID = 59 ORDER BY SeqNo, Connector_ID"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("CID: " + $reader["Connector_ID"] + " | Seq: " + $reader["SeqNo"] + " | Name: " + $reader["Name"])
}
$reader.Close()

Write-Host "`n=== OBJETOS EN DIAGRAMA 59 ==="
$cmd.CommandText = @"
SELECT do.Instance_ID, do.Object_ID, o.Name, o.Object_Type, o.Stereotype, do.RectLeft, do.RectTop, do.RectRight, do.RectBottom
FROM t_diagramobjects do
INNER JOIN t_object o ON do.Object_ID = o.Object_ID
WHERE do.Diagram_ID = 59
ORDER BY do.RectTop DESC
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("Inst: " + $reader["Instance_ID"] + " | Name: " + $reader["Name"] + " | Top: " + $reader["RectTop"] + " | Bottom: " + $reader["RectBottom"] + " | L: " + $reader["RectLeft"] + " | R: " + $reader["RectRight"])
}
$reader.Close()
$conn.Close()
