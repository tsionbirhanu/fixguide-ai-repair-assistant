# ✅ FixGuide AI Backend Setup Checklist

Follow this checklist to get the backend running successfully.

## Step 1: Environment Setup ✓

- [x] Python 3.11+ installed
- [ ] Virtual environment created
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- [ ] Dependencies installed
  ```powershell
  pip install -r requirements.txt
  ```

## Step 2: Get API Keys 🔑

### Required Keys

#### 1. Google Gemini API Key ⭐ REQUIRED

- [ ] Visit https://ai.google.dev
- [ ] Click "Get API Key in Google AI Studio"
- [ ] Create or select a project
- [ ] Copy the API key
- [ ] Add to `.env` as `GEMINI_API_KEY=your_key_here`

#### 2. Supabase Setup ⭐ REQUIRED

- [ ] Create account at https://supabase.com
- [ ] Create a new project
- [ ] Go to Settings → API
- [ ] Copy **Project URL** → Add to `.env` as `SUPABASE_URL`
- [ ] Copy **anon public** key → Add to `.env` as `SUPABASE_ANON_KEY`
- [ ] Copy **service_role** key → Add to `.env` as `SUPABASE_SERVICE_KEY`

#### 3. Tavily API Key (Optional - for web search fallback)

- [ ] Visit https://tavily.com
- [ ] Sign up for free account
- [ ] Copy API key
- [ ] Add to `.env` as `TAVILY_API_KEY=your_key_here`

## Step 3: Configure .env File 📝

- [ ] Copy `.env.example` to `.env` (or use existing `.env`)
- [ ] Fill in all required values:
  ```env
  GEMINI_API_KEY=your_actual_gemini_key
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_ANON_KEY=your_actual_anon_key
  SUPABASE_SERVICE_KEY=your_actual_service_key
  TAVILY_API_KEY=your_tavily_key (optional)
  ```

## Step 4: Setup Supabase Database 💾

- [ ] Go to your Supabase project dashboard
- [ ] Navigate to **SQL Editor**
- [ ] Click "New Query"
- [ ] Copy entire content of `supabase_schema.sql`
- [ ] Paste and click "Run"
- [ ] Verify tables created:
  - [ ] `messages` table exists
  - [ ] `token_usage` table exists
  - [ ] RLS policies are enabled

## Step 5: Verify Configuration ✅

Run this test command:

```powershell
.\venv\Scripts\python.exe -c "from app.core.config import settings; print('Config OK'); print(f'Supabase: {settings.SUPABASE_URL}'); print(f'Gemini: {len(settings.GEMINI_API_KEY)} chars')"
```

Expected output:

```
Config OK
Supabase: https://xxxxx.supabase.co
Gemini: 39 chars (or similar)
```

## Step 6: Start the Server 🚀

- [ ] Run the server:
  ```powershell
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- [ ] Server starts without errors
- [ ] Visit http://localhost:8000/health
- [ ] Should see: `{"status": "healthy", ...}`
- [ ] Visit http://localhost:8000/docs
- [ ] Swagger UI loads successfully

## Step 7: Test the API 🧪

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected: `{"status": "healthy"}`

### Test 2: Signup

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123456"}'
```

Expected: Success response with user data

### Test 3: Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123456"}'
```

Expected: Success response with `access_token`

### Test 4: Chat (use access_token from login)

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"message": "How do I fix my phone screen?"}'
```

Expected: Streaming response with repair guidance

## Common Issues & Solutions 🔧

### Issue: "GEMINI_API_KEY not configured"

- **Fix**: Make sure you added the actual API key to `.env`, not the placeholder

### Issue: "Supabase credentials not configured"

- **Fix**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are in `.env`

### Issue: "Module not found" errors

- **Fix**: Make sure virtual environment is activated and dependencies are installed
  ```powershell
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  ```

### Issue: Database/Table errors

- **Fix**: Run the `supabase_schema.sql` in Supabase SQL Editor

### Issue: CORS errors from frontend

- **Fix**: Add your frontend URL to `CORS_ORIGINS` in `.env`
  ```env
  CORS_ORIGINS=http://localhost:3000,http://localhost:5173
  ```

## ✨ Success Indicators

You're ready when:

- ✅ Server starts without errors
- ✅ `/health` endpoint returns healthy status
- ✅ `/docs` shows Swagger UI
- ✅ Can signup and login via API
- ✅ Can send chat messages and get responses
- ✅ Messages are saved to Supabase

## 🎯 Next Steps

1. **Frontend Setup**: Move to the frontend folder and set it up
2. **Test Integration**: Ensure frontend can communicate with backend
3. **Try Real Queries**: "How to fix iPhone 13 screen"
4. **Monitor Logs**: Watch the terminal for tool usage and streaming

---

**Need Help?**

- Check the main README.md for detailed documentation
- Review the API docs at http://localhost:8000/docs
- Verify all environment variables are set correctly

**Happy Building! 🚀**
