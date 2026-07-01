# FixGuide AI Backend

This document describes the current backend implementation in `backend/`, the available features, and the remaining external setup needed to run it against real services.

## Current Verdict

The backend MVP is now code-complete for the features listed below.

The previous unfinished items have been addressed in code:

- Runtime config now tolerates deployment words such as `DEBUG=release`.
- Supabase database access now supports service-role writes and anon-key plus user-JWT RLS fallback.
- Stored thread history is loaded back into the agent before each continued chat turn.
- Conversations now have server-side list, rename, delete, and message-history support.
- iFixit and web-search tool fallback text has been cleaned up.
- iFixit guide selection now scores guides against the user issue instead of always taking the first guide.
- iFixit device search now strips repair-problem words before searching, so queries such as `iPhone 13 screen replacement` can match the `iPhone 13` device.
- Gemini and Tavily can use comma-separated backend-only API key rotation pools.
- Optional iFixit App IDs can also rotate, though public repair-guide reads do not require them.
- Focused automated tests were added under `backend/tests/`.

External setup is still required: configure `.env`, run `supabase_schema.sql` in Supabase, and verify live Gemini/iFixit/Tavily/Supabase calls with real credentials.

## Tech Stack

- FastAPI for the HTTP API.
- LangGraph for the repair-assistant agent workflow.
- LangChain Google GenAI integration with `gemini-2.5-flash`.
- Supabase Auth for signup, login, token verification, and logout.
- Supabase Postgres for conversations, messages, and token usage.
- iFixit public API for official repair guides.
- Tavily for web-search fallback.
- Server-Sent Events for streaming chat responses.

## Backend Structure

```text
backend/
  app/
    main.py                  FastAPI app, CORS, router registration, health route
    api/
      chat.py                Auth, chat streaming, conversations, stats
    core/
      config.py              Environment settings
      api_keys.py            Backend-only Gemini/Tavily/iFixit key rotation
      auth.py                Supabase and demo-mode authentication
      database.py            Supabase persistence and analytics
    agent/
      graph.py               LangGraph agent and Gemini model setup
      ifixit_tool.py         iFixit API integration
      web_search_tool.py     Tavily fallback search
  tests/
    test_backend_units.py    Focused unit/API tests
  requirements.txt           Python dependencies
  supabase_schema.sql        Database schema and RLS policies
  API_TESTING.md             Manual endpoint testing guide
  README.md                  Setup guide
  test_backend.py            Manual/comprehensive backend test script
  test_flow.ps1              PowerShell workflow test
  start_server.bat           Windows server launcher
```

## API Endpoints

Public endpoints:

- `GET /` returns basic API information.
- `GET /health` returns backend health status.

Authentication:

- `POST /api/auth/signup` creates a user with email and password.
- `POST /api/auth/login` logs in a user and returns an access token.
- `POST /api/auth/logout` revokes the token when service-role auth is configured, then returns success so the frontend can clear local auth state.

Protected endpoints:

- `POST /api/chat/stream` streams an AI repair answer over SSE.
- `GET /api/chat/conversations` lists conversation threads.
- `PATCH /api/chat/conversations/{thread_id}` renames a conversation.
- `DELETE /api/chat/conversations/{thread_id}` deletes a conversation and related stored rows.
- `GET /api/chat/conversations/{thread_id}/messages` returns stored messages for one thread.
- `GET /api/stats` returns total messages, estimated tokens, and conversation count.

## Implemented Features

- FastAPI app with Swagger docs at `/docs` and ReDoc at `/redoc`.
- CORS configured from `CORS_ORIGINS`.
- Email/password signup and login through Supabase Auth.
- Real token revocation through Supabase admin logout when `SUPABASE_SERVICE_KEY` is configured.
- Demo authentication mode using in-memory demo tokens when `DEMO_AUTH=true`.
- Bearer-token protected chat, stats, and conversation endpoints.
- SSE chat streaming with events of type `status`, `token`, `done`, and `error`.
- Optional image input support in chat requests through base64 data URLs.
- Stored conversation history is loaded into the agent for continued thread context.
- LangGraph agent with a system prompt that prioritizes official iFixit guides.
- iFixit tool that searches for a device, lists guides, selects the most relevant guide, fetches guide details, and formats steps/tools/parts/images/source links as Markdown.
- iFixit query cleanup for common natural-language repair requests.
- Tavily web-search fallback when iFixit does not have a suitable result.
- Backend-only round-robin key rotation for Gemini, Tavily, and optional iFixit App IDs.
- Supabase `conversations`, `messages`, and `token_usage` persistence.
- Conversation list, rename, delete, and message retrieval.
- Basic usage stats.
- Graceful fallback to in-memory message storage when database operations fail.
- Basic input validation for auth email/password.
- User-friendly auth error messages for common Supabase failures.
- Automated tests for config parsing, guide selection/formatting, and demo conversation APIs.

