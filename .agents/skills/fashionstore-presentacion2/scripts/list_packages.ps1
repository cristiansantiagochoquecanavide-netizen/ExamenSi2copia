$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT Package_ID, Parent_ID, Name FROM t_package ORDER BY Package_ID")
while (-not $rs.EOF) {
    Write-Host ("{0} | Parent:{1} | {2}" -f $rs.Fields.Item("Package_ID").Value, $rs.Fields.Item("Parent_ID").Value, $rs.Fields.Item("Name").Value)
    $rs.MoveNext()
}
$conn.Close()
