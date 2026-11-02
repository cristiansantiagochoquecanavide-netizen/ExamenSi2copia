if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== OBJETOS EN DIAGRAMA 53 (CU04) ==="
$cmd.CommandText = @"
SELECT o.Object_ID, o.Name, o.Object_Type, o.Stereotype, do.RectLeft, do.RectTop, do.RectRight, do.RectBottom
FROM t_diagramobjects do
INNER JOIN t_object o ON do.Object_ID = o.Object_ID
WHERE do.Diagram_ID = 53
ORDER BY do.RectLeft
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("ID: " + $reader["Object_ID"] + " | Name: " + $reader["Name"] + " | Type: " + $reader["Object_Type"] + " | Stereo: " + $reader["Stereotype"])
}
$reader.Close()

Write-Host "`n=== CONECTORES EN DIAGRAMA 53 (CU04) ==="
$cmd.CommandText = @"
SELECT c.Connector_ID, c.Name, c.Connector_Type, c.Start_Object_ID, o1.Name AS SrcName, c.End_Object_ID, o2.Name AS DstName
FROM (t_connector c
INNER JOIN t_object o1 ON c.Start_Object_ID = o1.Object_ID)
INNER JOIN t_object o2 ON c.End_Object_ID = o2.Object_ID
WHERE c.Start_Object_ID IN (SELECT Object_ID FROM t_diagramobjects WHERE Diagram_ID = 53)
  AND c.End_Object_ID IN (SELECT Object_ID FROM t_diagramobjects WHERE Diagram_ID = 53)
ORDER BY c.Connector_ID
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ($reader["SrcName"] + " --[" + $reader["Name"] + " (" + $reader["Connector_Type"] + ")]--> " + $reader["DstName"])
}
$reader.Close()
$conn.Close()
