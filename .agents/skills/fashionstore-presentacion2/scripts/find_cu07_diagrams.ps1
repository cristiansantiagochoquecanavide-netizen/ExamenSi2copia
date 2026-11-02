if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== BUSCAR DIAGRAMA CU07 EN REPOSITORIO ==="
$cmd.CommandText = "SELECT Diagram_ID, Package_ID, Name, Diagram_Type FROM t_diagram WHERE Name LIKE '%CU07%'"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("ID: " + $reader["Diagram_ID"] + " | Pkg: " + $reader["Package_ID"] + " | Type: " + $reader["Diagram_Type"] + " | Name: " + $reader["Name"])
}
$reader.Close()

$conn.Close()
