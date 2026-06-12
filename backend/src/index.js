import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for easier local development/deployment
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Check if Gemini API key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not set! Ensure it is defined in .env or the deployment environment.');
}

// Initialize the Google Gen AI client if API key is present
let ai = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error('Failed to initialize GoogleGenAI client:', error);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!apiKey,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  });
});

// Chat stream endpoint
app.post('/api/chat/stream', async (req, res) => {
  const { message, history, systemInstruction, customApiKey } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // If a custom API key is sent from the frontend, initialize a temporary client for it
  let client = ai;
  if (customApiKey) {
    try {
      client = new GoogleGenAI({ apiKey: customApiKey });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid custom API key format provided.' });
    }
  }

  if (!client) {
    return res.status(500).json({ 
      error: 'Gemini API Key is not configured on the server. Please set the GEMINI_API_KEY env variable or enter your key in the settings panel.' 
    });
  }

  // Set up chunked transfer headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Construct contents array for Gemini
    const contents = [];

    // Map frontend history to Gemini content structure
    // Frontend structure: [{ sender: 'user'|'ai', text: '...' }]
    // Gemini structure: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        const role = msg.sender === 'user' ? 'user' : 'model';
        contents.push({
          role,
          parts: [{ text: msg.text }]
        });
      });
    }

    // Append the current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    
    // Default instruction optimized for voice response (concise, no markdown markers)
    const defaultInstruction = 
      "You are a premium AI voice assistant. " +
      "Since your response will be read aloud, keep answers concise, natural, and conversational (ideally 1-3 sentences). " +
      "Avoid lists, bullet points, asterisks, or markdown formatting, as they disrupt speech synthesis. " +
      "If the user asks for a detailed explanation, keep it friendly and split information into small readable paragraphs. " +
      `Additionally, the user's current date and time is ${new Date().toLocaleString('en-US')}. Use this to answer queries about today's date, time, or relative schedules.`;

    const systemInstructionConfig = systemInstruction || defaultInstruction;

    // Call generateContentStream
    const responseStream = await client.models.generateContentStream({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstructionConfig,
        temperature: 0.7,
      }
    });

    // Stream the chunks back to the client
    for await (const chunk of responseStream) {
      if (chunk.text) {
        // SSE format: data: chunkText
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    // Send closing SSE message
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error generating content stream:', error);
    // Send error message in SSE format so the client can catch and display it
    res.write(`data: ${JSON.stringify({ error: error.message || 'Error occurred while communicating with Gemini API.' })}\n\n`);
    res.end();
  }
// Auth login endpoint using Supabase REST API
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Supabase credentials are not configured on the server. Please check your backend .env file.' 
    });
  }

  try {
    // Query Supabase directly via its REST API (no extra npm packages needed)
    const supabaseEndpoint = `${supabaseUrl}/rest/v1/admin_users?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=*`;
    
    const response = await fetch(supabaseEndpoint, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supabase query failed:', errText);
      return res.status(401).json({ 
        error: 'Database connection failed. If you enabled Row Level Security (RLS) on Supabase, please disable RLS or ensure a SELECT policy allows read access, or use the Service Role key instead of Anon Key.' 
      });
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      // Credentials verified! Return a mock session token
      return res.json({ success: true, token: 'session_token_echosphere_2026' });
    } else {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// Serve static files from the React frontend build
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Fallback for Single Page App routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Static assets not found. Make sure to build the frontend first.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
