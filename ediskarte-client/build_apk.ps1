param (
    [string]$TargetIP,
    [string]$BuildType = "Release" # Can be "Release" or "Debug"
)

# eDiskarte APK Automated Build Script
# This script automates building the release APK with your laptop's WiFi or Hotspot IP.

# 1. Resolve IP address
$ip = $TargetIP
if (!$ip) {
    # Auto-detect WiFi IP address
    $ip = (Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -ErrorAction SilentlyContinue).IPAddress
    if (!$ip) {
        # Fallback to general active IPv4
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "127.0.0.1|169.254" } | Select-Object -First 1).IPAddress
    }
}

if (!$ip) {
    Write-Error "Could not detect your laptop's IP address. Please connect to WiFi or pass -TargetIP."
    exit 1
}

Write-Host "Target IP Address: $ip" -ForegroundColor Green

# 2. Update .env files
$envFile = Join-Path $PSScriptRoot ".env"
$androidEnvFile = Join-Path $PSScriptRoot "android\.env"

$envContent = @"
# use this for local wifi deployment
EXPO_PUBLIC_IP_ADDRESS=$ip
EXPO_PUBLIC_API_URL=http://${ip}:3000
"@

Set-Content -Path $envFile -Value $envContent
Set-Content -Path $androidEnvFile -Value $envContent
Write-Host "Updated .env and android/.env with IP $ip" -ForegroundColor Yellow

# 3. Temporarily inline IP in source files to force hardcoded build (bypass worker caching issues)
Write-Host "Inlining IP in source code..." -ForegroundColor Yellow
$files = Get-ChildItem -Recurse -Include *.ts,*.tsx -Path (Join-Path $PSScriptRoot "app") -ErrorAction SilentlyContinue
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'process\.env\.EXPO_PUBLIC_IP_ADDRESS') {
        $content = $content -replace 'process\.env\.EXPO_PUBLIC_IP_ADDRESS', "`"$ip`""
        Set-Content $file.FullName $content
        Write-Host "Inlined in: $($file.Name)"
    }
}

# 4. Clean caches
Write-Host "Cleaning Metro and Gradle caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\haste-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $PSScriptRoot ".expo") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $PSScriptRoot "node_modules\.cache") -ErrorAction SilentlyContinue

# Run gradle clean on app
Push-Location (Join-Path $PSScriptRoot "android")
.\gradlew :app:clean

# 5. Build APK
$gradleTask = if ($BuildType -eq "Debug") { ":app:assembleDebug" } else { ":app:assembleRelease" }
Write-Host "Starting Gradle $BuildType Build..." -ForegroundColor Green
$env:EXPO_PUBLIC_IP_ADDRESS = $ip
$env:EXPO_PUBLIC_API_URL = "http://$ip:3000"
.\gradlew $gradleTask --no-build-cache

Pop-Location

# 6. Restore source code to original state (keep git clean)
Write-Host "Restoring source code (cleaning up temporary inlining)..." -ForegroundColor Yellow
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "`"$ip`"") {
        $content = $content -replace "`"$ip`"", 'process.env.EXPO_PUBLIC_IP_ADDRESS'
        Set-Content $file.FullName $content
    }
}

# 7. Copy out final APK to root
$sourceApk = if ($BuildType -eq "Debug") {
    Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"
} else {
    Join-Path $PSScriptRoot "android\app\build\outputs\apk\release\app-release.apk"
}
$destApkName = if ($BuildType -eq "Debug") { "eDiskarte-debug-$ip.apk" } else { "eDiskarte-$ip.apk" }
$destApk = Join-Path $PSScriptRoot $destApkName

if (Test-Path $sourceApk) {
    Copy-Item $sourceApk $destApk -Force
    Write-Host "`nBUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Your shareable $BuildType APK is ready at:" -ForegroundColor Green
    Write-Host $destApk -ForegroundColor Cyan
} else {
    Write-Error "Build failed: APK not found."
}
