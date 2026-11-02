$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT d.Diagram_ID, d.Name, o.Name AS ObjName, o.Object_Type FROM (t_diagram d INNER JOIN t_diagramobjects do ON d.Diagram_ID = do.Diagram_ID) INNER JOIN t_object o ON do.Object_ID = o.Object_ID WHERE d.Diagram_ID = 6")
while (-not $rs.EOF) {
    Write-Host ("{0} | {1} | {2} ({3})" -f $rs.Fields.Item("Diagram_ID").Value, $rs.Fields.Item("Name").Value, $rs.Fields.Item("ObjName").Value, $rs.Fields.Item("Object_Type").Value)
    $rs.MoveNext()
}
$conn.Close()