## Environment Variables

The backend expects these settings:

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

GEMINI_API_KEY=...
GEMINI_API_KEYS=...
TAVILY_API_KEY=...
TAVILY_API_KEYS=...
IFIXIT_APP_ID=
IFIXIT_APP_IDS=

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

DEMO_AUTH=false
LANGCHAIN_API_KEY=
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=fixguide-ai
```

Use either the single-key variables or the comma-separated rotation pools:

- `GEMINI_API_KEY` or `GEMINI_API_KEYS=key1,key2,key3`
- `TAVILY_API_KEY` or `TAVILY_API_KEYS=key1,key2`
- `IFIXIT_APP_ID` or `IFIXIT_APP_IDS=app1,app2` only if iFixit provides App IDs for your integration

iFixit public guide-search endpoints do not require a key. Do not put Gemini, Tavily, iFixit App IDs, or Supabase service-role keys in the frontend. Browser-visible variables such as `NEXT_PUBLIC_API_BASE_URL` are exposed to users.

`DEBUG` and `DEMO_AUTH` accept normal booleans plus common deployment words:

- Truthy: `true`, `1`, `yes`, `on`, `debug`, `dev`, `development`
- Falsy: `false`, `0`, `no`, `off`, `release`, `prod`, `production`

Run the backend from inside the `backend/` folder:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Database

The schema in `supabase_schema.sql` creates:

- `conversations`: one row per user/thread with persistent title and timestamps.
- `messages`: user/assistant messages by `user_id` and `thread_id`.
- `token_usage`: token usage events by `user_id` and `thread_id`.
- Indexes for conversation lists, thread history, and analytics.
- RLS policies for user-owned select, insert, update, and delete access.
- A helper SQL function named `get_user_stats`.

Recommended production setup:

- Set `SUPABASE_SERVICE_KEY` for trusted backend persistence and admin logout.
- Keep RLS enabled for safety.
- Run the updated `supabase_schema.sql` before testing conversation rename/delete.

If `SUPABASE_SERVICE_KEY` is missing, the backend falls back to using the anon key with the user's JWT attached to PostgREST requests.

## Agent Flow

1. The frontend sends a protected `POST /api/chat/stream` request.
2. The backend validates the bearer token with Supabase Auth or demo auth.
3. Saved messages for the `thread_id` are loaded from Supabase or in-memory fallback storage.
4. The new user message is saved.
5. Gemini receives the saved thread history plus the new user message.
6. The model can call:
   - `search_ifixit_repair_guide`
   - `search_web_for_repair_solution`
7. The backend streams status updates and model tokens as SSE.
8. The assistant response and estimated token count are saved.
9. A final `done` event returns the active `thread_id`.

## Verification

Commands run successfully:

```powershell
.\venv\Scripts\python.exe -m compileall app tests
.\venv\Scripts\python.exe -m unittest discover tests
.\venv\Scripts\python.exe -c "from app.main import app; print(app.title); print([r.path for r in app.routes])"
```

Test result:

```text
Ran 7 tests
OK
```

Live iFixit check completed successfully for `iPhone 13 screen replacement`:

- Device match: `iPhone 13`
- Selected guide: `iPhone 13 Screen Replacement`
- Source: `https://www.ifixit.com/Guide/iPhone+13+Screen+Replacement/145897`

Discovered routes include:

- `/`
- `/health`
- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/stats`
- `/api/chat/conversations`
- `/api/chat/conversations/{thread_id}` with PATCH and DELETE
- `/api/chat/conversations/{thread_id}/messages`
- `/api/chat/stream`
- `/docs`
- `/redoc`

## Completion Status

Code-level backend status: finished for the current MVP.

Still required before calling it production-verified:

1. Run the updated Supabase schema in the actual Supabase project.
2. Confirm `.env` contains real `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, and `GEMINI_API_KEY`.
3. Add `TAVILY_API_KEY` or `TAVILY_API_KEYS` if web-search fallback should be active.
4. Run a live end-to-end chat request against the real services.
5. Deploy with production CORS origins and secret management.
