# FixGuide AI - Quick Start Guide

## 🚀 Running the Application

### Step 1: Start the Backend Server

```powershell
# Navigate to backend directory
cd "C:\Users\Hp\Desktop\FixGuide Ai\backend"

# Start the server (this activates venv and runs uvicorn)
.\start_server.bat
```

The backend will run on `http://localhost:8000`

### Step 2: Start the Frontend

```powershell
# Navigate to frontend directory
cd "C:\Users\Hp\Desktop\FixGuide Ai\Frontend"

# Run the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### Step 3: Access the Application

Open your browser and go to: `http://localhost:3000`

## 📖 User Journey

### 1. **Landing Page** (`/`)

- Beautiful homepage showcasing FixGuide AI
- Features section highlighting key benefits
- Popular repairs section
- Call-to-action buttons

### 2. **Sign Up** (`/signup`)

- Click "Get Started" or "Sign Up"
- Enter your email and password (min 6 characters)
- Confirm password
- Submit to create account
- Automatically redirected to chat

### 3. **Login** (`/login`)

- Enter your credentials
- Click "Sign In"
- Redirected to chat interface

### 4. **Chat Interface** (`/chat`)

- Ask questions about device repairs
- Click sample questions for quick start
- Watch real-time streaming responses
- See status updates (e.g., "Searching iFixit...")
- Start new conversations with "New Chat" button
- Access statistics from header

### 5. **Statistics** (`/stats`)

- View total conversations
- See total messages sent
- Check tokens used
- Read usage tips
- Quick actions to return to chat

## 🎨 Design Features

### Color Scheme

- **Soft Orange** (#FF8A65) - Primary actions and branding
- **Deep Gray** (#1F2937) - Headers and secondary elements
- **White** (#FFFFFF) - Light mode background
- **Black** (#0F0F0F) - Dark mode background

### Premium UI Elements

- Smooth transitions and animations
- Rounded corners and shadows
- Responsive design for all devices
- Dark mode support
- Loading states and spinners
- Status indicators

## 💡 Sample Questions

Try these questions in the chat:

- "How to replace iPhone 13 screen?"
- "Fix PS5 overheating issue"
- "Nintendo Switch won't charge"
- "Xbox controller drift fix"
- "Laptop keyboard not working"
- "MacBook won't turn on"

## 🔧 Troubleshooting

### Backend Not Running

- Make sure you're in the backend directory
- Activate virtual environment: `.\venv\Scripts\Activate.ps1`
- Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Frontend Errors

- Check if backend is running on port 8000
- Verify `.env.local` has correct API URL
- Run `npm install` if packages are missing
- Clear `.next` folder and restart: `rm -r .next; npm run dev`

### Authentication Issues

- Clear localStorage in browser dev tools
- Try incognito/private window
- Check backend logs for errors
- Verify Supabase credentials in backend `.env`

## 🎯 Key Features

✅ **Real-time Streaming** - See responses as they're generated
✅ **Context Preservation** - Maintain conversation history
✅ **Tool Integration** - iFixit search and web search
✅ **Status Updates** - Know what the AI is doing
✅ **Responsive Design** - Works on all devices
✅ **Dark Mode** - Easy on the eyes
✅ **Premium UI** - Professional, modern design

## 📝 Notes

- Mock data is used until backend is connected
- All authentication is handled via backend API
- Streaming uses Server-Sent Events (SSE)
- Access tokens stored in localStorage
- Conversation threads managed automatically

## 🎉 Enjoy!

Your premium AI-powered device repair assistant is ready to use!
