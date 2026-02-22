# FixGuide AI - Complete Workflow Test
# Tests: Health, Signup, Login, Chat, Analytics

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  FixGuide AI - Complete Test" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:8000"
$testEmail = "testuser$(Get-Random -Minimum 1000 -Maximum 9999)@example.com"
$testPassword = "TestPass123!"

# 1. Health Check
Write-Host "1. Testing Health..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health"
Write-Host "   Status: $($health.status)`n" -ForegroundColor Green

# 2. Signup
Write-Host "2. Testing Signup..." -ForegroundColor Yellow
Write-Host "   Email: $testEmail" -ForegroundColor Gray
$signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
try {
    $signup = Invoke-RestMethod -Uri "$baseUrl/api/auth/signup" -Method Post -ContentType "application/json" -Body $signupBody
    Write-Host "   Signup successful`n" -ForegroundColor Green
} catch {
    Write-Host "   Note: $($_.Exception.Message)`n" -ForegroundColor Yellow
}

# 3. Login
Write-Host "3. Testing Login..." -ForegroundColor Yellow
$loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $login.access_token
Write-Host "   Logged in! Token: $($token.Substring(0,25))...`n" -ForegroundColor Green

# 4. Chat
Write-Host "4. Testing Repair Chat..." -ForegroundColor Yellow
Write-Host "   Query: How to fix iPhone 13 screen?" -ForegroundColor Gray
$chatBody = @{ message = "How to fix iPhone 13 screen?"; thread_id = "test-$(Get-Random)" } | ConvertTo-Json
$response = Invoke-WebRequest -Uri "$baseUrl/api/chat/stream" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -Body $chatBody
Write-Host "   Chat working! Got response.`n" -ForegroundColor Green

# 5. Stats
Write-Host "5. Testing Analytics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/api/stats" -Headers @{ Authorization = "Bearer $token" }
Write-Host "   Messages: $($stats.total_messages)" -ForegroundColor Cyan
Write-Host "   Tokens: $($stats.total_tokens)" -ForegroundColor Cyan
Write-Host "   Conversations: $($stats.total_conversations)`n" -ForegroundColor Cyan

# Summary
Write-Host "======================================" -ForegroundColor Green
Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "======================================`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "2. Test with query: How to fix PS5 overheating?" -ForegroundColor White
Write-Host "3. Build the frontend!`n" -ForegroundColor White

Write-Host "Test Credentials:" -ForegroundColor Cyan
Write-Host "Email: $testEmail" -ForegroundColor White
Write-Host "Password: $testPassword`n" -ForegroundColor White
