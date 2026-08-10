$url = 'http://127.0.0.1:51888'

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 1
    if ($health.app -eq 'fund-dashboard') {
      Start-Process $url
      exit 0
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

exit 1
