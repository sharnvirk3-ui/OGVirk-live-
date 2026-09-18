import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  Database, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  KeyRound, 
  RefreshCw,
  LogOut,
  ShieldCheck,
  Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithSupabase, 
  signUpWithSupabase, 
  signInWithGithubSupabase,
  sendSupabasePasswordReset, 
  signOutSupabase, 
  formatSupabaseAuthError, 
  testSupabaseConnection, 
  mapSupabaseUserToAppUser,
  getStoredSupabaseUrl,
  supabase
} from '../lib/supabase';
import { AppUser } from '../types';

interface SupabaseAuthProps {
  onAuthSuccess?: (user: AppUser, session: any) => void;
  onSwitchToFirebase?: () => void;
  currentUser?: AppUser | null;
  className?: string;
  isCompact?: boolean;
}

export const SupabaseAuth: React.FC<SupabaseAuthProps> = ({
  onAuthSuccess,
  onSwitchToFirebase,
  currentUser,
  className = '',
  isCompact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    ok: boolean;
    latencyMs: number;
    message: string;
  }>({
    tested: false,
    ok: true,
    latencyMs: 0,
    message: 'Checking...',
  });

  // Check connection to Supabase on mount
  useEffect(() => {
    let isMounted = true;
    testSupabaseConnection().then((res) => {
      if (isMounted) {
        setConnectionStatus({
          tested: true,
          ok: res.ok,
          latencyMs: res.latencyMs,
          message: res.message,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestConnection = async () => {
    setConnectionStatus((prev) => ({ ...prev, tested: false }));
    const res = await testSupabaseConnection();
    setConnectionStatus({
      tested: true,
      ok: res.ok,
      latencyMs: res.latencyMs,
      message: res.message,
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const data = await signInWithSupabase(cleanEmail, cleanPassword);
      if (data.user && data.session) {
        const appUser = mapSupabaseUserToAppUser(data.user);
        setSuccessMessage('Authentication successful! Welcome to OG Virk Live.');
        if (onAuthSuccess) {
          onAuthSuccess(appUser, data.session);
        }
      } else {
        setError('Login completed but no active session was returned. Please check your email for confirmation.');
      }
    } catch (err: any) {
      setError(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst) {
      setError('Please enter your first name.');
      return;
    }
    if (!cleanLast) {
      setError('Please enter your last name.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const data = await signUpWithSupabase(cleanEmail, cleanPassword, {
        firstName: cleanFirst,
        lastName: cleanLast,
      });

      if (data.session && data.user) {
        const appUser = mapSupabaseUserToAppUser(data.user);
        setSuccessMessage('Account created successfully! Welcome aboard.');
        if (onAuthSuccess) {
          onAuthSuccess(appUser, data.session);
        }
      } else if (data.user) {
        setSuccessMessage('Account registered in Supabase! Please check your email to confirm your account, then sign in.');
        setActiveTab('signin');
      }
    } catch (err: any) {
      setError(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }

    setLoading(true);
    try {
      await sendSupabasePasswordReset(cleanEmail);
      setSuccessMessage(`Password recovery link has been sent to ${cleanEmail}. Please check your inbox.`);
    } catch (err: any) {
      setError(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutSupabase();
      setSuccessMessage('Signed out of Supabase successfully.');
    } catch (err: any) {
      setError(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await signInWithGithubSupabase();
    } catch (err: any) {
      setError(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const currentEndpoint = getStoredSupabaseUrl()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  // If already logged in via Supabase, render Session Info card
  if (currentUser && currentUser.provider === 'supabase') {
    return (
      <div className={`w-full bg-[#151A27]/95 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-white ${className}`}>
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black tracking-wide uppercase text-white">Supabase Auth Session</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Active
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{currentEndpoint}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="flex items-center px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold transition-all"
            title="Sign out of Supabase"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </button>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-800/60">
            <span className="text-gray-400 font-medium">User ID</span>
            <span className="font-mono text-gray-200 truncate max-w-[200px]" title={currentUser.uid}>
              {currentUser.uid}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-800/60">
            <span className="text-gray-400 font-medium">Email</span>
            <span className="text-gray-200 font-medium">{currentUser.email || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-800/60">
            <span className="text-gray-400 font-medium">Display Name</span>
            <span className="text-emerald-400 font-bold">{currentUser.displayName || 'Gamer'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-400 font-medium">Auth Provider</span>
            <span className="inline-flex items-center text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Supabase GoTrue v2
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`w-full max-w-[360px] bg-[#151A27]/95 backdrop-blur-xl rounded-3xl border border-emerald-500/30 p-6 shadow-[0_10px_35px_rgba(16,185,129,0.15)] relative ${className}`}
    >
      {/* Top Floating Badge & Supabase Icon */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#1a2332] rounded-2xl border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
        <Zap className="text-emerald-400 w-7 h-7 fill-emerald-400/20" />
      </div>

      {/* Header Info */}
      <div className="pt-6 pb-4 text-center">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
          <Database className="w-3 h-3" />
          <span>Supabase Auth Cloud</span>
        </div>
        <h3 className="text-lg font-black text-white tracking-wide uppercase">
          {activeTab === 'signin' && 'Sign In with Supabase'}
          {activeTab === 'signup' && 'Create Supabase Account'}
          {activeTab === 'forgot' && 'Reset Supabase Password'}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Fast, persistent JWT auth with cloud database sync
        </p>

        {/* Live Supabase Connection Badge */}
        <div className="mt-2.5 flex items-center justify-center space-x-2 text-[11px]">
          <span 
            className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus.ok ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-400'
            }`} 
          />
          <span className="text-gray-400 truncate max-w-[180px]">
            {currentEndpoint}
          </span>
          {connectionStatus.latencyMs > 0 && (
            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {connectionStatus.latencyMs}ms
            </span>
          )}
          <button
            type="button"
            onClick={handleTestConnection}
            title="Refresh Supabase connection"
            className="text-gray-500 hover:text-emerald-400 transition-colors p-0.5"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      {activeTab !== 'forgot' && (
        <div className="grid grid-cols-2 gap-1.5 bg-[#0F131D] p-1 rounded-xl border border-gray-800 mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setError(null); setSuccessMessage(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'signin'
                ? 'bg-emerald-500 text-black shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(null); setSuccessMessage(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'signup'
                ? 'bg-emerald-500 text-black shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Feedback Alerts */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3 rounded-xl flex items-start space-x-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words leading-relaxed">{error}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs p-3 rounded-xl flex items-start space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words leading-relaxed">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign In Form */}
      {activeTab === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-3.5">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input 
              type="email" 
              placeholder="Supabase Email Address" 
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Password" 
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={() => { setActiveTab('forgot'); setError(null); setSuccessMessage(null); }}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold tracking-wide py-3 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:opacity-95 transition-opacity active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>CONNECTING SUPABASE...</span>
              </>
            ) : (
              <>
                <span>SIGN IN WITH SUPABASE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Sign Up Form */}
      {activeTab === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />
              <input 
                type="text" 
                placeholder="First Name" 
                required
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setError(null); }}
                className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-2.5 pl-8 pr-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />
              <input 
                type="text" 
                placeholder="Last Name" 
                required
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setError(null); }}
                className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-2.5 pl-8 pr-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 6 chars)" 
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-9 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold tracking-wide py-3 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:opacity-95 transition-opacity active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>CREATING SUPABASE ACCOUNT...</span>
              </>
            ) : (
              <>
                <span>CREATE SUPABASE ACCOUNT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Forgot Password Form */}
      {activeTab === 'forgot' && (
        <form onSubmit={handleForgotPassword} className="space-y-3.5">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input 
              type="email" 
              placeholder="Enter your registered email" 
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-emerald-500 rounded-xl py-3 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-xs flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>SEND RESET INSTRUCTIONS</span>
          </button>

          <button 
            type="button" 
            onClick={() => { setActiveTab('signin'); setError(null); }}
            className="w-full text-center text-xs text-gray-400 hover:text-white pt-2 block"
          >
            Back to Sign In
          </button>
        </form>
      )}

      {/* Social Login: GitHub via Supabase */}
      {activeTab !== 'forgot' && (
        <div className="mt-4">
          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative bg-[#151A27] px-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Or
            </div>
          </div>
          <button
            type="button"
            onClick={handleGithubAuth}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-[#1A202C] hover:bg-[#232B3B] border border-gray-700 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            title="Sign in with GitHub via Supabase Auth"
          >
            <Github className="w-4 h-4 text-white" />
            <span>Continue with GitHub</span>
          </button>
        </div>
      )}

      {/* Switch to Firebase Alternative */}
      {onSwitchToFirebase && (
        <div className="mt-5 pt-4 border-t border-gray-800 text-center">
          <button
            type="button"
            onClick={onSwitchToFirebase}
            className="text-xs text-gray-400 hover:text-[#FF6B00] transition-colors font-medium flex items-center justify-center mx-auto space-x-1"
          >
            <span>Or use</span>
            <span className="text-[#FF6B00] font-bold">Firebase Authentication</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default SupabaseAuth;
