# Premium Real-time AI Voice Chat App (Gemini API)

A highly polished, production-ready AI voice assistant web application built with **React, TypeScript, Vite, Tailwind CSS (v4)**, and **Node.js/Express**. It securely connects to the **Gemini 2.5 Flash** API via the official `@google/genai` SDK.

The application features glassmorphism aesthetics, fluid micro-animations, built-in Speech-to-Text (STT) and Text-to-Speech (TTS) using browser APIs, session history logging, and a state-of-the-art interactive soundwave indicator.

---

## 🏗️ Architecture

```
User (Voice/Text)
   │
   ▼
Frontend (React + Vite) ──► Speech Recognition (Local Browser Web Speech API)
   │
   ├─► Sending User Text + Conversational History
   ▼
Backend API (Express Server) ──► Proxy to secure API Keys
   │
   ▼
Gemini 2.5 Flash API (Google AI Studio)
   │
   ▼
Backend API (Receiving stream chunks)
   │
   ▼ (Server-Sent Events streaming)
Frontend Rendering ──► Web Speech Synthesis (Local Voice Playback)
```

---

## 📁 File Structure

```
gemini-voice-chat/
├── package.json               # Root monorepo config for concurrent running
├── .gitignore                 # Exclusions for build and sensitive files
├── backend/                   # Backend Express Service
│   ├── package.json           # Node configuration & dependencies
│   ├── .env.example           # Environment template
│   └── src/
│       └── index.js           # Server logic & Gemini API streaming proxy
└── frontend/                  # React Client Application
    ├── package.json           # React dependencies & scripts
    ├── index.html             # Main HTML page
    ├── vite.config.ts         # Vite server settings with API Proxy config
    ├── tsconfig.json          # TypeScript configurations
    └── src/
        ├── main.tsx           # Entry point
        ├── index.css          # CSS styles with Tailwind v4 imports & theme configs
        ├── App.tsx            # Main Chat interface & layout logic
        ├── components/
        │   ├── Sidebar.tsx    # History log and Settings controls
        │   └── VoiceWaveform.tsx # Soundwave indicator animations
        └── hooks/
            ├── useSpeechToText.ts # STT browser SpeechRecognition hook
            └── useTextToSpeech.ts # TTS browser SpeechSynthesis hook
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v20+ recommended).
- A **Gemini API Key**. You can generate one for free at [Google AI Studio](https://aistudio.google.com/).

### 1. Clone & Install Dependencies
From the project root directory, run the setup script to install all packages for the monorepo root, backend, and frontend:
```bash
npm run setup
```

### 2. Configure Environment Variables
Navigate to the `backend/` directory, create a `.env` file, and paste your Gemini API key:
```bash
cd backend
cp .env.example .env
```
Inside the `backend/.env` file:
```env
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🚀 Running the App Locally

Start both the backend API server and frontend React app concurrently with a single command from the **root directory**:
```bash
npm run dev
```

The terminal will launch:
- **Backend Server**: running on `http://localhost:5000`
- **Frontend App**: running on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

> **Note**: For security, if the server doesn't find the `GEMINI_API_KEY` env variable, the frontend settings panel will display a warning and let you input your API key locally.

---

## ☁️ Deployment Guide

### Option 1: Full-Stack Deployment on Render (Recommended)
You can deploy the complete project on Render.

1. **GitHub Repository**: Push this directory to your GitHub account.
2. **Backend Web Service**:
   - Create a new **Web Service** on Render pointing to your repository.
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add `GEMINI_API_KEY` (and `GEMINI_MODEL=gemini-2.5-flash`).
3. **Frontend Static Site**:
   - Create a new **Static Site** on Render pointing to your repository.
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Redirect Rule**: Since this is a Single Page Application, add a Rewrite rule in Render:
     - Source: `/*`
     - Destination: `/index.html`
     - Action: `Rewrite`
   - **API Connection**: Configure the frontend environment variable `VITE_API_URL` to point to your deployed Render Backend Web Service (e.g., `https://your-backend.onrender.com`). *Note: Make sure your frontend fetches from this URL in production.*

---

### Option 2: Deploy Frontend on Vercel / Netlify
You can deploy the frontend on Netlify or Vercel and backend on Render.

#### Vercel (Frontend)
1. Install the Vercel CLI or import the project to the Vercel Dashboard.
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add a `vercel.json` rewrite configuration inside the `frontend` folder for routing fallback:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

#### Netlify (Frontend)
1. Connect your GitHub repository to Netlify.
2. Configure settings:
   - **Base Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Inside the `frontend/public` directory, ensure there is a `_redirects` file with the following content:
   ```text
   /*    /index.html   200
   ```

---

## 🎨 Design Polish Details (2026 Aesthetics)
- **Glassmorphism Panels**: Uses `backdrop-filter: blur(16px)` and translucent borders (`border-white/5`) to fit the high-end dark look.
- **Waveform Micro-Animations**: A canvas/SVG soundwave that dances when the user is speaking, pulses rhythmically when the AI is talking back, and has a gentle breathing effect when idle.
- **Text-to-Speech Markdown Stripper**: The TTS engine automatically filters out asterisks, list dots, code blocks, and headings to read replies back smoothly without awkward pronunciation of formatting symbols.
- **Response Auto-Scroll**: Keep track of the active streaming text with smooth-anchoring scroll indicators.
- **Persistent Sessions**: All conversations and custom settings are automatically saved in local browser storage, allowing you to reload the page without losing your work.
