if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== DETALLES DEL DIAGRAMA 73 ==="
$cmd.CommandText = "SELECT Diagram_ID, Package_ID, Name, Diagram_Type, ea_guid FROM t_diagram WHERE Diagram_ID = 73"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("ID: " + $reader["Diagram_ID"] + " | Pkg: " + $reader["Package_ID"] + " | Name: " + $reader["Name"] + " | Type: " + $reader["Diagram_Type"])
}
$reader.Close()

Write-Host "`n=== OBJETOS EN DIAGRAMA 73 ==="
$cmd.CommandText = @"
SELECT do.Object_ID, o.Name, o.Object_Type, o.Stereotype, do.RectLeft, do.RectTop, do.RectRight, do.RectBottom
FROM t_diagramobjects do
INNER JOIN t_object o ON do.Object_ID = o.Object_ID
WHERE do.Diagram_ID = 73
ORDER BY do.RectLeft
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("ObjID: " + $reader["Object_ID"] + " | " + $reader["Object_Type"] + " | " + $reader["Stereotype"] + " | " + $reader["Name"] + " | Left=" + $reader["RectLeft"] + " Top=" + $reader["RectTop"])
}
$reader.Close()

Write-Host "`n=== CONECTORES EN DIAGRAMA 73 ==="
$cmd.CommandText = @"
SELECT dl.ConnectorID, c.SeqNo, c.Name, c.Connector_Type, c.SubType, o1.Name AS SrcName, o2.Name AS DstName
FROM ((t_diagramlinks dl
INNER JOIN t_connector c ON dl.ConnectorID = c.Connector_ID)
INNER JOIN t_object o1 ON c.Start_Object_ID = o1.Object_ID)
INNER JOIN t_object o2 ON c.End_Object_ID = o2.Object_ID
WHERE dl.DiagramID = 73
ORDER BY c.SeqNo
"@
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("Seq: " + $reader["SeqNo"] + " | " + $reader["SrcName"] + " --[" + $reader["Name"] + " (" + $reader["SubType"] + ")]--> " + $reader["DstName"])
}
$reader.Close()

$conn.Close()
