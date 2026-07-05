# FixGuide AI Repair Assistant

FixGuide AI is a full-stack AI repair assistant for electronics troubleshooting and device repair. It combines a modern conversational web interface with a FastAPI backend that prioritizes official iFixit repair guides, streams AI responses in real time, supports image-aware chat, and stores user conversations with Supabase.

Live backend:

- API root: https://fixguide-ai-repair-assistant.onrender.com
- Health check: https://fixguide-ai-repair-assistant.onrender.com/health
- API docs: https://fixguide-ai-repair-assistant.onrender.com/docs

## Features

- Modern conversational repair assistant UI built with Next.js and TailwindCSS.
- FastAPI backend with streaming Server-Sent Events responses.
- Gemini-powered repair agent using LangGraph.
- Official iFixit guide lookup with steps, tools, parts, source links, and guide images.
- Tavily web-search fallback when iFixit does not have a matching guide.
- Backend-only API key rotation for Gemini, Tavily, and optional iFixit App IDs.
- Supabase email/password authentication.
- Persistent conversations, message history, and usage stats with Supabase.
- Demo auth mode for local testing without Supabase.
- Image upload support for multimodal repair questions.
- Local browser backup for chat history during demo/local development.
- Light and dark chat themes.

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React icons

Backend:

- FastAPI
- LangGraph
- LangChain
- Google Gemini
- iFixit public API
- Tavily Search API
- Supabase Auth and Postgres
- Uvicorn

## Project Structure

```text
.
|-- Frontend/
|   |-- app/
|   |   |-- chat/
|   |   |-- login/
|   |   |-- signup/
|   |   |-- stats/
|   |   `-- page.tsx
|   |-- components/
|   |-- contexts/
|   |-- hooks/
|   |-- lib/
|   |-- public/
|   |-- package.json
|   `-- next.config.ts
|-- backend/
|   |-- app/
|   |   |-- agent/
|   |   |-- api/
|   |   |-- core/
|   |   `-- main.py
|   |-- tests/
|   |-- requirements.txt
|   |-- supabase_schema.sql
|   `-- start_server.bat
`-- README.md
```

## How It Works

1. The user asks a repair question from the frontend.
2. The frontend sends the message to the FastAPI backend using an authenticated streaming request.
3. The LangGraph agent first searches iFixit for an official repair guide.
4. If no exact iFixit guide is available, the agent can use Tavily web search as fallback.
5. The backend streams status updates and response tokens back to the frontend.
6. Conversation messages and usage stats are saved through Supabase when production auth is enabled.

## Local Setup

### Prerequisites

- Node.js 18 or newer
- Python 3.11 or newer
- Supabase project
- Gemini API key
- Tavily API key for web fallback

### 1. Clone The Repository

```bash
git clone https://github.com/tsionbirhanu/fixguide-ai-repair-assistant.git
cd fixguide-ai-repair-assistant
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

CORS_ORIGINS=http://localhost:3000,https://fixguide-ai-repair-assistant.vercel.app
FRONTEND_URL=http://localhost:3000

GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEYS=

TAVILY_API_KEY=your_tavily_api_key
TAVILY_API_KEYS=

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

DEMO_AUTH=false

