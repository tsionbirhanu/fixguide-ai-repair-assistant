# FixGuide AI - Repair Assistant Backend

A production-grade AI-powered repair assistant that helps users fix electronics by retrieving verified repair guides from iFixit and providing expert guidance.

## 🎯 Features

- **Official iFixit Integration**: Searches verified repair guides with step-by-step instructions and images
- **Web Search Fallback**: Uses Tavily API when official guides aren't available
- **Gemini AI Agent**: Powered by Google's Gemini 2.0 Flash for intelligent assistance
- **Streaming Responses**: Real-time token-by-token streaming using Server-Sent Events (SSE)
- **Supabase Authentication**: Secure email-based signup/login
- **Usage Analytics**: Track messages, tokens, and conversations per user
- **PostgreSQL Persistence**: Full conversation history with LangGraph checkpointing
- **Production Ready**: Built with FastAPI, LangGraph, and async architecture

## 🏗️ Architecture

```
Backend Stack:
- FastAPI: High-performance async API framework
- LangGraph: Agent orchestration with tool routing
- Google Gemini 2.0 Flash: LLM for intelligent responses
- Supabase: Authentication & PostgreSQL database
- Tavily: Web search fallback
- AsyncPG: Async PostgreSQL driver
```

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Python 3.11+** installed
2. **Supabase Account**: [Sign up at supabase.com](https://supabase.com)
3. **Google AI API Key**: [Get from ai.google.dev](https://ai.google.dev)
4. **Tavily API Key**: [Get from tavily.com](https://tavily.com) (optional, for web search)

## 🚀 Quick Start

### Step 1: Clone and Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```env
# API Server
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
# Optional backend-only rotation pool. If set, this is used before GEMINI_API_KEY.
GEMINI_API_KEYS=

# iFixit public guide search does not require a key.
# Optional App IDs only if iFixit provides them for a complex integration.
IFIXIT_APP_ID=
IFIXIT_APP_IDS=

# Supabase (Get from Supabase Dashboard)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Tavily Search (Optional - for web fallback)
TAVILY_API_KEY=your_tavily_key_here
# Optional backend-only rotation pool. If set, this is used before TAVILY_API_KEY.
TAVILY_API_KEYS=

# iFixit API
# No key required for public repair-guide reads.
# If iFixit gives you App IDs, use IFIXIT_APP_ID or IFIXIT_APP_IDS.
IFIXIT_APP_ID=
IFIXIT_APP_IDS=
```

### Step 3: Setup Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL script from `supabase_schema.sql`:

```sql
-- This creates the messages and token_usage tables
-- Copy and paste the entire content of supabase_schema.sql
```

### Step 4: Get Your API Keys

#### Gemini API Key (Required)

1. Visit [ai.google.dev](https://ai.google.dev)
2. Click "Get API Key"
3. Create a new project or select existing
4. Copy the API key to `.env` as `GEMINI_API_KEY`, or add multiple keys as `GEMINI_API_KEYS=key1,key2,key3`

#### Supabase Keys (Required)

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy **Project URL** → `SUPABASE_URL`
4. Copy **anon public** key → `SUPABASE_ANON_KEY`
5. Copy **service_role** key → `SUPABASE_SERVICE_KEY`

#### Tavily API Key (Optional)

1. Visit [tavily.com](https://tavily.com)
2. Sign up and create an API key
3. Copy to `.env` as `TAVILY_API_KEY`, or add multiple keys as `TAVILY_API_KEYS=key1,key2`

Keep Gemini, Tavily, and Supabase service-role keys in the backend `.env` only. Frontend `NEXT_PUBLIC_*` variables are visible in the browser.

#### iFixit App ID (Usually Not Needed)

Public repair-guide search works without an iFixit key. iFixit only requires an App ID for some complex integrations. If you need one, contact iFixit API support at `api@ifixit.com`, then store it as `IFIXIT_APP_ID` or rotate several with `IFIXIT_APP_IDS=app1,app2`.

### Step 5: Run the Server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at:

- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📡 API Endpoints

### Authentication

#### Signup

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

# Response includes access_token
```

#### Logout

```bash
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Chat (Requires Authentication)

#### Stream Chat

```bash
POST /api/chat/stream
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "message": "How do I fix my PS5 overheating?",
  "thread_id": "optional-thread-id"
}

# Streams Server-Sent Events (SSE)
```

### Analytics

#### Get User Stats

```bash
GET /api/stats
Authorization: Bearer <access_token>

# Response:
{
  "total_messages": 42,
  "total_tokens": 15000,
  "total_conversations": 5
}
```

## 🔧 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── graph.py            # LangGraph agent orchestration
│   │   ├── ifixit_tool.py      # iFixit API integration
│   │   └── web_search_tool.py  # Tavily web search
│   ├── api/
│   │   ├── __init__.py
│   │   └── chat.py             # Chat & auth endpoints
│   └── core/
│       ├── __init__.py
│       ├── config.py           # Environment configuration
│       ├── auth.py             # Supabase auth service
│       └── database.py         # Database & analytics
├── requirements.txt            # Python dependencies
├── supabase_schema.sql        # Database schema
└── .env                       # Environment variables
```

## 🛠️ How It Works

### Agent Flow

1. **User sends message** → Authentication verified
2. **LangGraph Agent** receives message with system prompt
3. **iFixit Tool Priority**: Agent ALWAYS tries iFixit first
4. **Fallback to Web Search**: Only if iFixit returns no results
5. **Streaming Response**: Tokens streamed in real-time via SSE
6. **Analytics Tracking**: Messages & token usage saved to database

### Tool Routing Logic

The agent is instructed to:

1. **First**: Search iFixit for official verified guides
2. **If no results**: Fall back to Tavily web search
3. **Never**: Hallucinate repair steps

This ensures users get verified information first, with community solutions as backup.

## 📊 Database Schema

### messages Table

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- thread_id: TEXT
- role: TEXT (user|assistant|system)
- content: TEXT
- tokens: INTEGER
- created_at: TIMESTAMP
```

### token_usage Table

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- thread_id: TEXT
- tokens: INTEGER
- created_at: TIMESTAMP
```

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure token-based auth via Supabase
- **Environment Variables**: Sensitive keys stored in .env
- **CORS Configuration**: Configurable allowed origins

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY not configured"

**Solution**: Add your Gemini API key to `.env` file

### Issue: "Supabase credentials not configured"

**Solution**: Add SUPABASE_URL and SUPABASE_ANON_KEY to `.env`

### Issue: "No device found on iFixit"

**Solution**: This is expected behavior - the agent will fall back to web search automatically

### Issue: Database connection errors

**Solution**: Make sure you've run the `supabase_schema.sql` in your Supabase SQL Editor

## 📝 Development Notes

### Testing Without VPN

The iFixit API is public and doesn't require VPN for most regions. If you encounter access issues:

1. Try using a VPN
2. Or rely on the web search fallback tool

### Token Estimation

Currently uses simple word count for token estimation. For production:

```python
# Use tiktoken for accurate counting
import tiktoken
encoder = tiktoken.encoding_for_model("gpt-4")
tokens = len(encoder.encode(text))
```

### Streaming Format

The API uses Server-Sent Events (SSE) with this format:

```
data: {"type": "status", "content": "Searching iFixit..."}
data: {"type": "token", "content": "Here "}
data: {"type": "token", "content": "is "}
data: {"type": "done", "thread_id": "123"}
```

## 🚢 Production Deployment

### Environment Variables for Production

```env
DEBUG=false
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=https://yourdomain.com
```

### Recommended Services

- **Backend**: Railway, Render, or Fly.io
- **Database**: Supabase (already included)
- **Frontend**: Vercel or Netlify

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contributing

This is a hackathon project. Feel free to fork and improve!

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ using FastAPI, LangGraph, and Gemini AI**
