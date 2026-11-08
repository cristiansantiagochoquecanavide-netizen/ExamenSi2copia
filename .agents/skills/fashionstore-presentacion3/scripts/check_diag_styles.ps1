if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== DIAGRAM 63 vs DIAGRAM 73 ==="
$cmd.CommandText = "SELECT Diagram_ID, Name, StyleEx, ExtendedStyle, PDATA FROM t_diagram WHERE Diagram_ID IN (63, 73)"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("`nID: " + $reader["Diagram_ID"] + " | Name: " + $reader["Name"])
    Write-Host ("StyleEx: " + $reader["StyleEx"])
    Write-Host ("ExtendedStyle: " + $reader["ExtendedStyle"])
    Write-Host ("PDATA: " + $reader["PDATA"])
}
$reader.Close()

$conn.Close()