IFIXIT_APP_ID=
IFIXIT_APP_IDS=
```

Run the backend:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

- http://localhost:8000
- http://localhost:8000/health
- http://localhost:8000/docs

### 3. Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the full SQL script in `backend/supabase_schema.sql`.
4. Copy the Supabase project URL, anon key, and service role key into `backend/.env`.
5. Open Authentication > URL Configuration in Supabase.
6. Set Site URL to your frontend URL.
7. Add your local and production redirect URLs.

For local development:

```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/**
```

For the deployed app:

```text
Site URL: https://fixguide-ai-repair-assistant.vercel.app
Redirect URLs:
https://fixguide-ai-repair-assistant.vercel.app/**
```

For real persistent sessions, use:

```env
DEMO_AUTH=false
```

For local testing without Supabase persistence, use:

```env
DEMO_AUTH=true
```

Demo auth is useful during development, but production should use Supabase auth.

### 4. Frontend Setup

```bash
cd Frontend
npm install
```

Create `Frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

### Backend Variables

| Name | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Main Gemini API key. |
| `GEMINI_API_KEYS` | No | Comma-separated Gemini key rotation pool. Used before `GEMINI_API_KEY` when set. |
| `TAVILY_API_KEY` | Recommended | Tavily key for web fallback search. |
| `TAVILY_API_KEYS` | No | Comma-separated Tavily key rotation pool. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon public key. |
| `SUPABASE_SERVICE_KEY` | Recommended | Supabase service role key for trusted backend writes. |
| `DEMO_AUTH` | Yes | `false` for production, `true` for local demo mode. |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins. |
| `FRONTEND_URL` | Yes | Frontend URL used in Supabase email verification links. |
| `DEBUG` | Yes | `true` locally, `false` in production. |
| `IFIXIT_APP_ID` | No | Optional iFixit App ID if provided by iFixit. Public guide reads do not usually need it. |
| `IFIXIT_APP_IDS` | No | Optional iFixit App ID rotation pool. |

### Frontend Variables

| Name | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API URL. Exposed to the browser. |

Never put Gemini, Tavily, Supabase service role, or other private backend keys in frontend environment variables.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | API welcome response. |
| `GET` | `/health` | Backend health check. |
| `POST` | `/api/auth/signup` | Create user account. |
| `POST` | `/api/auth/login` | Login and return access token. |
| `POST` | `/api/auth/logout` | Logout current session. |
| `POST` | `/api/chat/stream` | Stream AI chat response. |
| `GET` | `/api/chat/conversations` | List user conversations. |
| `GET` | `/api/chat/conversations/{thread_id}/messages` | Get conversation messages. |
| `PATCH` | `/api/chat/conversations/{thread_id}` | Rename conversation. |
| `DELETE` | `/api/chat/conversations/{thread_id}` | Delete conversation. |
| `GET` | `/api/stats` | Get user usage statistics. |

Interactive API docs are available at:

```text
/docs
```

## Testing

Backend:

```bash
cd backend
.\venv\Scripts\activate
python -m unittest discover tests
```

Frontend:

```bash
cd Frontend
npm run lint
npm run build
```

Current verified checks:

- Backend unit tests pass.
- Frontend lint passes.
- Frontend production build passes.

## Deployment

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database/Auth: Supabase

### Backend On Render

Create a Render Web Service.

Use:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
Instance Type: Free for testing, Starter for always-on production
```

Render environment variables:

```env
DEMO_AUTH=false
DEBUG=false
GEMINI_API_KEY=your_key
GEMINI_API_KEYS=
TAVILY_API_KEY=your_key
TAVILY_API_KEYS=
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
CORS_ORIGINS=http://localhost:3000,https://fixguide-ai-repair-assistant.vercel.app
FRONTEND_URL=https://fixguide-ai-repair-assistant.vercel.app
```

Current deployed backend:

```text
https://fixguide-ai-repair-assistant.onrender.com
```

### Frontend On Vercel

Create a Vercel project from the same repository.

Use:

```text
Root Directory: Frontend
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Vercel environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://fixguide-ai-repair-assistant.onrender.com
```

After Vercel deploys, copy the Vercel frontend URL and add it to the Render backend `CORS_ORIGINS`. The current production frontend origin is `https://fixguide-ai-repair-assistant.vercel.app`.

## Production Checklist

- Set `DEMO_AUTH=false`.
- Run `backend/supabase_schema.sql` in Supabase.
- Add real Supabase, Gemini, and Tavily keys to Render.
- Add only `NEXT_PUBLIC_API_BASE_URL` to Vercel.
- Add Vercel frontend URL to backend `CORS_ORIGINS`.
- Add Vercel frontend URL to backend `FRONTEND_URL`.
- Set Supabase Auth Site URL and Redirect URLs to the Vercel frontend URL.
- Confirm `/health` returns healthy.
- Confirm `/docs` loads.
- Confirm signup, login, chat streaming, and conversation history work.
- Keep `.env`, `.env.local`, and service keys out of Git.
- Use Render Starter or another always-on backend plan for production.

## Common Issues

### The backend works locally but frontend cannot call it

Check `NEXT_PUBLIC_API_BASE_URL` in the frontend and `CORS_ORIGINS` in the backend.

### The app logs out or sessions disappear

If `DEMO_AUTH=true`, sessions are development-mode sessions. Use `DEMO_AUTH=false` with Supabase for production persistence.

### Tavily search fails with ForbiddenError

The Tavily key is invalid, inactive, or does not have search access. Generate a valid Tavily key and update the backend environment.

### iFixit cannot find a guide for a vague repair query

Ask with the exact model:

```text
How to replace iPhone 13 screen?
Samsung Galaxy S21 battery replacement
Google Pixel 7 cracked screen
```

iFixit guide matching works best with a specific device model.

## Security Notes

- Do not commit `.env` files.
- Do not put private API keys in frontend variables.
- Treat all `NEXT_PUBLIC_*` variables as public.
- Restrict CORS to your real frontend domains.
- Use Supabase Row Level Security policies from `supabase_schema.sql`.
- Rotate keys if any secret was committed or exposed.

## Roadmap

- Device model selector for more accurate repair matching.
- Better repair answer sections for tools, parts, warnings, and image galleries.
- Conversation date grouping in the sidebar.
- Admin analytics for failed searches and popular device queries.
- Rate limiting and request size limits.
- End-to-end tests for login and chat streaming.

## License

This project is currently private unless a license is added.
