# FixGuide AI - Frontend

A premium, ChatGPT-style UI for FixGuide AI - your AI-powered device repair assistant.

## 🎨 Design System

### Color Palette

- **Soft Orange**: `rgb(255, 138, 101)` - Primary color for CTAs and accents
- **Deep Gray**: `rgb(31, 41, 55)` - Secondary color for headers and cards
- **White**: `rgb(255, 255, 255)` - Light mode background
- **Black**: `rgb(15, 15, 15)` - Dark mode background

### Typography

- **Primary Font**: Geist Sans
- **Monospace Font**: Geist Mono

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running on `http://localhost:8000`

### Installation

```bash
cd Frontend
npm install
```

### Environment Setup

Create a `.env.local` file (already created):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
Frontend/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login page
│   ├── signup/page.tsx       # Signup page
│   ├── chat/page.tsx         # Main chat interface
│   ├── stats/page.tsx        # User statistics dashboard
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── Button.tsx            # Button component
│   ├── Input.tsx             # Input component
│   ├── Logo.tsx              # Logo component
│   ├── Card.tsx              # Card component
│   ├── LoadingSpinner.tsx    # Loading spinner
│   ├── MessageBubble.tsx     # Chat message bubble
│   ├── StatusBadge.tsx       # Status indicator
│   └── index.ts              # Component exports
├── lib/
│   ├── types.ts              # TypeScript type definitions
│   ├── config.ts             # API configuration
│   ├── auth.ts               # Authentication utilities
│   └── utils.ts              # Utility functions
└── public/                   # Static assets
```

## 🔐 Authentication Flow

- Navigate to `/signup` or `/login`
- Access token stored in localStorage
- Protected routes redirect to login if not authenticated

## 💬 Chat Features

- Real-time streaming with Server-Sent Events (SSE)
- Conversation continuity with thread management
- Status indicators for AI processing
- Sample questions for quick start
- Auto-scroll to latest messages

## 📊 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **UI Components**: Custom + shadcn/ui
- **State Management**: React Hooks
- **API Communication**: Fetch API with SSE

## 🎯 Pages

- `/` - Landing page
- `/login` - User login
- `/signup` - User registration
- `/chat` - Main chat interface (protected)
- `/stats` - User statistics (protected)

## 🔧 Build for Production

```bash
npm run build
npm start
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
