import React, { useState } from 'react';
import { Sparkles, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials or database connection issue.');
      }

      if (data.success && data.token) {
        onLoginSuccess(data.token);
      } else {
        throw new Error('Authentication succeeded but did not return a session token.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Connecting to auth server failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#08070b] bg-gradient-premium px-4 relative overflow-hidden">
      {/* Background ambient glowing balls */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-glass border border-white/5 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-10 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 relative animate-float">
            <Sparkles size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to EchoSphere</h1>
            <p className="text-xs text-zinc-400 mt-1">Sign in to access your voice AI assistant</p>
          </div>
        </div>

        {/* Error Dialog */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex gap-3 text-red-200 text-xs leading-normal animate-shake">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Authentication Error</span>
              <p className="mt-0.5 text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <User size={16} />
              </div>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Admin1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/40 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock size={16} />
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/40 border border-white/5 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3.5 px-4 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-sm font-semibold rounded-2xl hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-650/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Unlock Assistant
                <ArrowRight size={16} className="text-white/70 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-zinc-500 font-medium select-none">
          <span>Protected by Database Authentication Gate</span>
        </div>
      </div>
    </div>
  );
};
