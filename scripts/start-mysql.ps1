# Checks if MySQL Server 8.4 is already listening on port 3306; if not, starts it with bezent_dev_data.
$port = 3306
$dataDir = "C:\ProgramData\MySQL\bezent_dev_data"
$mysqld = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"

$conn = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
if ($conn.TcpTestSucceeded) {
    Write-Host "[db] MySQL Server 8.4 is already running on port $port." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $mysqld)) {
    Write-Error "[db] MySQL Server 8.4 executable not found at '$mysqld'."
    exit 1
}

if (-not (Test-Path $dataDir)) {
    Write-Error "[db] MySQL data directory not found at '$dataDir'."
    exit 1
}

Write-Host "[db] Starting MySQL Server 8.4 in background..." -ForegroundColor Yellow
Start-Process -FilePath $mysqld -ArgumentList "--datadir=`"$dataDir`"" -WindowStyle Hidden

# Wait up to 10 seconds for it to start listening
for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 1
    $conn = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) {
        Write-Host "[db] MySQL Server 8.4 is ready on port $port." -ForegroundColor Green
        exit 0
    }
}

Write-Error "[db] Timed out waiting for MySQL Server 8.4 to listen on port $port."
exit 1
