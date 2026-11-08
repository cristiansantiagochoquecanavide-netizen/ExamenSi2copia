if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== t_diagramobjects FOR DIAGRAM 63 (CU06) ==="
$cmd.CommandText = "SELECT do.Object_ID, o.Name, do.ObjectStyle, o.Backcolor, o.Bordercolor, o.Stereotype FROM t_diagramobjects do INNER JOIN t_object o ON do.Object_ID = o.Object_ID WHERE do.Diagram_ID = 63"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ($reader["Object_ID"].ToString() + " | " + $reader["Name"] + " | Style=" + $reader["ObjectStyle"] + " | Backcolor=" + $reader["Backcolor"] + " | Stereo=" + $reader["Stereotype"])
}
$reader.Close()

$conn.Close()
