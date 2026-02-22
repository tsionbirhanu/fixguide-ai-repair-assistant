# 🧪 API Testing Guide

Quick reference for testing all backend endpoints.

## Prerequisites

- Server running at http://localhost:8000
- For protected endpoints: You need an `access_token` (get from login)

---

## 1️⃣ Health Check

**No authentication required**

```bash
curl http://localhost:8000/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "service": "FixGuideAI Backend",
  "version": "0.1.0"
}
```

---

## 2️⃣ Signup

**Create a new user account**

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourname@example.com",
    "password": "securepass123"
  }'
```

**PowerShell Version:**

```powershell
$body = @{
    email = "yourname@example.com"
    password = "securepass123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/signup" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

**Expected Response:**

```json
{
  "success": true,
  "user": { "id": "...", "email": "..." },
  "session": { ... },
  "message": "Signup successful. Please check your email for verification."
}
```

---

## 3️⃣ Login

**Get access token**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourname@example.com",
    "password": "securepass123"
  }'
```

**PowerShell Version:**

```powershell
$body = @{
    email = "yourname@example.com"
    password = "securepass123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

# Save token for later use
$token = $response.access_token
Write-Host "Token: $token"
```

**Expected Response:**

```json
{
  "success": true,
  "user": { ... },
  "session": { ... },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

**⚠️ IMPORTANT: Save the `access_token` - you'll need it for all protected endpoints!**

---

## 4️⃣ Chat Stream (Protected)

**Send a repair question and get streaming response**

**Replace `YOUR_ACCESS_TOKEN` with the token from login!**

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "How do I fix my PS5 overheating issue?"
  }'
```

**PowerShell Version:**

```powershell
$token = "YOUR_ACCESS_TOKEN"  # Use token from login

$body = @{
    message = "How do I fix my PS5 overheating issue?"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/chat/stream" `
  -Method Post `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body
```

**Expected Response (Server-Sent Events):**

```
data: {"type":"status","content":"Searching for repair guide..."}

data: {"type":"status","content":"Using search_ifixit_repair_guide..."}

data: {"type":"token","content":"#"}

data: {"type":"token","content":" PS5"}

data: {"type":"token","content":" Overheating"}

...

data: {"type":"done","thread_id":"abc-123"}
```

**Test Different Queries:**

```json
{"message": "How to replace iPhone 13 screen?"}
{"message": "My Nintendo Switch won't charge"}
{"message": "Xbox controller drift fix"}
{"message": "Laptop keyboard not working"}
```

---

## 5️⃣ Get User Statistics (Protected)

**Check your usage analytics**

```bash
curl http://localhost:8000/api/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**PowerShell Version:**

```powershell
$token = "YOUR_ACCESS_TOKEN"

Invoke-RestMethod -Uri "http://localhost:8000/api/stats" `
  -Headers @{ Authorization = "Bearer $token" }
```

**Expected Response:**

```json
{
  "total_messages": 42,
  "total_tokens": 15000,
  "total_conversations": 5
}
```

---

## 6️⃣ Logout (Protected)

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**PowerShell Version:**

```powershell
$token = "YOUR_ACCESS_TOKEN"

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/logout" `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token" }
```

---

## 🧪 Full Testing Script (PowerShell)

Save this as `test-api.ps1`:

```powershell
# FixGuide AI - Full API Test Script

$baseUrl = "http://localhost:8000"
$email = "test$(Get-Random)@example.com"  # Random email
$password = "testpass123"

Write-Host "🧪 Testing FixGuide AI Backend" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "1️⃣ Testing Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health"
Write-Host "✅ Status: $($health.status)" -ForegroundColor Green
Write-Host ""

# 2. Signup
Write-Host "2️⃣ Testing Signup..." -ForegroundColor Yellow
$signupBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $signupResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/signup" `
        -Method Post -ContentType "application/json" -Body $signupBody
    Write-Host "✅ Signup successful: $email" -ForegroundColor Green
} catch {
    Write-Host "❌ Signup failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Login
Write-Host "3️⃣ Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.access_token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "📝 Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}
Write-Host ""

# 4. Chat Stream (note: streaming is limited in PowerShell)
Write-Host "4️⃣ Testing Chat..." -ForegroundColor Yellow
$chatBody = @{
    message = "How to fix PlayStation 5 overheating?"
} | ConvertTo-Json

try {
    Write-Host "Sending chat request (streaming not fully shown in PowerShell)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "$baseUrl/api/chat/stream" `
        -Method Post -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body $chatBody | Out-Null
    Write-Host "✅ Chat endpoint working" -ForegroundColor Green
} catch {
    Write-Host "❌ Chat failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 5. Get Stats
Write-Host "5️⃣ Testing User Stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/stats" `
        -Headers @{ Authorization = "Bearer $token" }
    Write-Host "✅ Stats retrieved:" -ForegroundColor Green
    Write-Host "   Messages: $($stats.total_messages)" -ForegroundColor Gray
    Write-Host "   Tokens: $($stats.total_tokens)" -ForegroundColor Gray
    Write-Host "   Conversations: $($stats.total_conversations)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Stats failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 6. Logout
Write-Host "6️⃣ Testing Logout..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" `
        -Method Post -Headers @{ Authorization = "Bearer $token" } | Out-Null
    Write-Host "✅ Logout successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Logout failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎉 Testing Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
```

**Run the test script:**

```powershell
.\test-api.ps1
```

---

## 🌐 Using Swagger UI (Recommended)

The easiest way to test is using the built-in Swagger UI:

1. **Open in browser**: http://localhost:8000/docs

2. **Test Authentication**:

   - Find `/api/auth/signup` → Click "Try it out"
   - Enter email and password → Execute
   - Copy the `access_token` from response

3. **Authorize**:

   - Click the green "Authorize" button at top
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
   - Click "Authorize"

4. **Test Chat**:

   - Find `/api/chat/stream` → Click "Try it out"
   - Enter message → Execute
   - See streaming response

5. **Check Stats**:
   - Find `/api/stats` → Click "Try it out"
   - Execute to see your usage

---

## 🐛 Troubleshooting

### "401 Unauthorized"

- Token expired or invalid
- Make sure to include `Bearer ` prefix
- Login again to get new token

### "Missing authorization header"

- Forgot to add `-H "Authorization: Bearer TOKEN"`
- Check token is not empty

### "GEMINI_API_KEY not configured"

- Add real Gemini API key to `.env`
- Restart the server

### "Supabase credentials not configured"

- Check `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Restart the server

---

## 📝 Response Types

### Status Events (SSE)

```json
{"type": "status", "content": "Searching iFixit..."}
{"type": "status", "content": "Using search_ifixit_repair_guide..."}
{"type": "status", "content": "Processing results..."}
```

### Token Events (SSE)

```json
{ "type": "token", "content": "word " }
```

### Completion Event (SSE)

```json
{ "type": "done", "thread_id": "abc-123-xyz" }
```

### Error Event (SSE)

```json
{ "type": "error", "content": "Error: Something went wrong" }
```

---

**Happy Testing! 🚀**
