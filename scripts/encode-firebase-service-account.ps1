[CmdletBinding()]
param(
    [Parameter()]
    [string]$InputPath,

    [Parameter()]
    [string]$ExpectedProjectId = 'secondopinion-e9051'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($InputPath)) {
    $InputPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads\secondopinion-e9051-firebase-adminsdk-fbsvc-17e186bf4c.json'
}

if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) {
    throw "Firebase service-account file not found: $InputPath"
}

$resolvedPath = (Resolve-Path -LiteralPath $InputPath).Path
$bytes = [System.IO.File]::ReadAllBytes($resolvedPath)

try {
    $serviceAccount = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
}
catch {
    throw "The selected file is not valid UTF-8 JSON: $resolvedPath"
}

if ($serviceAccount.type -ne 'service_account') {
    throw 'The selected JSON is not a Google service-account credential.'
}

if ([string]::IsNullOrWhiteSpace([string]$serviceAccount.private_key)) {
    throw 'The service-account JSON does not contain a private key.'
}

if ($serviceAccount.project_id -ne $ExpectedProjectId) {
    throw "Project mismatch. Expected '$ExpectedProjectId', found '$($serviceAccount.project_id)'."
}

$encoded = [Convert]::ToBase64String($bytes)
Set-Clipboard -Value $encoded

Write-Host 'Firebase service-account Base64 copied to the clipboard.' -ForegroundColor Green
Write-Host "Project: $($serviceAccount.project_id)"
Write-Host "Source:  $resolvedPath"
Write-Host "Length:  $($encoded.Length) characters"
Write-Host 'Paste it into the FIREBASE_SERVICE_ACCOUNT_BASE64 secret. The secret itself was not printed.'
