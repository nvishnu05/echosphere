import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

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
      "If the user asks for a detailed explanation, keep it friendly and split information into small readable paragraphs.";

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
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
