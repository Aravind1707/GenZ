param(
  [string]$InstallDir = 'C:\GenZ',
  [string]$NodeMajor = '20'
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' was not found. Install Node.js $NodeMajor LTS and Git, then rerun." }
}

Require-Command node
Require-Command npm

$nodeVersion = (node --version).TrimStart('v')
if ([int]($nodeVersion.Split('.')[0]) -lt [int]$NodeMajor) { throw "Node.js $NodeMajor+ is required. Found $nodeVersion." }

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

npm install
npm run build

Write-Host ''
Write-Host 'GenZ build completed successfully.'
Write-Host "Install directory: $InstallDir"
Write-Host 'Next: configure the production .env.local, run npm run db:migrate, then use register-genz-service.ps1 as Administrator.'
