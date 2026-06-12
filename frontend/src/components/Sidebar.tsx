import React, { useState } from 'react';
import { Plus, Trash2, Key, MessageSquare, Volume2, Settings, ShieldAlert, Check, X, Server } from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  messages: Array<{ sender: 'user' | 'ai'; text: string; timestamp: string }>;
  timestamp: string;
}

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, event: React.MouseEvent) => void;
  onClearAll: () => void;
  
  // Voice controls
  voices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  onSelectVoice: (name: string) => void;
  
  // Custom API key controls
  customApiKey: string;
  onSaveCustomApiKey: (key: string) => void;
  backendConfigured: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAll,
  voices,
  selectedVoiceName,
  onSelectVoice,
  customApiKey,
  onSaveCustomApiKey,
  backendConfigured
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState(customApiKey);
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomApiKey(keyInput.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  return (
    <aside className="w-80 h-full flex flex-col bg-zinc-950/90 border-r border-white/5 backdrop-blur-xl shrink-0 transition-transform duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            G
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white">Gemini Voice AI</h1>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${backendConfigured || customApiKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {backendConfigured ? 'Backend Connected' : customApiKey ? 'Custom API Key active' : 'API Key required'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          title="Voice & API Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Settings Panel Toggle */}
      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Settings</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-zinc-500 hover:text-white p-1 rounded-md"
            >
              <X size={14} />
            </button>
          </div>

          {/* API Key settings */}
          <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
            <h4 className="text-xs font-medium text-white flex items-center gap-1.5">
              <Key size={14} className="text-blue-400" />
              Gemini API Authorization
            </h4>
            
            {backendConfigured ? (
              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Server size={12} className="text-emerald-400" />
                API key provided by backend environment variables. Secure and configured.
              </p>
            ) : (
              <form onSubmit={handleSaveKey} className="space-y-2">
                <p className="text-[10px] text-zinc-500">
                  No server-side key detected. Provide a custom Gemini API key (saved locally in your browser).
                </p>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1 text-xs bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  {keySaved ? <Check size={12} /> : 'Save API Key'}
                  {keySaved ? 'Saved!' : ''}
                </button>
              </form>
            )}
          </div>

          {/* Text to Speech voices selection */}
          <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
            <h4 className="text-xs font-medium text-white flex items-center gap-1.5">
              <Volume2 size={14} className="text-violet-400" />
              Select Assistant Voice
            </h4>
            <p className="text-[10px] text-zinc-500">
              Select your preferred language voice for response playback.
            </p>
            {voices.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No voices available in browser</p>
            ) : (
              <select
                value={selectedVoiceName}
                onChange={(e) => onSelectVoice(e.target.value)}
                className="w-full text-xs p-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Warning info if no key is set */}
          {!backendConfigured && !customApiKey && (
            <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl flex gap-2">
              <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300 leading-relaxed">
                Provide your API key in settings or create a <code className="bg-black/40 px-1 rounded">.env</code> file in the backend to talk with Gemini.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Action buttons */}
          <div className="p-4">
            <button
              onClick={onNewChat}
              className="w-full py-2.5 px-4 bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-xl hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 group shadow-sm"
            >
              <Plus size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
              New Conversation
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">History</h3>
            {sessions.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No conversations yet</p>
              </div>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-indigo-650/15 border-indigo-500/20 text-white shadow-sm shadow-indigo-950/10'
                        : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-6">
                      <MessageSquare size={14} className={isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'} />
                      <span className="text-xs font-medium truncate tracking-wide">
                        {session.title || 'Untitled Chat'}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-500 p-1.5 rounded-lg hover:bg-white/5 transition-all"
                      title="Delete Conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer controls */}
          {sessions.length > 0 && (
            <div className="p-4 border-t border-white/5">
              <button
                onClick={onClearAll}
                className="w-full py-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 text-[11px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                Clear All Conversations
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
