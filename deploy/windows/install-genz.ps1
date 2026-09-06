param(
  [string]$InstallDir = 'C:\GenZ',
  [int]$NodeMajor = 24
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' was not found. Install Node.js $NodeMajor LTS and Git, then rerun." }
}

Require-Command node
Require-Command npm

$nodeVersion = (node --version).TrimStart('v')
$nodeMajorFound = [int]($nodeVersion.Split('.')[0])
if ($nodeMajorFound -ne $NodeMajor) { throw "Node.js $NodeMajor.x is required. Found $nodeVersion." }

$npmVersion = (npm --version).Trim()
$npmMajor = [int]($npmVersion.Split('.')[0])
if ($npmMajor -lt 11 -or $npmMajor -ge 12) { throw "npm 11.x is required. Found $npmVersion." }

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Set-Location $InstallDir

if (-not (Test-Path '.git')) {
  Require-Command git
  git clone 'https://github.com/Aravind1707/GenZ.git' .
} else {
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
}

npm install --no-audit --no-fund
npm run test
npm run build

Write-Host ''
Write-Host 'GenZ production build completed successfully.'
Write-Host "Install directory: $InstallDir"
Write-Host 'Next: configure the production .env.local, verify MySQL credentials, then use register-genz-service.ps1 as Administrator.'
