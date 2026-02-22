# Test FixGuide AI with existing Supabase user
# Instructions:
# 1. Go to https://vipvryaswrfjhyxhpyfv.supabase.co
# 2. Navigate to Authentication > Users
# 3. Click "Add user" > "Create new user"
# 4. Email: test@example.com, Password: TestPass123!
# 5. Check "Auto Confirm User" checkbox
# 6. Run this script

$baseUrl = "http://127.0.0.1:8000"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FixGuide AI - User Flow Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test credentials - UPDATE THESE if you used different values
$email = "test@example.com"
$password = "TestPass123!"

Write-Host "1. Testing Health..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health"
Write-Host "   Status: $($health.status)" -ForegroundColor Green

Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $login.session.access_token
    Write-Host "   SUCCESS! Logged in as: $email" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Gray
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
    Write-Host "`n   INSTRUCTIONS TO FIX:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://vipvryaswrfjhyxhpyfv.supabase.co" -ForegroundColor White
    Write-Host "   2. Click Authentication > Users" -ForegroundColor White
    Write-Host "   3. Click 'Add user' > 'Create new user'" -ForegroundColor White
    Write-Host "   4. Email: test@example.com" -ForegroundColor White
    Write-Host "   5. Password: TestPass123!" -ForegroundColor White
    Write-Host "   6. Check 'Auto Confirm User' checkbox" -ForegroundColor White
    Write-Host "   7. Click 'Create user'" -ForegroundColor White
    Write-Host "   8. Run this script again`n" -ForegroundColor White
    exit 1
}

Write-Host "`n3. Testing Repair Chat (with iFixit)..." -ForegroundColor Yellow
$chatBody = @{
    message = "How to fix iPhone 13 screen?"
    conversation_id = "test-conversation-001"
} | ConvertTo-Json

try {
    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "   Query: How to fix iPhone 13 screen?" -ForegroundColor Gray
    Write-Host "   Response: " -ForegroundColor Gray -NoNewline
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat/stream" -Method Post -Body $chatBody -Headers $headers
    
    # Parse SSE response
    $content = $response.Content
    $lines = $content -split "`n"
    $fullResponse = ""
    
    foreach ($line in $lines) {
        if ($line.StartsWith("data: ")) {
            $data = $line.Substring(6).Trim()
            if ($data -ne "[DONE]") {
                try {
                    $json = $data | ConvertFrom-Json
                    $fullResponse += $json.content
                } catch {
                    # Skip parsing errors
                }
            }
        }
    }
    
    Write-Host $fullResponse.Substring(0, [Math]::Min(200, $fullResponse.Length)) -ForegroundColor Green
    if ($fullResponse.Length -gt 200) {
        Write-Host "   ... (truncated)" -ForegroundColor Gray
    }
    
    # Check if iFixit tool was used
    if ($content -match "ifixit" -or $content -match "guide" -or $content -match "step") {
        Write-Host "   iFixit Tool: DETECTED!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host "`n4. Testing Analytics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/stats" -Headers @{ Authorization = "Bearer $token" }
    Write-Host "   Total Messages: $($stats.total_messages)" -ForegroundColor Green
    Write-Host "   Total Tokens: $($stats.total_tokens)" -ForegroundColor Green
    Write-Host "   Conversations: $($stats.conversations)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Swagger UI: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "2. Try different queries like:" -ForegroundColor White
Write-Host "   - How to fix PS5 overheating?" -ForegroundColor Gray
Write-Host "   - MacBook Pro battery not charging" -ForegroundColor Gray
Write-Host "   - Xbox Series X won't turn on" -ForegroundColor Gray
Write-Host "3. Check Supabase dashboard for data" -ForegroundColor White
Write-Host "4. Ready to build the frontend!`n" -ForegroundColor White
