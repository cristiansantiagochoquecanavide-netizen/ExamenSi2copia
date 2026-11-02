$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT Object_ID, Name, Object_Type, Note FROM t_object WHERE Package_ID = 10")
while (-not $rs.EOF) {
    Write-Host ("{0} | {1} | {2}" -f $rs.Fields.Item("Object_ID").Value, $rs.Fields.Item("Name").Value, $rs.Fields.Item("Object_Type").Value)
    if ($rs.Fields.Item("Note").Value) {
        Write-Host ("Note: " + $rs.Fields.Item("Note").Value)
    }
    $rs.MoveNext()
}
$conn.Close()
