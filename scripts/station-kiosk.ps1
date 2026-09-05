param(
  [string]$AgentUrl = "http://127.0.0.1:17800/",
  [string]$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $EdgePath)) { $EdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $EdgePath)) { throw "Microsoft Edge not found. Install Edge or pass -EdgePath." }
# The agent page is the only local UI exposed by the station agent. It continuously
# refreshes its station challenge QR and the agent separately enforces session leases.
Start-Process -FilePath $EdgePath -ArgumentList @('--kiosk', $AgentUrl, '--edge-kiosk-type=fullscreen', '--no-first-run', '--disable-pinch', '--overscroll-history-navigation=0')
