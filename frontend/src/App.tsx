import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Send, 
  Volume2, 
  VolumeX, 
  Menu, 
  Sparkles, 
  AlertCircle, 
  CornerDownLeft
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import type { ChatSession } from './components/Sidebar';
import { VoiceWaveform } from './components/VoiceWaveform';
import { useSpeechToText } from './hooks/useSpeechToText';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { Login } from './components/Login';

const STARTER_PROMPTS = [
  { icon: '🌟', text: 'Explain dark matter in simple words.' },
  { icon: '🎭', text: 'Tell me a short sci-fi story.' },
  { icon: '🧠', text: 'Give me a quick brain teaser.' },
  { icon: '🌿', text: 'What are 3 daily habits for stress relief?' }
];

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(() => !!localStorage.getItem('echosphere-auth-token'));
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('gemini-custom-api-key') || '');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastToggleTime = useRef(0);

  // Initialize Speech hooks
  const tts = useTextToSpeech(isVoiceEnabled);
  const stt = useSpeechToText();

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('echosphere-auth-token', token);
    setIsAuthorized(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('echosphere-auth-token');
    setIsAuthorized(false);
    tts.stop();
    stt.stopListening();
  };

  // Auth gate check
  if (!isAuthorized) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Check backend configuration status on load
  const checkBackendStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setBackendConfigured(data.apiKeyConfigured);
      setSystemError(null);
    } catch (error) {
      console.warn('Backend is offline or unreachable.', error);
      setBackendConfigured(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    checkBackendStatus();
    
    // Load chat sessions from localStorage
    const savedSessions = localStorage.getItem('gemini-voice-sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewChat();
        }
      } catch (e) {
        console.error('Failed to parse saved sessions', e);
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, [isAuthorized]);

  // Sync sessions with LocalStorage
  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem('gemini-voice-sessions', JSON.stringify(updatedSessions));
  };

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isLoading, stt.transcript]);

  // Adjust text area height dynamically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(120, inputRef.current.scrollHeight)}px`;
    }
  }, [input]);

  // Sync speech transcript into input area in real-time directly
  useEffect(() => {
    if (stt.isListening) {
      setInput(stt.transcript);
    }
  }, [stt.transcript, stt.isListening]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '',
      messages: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newSession, ...sessions];
    saveSessionsToStorage(updated);
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    tts.stop();
    stt.stopListening();
    setShowMobileSidebar(false);
  };

  const handleDeleteSession = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    tts.stop();
    const updated = sessions.filter(s => s.id !== id);
    saveSessionsToStorage(updated);
    
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        const fallbackSession: ChatSession = {
          id: Date.now().toString(),
          title: '',
          messages: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        saveSessionsToStorage([fallbackSession]);
        setActiveSessionId(fallbackSession.id);
      }
    }
  };

  const handleClearAll = () => {
    tts.stop();
    stt.stopListening();
    saveSessionsToStorage([]);
    createNewChat();
  };

  const handleSaveCustomApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('gemini-custom-api-key', key);
  };

  const toggleMic = () => {
    const now = Date.now();
    if (now - lastToggleTime.current < 400) return;
    lastToggleTime.current = now;

    if (stt.isListening) {
      stt.stopListening();
    } else {
      tts.stop();
      stt.startListening();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const finalMessage = (textToSend || input || stt.transcript).trim();
    if (!finalMessage) return;

    // Reset input states
    setInput('');
    stt.resetTranscript();
    stt.stopListening();
    tts.stop();
    setIsLoading(true);
    setSystemError(null);

    // 1. Update session chat logs with user message
    const userMsg = {
      sender: 'user' as const,
      text: finalMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let updatedMessages = activeSession ? [...activeSession.messages, userMsg] : [userMsg];
    let updatedTitle = activeSession?.title || (finalMessage.length > 28 ? finalMessage.substring(0, 28) + '...' : finalMessage);
    
    let updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: updatedTitle,
          messages: updatedMessages
        };
      }
      return s;
    });
    saveSessionsToStorage(updatedSessions);

    // 2. Add empty AI bubble which we will populate with streamed text
    const aiMsgPlaceholder = {
      sender: 'ai' as const,
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    updatedMessages = [...updatedMessages, aiMsgPlaceholder];
    updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: updatedMessages };
      }
      return s;
    });
    setSessions(updatedSessions);

    // 3. Request streaming response from Express backend
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: finalMessage,
          history: activeSession ? activeSession.messages : [], // send history for context
          customApiKey: customApiKey || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported by the backend response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                streamedResponse += parsed.text;
                // Live update the last message in current session
                setSessions(prevSessions => 
                  prevSessions.map(s => {
                    if (s.id === activeSessionId) {
                      const msgs = [...s.messages];
                      if (msgs.length > 0 && msgs[msgs.length - 1].sender === 'ai') {
                        msgs[msgs.length - 1] = {
                          ...msgs[msgs.length - 1],
                          text: streamedResponse
                        };
                      }
                      return { ...s, messages: msgs };
                    }
                    return s;
                  })
                );
              }
            } catch (err) {
              console.error('Failed to parse SSE data:', err);
            }
          }
        }
      }

      // Sync and save final session data to localstorage using latest state
      setSessions(prevSessions => {
        const finalSessions = prevSessions.map(s => {
          if (s.id === activeSessionId) {
            const msgs = [...s.messages];
            if (msgs.length > 0 && msgs[msgs.length - 1].sender === 'ai') {
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                text: streamedResponse
              };
            }
            return { ...s, messages: msgs };
          }
          return s;
        });
        localStorage.setItem('gemini-voice-sessions', JSON.stringify(finalSessions));
        return finalSessions;
      });
      setIsLoading(false);

      // Play back TTS if enabled
      if (isVoiceEnabled && streamedResponse) {
        tts.speak(streamedResponse);
      }

    } catch (error: any) {
      console.error('API Call Failed:', error);
      setIsLoading(false);
      
      const errorText = error.message || 'Connecting to backend failed. Make sure your local server is running on port 5000.';
      setSystemError(errorText);

      // Replace assistant message placeholder with error
      setSessions(prevSessions => 
        prevSessions.map(s => {
          if (s.id === activeSessionId) {
            const msgs = [...s.messages];
            if (msgs.length > 0 && msgs[msgs.length - 1].sender === 'ai') {
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                text: `⚠️ ERROR: ${errorText}`
              };
            }
            return { ...s, messages: msgs };
          }
          return s;
        })
      );
    }
  };

  // Determine current soundwave state
  let waveformState: 'idle' | 'listening' | 'speaking' = 'idle';
  if (stt.isListening) {
    waveformState = 'listening';
  } else if (tts.isSpeaking) {
    waveformState = 'speaking';
  }

  // Handle errors from speech hooks
  const speechError = stt.error;

  return (
    <div className="flex w-full h-full bg-[#08070b] overflow-hidden text-zinc-100">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={createNewChat}
          onDeleteSession={handleDeleteSession}
          onClearAll={handleClearAll}
          voices={tts.voices}
          selectedVoiceName={tts.selectedVoiceName}
          onSelectVoice={tts.setSelectedVoiceByName}
          customApiKey={customApiKey}
          onSaveCustomApiKey={handleSaveCustomApiKey}
          backendConfigured={backendConfigured}
          onLogout={handleLogout}
        />
      </div>

      {/* Sidebar Overlay for Mobile */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-80 h-full animate-slide-up">
            <Sidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={createNewChat}
              onDeleteSession={handleDeleteSession}
              onClearAll={handleClearAll}
              voices={tts.voices}
              selectedVoiceName={tts.selectedVoiceName}
              onSelectVoice={tts.setSelectedVoiceByName}
              customApiKey={customApiKey}
              onSaveCustomApiKey={handleSaveCustomApiKey}
              backendConfigured={backendConfigured}
              onLogout={handleLogout}
            />
          </div>
          <div className="flex-1" onClick={() => setShowMobileSidebar(false)} />
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-gradient-premium relative">
        {/* Sleek top glowing border/effects */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        
        {/* Navigation / Header */}
        <header className="h-16 px-4 border-b border-white/5 flex items-center justify-between bg-glass-light backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white md:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-400 animate-pulse-slow" />
              <span className="font-semibold text-sm tracking-wide text-white">EchoSphere</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-medium border border-blue-500/10">
                Voice Assistant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Indicator */}
            {waveformState !== 'idle' && (
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${waveformState === 'listening' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${waveformState === 'listening' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              </span>
            )}
            
            {/* TTS Mute Toggle */}
            <button
              onClick={() => {
                setIsVoiceEnabled(!isVoiceEnabled);
                if (isVoiceEnabled) tts.stop();
              }}
              className={`p-2 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                isVoiceEnabled 
                  ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/25' 
                  : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              }`}
              title={isVoiceEnabled ? "Mute Voice Output" : "Enable Voice Output"}
            >
              {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </header>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
          {/* If chat history is empty, show modern starter templates */}
          {(!activeSession || activeSession.messages.length === 0) ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center text-center space-y-8 py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-125" />
                <div className="w-16 h-16 rounded-2xl bg-glass border border-white/10 flex items-center justify-center text-blue-400 relative z-10 shadow-lg">
                  <Sparkles size={32} className="animate-float" />
                </div>
              </div>
              
              <div className="space-y-2 max-w-md relative z-10">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">How can I help you today?</h2>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  Start typing below or tap the microphone button. I'll read my answers aloud unless you mute me.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-xl">
                {STARTER_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt.text)}
                    className="p-4 bg-glass border border-white/5 rounded-2xl text-left hover:border-white/15 hover:bg-white/5 hover:scale-[1.01] transition-all group duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl bg-white/5 p-1.5 rounded-lg shrink-0">{prompt.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors leading-normal line-clamp-2">
                          {prompt.text}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-3.5 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Sparkles size={14} />
                      </div>
                    )}
                    
                    {/* Chat bubbles */}
                    <div className={`flex flex-col space-y-1.5 max-w-[85%] md:max-w-[75%]`}>
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-tr-sm shadow-md'
                            : 'bg-glass border border-white/5 text-zinc-100 rounded-tl-sm ai-message-content shadow-sm'
                        }`}
                      >
                        {msg.text ? (
                          // Standard simple markdown parser for rendering paragraphs / formatting
                          msg.text.split('\n\n').map((paragraph, i) => (
                            <p key={i}>
                              {paragraph.split(' ').map((word, j) => {
                                // Simple bold parsing
                                if (word.startsWith('**') && word.endsWith('**')) {
                                  return <strong key={j} className="text-white font-semibold">{word.replace(/\*\*/g, '')} </strong>;
                                }
                                // Simple inline code parsing
                                if (word.startsWith('`') && word.endsWith('`')) {
                                  return <code key={j}>{word.replace(/`/g, '')} </code>;
                                }
                                return word + ' ';
                              })}
                            </p>
                          ))
                        ) : (
                          // Streaming / response loader
                          <div className="flex items-center gap-1 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-typing" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-typing" style={{ animationDelay: '200ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-typing" style={{ animationDelay: '400ms' }} />
                          </div>
                        )}
                      </div>
                      
                      {/* Message Footer Info */}
                      <span className={`text-[10px] text-zinc-500 font-medium ${isUser ? 'text-right mr-1' : 'text-left ml-1'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {/* Reference point for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* System & Speech Notifications */}
        {(speechError || systemError) && (
          <div className="max-w-xl mx-auto px-4 z-20 w-full mb-1">
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-center justify-between gap-3 text-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-[11px] font-medium leading-normal">{speechError || systemError}</span>
              </div>
              <button 
                onClick={() => {
                  stt.resetTranscript();
                  setSystemError(null);
                }} 
                className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 bg-red-500/10 rounded-md border border-red-500/10 shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Floating STT active prompt box */}
        {stt.isListening && stt.transcript && (
          <div className="max-w-2xl mx-auto px-4 z-20 w-full mb-2">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-100 shadow-sm animate-pulse-slow">
              <Mic size={14} className="text-emerald-400 shrink-0 animate-bounce" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-emerald-400/70 font-semibold uppercase tracking-wider mb-0.5 text-[9px]">Listening...</p>
                <p className="text-xs text-zinc-100 font-medium leading-relaxed italic truncate">
                  "{stt.transcript}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Soundwave Panel */}
        <div className="flex justify-center w-full z-10 shrink-0">
          <VoiceWaveform state={waveformState} />
        </div>

        {/* Input Bar Section */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-zinc-950/40 to-transparent z-10 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Input Pills */}
            <div className="relative bg-glass border border-white/5 rounded-2xl md:rounded-3xl p-2 flex items-end gap-2 shadow-lg hover:border-white/10 transition-all duration-300">
              
              {/* Mic Input Trigger */}
              <button
                onClick={toggleMic}
                className={`p-3 rounded-xl md:rounded-2xl transition-all duration-300 flex items-center justify-center shrink-0 ${
                  stt.isListening 
                    ? 'bg-emerald-500 text-white animate-pulse shadow-md shadow-emerald-500/25' 
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
                title={stt.isListening ? "Listening (Tap to Stop)" : "Talk to Gemini"}
              >
                {stt.isListening ? <Mic size={20} /> : <Mic size={20} />}
              </button>

              {/* Text Input area */}
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={stt.isListening ? "Listening... speak now" : "Ask Gemini anything..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={stt.isListening}
                className="flex-1 max-h-[120px] bg-transparent border-0 outline-none focus:ring-0 text-sm py-2.5 px-1 resize-none text-zinc-100 placeholder-zinc-500 focus:placeholder-zinc-600 disabled:opacity-50"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={(!input.trim() && !stt.transcript.trim()) || isLoading}
                className={`p-3 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center justify-center shrink-0 ${
                  (input.trim() || stt.transcript.trim()) && !isLoading
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 hover:scale-[1.02] cursor-pointer'
                    : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            
            {/* Tiny Footer Instruction */}
            <div className="flex items-center justify-between mt-2.5 px-3 text-[10px] text-zinc-500 font-medium select-none">
              <div className="flex items-center gap-1">
                <CornerDownLeft size={10} className="text-zinc-600" />
                <span>Press Enter to send</span>
              </div>
              <div>
                <span>Powered by Gemini API</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
