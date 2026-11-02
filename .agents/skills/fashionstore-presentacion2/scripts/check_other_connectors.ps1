if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

$cmd.CommandText = @"
SELECT c.Connector_ID, c.DiagramID, c.Connector_Type, c.Name, c.Start_Object_ID, o1.Name AS Src, c.End_Object_ID, o2.Name AS Dst
FROM (t_connector c
INNER JOIN t_object o1 ON c.Start_Object_ID = o1.Object_ID)
INNER JOIN t_object o2 ON c.End_Object_ID = o2.Object_ID
WHERE (c.Start_Object_ID IN (SELECT Object_ID FROM t_diagramobjects WHERE Diagram_ID = 59)
   AND c.End_Object_ID IN (SELECT Object_ID FROM t_diagramobjects WHERE Diagram_ID = 59))
  AND c.DiagramID <> 59
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("CID: " + $reader["Connector_ID"] + " | DiagID: " + $reader["DiagramID"] + " | Type: " + $reader["Connector_Type"] + " | Name: " + $reader["Name"] + " | " + $reader["Src"] + " -> " + $reader["Dst"])
}
$reader.Close()
$conn.Close()
