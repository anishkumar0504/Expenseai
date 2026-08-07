import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { GoogleLogin } from '@react-oauth/google'; // <-- ADD THIS
import { Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
      const payload = isSignUp ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      login(data.token, data.user);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // REAL Google auth handler
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsSubmitting(true);
    setError('');
    try {
      // 1. Get CSRF state token
      const csrfRes = await fetch('/api/auth/google/csrf-token');
      const { stateToken } = await csrfRes.json();

      // 2. Send real Google credential to backend
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialResponse.credential, // Real Google ID token (JWT)
          stateToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google Sign-In failed');

      login(data.token, data.user);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Google Auth Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        data-lenis-prevent
        className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 md:p-8 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/10 mb-3 text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isSignUp
              ? 'Sign up to manage your expenses, budgets & analytics'
              : 'Log in to access your personal dashboard'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* REAL Google Sign-In Button — forces account picker */}
        <div className="mb-4 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-In failed')}
            prompt="select_account"   // <-- Forces account picker every time
            auto_select={false}       // <-- Prevents auto-login
            useOneTap={false}
            text="continue_with"
            shape="rect"
            width="320"
          />
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            or email
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Password {isSignUp && '(min 8 chars)'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                minLength={isSignUp ? 8 : 1}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-black bg-white hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Sign Up' : 'Log In'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-white font-bold underline ml-1"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};