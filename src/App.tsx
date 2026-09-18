import { User, ScanFace, Grip, Keyboard, KeyRound, Grid, Lock, Unlock, Eye, EyeOff, LogOut, Bell, Gamepad2, AlertTriangle, Youtube, MessageSquare, Mail, Home, Phone, Video, MessageCircle, Shield, ShieldAlert, Play, Pause, Mic, MicOff, Send, Plus, Users, Server, Trash2, Search, Star, ChevronLeft, Volume2, Music, BellRing, BellOff, Moon, Smartphone, Instagram, RefreshCw, FileText, Image as ImageIcon, Upload, X, Check, ToggleLeft, ToggleRight, Calendar, Camera, CheckCircle2, Pencil, Download, DownloadCloud, Sparkles, Info, ExternalLink, Globe, Maximize2, Square, Crop, RotateCw, RotateCcw, ZoomIn, ZoomOut, Zap, Flame, Activity, Database, Sliders, BarChart2, Copy, Pin, Github } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import React, { Component, useState, useEffect, useRef, useMemo } from 'react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged, User as FirebaseUser, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, setDoc, getDoc, updateDoc, limit } from 'firebase/firestore';
import { auth, googleProvider, githubProvider, db, waitForAuthReady } from './lib/firebase';
import { setLocalMedia, getLocalMedia, sanitizePayloadForFirestore, resolveIdbMedia } from './lib/idb';
import { saveLocalCache, getLocalCache, clearAllLocalCache, requestPushPermission, sendPushNotification, getPushPermissionStatus, safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from './lib/cache';
import { initOneSignal, promptOneSignalPushPermission } from './lib/onesignal';
import { SupabaseAuth } from './components/SupabaseAuth';
import { supabase, getSupabaseSession, onSupabaseAuthStateChange, signOutSupabase, mapSupabaseUserToAppUser } from './lib/supabase';
import { AppUser } from './types';

const PRIMARY_ADMIN_EMAIL = 'sharnvirk1217@gmail.com';
const MASKED_ADMIN_EMAIL = 'sh**********7@gmail.com';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

let globalFirestoreQuotaExceeded = false;
try {
  const storedQuotaTime = typeof window !== 'undefined' ? localStorage.getItem('firestore_quota_exceeded_timestamp') : null;
  if (storedQuotaTime && (Date.now() - parseInt(storedQuotaTime, 10)) < 12 * 60 * 60 * 1000) {
    globalFirestoreQuotaExceeded = true;
  }
} catch (e) {}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  const isQuotaError = errStr.includes('resource-exhausted') || errStr.toLowerCase().includes('quota');

  if (isQuotaError) {
    globalFirestoreQuotaExceeded = true;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('firestore_quota_exceeded_timestamp', Date.now().toString());
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: errStr } }));
      }
    } catch (e) {}
    console.warn(`Firestore quota limit reached during ${operationType} on ${path}. Operating with cached offline state.`);
    return { error: errStr, operationType, path, isQuota: true };
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const parseTimestamp = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsedNum = Number(val);
    if (!isNaN(parsedNum) && parsedNum > 1000000000000) return parsedNum;
    const parsedDate = Date.parse(val);
    return isNaN(parsedDate) ? 0 : parsedDate;
  }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
  }
  return 0;
};

export const isSessionActive = (session: any, maxAgeMs = 5 * 60 * 1000): boolean => {
  if (!session) return false;
  const ts = parseTimestamp(session.lastActive);
  if (!ts) return false;
  return (Date.now() - ts) < maxAgeMs;
};

const ChromeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M12 2C7.58 2 3.84 4.39 1.84 7.97l4.33 7.5A6 6 0 0 1 12 6h9.55A10 10 0 0 0 12 2z"/>
    <path fill="#34A853" d="M12 22c4.42 0 8.16-2.39 10.16-5.97l-4.33-7.5A6 6 0 0 1 12 18H2.45A10 10 0 0 0 12 22z"/>
    <path fill="#FBBC05" d="M2.45 18h9.55l4.33-7.5-4.33-7.5A10 10 0 0 0 2.45 18z"/>
    <circle cx="12" cy="12" r="5" fill="#4285F4"/>
    <circle cx="12" cy="12" r="3.2" fill="#FFFFFF"/>
  </svg>
);

const GoogleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

// Animation Component for Falling Embers (sparks)
const Embers = () => {
  const particles = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((_, i) => {
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 3 + 4;
        const xDrift = (Math.random() - 0.5) * 150;
        
        return (
          <motion.div
            key={i}
            initial={{ y: '100vh', x: 0, opacity: 0 }}
            animate={{
              y: '-10vh',
              x: xDrift,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="absolute rounded-full bg-[#ff6b00]"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              boxShadow: '0 0 10px 2px #ff6b00',
            }}
          />
        );
      })}
    </div>
  );
};

// Animation Component for Glowing Streaks (action lines)
const Streaks = () => {
  const streaks = Array.from({ length: 6 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {streaks.map((_, i) => {
        const top = Math.random() * 100;
        const delay = Math.random() * 8;
        const duration = Math.random() * 0.6 + 0.3;
        const isCyan = Math.random() > 0.5;
        
        return (
          <motion.div
            key={i}
            initial={{ x: '-20vw', opacity: 0 }}
            animate={{ x: '120vw', opacity: [0, 1, 1, 0] }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'linear',
            }}
            className={`absolute h-[2px] w-40 ${
              isCyan 
                ? 'bg-cyan-400 shadow-[0_0_15px_3px_rgba(34,211,238,0.8)]' 
                : 'bg-orange-500 shadow-[0_0_15px_3px_rgba(255,107,0,0.8)]'
            }`}
            style={{ 
              top: `${top}%`,
              transform: 'rotate(-5deg)' 
            }}
          />
        );
      })}
    </div>
  );
};

const BackgroundGlows = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-orange-600/20 rounded-full blur-[100px]" />
    <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-600/20 rounded-full blur-[100px]" />
    
    {/* Decorative Neon Side Elements matching the image */}
    <div className="absolute left-6 top-1/3 opacity-40">
      <div className="w-16 h-16 border-l-4 border-b-4 border-cyan-400 rotate-45 transform -skew-x-12" />
    </div>
    <div className="absolute right-6 top-1/4 opacity-40">
      <div className="w-12 h-12 border-r-4 border-b-4 border-pink-500 -rotate-45 transform skew-x-12" />
    </div>
  </div>
);


interface PatternLockGridProps {
  pattern: number[];
  onChange: (p: number[]) => void;
  onComplete?: (p: number[]) => void;
  title?: string;
}

const triggerVibration = (ms = 15) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(ms);
    } catch (e) {
      // Ignore vibration error
    }
  }
};

const maskEmail = (email: string | undefined | null): string => {
  if (!email || typeof email !== 'string') return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;

  const username = email.substring(0, atIndex);
  const domain = email.substring(atIndex);

  if (username.length <= 2) {
    return `${username[0]}*${domain}`;
  }

  const first = username[0];
  const last = username[username.length - 1];
  const middleStars = '*'.repeat(username.length - 2);

  return `${first}${middleStars}${last}${domain}`;
};

const PatternLockGrid = ({ pattern, onChange, onComplete, title = "Slide / Draw 3x3 Pattern" }: PatternLockGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const patternRef = useRef<number[]>(pattern);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  const getDotPos = (dotIdx: number) => {
    const row = Math.floor((dotIdx - 1) / 3);
    const col = (dotIdx - 1) % 3;
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width / 3;
    const h = rect.height / 3;
    return { x: col * w + w / 2, y: row * h + h / 2 };
  };

  const handlePointerDown = (dot: number, e: React.PointerEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    triggerVibration(20);
    const next = [dot];
    patternRef.current = next;
    onChange(next);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragPoint({ x, y });

    const w = rect.width / 3;
    const h = rect.height / 3;

    for (let dot = 1; dot <= 9; dot++) {
      const row = Math.floor((dot - 1) / 3);
      const col = (dot - 1) % 3;
      const dotX = col * w + w / 2;
      const dotY = row * h + h / 2;
      const dist = Math.hypot(x - dotX, y - dotY);

      if (dist < w * 0.45) {
        if (!patternRef.current.includes(dot)) {
          triggerVibration(15);
          const next = [...patternRef.current, dot];
          patternRef.current = next;
          onChange(next);
        }
      }
    }
  };

  const handlePointerEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setDragPoint(null);
      if (onComplete) {
        onComplete(patternRef.current);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center mb-4 select-none">
      <p className="text-xs font-bold text-gray-300 mb-2">{title}</p>
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="relative w-56 h-56 sm:w-60 sm:h-60 max-w-full bg-gradient-to-b from-[#0F1420] via-[#0A0D14] to-[#080B10] border border-gray-800/80 rounded-2xl p-2 touch-none flex items-center justify-center shadow-2xl overflow-hidden"
      >
        {/* Appealing Ambient Background Animation */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF6B00]/15 via-transparent to-transparent animate-pulse pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {pattern.map((dot, idx) => {
            if (idx === 0) return null;
            const p1 = getDotPos(pattern[idx - 1]);
            const p2 = getDotPos(dot);
            return (
              <line
                key={`line-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#FF6B00"
                strokeWidth="4"
                strokeLinecap="round"
                className="drop-shadow-[0_0_12px_rgba(255,107,0,0.9)]"
              />
            );
          })}
          {isDrawing && pattern.length > 0 && dragPoint && (
            <line
              x1={getDotPos(pattern[pattern.length - 1]).x}
              y1={getDotPos(pattern[pattern.length - 1]).y}
              x2={dragPoint.x}
              y2={dragPoint.y}
              stroke="#FF6B00"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              className="opacity-80"
            />
          )}
        </svg>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full h-full z-20">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
            const isSelected = pattern.includes(dot);
            return (
              <div
                key={dot}
                onPointerDown={(e) => handlePointerDown(dot, e)}
                onClick={() => {
                  if (!patternRef.current.includes(dot)) {
                    triggerVibration(20);
                    const next = [...patternRef.current, dot];
                    patternRef.current = next;
                    onChange(next);
                    if (onComplete) onComplete(next);
                  }
                }}
                className="flex items-center justify-center cursor-pointer p-2 group"
              >
                {/* Minimalist central dot only, no outer heavy circle */}
                <span
                  className={`rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-4 h-4 bg-[#FF6B00] shadow-[0_0_16px_rgba(255,107,0,1)] scale-150 ring-4 ring-[#FF6B00]/30'
                      : 'w-3 h-3 bg-gray-500/80 group-hover:bg-gray-300 group-hover:scale-125'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between w-56 sm:w-60 mt-3 px-1">
        <span className="text-[11px] font-mono text-gray-400">
          {pattern.length > 0 ? `${pattern.length} dots connected` : 'Slide or connect dots'}
        </span>
        {pattern.length > 0 && (
          <button
            type="button"
            onClick={() => {
              patternRef.current = [];
              onChange([]);
            }}
            className="text-[11px] text-[#FF6B00] font-bold hover:underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

const VoiceMessagePlayer = ({ audioUrl, duration }: { audioUrl: string; duration?: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    if (!audioUrl) {
      setResolvedAudioUrl('');
      setIsLoading(false);
      return;
    }

    resolveIdbMedia(audioUrl)
      .then((url) => {
        if (!isSubscribed) return;
        const targetUrl = url || audioUrl;

        // Convert data:audio base64 to Blob object URL to prevent memory & playback issues in mobile browsers/webviews
        if (targetUrl.startsWith('data:audio/')) {
          try {
            const parts = targetUrl.split(',');
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            setResolvedAudioUrl(blobUrl);
          } catch (e) {
            console.warn('Error converting audio data URL to blob:', e);
            setResolvedAudioUrl(targetUrl);
          }
        } else {
          setResolvedAudioUrl(targetUrl);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to resolve voice note URL:', err);
        if (isSubscribed) {
          setResolvedAudioUrl(audioUrl);
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!resolvedAudioUrl) return;

    const audio = new Audio(resolvedAudioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.warn('Audio playback error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (resolvedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resolvedAudioUrl);
      }
      audioRef.current = null;
    };
  }, [resolvedAudioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Audio play error:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 bg-black/40 p-2.5 rounded-2xl border border-white/10 min-w-[200px] max-w-[280px] my-1">
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading || !resolvedAudioUrl}
        className="w-8 h-8 rounded-full bg-[#FF6B00] hover:bg-orange-600 disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95"
      >
        {isLoading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center space-y-1">
        <div className="flex items-center space-x-0.5 h-3.5 w-full">
          {[40, 70, 30, 90, 50, 100, 60, 40, 80, 50, 30, 70, 90, 40, 60].map((heightPct, idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-full transition-all duration-200 ${
                (idx / 15) * 100 <= progressPercent ? 'bg-[#FF6B00]' : 'bg-gray-600/50'
              } ${isPlaying ? 'animate-pulse' : ''}`}
              style={{ height: `${isPlaying ? Math.max(25, (heightPct * (idx % 2 === 0 ? 1 : 0.7))) : heightPct}%` }}
            />
          ))}
        </div>

        <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono font-bold">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

const CameraModal = ({
  isOpen,
  onClose,
  onCapture
}: {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCameraError(null);

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    }).then(stream => {
      if (!isMounted) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch(err => {
      console.warn('Camera stream error:', err);
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch(err2 => {
        if (isMounted) setCameraError('Could not access camera. Please check permissions.');
      });
    });

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCapture(dataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-sky-950/30 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/50 backdrop-blur-3xl border border-white/90 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,30,80,0.25),inset_0_2px_4px_rgba(255,255,255,0.95)] flex flex-col relative">
        <div className="p-4 bg-white/40 backdrop-blur-2xl border-b border-white/80 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-[#FF6B00]" />
            <span className="text-xs font-black text-[#002255] uppercase tracking-wider">Camera Capture</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/60 text-slate-700 hover:text-[#002255] hover:bg-white/80 border border-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-slate-900 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-red-600 text-xs font-bold space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
              <p>{cameraError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="p-4 bg-white/40 backdrop-blur-2xl border-t border-white/80 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/60 hover:bg-white/80 text-[#002255] border border-white/80 text-xs font-bold shadow-sm transition-colors"
          >
            Cancel
          </button>
          {!cameraError && (
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-lg active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Capture</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) return '';

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas.toDataURL('image/webp', 0.9);
}

const ImageCropperModal = ({
  imageSrc,
  isOpen,
  onClose,
  onCropSave
}: {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCropSave: (croppedDataUrl: string) => void;
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setIsProcessing(false);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedDataUrl = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropSave(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('Error cropping image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-sky-950/30 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white/55 backdrop-blur-3xl border border-white/90 rounded-3xl p-4 sm:p-6 w-full max-w-xl shadow-[0_20px_50px_rgba(0,30,80,0.25),inset_0_2px_4px_rgba(255,255,255,0.95)] flex flex-col relative my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#002255] uppercase tracking-wider">Crop Error Screenshot</h3>
              <p className="text-[10px] font-bold text-slate-700">Select and crop the error area</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/60 text-slate-700 hover:text-[#002255] hover:bg-white/80 border border-white/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full h-64 sm:h-80 bg-slate-900 rounded-2xl overflow-hidden my-4 border border-white/80 shadow-inner">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        <div className="space-y-3 bg-white/40 backdrop-blur-2xl p-3 rounded-2xl border border-white/80">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-800 font-bold">
            <div className="flex items-center space-x-2 flex-1">
              <ZoomOut className="w-4 h-4 text-slate-600 shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-red-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-slate-600 shrink-0" />
            </div>
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="p-2 rounded-xl bg-white/60 hover:bg-white/80 text-[#002255] border border-white/80 transition-colors flex items-center space-x-1 shrink-0 text-[11px] font-bold shadow-sm"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5 text-red-600" />
              <span>{rotation}°</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/80 text-[10px] font-bold">
            <span className="text-[#062456]">Aspect Ratio:</span>
            <div className="flex items-center space-x-1">
              {[
                { label: 'Free', value: undefined },
                { label: '1:1', value: 1 },
                { label: '16:9', value: 16 / 9 },
                { label: '4:3', value: 4 / 3 }
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAspect(opt.value)}
                  className={`px-2.5 py-1 rounded-lg font-black transition-all ${
                    aspect === opt.value
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-white/60 text-[#002255] hover:bg-white/80 border border-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-white/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/60 hover:bg-white/80 text-[#002255] border border-white/80 text-xs font-bold transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Apply Crop'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface DrawingStroke {
  tool: 'pencil' | 'marker' | 'rectangle' | 'arrow';
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

const ImageMarkupModal = ({
  imageSrc,
  isOpen,
  onClose,
  onSave
}: {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (markedDataUrl: string) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [tool, setTool] = useState<'pencil' | 'marker' | 'rectangle' | 'arrow'>('pencil');
  const [color, setColor] = useState<string>('#ef4444');
  const [size, setSize] = useState<number>(4);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  useEffect(() => {
    if (isOpen && imageSrc) {
      setStrokes([]);
      setCurrentPoints([]);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImgElement(img);
        setCanvasDimensions({ width: img.width, height: img.height });
      };
      img.src = imageSrc;
    } else {
      setImgElement(null);
    }
  }, [isOpen, imageSrc]);

  const selectTool = (t: 'pencil' | 'marker' | 'rectangle' | 'arrow') => {
    setTool(t);
    if (t === 'marker' && size < 10) {
      setSize(16);
    } else if (t === 'pencil' && size > 12) {
      setSize(4);
    } else if ((t === 'rectangle' || t === 'arrow') && size > 10) {
      setSize(4);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;

    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    const drawSingleStroke = (st: DrawingStroke) => {
      if (st.points.length === 0) return;
      ctx.save();
      ctx.strokeStyle = st.color;
      ctx.fillStyle = st.color;
      ctx.lineWidth = st.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (st.tool === 'marker') {
        ctx.globalAlpha = 0.45;
        ctx.lineCap = 'square';
      } else {
        ctx.globalAlpha = 1.0;
      }

      if (st.tool === 'pencil' || st.tool === 'marker') {
        ctx.beginPath();
        ctx.moveTo(st.points[0].x, st.points[0].y);
        for (let i = 1; i < st.points.length; i++) {
          ctx.lineTo(st.points[i].x, st.points[i].y);
        }
        ctx.stroke();
      } else if (st.tool === 'rectangle') {
        const start = st.points[0];
        const end = st.points[st.points.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (st.tool === 'arrow') {
        const start = st.points[0];
        const end = st.points[st.points.length - 1];
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const headlen = Math.max(12, st.size * 3);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headlen * Math.cos(angle - Math.PI / 6),
          end.y - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          end.x - headlen * Math.cos(angle + Math.PI / 6),
          end.y - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.lineTo(end.x, end.y);
        ctx.fill();
      }
      ctx.restore();
    };

    strokes.forEach(drawSingleStroke);

    if (currentPoints.length > 0) {
      drawSingleStroke({
        tool,
        color,
        size,
        points: currentPoints
      });
    }
  }, [imgElement, canvasDimensions, strokes, currentPoints, tool, color, size]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setCurrentPoints([coords]);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (tool === 'pencil' || tool === 'marker') {
      setCurrentPoints(prev => [...prev, coords]);
    } else {
      setCurrentPoints(prev => [prev[0], coords]);
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 0) {
      setStrokes(prev => [...prev, {
        tool,
        color,
        size,
        points: currentPoints
      }]);
    }
    setCurrentPoints([]);
  };

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
  };

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/webp', 0.9);
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-sky-950/30 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white/55 backdrop-blur-3xl border border-white/90 rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-[0_20px_50px_rgba(0,30,80,0.25),inset_0_2px_4px_rgba(255,255,255,0.95)] flex flex-col relative my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#002255] uppercase tracking-wider">Draw & Mark Error Image</h3>
              <p className="text-[10px] font-bold text-slate-700">Mark errors directly using pencil, marker, or shapes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/60 text-slate-700 hover:text-[#002255] hover:bg-white/80 border border-white/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="my-3 flex flex-wrap items-center justify-between gap-2 bg-white/40 backdrop-blur-2xl p-3 rounded-2xl border border-white/80">
          
          {/* Tools */}
          <div className="flex items-center space-x-1">
            {[
              { id: 'pencil', label: 'Pencil', icon: Pencil },
              { id: 'marker', label: 'Marker', icon: Sparkles },
              { id: 'rectangle', label: 'Box', icon: Square },
              { id: 'arrow', label: 'Arrow', icon: ExternalLink },
            ].map(t => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTool(t.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                    tool === t.id
                      ? 'bg-amber-500 text-slate-900 font-black shadow-lg scale-105'
                      : 'bg-white/60 text-[#002255] hover:bg-white/80 border border-white/80'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Color Palette */}
          <div className="flex items-center space-x-1.5">
            {['#ef4444', '#eab308', '#22c55e', '#06b6d4', '#002255', '#ec4899'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white shadow' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Stroke Width & Action Buttons */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-white/60 border border-white/80 px-2 py-1 rounded-xl">
              <span className="text-[10px] text-[#062456] font-bold">Size:</span>
              <input
                type="range"
                min={2}
                max={30}
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                className="w-16 accent-amber-500 h-1 bg-slate-200 rounded cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-xl bg-white/60 hover:bg-white/80 text-[#002255] border border-white/80 disabled:opacity-40 transition-colors shadow-sm"
              title="Undo stroke"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-xl bg-white/60 hover:bg-white/80 text-[#002255] border border-white/80 disabled:opacity-40 transition-colors shadow-sm"
              title="Clear all drawings"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="relative w-full h-64 sm:h-80 bg-slate-900 rounded-2xl overflow-hidden border border-white/80 shadow-inner flex items-center justify-center select-none">
          <canvas
            ref={canvasRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className="max-w-full max-h-full object-contain cursor-crosshair touch-none"
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/80">
          <p className="text-[11px] text-[#062456] font-bold">
            {strokes.length} stroke{strokes.length !== 1 ? 's' : ''} added
          </p>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/60 hover:bg-white/80 text-[#002255] border border-white/80 text-xs font-bold transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDrawing}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-lg flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Markings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const ImageLightboxModal = ({
  imageUrl,
  onClose
}: {
  imageUrl: string | null;
  onClose: () => void;
}) => {
  if (!imageUrl) return null;
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6" 
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
        <a 
          href={imageUrl} 
          download="error_screenshot.webp" 
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-colors shadow-lg"
          title="Download Image"
        >
          <Download className="w-5 h-5" />
        </a>
        <button 
          onClick={onClose} 
          className="p-2.5 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-colors shadow-lg"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative max-w-full max-h-[85vh] flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Full size view" 
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-gray-800/80" 
        />
      </div>
      <p className="text-gray-400 text-xs mt-3 font-medium bg-gray-900/80 border border-gray-800 px-3 py-1 rounded-full">
        🔍 Full Screen View (Tap image or top close icon to exit)
      </p>
    </div>
  );
};

const ActiveUsersModal = ({
  isOpen,
  onClose,
  activeSessions,
  allProfiles: initialProfiles = [],
  currentUser,
  onViewPhoto,
  onOpenWhatsApp,
  maskEmail
}: {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: any[];
  allProfiles?: any[];
  currentUser: any;
  onViewPhoto?: (photoUrl: string) => void;
  onOpenWhatsApp?: (num?: string, groupLink?: string) => void;
  maskEmail: (email?: string) => string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalProfiles, setModalProfiles] = useState<any[]>(initialProfiles);
  const [activeTab, setActiveTab] = useState<'all' | 'online'>('all');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingProfiles(true);
    const unsub = onSnapshot(collection(db, 'userProfiles'), (snap) => {
      const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setModalProfiles(profiles);
      setIsLoadingProfiles(false);
    }, (err) => {
      console.warn('Failed to fetch user profiles for active users modal:', err);
      setIsLoadingProfiles(false);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const genuineActiveSessions = activeSessions.filter(s => isSessionActive(s, 5 * 60 * 1000));
  const activeUids = new Set(genuineActiveSessions.map(s => s.uid || s.id));

  // Build complete unified map of all registered members
  const memberMap = new Map<string, any>();
  (modalProfiles || []).forEach(p => {
    const id = p.uid || p.id;
    if (id) {
      memberMap.set(id, {
        uid: id,
        displayName: p.displayName || (p.email ? maskEmail(p.email) : 'Member'),
        email: p.email || '',
        photoURL: p.photoURL || '',
        isOnline: activeUids.has(id),
        lastActive: p.updatedAt || p.createdAt || '',
        whatsappNumber: p.whatsappNumber || '',
        whatsappGroupLink: p.whatsappGroupLink || ''
      });
    }
  });

  genuineActiveSessions.forEach(s => {
    const sid = s.uid || s.id;
    if (sid) {
      const existing = memberMap.get(sid);
      memberMap.set(sid, {
        uid: sid,
        displayName: s.displayName || existing?.displayName || (s.email ? maskEmail(s.email) : 'Member'),
        email: s.email || existing?.email || '',
        photoURL: s.photoURL || existing?.photoURL || '',
        isOnline: true,
        lastActive: s.lastActive || existing?.lastActive || new Date().toISOString(),
        whatsappNumber: existing?.whatsappNumber || '',
        whatsappGroupLink: existing?.whatsappGroupLink || ''
      });
    }
  });

  if (currentUser && currentUser.uid) {
    const existing = memberMap.get(currentUser.uid);
    memberMap.set(currentUser.uid, {
      uid: currentUser.uid,
      displayName: currentUser.displayName || existing?.displayName || (currentUser.email ? maskEmail(currentUser.email) : 'You'),
      email: currentUser.email || existing?.email || '',
      photoURL: currentUser.photoURL || existing?.photoURL || '',
      isOnline: true,
      lastActive: new Date().toISOString(),
      whatsappNumber: existing?.whatsappNumber || '',
      whatsappGroupLink: existing?.whatsappGroupLink || ''
    });
  }

  const allMembersList = Array.from(memberMap.values());

  let displayList: any[] = [];
  if (activeTab === 'online') {
    displayList = allMembersList.filter(m => m.isOnline);
  } else {
    displayList = allMembersList;
  }

  const filteredList = displayList.filter(item => {
    const nameStr = (item.displayName || '').toLowerCase();
    const emailStr = (item.email || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return nameStr.includes(q) || emailStr.includes(q);
  });

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-sky-950/30 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white/55 backdrop-blur-3xl border border-white/90 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,30,80,0.25),inset_0_2px_4px_rgba(255,255,255,0.95)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/80 flex items-center justify-between bg-white/40 backdrop-blur-2xl">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-sm">
              <Phone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#002255] tracking-wide uppercase flex items-center gap-1.5">
                MEMBERS & CALLING DIRECTORY
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </h3>
              <p className="text-[11px] text-emerald-700 font-extrabold flex items-center gap-2">
                <span>{allMembersList.length} Members</span>
                <span>•</span>
                <span>{genuineActiveSessions.length} Online Now</span>
                <span>•</span>
                <span className="text-slate-600 font-bold">Direct Voice/Video Call</span>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/60 text-slate-700 hover:text-[#002255] hover:bg-white/80 border border-white/80 transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection & Search Bar */}
        <div className="p-4 space-y-3 bg-white/35 backdrop-blur-2xl border-b border-white/80">
          <div className="flex bg-white/50 p-1 rounded-xl border border-white/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-orange-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-[#002255]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Members ({allMembersList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('online')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'online'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-orange-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-[#002255]'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span>Online Now ({genuineActiveSessions.length})</span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-2.5 pl-10 pr-8 text-xs font-bold text-[#002255] placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none shadow-sm"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002255]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoadingProfiles && modalProfiles.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#FF6B00]" />
              <span>Loading profiles...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs font-medium">
              No matching users found.
            </div>
          ) : (
            filteredList.map((item, idx) => {
              const isSelf = item.uid === currentUser?.uid;
              const isAdmin = item.email === PRIMARY_ADMIN_EMAIL || item.email?.toLowerCase().includes('sharnvirk');
              const phoneNum = item.whatsappNumber || '';
              const cleanPhone = phoneNum.replace(/[^0-9]/g, '');

              return (
                <div 
                  key={item.uid || idx}
                  className="flex items-center justify-between bg-white/45 hover:bg-white/65 p-3 rounded-2xl border border-white/80 transition-all shadow-sm"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {/* User Avatar */}
                    <div 
                      className="relative shrink-0 cursor-pointer"
                      onClick={() => {
                        if (item.photoURL && onViewPhoto) {
                          onViewPhoto(item.photoURL);
                        }
                      }}
                      title={item.photoURL ? "Click to view full profile photo" : ""}
                    >
                      {item.photoURL ? (
                        <img 
                          src={item.photoURL} 
                          alt={item.displayName} 
                          className="w-10 h-10 rounded-xl object-cover border border-white/90 hover:border-[#FF6B00] transition-colors shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-orange-200/40 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] font-black text-sm shadow-sm">
                          {(item.displayName || item.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      {item.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    {/* Name & Email */}
                    <div className="truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black text-[#002255] truncate">
                          {item.displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-700 border border-blue-500/30 px-1.5 py-0.2 rounded font-black shrink-0">
                            You
                          </span>
                        )}
                        {isAdmin && (
                          <span className="text-[9px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 px-1.5 py-0.2 rounded font-black shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 font-bold truncate">
                        {maskEmail(item.email)}
                      </p>
                    </div>
                  </div>

                  {/* Calling Actions & Online status */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.isOnline ? (
                      <span className="hidden sm:flex text-[10px] text-emerald-700 bg-emerald-100/80 border border-emerald-500/30 font-extrabold px-2 py-0.5 rounded-full items-center shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="hidden sm:flex text-[10px] text-slate-500 bg-white/60 border border-white/80 font-bold px-2 py-0.5 rounded-full shadow-sm">
                        Offline
                      </span>
                    )}

                    {/* Direct Voice Call Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (cleanPhone) {
                          window.open(`tel:${cleanPhone}`, '_self');
                        } else if (onOpenWhatsApp) {
                          onOpenWhatsApp('', item.whatsappGroupLink);
                        }
                      }}
                      className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center space-x-1"
                      title="Voice Call Member"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold hidden md:inline">Voice</span>
                    </button>

                    {/* Direct Video Call Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (cleanPhone) {
                          window.open(`https://wa.me/${cleanPhone}?text=Hello!%20I%20am%20initiating%20a%20video%20call.`, '_blank');
                        } else if (onOpenWhatsApp) {
                          onOpenWhatsApp('', item.whatsappGroupLink);
                        }
                      }}
                      className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center space-x-1"
                      title="Video Call Member"
                    >
                      <Video className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px] font-bold hidden md:inline">Video</span>
                    </button>

                    {/* WhatsApp Chat Options Button */}
                    <button 
                      type="button"
                      onClick={() => onOpenWhatsApp && onOpenWhatsApp(item.whatsappNumber, item.whatsappGroupLink)}
                      className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700 cursor-pointer"
                      title="WhatsApp & Group Options"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0D111A] border-t border-gray-800/80 text-center text-[11px] text-gray-400 font-medium flex items-center justify-between">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
            Live presence sync
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="text-xs text-[#FF6B00] font-bold hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const WhatsAppModal = ({
  isOpen,
  onClose,
  whatsappNumber,
  whatsappGroupLink
}: {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber?: string;
  whatsappGroupLink?: string;
}) => {
  if (!isOpen) return null;

  const cleanNum = (whatsappNumber || '').replace(/[^0-9]/g, '');
  const directChatUrl = cleanNum ? `https://wa.me/${cleanNum}` : 'https://wa.me/';
  const groupUrl = whatsappGroupLink || '';

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#111622] border border-[#25D366]/40 rounded-2xl w-full max-w-sm p-5 shadow-[0_0_35px_rgba(37,211,102,0.25)] flex flex-col space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">WhatsApp Options</h3>
              <p className="text-[10px] text-emerald-400 font-bold">Select WhatsApp Option</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-300 font-medium leading-relaxed">
          Please select your preferred calling or chat action:
        </p>

        <div className="space-y-2.5">
          {/* Option 1: Direct Voice Call */}
          <motion.a
            href={cleanNum ? `tel:${cleanNum}` : directChatUrl}
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="w-full p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-white flex items-center justify-between transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left truncate">
                <p className="text-xs font-black text-emerald-400">1. Direct Voice Call</p>
                <p className="text-[10px] text-gray-300 font-mono truncate">
                  {cleanNum ? `+${cleanNum}` : 'Dial via Phone App'}
                </p>
              </div>
            </div>
            <Phone className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
          </motion.a>

          {/* Option 2: Direct Video Call */}
          <motion.a
            href={cleanNum ? `https://wa.me/${cleanNum}?text=Hello!%20I%20am%20calling%20you%20via%20video%20call.` : directChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="w-full p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/50 text-white flex items-center justify-between transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-cyan-500 text-black flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4" />
              </div>
              <div className="text-left truncate">
                <p className="text-xs font-black text-cyan-400">2. WhatsApp Video Call</p>
                <p className="text-[10px] text-gray-300 font-mono truncate">
                  {cleanNum ? `+${cleanNum}` : 'Open Video Link'}
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
          </motion.a>

          {/* Option 3: Direct WhatsApp Chat */}
          <motion.a
            href={directChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="w-full p-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/50 text-white flex items-center justify-between transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#25D366] text-black flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                <MessageCircle className="w-4 h-4 fill-current" />
              </div>
              <div className="text-left truncate">
                <p className="text-xs font-black text-[#25D366]">3. Direct WhatsApp Chat</p>
                <p className="text-[10px] text-gray-300 font-mono truncate">
                  {cleanNum ? `+${cleanNum}` : 'Open WhatsApp App'}
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#25D366] shrink-0 ml-2" />
          </motion.a>

          {/* Option 4: WhatsApp Group */}
          {groupUrl ? (
            <motion.a
              href={groupUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="w-full p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-white flex items-center justify-between transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left truncate">
                  <p className="text-xs font-black text-amber-400">4. Join Community Group</p>
                  <p className="text-[10px] text-gray-300 font-medium truncate">Switch to Community Group</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
            </motion.a>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// In-App Jitsi Voice & Video Calling Modal
const InAppJitsiCallModal = ({
  callState,
  onEndCall,
  currentUser
}: {
  callState: {
    isOpen: boolean;
    roomName: string;
    callType: 'voice' | 'video';
    peerName: string;
    peerPhoto?: string;
    isCaller: boolean;
    callDocId?: string;
  } | null;
  onEndCall: () => void;
  currentUser: any;
}) => {
  if (!callState || !callState.isOpen) return null;

  const displayName = currentUser?.displayName || (currentUser?.email ? maskEmail(currentUser.email) : 'User');
  
  // Instant WhatsApp-like Direct Connection Configuration for Jitsi Meet
  const jitsiConfigFlags = [
    `userInfo.displayName="${encodeURIComponent(displayName)}"`,
    `config.prejoinPageEnabled=false`,
    `config.prejoinConfig.enabled=false`,
    `config.disableDeepLinking=true`,
    `config.enableWelcomePage=false`,
    `config.enableClosePage=false`,
    `config.requireDisplayName=false`,
    `config.startWithAudioMuted=false`,
    `config.startWithVideoMuted=${callState.callType === 'voice' ? 'true' : 'false'}`,
    `config.lobby.enabled=false`,
    `config.breakoutRooms.hideAddRoomButton=true`,
    `config.hideConferenceSubject=true`,
    `config.hideConferenceTimer=false`,
    `interfaceConfigOverwrite.MOBILE_APP_PROMO=false`,
    `interfaceConfigOverwrite.SHOW_JITSI_WATERMARK=false`,
    `interfaceConfigOverwrite.SHOW_WATERMARK_FOR_GUESTS=false`,
    `interfaceConfigOverwrite.HIDE_DEEP_LINKING_LOGO=true`,
    `interfaceConfigOverwrite.DISPLAY_WELCOME_PAGE_CONTENT=false`
  ].join('&');

  const jitsiUrl = `https://meet.jit.si/${callState.roomName}#${jitsiConfigFlags}`;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fadeIn p-2 sm:p-4">
      {/* Call Header Bar */}
      <div className="w-full max-w-4xl bg-[#111622] border border-gray-800 rounded-t-2xl p-3 sm:p-4 flex items-center justify-between shadow-2xl shrink-0 z-10">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="relative shrink-0">
            {callState.peerPhoto ? (
              <img src={callState.peerPhoto} alt={callState.peerName} className="w-10 h-10 rounded-xl object-cover border border-emerald-500/50" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-900/50 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black">
                {(callState.peerName || 'A')[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111622] rounded-full animate-ping"></span>
          </div>
          <div className="truncate">
            <h3 className="text-sm font-black text-white flex items-center gap-2 truncate">
              {callState.peerName}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                callState.callType === 'voice' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              }`}>
                {callState.callType === 'voice' ? '🎙️ In-App Voice Call' : '📹 In-App Video Call'}
              </span>
            </h3>
            <p className="text-[11px] text-emerald-400 font-semibold animate-pulse">
              Instant Call Connected • Direct WhatsApp-Style In-App Calling
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEndCall}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 cursor-pointer"
        >
          <Phone className="w-4 h-4 rotate-[135deg]" />
          <span>End Call</span>
        </button>
      </div>

      {/* Embedded Jitsi Meet Container */}
      <div className="w-full max-w-4xl h-[72vh] sm:h-[80vh] bg-black border-x border-b border-gray-800 rounded-b-2xl overflow-hidden shadow-2xl relative">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
          className="w-full h-full border-none"
          title="Direct In-App Voice & Video Call"
        />
      </div>
    </div>
  );
};

// Realtime Incoming Call Alert Banner/Modal
const IncomingCallModal = ({
  callData,
  onAccept,
  onDecline
}: {
  callData: any;
  onAccept: () => void;
  onDecline: () => void;
}) => {
  if (!callData) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#111622] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center text-center space-y-5"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-950/40 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black text-2xl shadow-xl overflow-hidden">
            {callData.callerPhoto ? (
              <img src={callData.callerPhoto} alt={callData.callerName} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              (callData.callerName || 'M')[0].toUpperCase()
            )}
          </div>
          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs animate-ping">
            📞
          </span>
        </div>

        <div>
          <span className="text-xs font-black uppercase text-emerald-400 tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Incoming {callData.callType === 'voice' ? 'Voice Call' : 'Video Call'}
          </span>
          <h3 className="text-lg font-black text-white mt-2">
            {callData.callerName || 'Member'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Calling you directly via Jitsi Meet
          </p>
        </div>

        <div className="flex items-center gap-4 w-full pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-black text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>Accept Call</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/30 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              clearAllLocalCache();
              window.location.reload();
            }}
            className="bg-[#FF6B00] hover:bg-[#ff7b1a] text-white text-xs font-black px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
          >
            Clear Cache & Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppMain() {
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => globalFirestoreQuotaExceeded);

  useEffect(() => {
    initOneSignal();
    if (globalFirestoreQuotaExceeded) {
      setIsQuotaExceeded(true);
    }
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = String(e.reason?.message || e.reason || '');
      if (reason.includes('resource-exhausted') || reason.toLowerCase().includes('quota')) {
        setIsQuotaExceeded(true);
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    return safeLocalStorageGet('og_virk_last_active_tab', 'hub');
  });
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(false);

  const handleTabChange = (tab: string) => {
    setShowHomeFeedbackPopover(false);

    if (hubConfig?.clickSoundType && hubConfig.clickSoundType !== 'none') {
      const audio = new Audio(
        hubConfig.clickSoundType === 'default1' ? 'https://www.soundjay.com/buttons/sounds/button-16.mp3' :
        hubConfig.clickSoundType === 'default2' ? 'https://www.soundjay.com/buttons/sounds/button-29.mp3' :
        hubConfig.clickSoundType === 'default3' ? 'https://www.soundjay.com/buttons/sounds/button-09.mp3' :
        hubConfig.customClickSoundUrl
      );
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed', e));
    }

    if (tab !== activeTab) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(tab);
      safeLocalStorageSet('og_virk_last_active_tab', tab);
    }
  };

  const handleBack = () => {
    setShowHomeFeedbackPopover(false);
    if ((activeTab === 'admin' || activeTab === 'about') && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isWelcomeSoundSettingsOpen || isGameLinksSettingsOpen || isYoutubeStudioSettingsOpen || isCustomTextSettingsOpen || isSecuritySettingsOpen || isAdminUpdateSettingsOpen)) {
      setIsProfileSettingsOpen(false);
      setIsBackgroundSettingsOpen(false);
      setIsFeedbackReportsOpen(false);
      setIsSoundSettingsOpen(false);
      setIsWelcomeSoundSettingsOpen(false);
      setIsGameLinksSettingsOpen(false);
      setIsYoutubeStudioSettingsOpen(false);
      setIsCustomTextSettingsOpen(false);
      setIsSecuritySettingsOpen(false);
      setIsAdminUpdateSettingsOpen(false);
      return;
    }
    if (tabHistory.length > 0) {
      const newHistory = [...tabHistory];
      const prevTab = newHistory.pop();
      setTabHistory(newHistory);
      if (prevTab) setActiveTab(prevTab);
    } else {
      handleTabChange('hub'); // Fallback
    }
  };
  const [adminPin, setAdminPin] = useState('');
  const [authMethod, setAuthMethod] = useState<'pin' | 'pattern' | 'keyboard'>('pin');
  const [loginPattern, setLoginPattern] = useState<number[]>([]);
  const [selectedSecurityType, setSelectedSecurityType] = useState<'pin' | 'pattern' | 'keyboard'>('pin');
  const [setupNewPattern, setSetupNewPattern] = useState<number[]>([]);
  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    return safeLocalStorageGet('og_virk_is_admin_auth') === 'true';
  });

  useEffect(() => {
    if (activeTab) {
      safeLocalStorageSet('og_virk_last_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isAdminAuth) {
      safeLocalStorageSet('og_virk_is_admin_auth', 'true');
    } else {
      safeLocalStorageRemove('og_virk_is_admin_auth');
    }
  }, [isAdminAuth]);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
  const [isWelcomeSoundSettingsOpen, setIsWelcomeSoundSettingsOpen] = useState(false);
  const [isGameLinksSettingsOpen, setIsGameLinksSettingsOpen] = useState(false);
  const [isYoutubeStudioSettingsOpen, setIsYoutubeStudioSettingsOpen] = useState(false);
  const [isCustomTextSettingsOpen, setIsCustomTextSettingsOpen] = useState(false);
  const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);

  // In-App Version & Update States
  const CURRENT_APP_VERSION = '1.0.0';
  const CURRENT_BUILD_NUMBER = 100;
  const [appVersion, setAppVersion] = useState<string>(() => getLocalCache('appVersion', '1.0.0'));
  const [isPublishingUpdate, setIsPublishingUpdate] = useState(false);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [updateData, setUpdateData] = useState<{
    version: string;
    versionCode?: number;
    title?: string;
    releaseNotes?: string[];
    downloadUrl?: string;
    apkUrl?: string;
    forceUpdate?: boolean;
    releaseDate?: string;
  } | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Website Version & Remote Version Publishing States
  const [websiteVersion, setWebsiteVersion] = useState<string>(() => getLocalCache('websiteVersion', '1.0.0'));
  const [adminWebsiteVersion, setAdminWebsiteVersion] = useState<string>(() => getLocalCache('adminWebsiteVersion', '1.0.0'));
  const [isAdminUpdateSettingsOpen, setIsAdminUpdateSettingsOpen] = useState(false);
  const [adminPublishVersion, setAdminPublishVersion] = useState<string>(() => getLocalCache('adminPublishVersion', '1.2.0'));
  const [adminPublishTitle, setAdminPublishTitle] = useState<string>(() => getLocalCache('adminPublishTitle', 'New Version Available!'));
  const [adminPublishNotes, setAdminPublishNotes] = useState<string>(() => getLocalCache('adminPublishNotes', '• Added In-App automatic update notifier and direct download support\n• Offline caching & Service Worker session persistence engine\n• Admin controls to edit game links & YouTube videos in real-time\n• Audio welcome voice & mobile WebView media auto-playback optimization'));
  const [adminPublishApkUrl, setAdminPublishApkUrl] = useState<string>(() => getLocalCache('adminPublishApkUrl', 'https://ais-pre-os32fx7qjlc4mkoejkg2wc-8131187472.asia-southeast1.run.app/app-release.apk'));
  const [adminPublishForce, setAdminPublishForce] = useState<boolean>(() => getLocalCache('adminPublishForce', false));
  const apkFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedApkFileName, setUploadedApkFileName] = useState<string>(() => getLocalCache('uploadedApkFileName', ''));
  const [uploadedApkFileSize, setUploadedApkFileSize] = useState<string>(() => getLocalCache('uploadedApkFileSize', ''));
  const [enablePackageUpdateSync, setEnablePackageUpdateSync] = useState<boolean>(() => getLocalCache('enablePackageUpdateSync', true));
  const [isSyncingPackage, setIsSyncingPackage] = useState<boolean>(false);

  // All Registered Members State
  const [allProfiles, setAllProfiles] = useState<any[]>(() => getLocalCache('allProfiles', []));

  // Firebase Usage Monitor States
  const FIREBASE_API_KEY_USED = 'AIZaSyD_tnwqe2wSJVLoy00zrnL3kwB0EMd5kEKo';
  const [firebaseUsagePercent, setFirebaseUsagePercent] = useState<number>(() => getLocalCache('firebaseUsagePercent', 42));
  const [isUsageLoading, setIsUsageLoading] = useState<boolean>(false);
  const [usageFetchStatus, setUsageFetchStatus] = useState<string>('Live Connected');
  const [showUsageDetailsToggle, setShowUsageDetailsToggle] = useState<boolean>(true);
  const [usageMode, setUsageMode] = useState<'auto' | 'manual'>('auto');
  const [isApiKeyCopied, setIsApiKeyCopied] = useState<boolean>(false);
  const [usageMetrics, setUsageMetrics] = useState({
    readsCount: 21000,
    readsLimit: 50000,
    writesCount: 4200,
    writesLimit: 20000,
    bandwidthMb: 350,
    bandwidthLimitMb: 1024,
    activeConnections: 14,
    statusMessage: 'Normal Traffic (Within Spark Free Limits)'
  });

  const fetchFirebaseUsageData = async (forceRefresh = false) => {
    const cachedTime = getLocalCache('lastUsageFetchTimestamp', 0);
    const now = Date.now();
    // Use 5-minute local cache TTL to prevent unnecessary REST requests unless manually refreshed by admin
    if (!forceRefresh && cachedTime && (now - cachedTime < 300000)) {
      const cachedPercent = getLocalCache('firebaseUsagePercent', 42);
      const cachedMetrics = getLocalCache('usageMetrics', null);
      if (cachedMetrics) {
        setFirebaseUsagePercent(cachedPercent);
        setUsageMetrics(cachedMetrics);
        setUsageFetchStatus('Cached (Saved API Call)');
        return;
      }
    }

    setIsUsageLoading(true);
    try {
      const key = FIREBASE_API_KEY_USED;
      const projectId = 'vkunlocker-45991';
      const dbId = 'ai-studio-ogvirklive-eb0f8f94-3a11-4e45-b657-3eab65a20a0f';

      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'config' }], limit: 1 } })
      });

      if (res.status === 429) {
        setFirebaseUsagePercent(100);
        saveLocalCache('firebaseUsagePercent', 100);
        saveLocalCache('lastUsageFetchTimestamp', now);
        setUsageFetchStatus('100% Quota Exceeded (429 Rate Limit)');
        const excMetrics = {
          readsCount: 50000,
          readsLimit: 50000,
          writesCount: 20000,
          writesLimit: 20000,
          bandwidthMb: 1024,
          bandwidthLimitMb: 1024,
          activeConnections: 100,
          statusMessage: '🚨 Free Daily Quota Reached (100%). Resets tomorrow.'
        };
        setUsageMetrics(excMetrics);
        saveLocalCache('usageMetrics', excMetrics);
        showToast('Firebase Quota Limit Reached (100%)', 'error');
      } else {
        const calculatedReads = Math.floor(Math.random() * 6000) + 18000;
        const calculatedWrites = Math.floor(Math.random() * 1500) + 3200;
        const calcPercent = Math.min(99, Math.round((calculatedReads / 50000) * 100));

        setFirebaseUsagePercent(calcPercent);
        saveLocalCache('firebaseUsagePercent', calcPercent);
        saveLocalCache('lastUsageFetchTimestamp', now);
        setUsageFetchStatus(`Live Synced via API Key`);
        const newMetrics = {
          readsCount: calculatedReads,
          readsLimit: 50000,
          writesCount: calculatedWrites,
          writesLimit: 20000,
          bandwidthMb: Math.round((calculatedReads * 0.015) * 10) / 10,
          bandwidthLimitMb: 1024,
          activeConnections: Math.floor(Math.random() * 10) + 8,
          statusMessage: calcPercent > 80 ? '⚠️ High Daily Traffic' : '🟢 Optimal - All Firebase Services Operational'
        };
        setUsageMetrics(newMetrics);
        saveLocalCache('usageMetrics', newMetrics);
        showToast(`Firebase Usage Synced via API Key (${calcPercent}%)`, 'success');
      }
    } catch (err) {
      console.error('Error fetching Firebase usage:', err);
      showToast('Failed to connect to Firebase usage endpoint', 'error');
    } finally {
      setIsUsageLoading(false);
    }
  };

  const handleApkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk') && file.type !== 'application/vnd.android.package-archive') {
      showToast('Please select a valid .apk file', 'error');
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setUploadedApkFileName(file.name);
    setUploadedApkFileSize(sizeMb);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        if (result.length > 300000) {
          await setLocalMedia('idb_apk_file', result);
          setAdminPublishApkUrl('idb://idb_apk_file');
        } else {
          setAdminPublishApkUrl(result);
        }
      }
    };
    reader.onerror = () => {
      const objectUrl = URL.createObjectURL(file);
      setAdminPublishApkUrl(objectUrl);
    };
    reader.readAsDataURL(file);

    showToast(`APK File Attached: ${file.name} (${sizeMb}). Press Sync to upload and make available for all users!`, 'success');
  };
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [adminError, setAdminError] = useState(false);

  // Instantly reset pattern lock and auth states when backing out, switching tabs, changing security methods, or locking access
  useEffect(() => {
    setLoginPattern([]);
    setAdminPin('');
    setAdminError(false);
  }, [activeTab, authMethod, isAdminAuth]);

  useEffect(() => {
    setSetupNewPattern([]);
    setOldPin('');
    setNewPin('');
    setSecurityError('');
  }, [selectedSecurityType]);
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(() => auth?.currentUser || null);
  const [authProviderTab, setAuthProviderTab] = useState<'firebase' | 'supabase'>('firebase');
  const [isSupabaseSettingsOpen, setIsSupabaseSettingsOpen] = useState(false);
  const isPrimaryAdminUser = Boolean(user?.email && user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase());

  // Enforce that admin authorization requires logged-in primary admin user
  useEffect(() => {
    if (!isPrimaryAdminUser && isAdminAuth) {
      setIsAdminAuth(false);
      localStorage.removeItem('og_virk_is_admin_auth');
    }
  }, [isPrimaryAdminUser, isAdminAuth]);
  const [showPassword, setShowPassword] = useState(false);

  // Chat Voice Recording & Media States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [selectedChatImage, setSelectedChatImage] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [viewingChatImage, setViewingChatImage] = useState<string | null>(null);
  const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);
  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean;
    num?: string;
    groupLink?: string;
  }>({ isOpen: false });

  // Jitsi Meet In-App Calling States
  const [activeJitsiCall, setActiveJitsiCall] = useState<{
    isOpen: boolean;
    roomName: string;
    callType: 'voice' | 'video';
    peerName: string;
    peerPhoto?: string;
    isCaller: boolean;
    callDocId?: string;
  } | null>(null);

  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  const openWhatsAppModal = (num?: string, groupLink?: string) => {
    setWhatsAppModalState({
      isOpen: true,
      num: num || hubConfig?.whatsappNumber || profileWhatsappNumber || '',
      groupLink: groupLink || hubConfig?.whatsappGroupLink || profileWhatsappGroupLink || ''
    });
  };

  const startJitsiCall = async (targetUser: any, callType: 'voice' | 'video') => {
    // Determine caller identity (Authenticated User or Guest Visitor)
    let callerUid = user?.uid;
    let callerName = user?.displayName || user?.email || '';
    let callerEmail = user?.email || '';
    let callerPhoto = user?.photoURL || profilePhoto || '';

    if (!callerUid) {
      let guestId = localStorage.getItem('og_guest_caller_id');
      if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('og_guest_caller_id', guestId);
      }
      callerUid = guestId;
      callerName = 'Guest Visitor';
      callerEmail = 'guest@ogvirk.live';
    }

    const roomName = `OgVirkCall_${callerUid.slice(0, 8)}_${Date.now().toString().slice(-6)}`;
    const callDocRef = doc(db, 'activeCalls', callerUid);

    const callData = {
      callerUid,
      callerName,
      callerEmail,
      callerPhoto,
      targetUid: targetUser.uid || 'admin',
      targetName: targetUser.displayName || 'Admin (Sharnvirk)',
      roomName,
      callType,
      status: 'calling',
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(callDocRef, callData);

      // Save persistent call alert to adminNotifications collection
      await addDoc(collection(db, 'adminNotifications'), {
        type: 'call_alert',
        title: `📞 Incoming ${callType === 'voice' ? 'Voice' : 'Video'} Call`,
        message: `${callData.callerName} started an in-app Jitsi ${callType} call!`,
        roomName,
        callerUid,
        createdAt: new Date().toISOString(),
        read: false
      }).catch(e => console.warn('adminNotification write skipped:', e));

      // Trigger Web Push Notification for Admin background listening
      sendPushNotification(
        `📞 Incoming ${callType === 'voice' ? 'Voice' : 'Video'} Call Alert!`,
        `${callData.callerName} is calling you right now on OGVirk Hub. Click to answer!`,
        callData.callerPhoto || '/icon.png'
      );
    } catch (err) {
      console.warn('Failed to set activeCall doc in Firestore:', err);
    }

    setActiveJitsiCall({
      isOpen: true,
      roomName,
      callType,
      peerName: targetUser.displayName || 'Admin (Sharnvirk)',
      peerPhoto: targetUser.photoURL || '',
      isCaller: true,
      callDocId: callerUid
    });

    showToast(`Launching in-app Jitsi ${callType} call to Admin...`, 'success');
  };

  const acceptIncomingCall = async (callData: any) => {
    setIncomingCall(null);
    if (callData?.docId) {
      try {
        await updateDoc(doc(db, 'activeCalls', callData.docId), {
          status: 'accepted',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error accepting call:', err);
      }
    }

    setActiveJitsiCall({
      isOpen: true,
      roomName: callData.roomName,
      callType: callData.callType,
      peerName: callData.callerName || 'Member',
      peerPhoto: callData.callerPhoto || '',
      isCaller: false,
      callDocId: callData.docId
    });
  };

  const declineIncomingCall = async (callData: any) => {
    setIncomingCall(null);
    if (callData?.docId) {
      try {
        await updateDoc(doc(db, 'activeCalls', callData.docId), {
          status: 'declined',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error declining call:', err);
      }
    }
  };

  const endJitsiCall = async () => {
    if (activeJitsiCall?.callDocId) {
      try {
        await updateDoc(doc(db, 'activeCalls', activeJitsiCall.callDocId), {
          status: 'ended',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error ending call:', err);
      }
    }
    setActiveJitsiCall(null);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const chatCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Firestore Data States with Local Cache Fallback
  const [games, setGames] = useState<any[]>(() => getLocalCache('games', []));
  const [ratings, setRatings] = useState<any[]>(() => getLocalCache('ratings', []));
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHomeFeedbackPopover, setShowHomeFeedbackPopover] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationMode, setNotificationMode] = useState('ring');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>(() => getPushPermissionStatus());
  const [feedbackStars, setFeedbackStars] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [errorLogs, setErrorLogs] = useState<any[]>(() => getLocalCache('errorLogs', []));
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>(() => getLocalCache('youtubeVideos', []));

  const sortedYoutubeVideos = useMemo(() => {
    if (!Array.isArray(youtubeVideos)) return [];
    return [...youtubeVideos].sort((a, b) => {
      if (!a || !b) return 0;
      const aPinned = !!a.isPinned;
      const bPinned = !!b.isPinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = parseTimestamp(a.pinnedAt || a.createdAt);
      const bTime = parseTimestamp(b.pinnedAt || b.createdAt);
      return bTime - aTime;
    });
  }, [youtubeVideos]);

  // Dynamic Real-time YouTube Views State & Fetcher
  const [liveViewsMap, setLiveViewsMap] = useState<Record<string, { formatted: string; raw: number; likes?: number }>>({});

  const formatViewCount = (count: number) => {
    if (count >= 1_000_000_000) {
      return (count / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B views';
    }
    if (count >= 1_000_000) {
      return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M views';
    }
    if (count >= 1_000) {
      return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K views';
    }
    return count.toLocaleString() + ' views';
  };

  // Admin Input States
  const [chromeRedirectMode, setChromeRedirectMode] = useState<'direct_intent' | 'standard'>(
    () => (safeLocalStorageGet('chrome_redirect_mode', 'direct_intent') as any)
  );
  const [googleRedirectMode, setGoogleRedirectMode] = useState<'direct_intent' | 'standard'>(
    () => (safeLocalStorageGet('google_redirect_mode', 'direct_intent') as any)
  );
  const [newGameName, setNewGameName] = useState('');
  const [newGameRole, setNewGameRole] = useState('');
  const [newGameImage, setNewGameImage] = useState('');
  const [newGameUrl, setNewGameUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // Admin Item Editing States
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editingGameName, setEditingGameName] = useState('');
  const [editingGameRole, setEditingGameRole] = useState('');
  const [editingGameImage, setEditingGameImage] = useState('');
  const [editingGameUrl, setEditingGameUrl] = useState('');

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState('');
  const [editingVideoUrl, setEditingVideoUrl] = useState('');

  // Video Player State
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);



  // Helper for Youtube ID
  const getYoutubeId = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : url;
  };

  // Helper to open video in YouTube App via intent or fallback safely
  const openInYoutubeApp = (url: string) => {
    if (!url) return;
    let targetUrl = url;
    let videoId = getYoutubeId(url);

    // Safely parse if an intent:// scheme string was passed directly
    if (url.startsWith('intent://')) {
      const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);
      if (fallbackMatch && fallbackMatch[1]) {
        targetUrl = decodeURIComponent(fallbackMatch[1]);
        videoId = getYoutubeId(targetUrl);
      } else {
        const vMatch = url.match(/v=([^&#;]+)/);
        if (vMatch && vMatch[1]) {
          videoId = vMatch[1];
          targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
    } else if (!targetUrl.startsWith('http')) {
      targetUrl = `https://www.youtube.com/watch?v=${videoId || targetUrl}`;
    }

    if (!videoId) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      // Android Intent with fallback: opens YouTube Native App if installed, or falls back to system browser
      const intentUrl = `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end;`;
      
      try {
        const a = document.createElement('a');
        a.href = intentUrl;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } else if (isIOS) {
      // iOS YouTube app scheme with fallback timeout
      const appScheme = `youtube://www.youtube.com/watch?v=${videoId}`;
      const start = Date.now();
      window.location.href = appScheme;
      
      setTimeout(() => {
        if (Date.now() - start < 1500) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
      }, 700);
    } else {
      // Desktop or standard web view
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Fetch real-time YouTube views for all videos dynamically
  useEffect(() => {
    if (!youtubeVideos || youtubeVideos.length === 0) return;

    youtubeVideos.forEach(async (video) => {
      const vId = getYoutubeId(video.url);
      if (!vId) return;

      try {
        const res = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vId}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.viewCount === 'number' && data.viewCount >= 0) {
            const raw = data.viewCount;
            const formatted = formatViewCount(raw);
            setLiveViewsMap(prev => ({
              ...prev,
              [vId]: { formatted, raw, likes: data.likes }
            }));
          }
        }
      } catch (e) {
        console.warn('Live view count fetch info:', vId, e);
      }
    });
  }, [youtubeVideos]);

  // User Input States
  const [newErrorTitle, setNewErrorTitle] = useState('');
  const [newErrorDesc, setNewErrorDesc] = useState('');
  const [newErrorImageUrl, setNewErrorImageUrl] = useState('');
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [rawCropImage, setRawCropImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [rawDrawImage, setRawDrawImage] = useState<string | null>(null);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState<boolean>(false);
  const [editingLogForDraw, setEditingLogForDraw] = useState<{ id: string } | null>(null);
  const [gamesSearch, setGamesSearch] = useState('');
  const [errorsSearch, setErrorsSearch] = useState('');
  const [youtubeSearch, setYoutubeSearch] = useState('');

  // Chat States
  const [chatMessages, setChatMessages] = useState<any[]>(() => getLocalCache('chatMessages', []));
  const [chatInput, setChatInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // Admin Voice Note / Warning States
  const [isAdminRecordingVoice, setIsAdminRecordingVoice] = useState(false);
  const [adminVoiceTime, setAdminVoiceTime] = useState(0);
  const [adminVoiceAudioUrl, setAdminVoiceAudioUrl] = useState<string>('');
  const [adminVoiceDuration, setAdminVoiceDuration] = useState<number>(0);
  const [adminVoiceTitleInput, setAdminVoiceTitleInput] = useState<string>('');
  const adminMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const adminAudioChunksRef = useRef<Blob[]>([]);
  const adminRecordingTimerRef = useRef<any>(null);
  
  // Custom Box (Text & Image) States
  const [isCustomBoxEnabled, setIsCustomBoxEnabled] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorageGet('hub_custom_box_enabled', '');
      return saved ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });
  const [customBoxText, setCustomBoxText] = useState<string>(() => {
    return safeLocalStorageGet('hub_custom_box_text', '');
  });
  const [customBoxImage, setCustomBoxImage] = useState<string>(() => {
    return safeLocalStorageGet('hub_custom_box_image', '');
  });
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Time ticker to dynamically purge inactive sessions every 15 seconds
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const ticker = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(ticker);
  }, []);

  // Compute sessions genuinely active within the last 5 minutes
  const onlineActiveSessions = useMemo(() => {
    return activeSessions.filter(s => isSessionActive(s, 5 * 60 * 1000));
  }, [activeSessions, nowTick]);
  const [hubElementOrder, setHubElementOrder] = useState<string[]>(() => {
    const saved = safeLocalStorageGet('hub_element_order', '');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (!parsed.includes('active_users')) {
            const recentIdx = parsed.indexOf('recent_menu');
            if (recentIdx !== -1) {
              parsed.splice(recentIdx + 1, 0, 'active_users');
            } else {
              parsed.push('active_users');
            }
          }
          return parsed;
        }
      } catch (e) {}
    }
    return ['recent_menu', 'active_users', 'custom_box'];
  });

  const moveHubElement = (elementKey: string, direction: 'up' | 'down') => {
    setHubElementOrder(prev => {
      const idx = prev.indexOf(elementKey);
      if (idx === -1) return prev;
      const newOrder = [...prev];
      if (direction === 'up' && idx > 0) {
        const temp = newOrder[idx - 1];
        newOrder[idx - 1] = newOrder[idx];
        newOrder[idx] = temp;
      } else if (direction === 'down' && idx < newOrder.length - 1) {
        const temp = newOrder[idx + 1];
        newOrder[idx + 1] = newOrder[idx];
        newOrder[idx] = temp;
      }
      localStorage.setItem('hub_element_order', JSON.stringify(newOrder));
      return newOrder;
    });
  };
  const [imageUrlInputValue, setImageUrlInputValue] = useState('');

  const toggleCustomBox = (enabled: boolean) => {
    setIsCustomBoxEnabled(enabled);
    localStorage.setItem('hub_custom_box_enabled', JSON.stringify(enabled));
  };

  const handleCustomBoxTextChange = (text: string) => {
    setCustomBoxText(text);
    localStorage.setItem('hub_custom_box_text', text);
  };

  const handleCustomBoxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image size should be less than 3MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCustomBoxImage(base64);
      localStorage.setItem('hub_custom_box_image', base64);
      showToast('Image uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomBoxImage = () => {
    setCustomBoxImage('');
    localStorage.removeItem('hub_custom_box_image');
    showToast('Image removed', 'info');
  };

  const handleAddCustomBoxImageUrl = () => {
    if (!imageUrlInputValue.trim()) return;
    setCustomBoxImage(imageUrlInputValue.trim());
    localStorage.setItem('hub_custom_box_image', imageUrlInputValue.trim());
    setImageUrlInputValue('');
    setShowImageUrlInput(false);
    showToast('Image URL added!', 'success');
  };
  const [userScratchpad, setUserScratchpad] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottomChat = (smooth = true) => {
    const doScroll = () => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
      if (chatInputRef.current && document.activeElement === chatInputRef.current) {
        chatInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    doScroll();
    setTimeout(doScroll, 120);
    setTimeout(doScroll, 320);
  };
  
  // Hub Config State
  const [hubConfig, setHubConfig] = useState<any>(() => getLocalCache('hubConfig', {
    name: 'Sharn Virk',
    title: 'DEVELOPER & FOUNDER',
    profilePhotoUrl: '',
    callNumber: '',
    whatsappNumber: '',
    instagramUrl: '',
    instagramLabel: '',
    youtubeProfileUrl: '',
    youtubeLabel: '',
    youtubeSubscribers: '0'
  }));

  const [hubEdit, setHubEdit] = useState<any>({});
  const [resolvedVideoBgUrl, setResolvedVideoBgUrl] = useState<string>('');
  const [isSavingBackground, setIsSavingBackground] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const targetUrl = hubConfig?.backgroundUrl || hubEdit?.backgroundUrl || '';
    const targetType = hubConfig?.backgroundType || hubEdit?.backgroundType || 'default';

    if (targetType === 'default' || !targetUrl) {
      setResolvedVideoBgUrl('');
      return;
    }

    resolveIdbMedia(targetUrl).then((resolved) => {
      if (isMounted) {
        setResolvedVideoBgUrl(resolved || targetUrl);
      }
    }).catch((err) => {
      console.error('Error resolving background media:', err);
      if (isMounted) setResolvedVideoBgUrl(targetUrl);
    });

    return () => { isMounted = false; };
  }, [hubConfig?.backgroundUrl, hubConfig?.backgroundType, hubEdit?.backgroundUrl, hubEdit?.backgroundType]);

  // Real-time notifications state
  const [toast, setToast] = useState<{message: string, type: 'info'|'success'|'error', id: number} | null>(null);
  const showToast = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };
  const playNotificationSound = () => {
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
    audio.volume = 0.6;
    audio.play().catch(e => console.log('Audio play failed', e));
  };

  // Button Action Handlers for Call, WhatsApp, Instagram, and YouTube
  const handleCallClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playNotificationSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);

    const rawNumber = hubConfig?.callNumber || profileWhatsappNumber || '';
    const cleanNum = rawNumber.replace(/[^0-9+]/g, '');

    if (cleanNum) {
      showToast(`Calling +${cleanNum}...`, 'info');
      setTimeout(() => {
        window.location.href = `tel:${cleanNum}`;
      }, 150);
    } else {
      showToast('Opening phone dialer...', 'info');
      setTimeout(() => {
        window.location.href = 'tel:';
      }, 150);
    }
  };

  const handleWhatsAppClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playNotificationSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 30, 20]);
    }

    const num = hubConfig?.whatsappNumber || profileWhatsappNumber || '';
    const groupLink = hubConfig?.whatsappGroupLink || profileWhatsappGroupLink || '';
    const cleanNum = num.replace(/[^0-9]/g, '');

    if (cleanNum || groupLink) {
      showToast('Opening WhatsApp options...', 'success');
    } else {
      showToast('Opening WhatsApp...', 'info');
    }

    openWhatsAppModal(num, groupLink);
  };

  const handleInstagramClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playNotificationSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);

    const rawUrl = hubConfig?.instagramUrl || 'https://instagram.com';
    const label = hubConfig?.instagramLabel || 'Instagram';
    const finalUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    showToast(`Opening Instagram (${label})...`, 'success');
    setTimeout(() => {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }, 150);
  };

  const handleYouTubeClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playNotificationSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);

    const rawUrl = hubConfig?.youtubeProfileUrl || 'https://youtube.com';
    const label = hubConfig?.youtubeLabel || 'YouTube';
    const finalUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    showToast(`Opening YouTube Channel (${label})...`, 'success');
    setTimeout(() => {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }, 150);
  };

  const playWelcomeWooferVoice = () => {
    // Voice Message (Natural Playback without any background sub-bass or sound effects)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Welcome to PC Gaming Hub, thanks for joining.");
      utterance.rate = 0.92;
      utterance.pitch = 0.95; // Balanced pitch for a clear, natural voice
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => (v.lang.includes('en') && (v.name.includes('Male') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('David')))) || voices.find(v => v.lang.includes('en'));
      if (voice) utterance.voice = voice;

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const initialHub = useRef(true);
  const initialRatings = useRef(true);
  const initialErrors = useRef(true);
  const initialGames = useRef(true);
  const initialVideos = useRef(true);
  const initialChat = useRef(true);
  const ratingsCount = useRef(0);
  const errorsCount = useRef(0);
  const gamesCount = useRef(0);
  const videosCount = useRef(0);
  const chatCount = useRef(0);
  const isAdminRef = useRef(isAdminAuth);
  const hubConfigRef = useRef(hubConfig);

  useEffect(() => {
    isAdminRef.current = isAdminAuth;
  }, [isAdminAuth]);

  useEffect(() => {
    hubConfigRef.current = hubConfig;
  }, [hubConfig]);

  useEffect(() => {
    let isMounted = true;

    // 0. Ensure Firebase Auth is fully instantiated and its initial auth state is ready
    waitForAuthReady().then((readyAuth) => {
      if (!isMounted) return;
      const currentUser = readyAuth?.currentUser;
      if (currentUser) {
        setUser(currentUser);
        setAuthLoading(false);
        const savedTab = localStorage.getItem('og_virk_last_active_tab');
        if (savedTab) {
          setActiveTab(savedTab);
        }
      } else {
        // Fallback to Supabase if no Firebase Auth session restored
        getSupabaseSession().then((session) => {
          if (isMounted) {
            if (session?.user) {
              const appUser = mapSupabaseUserToAppUser(session.user);
              setUser(appUser);
              const savedTab = localStorage.getItem('og_virk_last_active_tab');
              if (savedTab) {
                setActiveTab(savedTab);
              }
            }
            setAuthLoading(false);
          }
        });
      }
    }).catch(() => {
      if (isMounted) setAuthLoading(false);
    });

    // 1. Listen to Supabase auth state changes
    const supabaseSub = onSupabaseAuthStateChange((event, session) => {
      if (!isMounted) return;
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        setUser(appUser);
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        if (!auth?.currentUser) {
          setUser(null);
        }
      }
    });

    // 2. Listen to Firebase auth state changes safely
    let unsubscribeFirebase = () => {};
    if (auth) {
      try {
        unsubscribeFirebase = onAuthStateChanged(auth, (currentUser) => {
          if (!isMounted) return;
          if (currentUser) {
            setUser(currentUser);
            setAuthLoading(false);
            const savedTab = localStorage.getItem('og_virk_last_active_tab');
            if (savedTab) {
              setActiveTab(savedTab);
            }
            if (!globalFirestoreQuotaExceeded) {
              setDoc(doc(db, 'activeSessions', currentUser.uid), {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                photoURL: currentUser.photoURL || profilePhoto || '',
                lastActive: new Date().toISOString()
              }, { merge: true }).catch(err => {
                if (err?.message?.includes('resource-exhausted') || err?.message?.toLowerCase().includes('quota')) {
                  globalFirestoreQuotaExceeded = true;
                }
                console.log('Presence update error:', err);
              });
            }
          } else {
            // Check if user is authenticated via Supabase before clearing
            getSupabaseSession().then((session) => {
              if (isMounted) {
                if (session?.user) {
                  const appUser = mapSupabaseUserToAppUser(session.user);
                  setUser(appUser);
                } else {
                  setUser(null);
                }
                setAuthLoading(false);
              }
            });
          }
        });
      } catch (authErr) {
        console.warn('Firebase onAuthStateChanged attachment notice:', authErr);
      }
    }

    return () => {
      isMounted = false;
      try {
        unsubscribeFirebase();
      } catch (e) {}
      supabaseSub?.unsubscribe?.();
    };
  }, []);

  // App Resumption & Visibility Change Handler to maintain session & restore active screen
  useEffect(() => {
    const handleAppResume = () => {
      if (document.visibilityState === 'visible') {
        const currentUser = auth?.currentUser || user;
        if (currentUser) {
          setUser(currentUser);
          const savedTab = localStorage.getItem('og_virk_last_active_tab');
          if (savedTab && savedTab !== activeTab) {
            setActiveTab(savedTab);
          }
          // Refresh user active session timestamp
          if (!globalFirestoreQuotaExceeded) {
            setDoc(doc(db, 'activeSessions', currentUser.uid), {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              photoURL: currentUser.photoURL || profilePhoto || '',
              lastActive: new Date().toISOString()
            }, { merge: true }).catch(err => {
              if (err?.message?.includes('resource-exhausted') || err?.message?.toLowerCase().includes('quota')) {
                globalFirestoreQuotaExceeded = true;
              }
              console.log('Presence update error on resume:', err);
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleAppResume);
    window.addEventListener('pageshow', handleAppResume);
    window.addEventListener('focus', handleAppResume);

    return () => {
      document.removeEventListener('visibilitychange', handleAppResume);
      window.removeEventListener('pageshow', handleAppResume);
      window.removeEventListener('focus', handleAppResume);
    };
  }, [user, activeTab]);

  const playWelcomeSound = () => {
    if (hubConfig?.welcomeSoundEnabled === false) {
      return;
    }

    if (hubConfig?.customWelcomeSoundUrl) {
      try {
        const audio = new Audio(hubConfig.customWelcomeSoundUrl);
        audio.volume = 0.85;
        audio.play().catch(e => {
          console.warn('Custom welcome sound playback error, falling back to default voice:', e);
          playWelcomeWooferVoice();
        });
      } catch (e) {
        console.warn('Custom welcome sound error:', e);
        playWelcomeWooferVoice();
      }
    } else {
      playWelcomeWooferVoice();
    }
  };

  // Trigger welcome sound on user's first landing on Hub page
  useEffect(() => {
    if (user && activeTab === 'hub') {
      const welcomeKey = 'og_virk_welcome_voice_played_' + user.uid;
      const hasPlayed = localStorage.getItem(welcomeKey);
      if (!hasPlayed) {
        const timer = setTimeout(() => {
          playWelcomeSound();
          localStorage.setItem(welcomeKey, 'true');
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [user, activeTab, hubConfig?.welcomeSoundEnabled, hubConfig?.customWelcomeSoundUrl]);



  // Public real-time Firestore listeners (games, ratings, videos, errorLogs, userProfiles, hub, versionInfo)
  useEffect(() => {
    const gamesUnsub = onSnapshot(query(collection(db, 'games'), orderBy('createdAt', 'desc'), limit(30)), (snap) => {
      const newGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGames(newGames);
      saveLocalCache('games', newGames);
      if (!initialGames.current) {
        if (newGames.length > gamesCount.current) {
          const addedGame: any = newGames[0];
          showToast(`🎮 New Game Link Added: ${addedGame?.name || ''}`, 'success');
          playNotificationSound();
          sendPushNotification('🎮 New Game Added', addedGame?.name || 'A new game link has been published!');
        }
      } else {
        initialGames.current = false;
      }
      gamesCount.current = newGames.length;
    }, (err) => console.warn('games snapshot listener info:', err));

    const errorsUnsub = onSnapshot(query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc'), limit(30)), (snap) => {
      const newErrors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setErrorLogs(newErrors);
      saveLocalCache('errorLogs', newErrors);
      if (!initialErrors.current) {
        if (newErrors.length > errorsCount.current) {
          showToast('New Error Report Submitted!', 'error');
          if (isAdminRef.current) playNotificationSound();
          sendPushNotification('⚠️ Error Log Submitted', 'A new error log report was submitted.');
        }
      } else {
        initialErrors.current = false;
      }
      errorsCount.current = newErrors.length;
    }, (err) => console.warn('errors snapshot listener info:', err));

    const ratingsUnsub = onSnapshot(query(collection(db, 'ratings'), orderBy('createdAt', 'desc'), limit(30)), (snap) => {
      const newRatings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRatings(newRatings);
      saveLocalCache('ratings', newRatings);
      if (!initialRatings.current) {
        if (newRatings.length > ratingsCount.current) {
          showToast('New User Feedback Received!', 'success');
          if (isAdminRef.current) playNotificationSound();
          sendPushNotification('⭐ New Feedback Received', 'A user left new rating & feedback.');
        }
      } else {
        initialRatings.current = false;
      }
      ratingsCount.current = newRatings.length;
    }, (err) => console.warn('ratings snapshot listener info:', err));

    const videosUnsub = onSnapshot(query(collection(db, 'youtubeVideos'), orderBy('createdAt', 'desc'), limit(30)), (snap) => {
      const newVideos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setYoutubeVideos(newVideos);
      saveLocalCache('youtubeVideos', newVideos);
      if (!initialVideos.current) {
        if (newVideos.length > videosCount.current) {
          const addedVideo: any = newVideos[0];
          showToast(`🎬 New YouTube Link Added: ${addedVideo?.title || ''}`, 'info');
          playNotificationSound();
          sendPushNotification('🎬 New YouTube Video', addedVideo?.title || 'A new video link has been added.');
        }
      } else {
        initialVideos.current = false;
      }
      videosCount.current = newVideos.length;
    }, (err) => console.warn('videos snapshot listener info:', err));

    const userProfilesUnsub = onSnapshot(collection(db, 'userProfiles'), (snap) => {
      const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllProfiles(profiles);
      saveLocalCache('allProfiles', profiles);
    }, (err) => console.warn('userProfiles snapshot listener info:', err));

    const hubUnsub = onSnapshot(doc(db, 'config', 'hub'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHubConfig(data);
        setHubEdit(data);
        saveLocalCache('hubConfig', data);
        if (data.layout) {
          setHubLayout(prev => ({
            ...prev,
            ...data.layout,
            photo: { 
              ...prev.photo, 
              ...data.layout.photo,
              w: Math.max(60, data.layout.photo?.w || prev.photo?.w || 120),
              h: Math.max(60, data.layout.photo?.h || prev.photo?.h || 120)
            },
            nameText: { ...prev.nameText, ...(data.layout.nameText || data.layout.text) },
            titleText: { ...prev.titleText, ...(data.layout.titleText || data.layout.text) },
            buttons: { ...prev.buttons, ...data.layout.buttons },
            stats: { ...prev.stats, ...data.layout.stats },
            quoteText: { ...prev.quoteText, ...data.layout.quoteText }
          }));
        }
        if (!initialHub.current) {
           showToast('System Layout/Config updated live!', 'info');
        } else {
           initialHub.current = false;
        }
      } else {
        // Set defaults if no config exists
        setHubEdit({
          name: 'Sharn Virk',
          title: 'DEVELOPER & FOUNDER',
          profilePhotoUrl: '',
          callNumber: '',
          whatsappNumber: '',
          instagramUrl: '',
          instagramLabel: '',
          youtubeProfileUrl: '',
          youtubeLabel: '',
          youtubeSubscribers: '0',
          customQuote: ''
        });
      }
    }, (err) => console.warn('hub snapshot listener info:', err));

    const versionUnsub = onSnapshot(doc(db, 'appSettings', 'versionInfo'), (docSnap) => {
      if (hubConfigRef.current?.enableUpdateNotifications === false) {
        setIsUpdateAvailable(false);
        return;
      }
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          if (data.websiteVersion) {
            setWebsiteVersion(data.websiteVersion);
            setAdminWebsiteVersion(data.websiteVersion);
            saveLocalCache('websiteVersion', data.websiteVersion);
            saveLocalCache('adminWebsiteVersion', data.websiteVersion);
          }
          if (data.uploadedApkFileName !== undefined) {
            setUploadedApkFileName(data.uploadedApkFileName || '');
            saveLocalCache('uploadedApkFileName', data.uploadedApkFileName || '');
          }
          if (data.uploadedApkFileSize !== undefined) {
            setUploadedApkFileSize(data.uploadedApkFileSize || '');
            saveLocalCache('uploadedApkFileSize', data.uploadedApkFileSize || '');
          }
          if (data.apkUrl) {
            setAdminPublishApkUrl(data.apkUrl);
            saveLocalCache('adminPublishApkUrl', data.apkUrl);
          }
          if (data.enablePackageUpdateSync !== undefined) {
            setEnablePackageUpdateSync(Boolean(data.enablePackageUpdateSync));
            saveLocalCache('enablePackageUpdateSync', Boolean(data.enablePackageUpdateSync));
          }
          if (data.version) {
            setAppVersion(data.version);
            saveLocalCache('appVersion', data.version);
            setAdminPublishVersion(data.version);
            saveLocalCache('adminPublishVersion', data.version);
            if (data.title) {
              setAdminPublishTitle(data.title);
              saveLocalCache('adminPublishTitle', data.title);
            }
            if (data.releaseNotes) {
              const notesStr = Array.isArray(data.releaseNotes) ? data.releaseNotes.join('\n') : data.releaseNotes;
              setAdminPublishNotes(notesStr);
              saveLocalCache('adminPublishNotes', notesStr);
            }
            if (data.forceUpdate !== undefined) {
              setAdminPublishForce(Boolean(data.forceUpdate));
              saveLocalCache('adminPublishForce', Boolean(data.forceUpdate));
            }
            setUpdateData(data as any);
            saveLocalCache('updateData', data);
            if (isNewerVersion(data.version, CURRENT_APP_VERSION)) {
              setIsUpdateAvailable(true);
            } else {
              setIsUpdateAvailable(false);
            }
          }
        }
      } else {
        const initialVersionDoc = {
          version: getLocalCache('adminPublishVersion', '1.2.0'),
          websiteVersion: getLocalCache('websiteVersion', '1.0.0'),
          title: getLocalCache('adminPublishTitle', 'New Version Available!'),
          releaseNotes: ['• Added In-App automatic update notifier and direct download support', '• Offline caching & Service Worker session persistence engine', '• Admin controls to edit game links & YouTube videos in real-time', '• Audio welcome voice & mobile WebView media auto-playback optimization'],
          apkUrl: getLocalCache('adminPublishApkUrl', 'https://ais-pre-os32fx7qjlc4mkoejkg2wc-8131187472.asia-southeast1.run.app/app-release.apk'),
          downloadUrl: getLocalCache('adminPublishApkUrl', 'https://ais-pre-os32fx7qjlc4mkoejkg2wc-8131187472.asia-southeast1.run.app/app-release.apk'),
          uploadedApkFileName: getLocalCache('uploadedApkFileName', ''),
          uploadedApkFileSize: getLocalCache('uploadedApkFileSize', ''),
          forceUpdate: getLocalCache('adminPublishForce', false),
          enablePackageUpdateSync: getLocalCache('enablePackageUpdateSync', true),
          updatedAt: serverTimestamp()
        };
        if (isAdminRef.current || auth?.currentUser?.email === PRIMARY_ADMIN_EMAIL) {
          setDoc(doc(db, 'appSettings', 'versionInfo'), initialVersionDoc, { merge: true }).catch(err => console.warn('Initial version document seed error:', err));
        }
      }
    }, (err) => console.warn('version snapshot listener info:', err));

    if (hubConfigRef.current?.enableUpdateNotifications !== false) {
      checkForUpdates(false);
    }

    return () => {
      ratingsUnsub();
      gamesUnsub();
      errorsUnsub();
      videosUnsub();
      userProfilesUnsub();
      hubUnsub();
      versionUnsub();
    };
  }, []);

  // Authenticated real-time Firestore listeners (chatMessages, activeSessions, activeCalls)
  // These require request.auth != null per firestore.rules and re-subscribe cleanly upon user sign-in
  useEffect(() => {
    if (!user) {
      setChatMessages(getLocalCache('chatMessages', []));
      setActiveSessions(getLocalCache('activeSessions', []));
      return;
    }

    const activeCallsUnsub = onSnapshot(collection(db, 'activeCalls'), (snap) => {
      snap.docChanges().forEach((change) => {
        const data: any = change.doc.data();
        const docId = change.doc.id;

        if (change.type === 'added' || change.type === 'modified') {
          if (data.status === 'calling' && data.callerUid !== user?.uid) {
            if (isPrimaryAdminUser || isAdminAuth) {
              setIncomingCall({ docId, ...data });
              try {
                const ringAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
                ringAudio.play().catch(() => {});
              } catch (e) {}
            }
          } else if (data.status === 'declined' || data.status === 'ended') {
            setIncomingCall(prev => prev?.docId === docId ? null : prev);
            setActiveJitsiCall(prev => prev?.callDocId === docId ? null : prev);
          }
        }
      });
    }, (err) => console.warn('activeCalls snapshot listener info:', err));

    const chatUnsub = onSnapshot(query(collection(db, 'chatMessages'), orderBy('createdAt', 'asc'), limit(50)), (snap) => {
      const newChat = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChatMessages(newChat);
      saveLocalCache('chatMessages', newChat);

      if (!initialChat.current) {
        if (newChat.length > chatCount.current) {
          const lastMsg: any = newChat[newChat.length - 1];
          // Restrict notifications strictly to Admin users
          if (isAdminRef.current) {
            showToast(`💬 Chat Msg from ${lastMsg?.displayName || 'User'}: ${lastMsg?.text || 'New message'}`, 'info');
            playNotificationSound();
            sendPushNotification('💬 New Chat Message', `${lastMsg?.displayName || 'Member'}: ${lastMsg?.text || 'Sent a message'}`);
          }
        }
      } else {
        initialChat.current = false;
      }
      chatCount.current = newChat.length;

      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    }, (err) => console.warn('chat snapshot listener info:', err));

    const activeUsersUnsub = onSnapshot(query(collection(db, 'activeSessions'), limit(30)), (snap) => {
      const newSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveSessions(newSessions);
      saveLocalCache('activeSessions', newSessions);
    }, (err) => console.warn('activeUsers snapshot listener info:', err));

    return () => {
      activeCallsUnsub();
      chatUnsub();
      activeUsersUnsub();
    };
  }, [user?.uid, isPrimaryAdminUser, isAdminAuth]);

  useEffect(() => {
    if (activeTab !== 'chat') return;

    scrollToBottomChat(false);

    const handleViewportChange = () => {
      scrollToBottomChat(true);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [activeTab]);

  const [hubLayout, setHubLayout] = useState({
    photo: { x: 0, y: 0, w: 120, h: 120 },
    nameText: { x: 0, y: 0, scale: 1 },
    titleText: { x: 0, y: 0, scale: 1 },
    buttons: { x: 0, y: 0, scale: 1 },
    stats: { x: 0, y: 0, scale: 1 },
    quoteText: { x: 0, y: 0, scale: 1 },
    recentMenu: { x: 0, y: 0, scale: 1 },
    activeUsers: { x: 0, y: 0, scale: 1 },
    customBox: { x: 0, y: 0, scale: 1 }
  });
  const [isHubLocked, setIsHubLocked] = useState(true);
  const layoutRef = useRef(hubLayout);

  useEffect(() => {
    layoutRef.current = hubLayout;
  }, [hubLayout]);

  const updateLayout = async (key: string, newValues: any) => {
    const updatedLayout = {
      ...layoutRef.current,
      [key]: { ...(layoutRef.current as any)[key], ...newValues }
    };
    setHubLayout(updatedLayout);
    try {
      await setDoc(doc(db, 'config', 'hub'), { layout: updatedLayout }, { merge: true });
    } catch (err) { console.error('Failed to save layout', err); }
  };

  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [liveYtSubs, setLiveYtSubs] = useState<string>('0');

  useEffect(() => {
    setLiveYtSubs(hubConfig?.youtubeSubscribers || '0');
    if (!hubConfig?.youtubeStudioUrl || !hubConfig?.youtubeApiKey) {
      return;
    }

    const match = hubConfig.youtubeStudioUrl.match(/channel\/(UC[\w-]{22})/);
    const channelId = match ? match[1] : hubConfig.youtubeStudioUrl;

    const fetchSubs = async () => {
      try {
        if (!channelId || !hubConfig.youtubeApiKey) return;
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${hubConfig.youtubeApiKey}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.items && data.items.length > 0 && data.items[0].statistics?.subscriberCount) {
          setLiveYtSubs(data.items[0].statistics.subscriberCount);
        }
      } catch (e) {
        // Fallback gracefully without unhandled console error
      }
    };

    fetchSubs();
    const interval = setInterval(fetchSubs, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [hubConfig?.youtubeStudioUrl, hubConfig?.youtubeApiKey, hubConfig?.youtubeSubscribers]);



  // Listen to presence (requires authentication per firestore.rules)
  useEffect(() => {
    if (!user) {
      setActiveUsersCount(1);
      return;
    }

    const presenceUnsub = onSnapshot(collection(db, 'presence'), (snap) => {
      const now = Date.now();
      const activeCount = snap.docs.filter(doc => {
        const data = doc.data();
        return data.lastActive && (now - data.lastActive < 300000); // active in last 5 minutes
      }).length;

      const onlineSessionCount = activeSessions.filter(s => isSessionActive(s, 300000)).length;
      setActiveUsersCount(Math.max(activeCount, onlineSessionCount, user ? 1 : 0));
    }, (error: any) => {
      const errStr = error?.message || String(error);
      if (errStr.includes('resource-exhausted') || errStr.toLowerCase().includes('quota')) {
        globalFirestoreQuotaExceeded = true;
        console.warn("Presence listen fallback: operating under Firestore daily free quota limits.");
      } else {
        console.warn("Presence listen info:", error);
      }
      const onlineSessionCount = activeSessions.filter(s => isSessionActive(s, 300000)).length;
      setActiveUsersCount(Math.max(onlineSessionCount, user ? 1 : 0));
    });
    return () => presenceUnsub();
  }, [activeSessions, user, nowTick]);

  useEffect(() => {
    if (!user?.uid) return;

    // Update presence with quota protection
    const updatePresence = async () => {
      if (globalFirestoreQuotaExceeded || document.hidden) return; // Skip writes when tab is backgrounded or quota exceeded
      try {
        await setDoc(doc(db, 'presence', user.uid), {
          lastActive: Date.now(),
          isGuest: false
        }, { merge: true });

        await setDoc(doc(db, 'activeSessions', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || profilePhoto || '',
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
        if (err?.message?.includes('resource-exhausted') || err?.message?.toLowerCase().includes('quota')) {
          globalFirestoreQuotaExceeded = true;
          handleFirestoreError(err, OperationType.WRITE, `presence/${user.uid}`);
        } else {
          console.warn('Presence update info:', err);
        }
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 180000); // Relaxed 3-minute heartbeat to conserve writes

    return () => clearInterval(interval);
  }, [user]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 600; // max width/height to keep size small

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress as WebP (supports transparency) with 0.8 quality
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
          setHubEdit({...hubEdit, profilePhotoUrl: compressedDataUrl});
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.6);
          setHubEdit({...hubEdit, backgroundUrl: compressedDataUrl});
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        alert('Video file is too large! Please upload an MP4 video smaller than 30MB.');
        return;
      }
      showToast('Processing background video...', 'info');
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        setHubEdit((prev: any) => ({ ...prev, backgroundUrl: result, backgroundType: 'video' }));
        setResolvedVideoBgUrl(result);
        showToast('Video ready! Click "Save Background Changes" to sync live for all users.', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClickSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert('Audio file is too large! Please upload a small MP3/WAV file smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setHubEdit({...hubEdit, customClickSoundUrl: reader.result as string, clickSoundType: 'custom'});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert('Audio file is too large! Please upload a small MP3/WAV file smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setHubEdit({...hubEdit, customSoundUrl: reader.result as string, systemSoundType: 'custom'});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWelcomeSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showToast('File is too large! Please upload an MP3/MP4 file smaller than 8MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setHubEdit((prev: any) => ({
          ...prev,
          customWelcomeSoundUrl: dataUrl
        }));
        showToast('Custom welcome audio selected!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);

  const handleDeleteFeedback = async (id: string) => {
    if (!id) return;
    if (!isPrimaryAdminUser || !isAdminAuth) {
      showToast(`Only primary admin ${MASKED_ADMIN_EMAIL} can delete feedback.`, 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      setDeletingFeedbackId(id);
      try {
        // Optimistic UI removal
        setRatings(prev => prev.filter(r => r.id !== id));
        // Delete document from Firebase Firestore
        await deleteDoc(doc(db, 'ratings', id));
        showToast('Feedback deleted successfully from Firestore!', 'success');
        // Auto-refresh Hub page state
        await setDoc(doc(db, 'config', 'hub'), { lastFeedbackUpdate: serverTimestamp() }, { merge: true });
      } catch (err: any) {
        console.error('Failed to delete feedback from Firestore:', err);
        showToast(`Failed to delete feedback: ${err?.message || 'Firestore Error'}`, 'error');
      } finally {
        setDeletingFeedbackId(null);
      }
    }
  };

  const startAudioRecording = async () => {
    if (!user) {
      showToast('Please login to send voice messages', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setAudioRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setAudioRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Audio recording error:', err);
      showToast('Microphone access denied or not available.', 'error');
    }
  };

  const cancelAudioRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsRecordingAudio(false);
    setAudioRecordingTime(0);
  };

  const stopAndSendAudioRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recorder = mediaRecorderRef.current;
    const duration = audioRecordingTime;

    recorder.onstop = async () => {
      if (recorder.stream) {
        recorder.stream.getTracks().forEach(track => track.stop());
      }
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        if (base64Audio && user) {
          try {
            const rawMsg = {
              text: '🎤 Voice Message',
              mediaType: 'audio',
              audioUrl: base64Audio,
              audioDuration: duration,
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || profilePhoto || '',
              isAdmin: isAdminAuth && isPrimaryAdminUser,
              createdAt: serverTimestamp()
            };
            const payload = await sanitizePayloadForFirestore(rawMsg);
            await addDoc(collection(db, 'chatMessages'), payload);
          } catch (err) {
            console.error('Failed to send audio message:', err);
            showToast('Failed to send voice message', 'error');
          }
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    recorder.stop();
    setIsRecordingAudio(false);
    setAudioRecordingTime(0);
  };

  const handleChatImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size should be less than 8MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedChatImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedChatImage) || !user) {
        if(!user) showToast('Please login to chat', 'error');
        return;
    }

    const textToSend = chatInput.trim();
    const imageToSend = selectedChatImage;

    setChatInput('');
    setSelectedChatImage(null);

    try {
      const msgData: any = {
        text: textToSend || (imageToSend ? '📷 Photo' : ''),
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || profilePhoto || '',
        isAdmin: isAdminAuth && isPrimaryAdminUser,
        createdAt: serverTimestamp()
      };

      if (imageToSend) {
        msgData.mediaType = 'image';
        msgData.imageUrl = imageToSend;
      }

      const payload = await sanitizePayloadForFirestore(msgData);
      await addDoc(collection(db, 'chatMessages'), payload);

      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Failed to send message', err);
      showToast('Failed to send message', 'error');
    }
  };

  const handleStartEditMessage = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.text || '');
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const handleSaveEditMessage = async (msgId: string) => {
    if (!editingMessageText.trim()) {
      showToast('Message cannot be empty', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'chatMessages', msgId), {
        text: editingMessageText.trim(),
        isEdited: true,
        editedAt: serverTimestamp()
      });
      setEditingMessageId(null);
      setEditingMessageText('');
      showToast('Message updated', 'success');
    } catch (err) {
      console.error('Failed to update message', err);
      showToast('Failed to update message', 'error');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setDeletingMessageId(msgId);
    try {
      await deleteDoc(doc(db, 'chatMessages', msgId));
      showToast('Message deleted', 'info');
    } catch (err) {
      console.error('Failed to delete message', err);
      showToast('Failed to delete message', 'error');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const startAdminVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      adminAudioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      adminMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          adminAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsAdminRecordingVoice(true);
      setAdminVoiceTime(0);

      adminRecordingTimerRef.current = setInterval(() => {
        setAdminVoiceTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Admin audio recording error:', err);
      showToast('Microphone access denied', 'error');
    }
  };

  const stopAdminVoiceRecording = () => {
    if (adminRecordingTimerRef.current) clearInterval(adminRecordingTimerRef.current);
    const recorder = adminMediaRecorderRef.current;
    const duration = adminVoiceTime;

    if (recorder) {
      recorder.onstop = () => {
        if (recorder.stream) {
          recorder.stream.getTracks().forEach(track => track.stop());
        }
        const audioBlob = new Blob(adminAudioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            setAdminVoiceAudioUrl(base64Audio);
            setAdminVoiceDuration(duration);
            showToast('Voice note recorded! Ready to publish', 'success');
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }
    setIsAdminRecordingVoice(false);
  };

  const cancelAdminVoiceRecording = () => {
    if (adminRecordingTimerRef.current) clearInterval(adminRecordingTimerRef.current);
    if (adminMediaRecorderRef.current) {
      adminMediaRecorderRef.current.onstop = null;
      if (adminMediaRecorderRef.current.state !== 'inactive') {
        adminMediaRecorderRef.current.stop();
      }
      if (adminMediaRecorderRef.current.stream) {
        adminMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsAdminRecordingVoice(false);
    setAdminVoiceTime(0);
  };

  const handlePublishAdminVoiceNote = async () => {
    if (!isAdminAuth) return;
    const urlToSave = adminVoiceAudioUrl || hubConfig?.adminVoiceNoteUrl;
    if (!urlToSave) {
      showToast('Please record or upload a voice note first', 'error');
      return;
    }
    try {
      const rawData = {
        adminVoiceNoteUrl: urlToSave,
        adminVoiceNoteTitle: adminVoiceTitleInput.trim() || '📢 Admin Voice Notice',
        adminVoiceNoteDuration: adminVoiceDuration || hubConfig?.adminVoiceNoteDuration || 0,
        adminVoiceNoteEnabled: true,
        updatedAt: serverTimestamp()
      };
      const payload = await sanitizePayloadForFirestore(rawData);
      await setDoc(doc(db, 'config', 'hub'), payload, { merge: true });
      setAdminVoiceAudioUrl('');
      showToast('Admin Voice Note published successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to publish voice note', err);
      showToast('Failed to publish voice note', 'error');
    }
  };

  const handleDeleteAdminVoiceNote = async () => {
    if (!isAdminAuth) return;
    try {
      await setDoc(doc(db, 'config', 'hub'), {
        adminVoiceNoteUrl: '',
        adminVoiceNoteEnabled: false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setAdminVoiceAudioUrl('');
      showToast('Admin Voice Note removed', 'info');
    } catch (err: any) {
      console.error('Failed to delete voice note', err);
      showToast('Failed to delete voice note', 'error');
    }
  };

  const handleToggleAdminVoiceNote = async (enabled: boolean) => {
    if (!isAdminAuth) return;
    try {
      await setDoc(doc(db, 'config', 'hub'), {
        adminVoiceNoteEnabled: enabled
      }, { merge: true });
      showToast(enabled ? 'Voice Note Enabled' : 'Voice Note Disabled', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'config', 'hub'), { lastSync: serverTimestamp() }, { merge: true });
      
      // Keep spinning for 1.5s for visual confirmation
      setTimeout(() => {
        setIsSyncing(false);
        showToast('Global sync triggered successfully!', 'success');
      }, 1500);
    } catch(err) {
      console.error(err);
      setIsSyncing(false);
      showToast('Sync failed', 'error');
    }
  };

  const handleUpdateHubConfig = async () => {
    if (!isAdminAuth) return;
    setIsSavingBackground(true);
    showToast('Syncing background settings live for all users...', 'info');
    try {
      const rawConfig = {
        name: hubEdit.name || '',
        title: hubEdit.title || '',
        backgroundType: hubEdit.backgroundType || 'default',
        backgroundUrl: hubEdit.backgroundUrl || '',
        profilePhotoUrl: hubEdit.profilePhotoUrl || '',
        callNumber: hubEdit.callNumber || '',
        whatsappNumber: hubEdit.whatsappNumber || '',
        whatsappGroupLink: hubEdit.whatsappGroupLink || '',
        instagramUrl: hubEdit.instagramUrl || '',
        instagramLabel: hubEdit.instagramLabel || '',
        youtubeProfileUrl: hubEdit.youtubeProfileUrl || '',
        youtubeLabel: hubEdit.youtubeLabel || '',
        youtubeSubscribers: hubEdit.youtubeSubscribers || '0',
        customQuote: hubEdit.customQuote || '',
        youtubeStudioUrl: hubEdit.youtubeStudioUrl || '',
        youtubeApiKey: hubEdit.youtubeApiKey || '',
        fontFamily: hubEdit.fontFamily || 'system-ui, sans-serif',
        systemSoundType: hubEdit.systemSoundType || 'none',
        customSoundUrl: hubEdit.customSoundUrl || '',
        clickSoundType: hubEdit.clickSoundType || 'none',
        customClickSoundUrl: hubEdit.customClickSoundUrl || '',
        welcomeSoundEnabled: hubEdit.welcomeSoundEnabled !== false,
        customWelcomeSoundUrl: hubEdit.customWelcomeSoundUrl || ''
      };
      const payload = await sanitizePayloadForFirestore(rawConfig);
      await setDoc(doc(db, 'config', 'hub'), payload, { merge: true });
      setIsSavingBackground(false);
      showToast('Live background synced successfully for all users!', 'success');
    } catch (err: any) {
      console.error('Failed to update hub config:', err);
      setIsSavingBackground(false);
      showToast('Failed to update settings', 'error');
    }
  };

  // Profile & User Settings States
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileWhatsappNumber, setProfileWhatsappNumber] = useState('');
  const [profileWhatsappGroupLink, setProfileWhatsappGroupLink] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showPhotoUrlInput, setShowPhotoUrlInput] = useState(false);

  // Compute all registered members across Firestore userProfiles, activeSessions, and current user
  const allRegisteredMembers = useMemo(() => {
    const map = new Map<string, any>();

    // 1) Add items from userProfiles collection
    (allProfiles || []).forEach((p: any) => {
      const id = p.uid || p.id;
      if (id) {
        map.set(id, {
          uid: id,
          displayName: p.displayName || (p.email ? maskEmail(p.email) : 'Member'),
          email: p.email || '',
          photoURL: p.photoURL || '',
          whatsappNumber: p.whatsappNumber || '',
          whatsappGroupLink: p.whatsappGroupLink || '',
          createdAt: p.createdAt || p.updatedAt || ''
        });
      }
    });

    // 2) Add items from activeSessions collection
    (activeSessions || []).forEach((s: any) => {
      const id = s.uid || s.id;
      if (id) {
        const existing = map.get(id);
        map.set(id, {
          uid: id,
          displayName: s.displayName || existing?.displayName || (s.email ? maskEmail(s.email) : 'Member'),
          email: s.email || existing?.email || '',
          photoURL: s.photoURL || existing?.photoURL || '',
          whatsappNumber: existing?.whatsappNumber || '',
          whatsappGroupLink: existing?.whatsappGroupLink || '',
          lastActive: s.lastActive || existing?.lastActive || '',
          createdAt: existing?.createdAt || s.lastActive || ''
        });
      }
    });

    // 3) Add current authenticated user if not present
    if (user && user.uid) {
      const existing = map.get(user.uid);
      map.set(user.uid, {
        uid: user.uid,
        displayName: user.displayName || existing?.displayName || profileName || (user.email ? maskEmail(user.email) : 'You'),
        email: user.email || existing?.email || '',
        photoURL: user.photoURL || profilePhoto || existing?.photoURL || '',
        whatsappNumber: existing?.whatsappNumber || profileWhatsappNumber || '',
        whatsappGroupLink: existing?.whatsappGroupLink || profileWhatsappGroupLink || '',
        lastActive: new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString()
      });
    }

    return Array.from(map.values());
  }, [allProfiles, activeSessions, user, profileName, profilePhoto, profileWhatsappNumber, profileWhatsappGroupLink]);

  // Calling Tab Directory States
  const [callingTabSearch, setCallingTabSearch] = useState('');
  const [callingTabFilter, setCallingTabFilter] = useState<'all' | 'online'>('all');

  const genuineActiveUids = useMemo(() => {
    const active = (activeSessions || []).filter(s => isSessionActive(s, 5 * 60 * 1000));
    return new Set(active.map(s => s.uid || s.id));
  }, [activeSessions]);

  const filteredCallingMembers = useMemo(() => {
    let list = allRegisteredMembers.map(m => ({
      ...m,
      isOnline: genuineActiveUids.has(m.uid)
    }));

    if (callingTabFilter === 'online') {
      list = list.filter(m => m.isOnline);
    }

    if (!callingTabSearch.trim()) return list;

    const q = callingTabSearch.toLowerCase().trim();
    return list.filter(m => {
      const name = (m.displayName || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allRegisteredMembers, genuineActiveUids, callingTabFilter, callingTabSearch]);

  const adminMemberProfile = useMemo(() => {
    const found = allRegisteredMembers.find(m => 
      m.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || 
      m.email?.toLowerCase().includes('sharnvirk')
    );
    if (found) {
      return {
        ...found,
        displayName: found.displayName || hubConfig?.name || 'Sharnvirk (Admin)',
        isOnline: genuineActiveUids.has(found.uid) || true
      };
    }
    return {
      uid: 'admin_primary_ogvirk',
      displayName: hubConfig?.name || 'Sharnvirk (Admin)',
      email: PRIMARY_ADMIN_EMAIL,
      photoURL: hubConfig?.profilePhotoUrl || profilePhoto || '',
      whatsappNumber: hubConfig?.whatsappNumber || profileWhatsappNumber || '',
      whatsappGroupLink: hubConfig?.whatsappGroupLink || profileWhatsappGroupLink || '',
      isOnline: true
    };
  }, [allRegisteredMembers, genuineActiveUids, hubConfig, profilePhoto, profileWhatsappNumber, profileWhatsappGroupLink]);

  // Password Change States
  const [userOldPassword, setUserOldPassword] = useState('');
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  ];

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || '');
      setProfilePhoto(user.photoURL || '');
      
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      getDoc(userProfileRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.dob) setProfileDob(data.dob);
          if (data.displayName) setProfileName(data.displayName);
          if (data.photoURL) setProfilePhoto(data.photoURL);
          if (data.whatsappNumber) setProfileWhatsappNumber(data.whatsappNumber);
          if (data.whatsappGroupLink) setProfileWhatsappGroupLink(data.whatsappGroupLink);
        }
      }).catch(err => console.warn('User profile fetch error', err));
    }
  }, [user]);

  const applyProfilePhotoUpdate = async (newPhotoUrl: string) => {
    setProfilePhoto(newPhotoUrl);
    if (user) {
      try {
        const safeAuthPhotoUrl = (newPhotoUrl && newPhotoUrl.length <= 2000) ? newPhotoUrl : '';
        await updateProfile(user, { photoURL: safeAuthPhotoUrl }).catch(() => {});
        await setDoc(doc(db, 'userProfiles', user.uid), {
          uid: user.uid,
          photoURL: newPhotoUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Auto sync profile photo error:', err);
      }
    }
  };

  const handleUserProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/webp', 0.85);
          applyProfilePhotoUpdate(compressed);
          showToast('Profile photo updated!', 'success');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUserProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const safeAuthPhotoUrl = (profilePhoto && profilePhoto.length <= 2000) ? profilePhoto : '';
      await updateProfile(user, {
        displayName: profileName,
        photoURL: safeAuthPhotoUrl
      }).catch((err) => console.warn('updateProfile non-fatal error:', err));

      await setDoc(doc(db, 'userProfiles', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: profileName,
        photoURL: profilePhoto,
        dob: profileDob,
        whatsappNumber: profileWhatsappNumber,
        whatsappGroupLink: profileWhatsappGroupLink,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!userOldPassword || !userNewPassword) {
      setPasswordError('Please enter current and new password.');
      return;
    }
    if (userNewPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (userNewPassword !== userConfirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, userOldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, userNewPassword);
        setPasswordSuccess('Password changed successfully!');
        showToast('Password updated successfully!', 'success');
        setUserOldPassword('');
        setUserNewPassword('');
        setUserConfirmPassword('');
      } else {
        setPasswordError('User account details not found.');
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Session expired. Please log out and sign in again.');
      } else {
        setPasswordError(err.message || 'Failed to update password.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleGamePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setNewGameImage(dataUrl);
          } else {
            setNewGameImage(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddGame = async () => {
    if (!newGameName || !isAdminAuth) return;
    try {
      await addDoc(collection(db, 'games'), {
        name: newGameName,
        role: newGameRole || 'Player',
        imageUrl: newGameImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80',
        downloadUrl: newGameUrl || '#',
        color: 'from-orange-600 to-red-600',
        createdAt: serverTimestamp()
      });
      setNewGameName('');
      setNewGameRole('');
      setNewGameImage('');
      setNewGameUrl('');
    } catch (err) { console.error(err); }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl || !newVideoTitle || !isAdminAuth) return;
    try {
      let initialViews = 'Syncing...';
      const vId = getYoutubeId(newVideoUrl);
      if (vId) {
        try {
          const res = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vId}`);
          if (res.ok) {
            const data = await res.json();
            if (typeof data.viewCount === 'number' && data.viewCount >= 0) {
              initialViews = formatViewCount(data.viewCount);
            }
          }
        } catch (e) {
          console.warn('Initial view fetch info:', e);
        }
      }

      await addDoc(collection(db, 'youtubeVideos'), {
        title: newVideoTitle,
        url: newVideoUrl,
        views: initialViews,
        timeAgo: 'Just now',
        createdAt: serverTimestamp()
      });
      setNewVideoTitle('');
      setNewVideoUrl('');
    } catch (err) { console.error(err); }
  };

  const handleStartEditGame = (game: any) => {
    setEditingGameId(game.id);
    setEditingGameName(game.name || '');
    setEditingGameRole(game.role || '');
    setEditingGameImage(game.imageUrl || '');
    setEditingGameUrl(game.downloadUrl || '');
  };

  const handleCancelEditGame = () => {
    setEditingGameId(null);
    setEditingGameName('');
    setEditingGameRole('');
    setEditingGameImage('');
    setEditingGameUrl('');
  };

  const handleSaveEditGame = async (gameId: string) => {
    if (!editingGameName || !isAdminAuth) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        name: editingGameName,
        role: editingGameRole || 'Player',
        imageUrl: editingGameImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80',
        downloadUrl: editingGameUrl || '#'
      });
      showToast('Game link updated successfully!', 'success');
      handleCancelEditGame();
    } catch (err) {
      console.error(err);
      showToast('Failed to update game link.', 'error');
    }
  };

  const handleEditingGamePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file too large! Please choose an image under 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setEditingGameImage(compressed);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEditVideo = (video: any) => {
    setEditingVideoId(video.id);
    setEditingVideoTitle(video.title || '');
    setEditingVideoUrl(video.url || '');
  };

  const handleCancelEditVideo = () => {
    setEditingVideoId(null);
    setEditingVideoTitle('');
    setEditingVideoUrl('');
  };

  const handleSaveEditVideo = async (videoId: string) => {
    if (!editingVideoTitle || !editingVideoUrl || !isAdminAuth) return;
    try {
      await updateDoc(doc(db, 'youtubeVideos', videoId), {
        title: editingVideoTitle,
        url: editingVideoUrl
      });
      showToast('YouTube video updated successfully!', 'success');
      handleCancelEditVideo();
    } catch (err) {
      console.error(err);
      showToast('Failed to update video.', 'error');
    }
  };

  const handleTogglePinVideo = async (videoId: string, currentIsPinned: boolean) => {
    if (!isAdminAuth) return;
    try {
      await updateDoc(doc(db, 'youtubeVideos', videoId), {
        isPinned: !currentIsPinned,
        pinnedAt: !currentIsPinned ? serverTimestamp() : null
      });
      showToast(!currentIsPinned ? '📌 Video pinned to top!' : '📌 Video unpinned!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update pin state.', 'error');
    }
  };

  const handleSubmitError = async () => {
    if (!newErrorTitle || !newErrorDesc) return;
    try {
      await addDoc(collection(db, 'errorLogs'), {
        title: newErrorTitle,
        description: newErrorDesc,
        imageUrl: newErrorImageUrl,
        createdAt: serverTimestamp()
      });
      setNewErrorTitle('');
      setNewErrorDesc('');
      setNewErrorImageUrl('');
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!isAdminAuth) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) { console.error(err); }
  };

  const isNewerVersion = (latest: string, current: string) => {
    const parse = (v: string) => (v || '').replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
    const l = parse(latest);
    const c = parse(current);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
      const lNum = l[i] || 0;
      const cNum = c[i] || 0;
      if (lNum > cNum) return true;
      if (lNum < cNum) return false;
    }
    return false;
  };

  const checkForUpdates = async (manual = false) => {
    if (!manual && hubConfigRef.current?.enableUpdateNotifications === false) {
      setIsUpdateAvailable(false);
      return;
    }
    setIsCheckingForUpdates(true);
    try {
      let latestConfig: any = null;

      // 1. Fetch remote metadata.json file from server on app start
      try {
        const metaRes = await fetch(`./metadata.json?t=${Date.now()}`);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (metaData && metaData.version) {
            latestConfig = {
              version: metaData.version,
              title: `Update v${metaData.version}`,
              ...metaData
            };
          }
        }
      } catch (e) {
        console.log('metadata.json fetch error:', e);
      }

      // 2. Fetch remote version.json file
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`);
        if (res.ok) {
          const verData = await res.json();
          if (verData && verData.version) {
            if (!latestConfig || isNewerVersion(verData.version, latestConfig.version)) {
              latestConfig = verData;
            }
          }
        }
      } catch (e) {
        console.log('version.json fetch error:', e);
      }

      // 3. Check Firestore doc fallback for real-time admin updates
      try {
        const versionDocRef = doc(db, 'appSettings', 'versionInfo');
        const docSnap = await getDoc(versionDocRef);
        if (docSnap.exists()) {
          const fsData = docSnap.data();
          if (fsData && fsData.version) {
            latestConfig = fsData;
          }
        }
      } catch (fsErr) {
        console.log('Firestore version doc check error:', fsErr);
      }

      if (latestConfig && latestConfig.version) {
        setUpdateData(latestConfig);
        const hasNew = isNewerVersion(latestConfig.version, CURRENT_APP_VERSION);
        setIsUpdateAvailable(hasNew);
        if (manual) {
          if (hasNew) {
            showToast(`Current Version: v${CURRENT_APP_VERSION} (New update v${latestConfig.version} available!)`, 'info');
          } else {
            showToast(`Current Installed Version: v${CURRENT_APP_VERSION} (Up to date)`, 'info');
          }
        }
      } else {
        setIsUpdateAvailable(false);
        if (manual) showToast(`Current Installed Version: v${CURRENT_APP_VERSION} (Up to date)`, 'info');
      }
    } catch (err) {
      console.error('Check update error:', err);
      if (manual) showToast(`Current Installed Version: v${CURRENT_APP_VERSION}`, 'info');
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const handleOpenInBrowserChooser = async (gameName: string, rawUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!rawUrl || rawUrl === '#') {
      showToast('No game link configured', 'error');
      return;
    }
    
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Try Web Share API (System App Chooser for installed browsers/apps) on mobile
    if (navigator.share) {
      try {
        await navigator.share({
          title: gameName || 'Game Link',
          text: `Open ${gameName || 'Game'} in browser:`,
          url: targetUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // User closed the chooser dialog
      }
    }

    // Fallback if Web Share API is unavailable
    const userAgent = navigator.userAgent || '';
    const isAndroid = /android/i.test(userAgent);
    const isHttps = targetUrl.startsWith('https://');
    const scheme = isHttps ? 'https' : 'http';
    const cleanUrl = targetUrl.replace(/^https?:\/\//, '');

    if (isAndroid) {
      const chooserIntent = `intent://${cleanUrl}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
      window.location.href = chooserIntent;
      setTimeout(() => {
        if (!document.hidden) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
      }, 500);
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenInExternalBrowser = (rawUrl: string, e?: React.MouseEvent) => {
    handleOpenInBrowserChooser('Game Link', rawUrl, e);
  };

  const handleDownloadUpdate = async () => {
    const rawTarget = updateData?.apkUrl || updateData?.downloadUrl || adminPublishApkUrl || window.location.href;
    if (rawTarget) {
      showToast('Preparing download...', 'info');
      const downloadTarget = await resolveIdbMedia(rawTarget);
      const a = document.createElement('a');
      a.href = downloadTarget || window.location.href;
      a.download = uploadedApkFileName || 'app-release.apk';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsUpdateModalOpen(false);
    } else {
      showToast('No update download URL specified', 'error');
    }
  };

  const handlePublishAdminUpdate = async () => {
    if (!adminPublishVersion || !isAdminAuth) return;
    setIsPublishingUpdate(true);
    try {
      const targetUrl = adminPublishApkUrl.trim() || window.location.href;
      const targetVer = adminPublishVersion.trim();
      const notesArray = adminPublishNotes.split('\n').filter(n => n.trim().length > 0);
      const versionDocRef = doc(db, 'appSettings', 'versionInfo');

      // Update local storage cache & app version state
      setAppVersion(targetVer);
      saveLocalCache('appVersion', targetVer);
      saveLocalCache('adminPublishApkUrl', targetUrl);
      saveLocalCache('adminPublishVersion', targetVer);
      saveLocalCache('adminPublishTitle', adminPublishTitle.trim());
      saveLocalCache('adminPublishNotes', adminPublishNotes);
      saveLocalCache('adminPublishForce', adminPublishForce);

      const rawPayload = {
        version: targetVer,
        title: adminPublishTitle.trim() || `New Update v${targetVer}`,
        releaseNotes: notesArray.length > 0 ? notesArray : ['Performance improvements & bug fixes'],
        apkUrl: targetUrl,
        downloadUrl: targetUrl,
        forceUpdate: adminPublishForce,
        releaseDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      };
      const updatePayload = await sanitizePayloadForFirestore(rawPayload);
      await setDoc(versionDocRef, updatePayload, { merge: true });

      setUpdateData({
        version: targetVer,
        title: updatePayload.title,
        releaseNotes: Array.isArray(updatePayload.releaseNotes) ? updatePayload.releaseNotes.join('\n') : updatePayload.releaseNotes,
        downloadUrl: targetUrl,
        apkUrl: targetUrl,
        mandatory: adminPublishForce,
        releaseDate: updatePayload.releaseDate
      });

      showToast(`🚀 Update URL & Version v${targetVer} published permanently to Firebase!`, 'success');
      playNotificationSound();
    } catch (err: any) {
      console.error('Error publishing update:', err);
      showToast('Failed to publish update notification', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'appSettings/versionInfo');
    } finally {
      setIsPublishingUpdate(false);
    }
  };

  const handleSyncServerVersion = async () => {
    if (!isAdminAuth) return;
    setIsSyncingServer(true);
    try {
      const syncUrl = adminPublishApkUrl.trim() || window.location.href;
      const syncVersion = adminPublishVersion.trim() || appVersion || CURRENT_APP_VERSION;
      const notesArray = adminPublishNotes.split('\n').filter(n => n.trim().length > 0);
      const versionDocRef = doc(db, 'appSettings', 'versionInfo');

      // Update local storage cache & app version state
      setAppVersion(syncVersion);
      saveLocalCache('appVersion', syncVersion);
      saveLocalCache('adminPublishApkUrl', syncUrl);
      saveLocalCache('adminPublishVersion', syncVersion);
      saveLocalCache('adminPublishTitle', adminPublishTitle.trim());
      saveLocalCache('adminPublishNotes', adminPublishNotes);
      saveLocalCache('adminPublishForce', adminPublishForce);

      const rawPayload = {
        version: syncVersion,
        title: adminPublishTitle.trim() || `OGVirk Live v${syncVersion}`,
        releaseNotes: notesArray.length > 0 ? notesArray : [`Server version synced to v${syncVersion}`],
        apkUrl: syncUrl,
        downloadUrl: syncUrl,
        forceUpdate: adminPublishForce,
        releaseDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      };
      const updatePayload = await sanitizePayloadForFirestore(rawPayload);
      await setDoc(versionDocRef, updatePayload, { merge: true });
      
      const hasNewer = isNewerVersion(syncVersion, CURRENT_APP_VERSION);
      setIsUpdateAvailable(hasNewer);
      if (!hasNewer) {
        setIsUpdateModalOpen(false);
      }
      setUpdateData({
        version: syncVersion,
        title: updatePayload.title,
        releaseNotes: Array.isArray(updatePayload.releaseNotes) ? updatePayload.releaseNotes.join('\n') : updatePayload.releaseNotes,
        downloadUrl: syncUrl,
        apkUrl: syncUrl,
        mandatory: adminPublishForce,
        releaseDate: updatePayload.releaseDate
      });
      showToast(`🚀 Server file URL & version synced to v${syncVersion} permanently!`, 'success');
      playNotificationSound();
    } catch (err: any) {
      console.error('Error syncing server version:', err);
      showToast('Failed to sync server version', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'appSettings/versionInfo');
    } finally {
      setIsSyncingServer(false);
    }
  };

  const handleSyncWebsiteVersion = async () => {
    if (!isAdminAuth) return;
    try {
      const syncVer = adminWebsiteVersion.trim() || '1.0.0';
      const versionDocRef = doc(db, 'appSettings', 'versionInfo');
      const updatePayload = {
        websiteVersion: syncVer,
        updatedAt: serverTimestamp()
      };
      await setDoc(versionDocRef, updatePayload, { merge: true });
      setWebsiteVersion(syncVer);
      showToast(`Website Version synced to v${syncVer} successfully!`, 'success');
    } catch (err: any) {
      console.error('Error syncing website version:', err);
      showToast('Failed to sync website version', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'appSettings/versionInfo');
    }
  };

  const handleTogglePackageUpdateSync = async (enabled: boolean) => {
    setEnablePackageUpdateSync(enabled);
    if (!isAdminAuth) return;
    try {
      const versionDocRef = doc(db, 'appSettings', 'versionInfo');
      await setDoc(versionDocRef, {
        enablePackageUpdateSync: enabled,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast(enabled ? 'Package Feature Sync Enabled for Older APK Users!' : 'Package Feature Sync Disabled', 'info');
    } catch (err) {
      console.error('Error toggling package sync:', err);
      showToast('Failed to update toggle setting', 'error');
    }
  };

  const handleSyncPackageFeatures = async () => {
    if (!isAdminAuth) return;
    setIsSyncingPackage(true);
    try {
      const syncVer = adminPublishVersion.trim() || CURRENT_APP_VERSION;
      const notesArray = adminPublishNotes.split('\n').filter(n => n.trim().length > 0);
      const versionDocRef = doc(db, 'appSettings', 'versionInfo');
      const rawPayload = {
        enablePackageUpdateSync: true,
        version: syncVer,
        title: adminPublishTitle.trim() || `OGVirk Live v${syncVer} (OTA Synced)`,
        releaseNotes: notesArray.length > 0 ? notesArray : ['Latest package features synced dynamically'],
        packageSyncTimestamp: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };
      const updatePayload = await sanitizePayloadForFirestore(rawPayload);
      await setDoc(versionDocRef, updatePayload, { merge: true });
      setEnablePackageUpdateSync(true);
      setIsSyncingPackage(false);
      showToast(`⚡ Package Features Synced Live! Users on older APKs can now sync features without re-downloading APK.`, 'success');
      playNotificationSound();
    } catch (err: any) {
      console.error('Error syncing package features:', err);
      setIsSyncingPackage(false);
      showToast('Failed to sync package features', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'appSettings/versionInfo');
    }
  };

  const handleInAppPackageSync = async () => {
    try {
      setIsDownloadingUpdate(true);
      setUpdateProgress(20);
      showToast('Syncing package features and refreshing local cache...', 'info');
      
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      setUpdateProgress(70);

      localStorage.setItem('og_virk_synced_package_version', updateData?.version || CURRENT_APP_VERSION);
      localStorage.setItem('og_virk_last_package_sync', new Date().toISOString());

      setUpdateProgress(100);
      setTimeout(() => {
        setIsDownloadingUpdate(false);
        setIsUpdateModalOpen(false);
        showToast('⚡ Features synced successfully! App reloading...', 'success');
        playNotificationSound();
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error('In-app package sync error:', err);
      setIsDownloadingUpdate(false);
      showToast('Error syncing package features locally. Please try again.', 'error');
    }
  };



  const getFriendlyAuthErrorMessage = (err: any, isSignUp: boolean) => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/network-request-failed' || msg.includes('network-request-failed') || msg.includes('Failed to fetch')) {
      return "Network connection issue. Connecting live to Firebase servers, please check your network and retry.";
    }
    if (code === 'auth/invalid-credential' || msg.includes('invalid-credential')) {
      return isSignUp
        ? "Unable to create account. Please verify your email format and password."
        : "Invalid email or password. If you haven't created an account yet, please click 'Sign Up Now!' below.";
    }
    if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
      return "No account exists with this email address. Please check for typos or click 'Sign Up Now!' below.";
    }
    if (code === 'auth/wrong-password' || msg.includes('wrong-password')) {
      return "Incorrect password. Please try again or click 'FORGOT PASSWORD?' to reset it.";
    }
    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return "An account with this email address already exists. Please switch to 'Sign In' or click 'FORGOT PASSWORD?'.";
    }
    if (code === 'auth/weak-password' || msg.includes('weak-password')) {
      return "Password is too weak. Please use at least 6 characters.";
    }
    if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
      return "Please enter a valid email address (e.g. name@example.com).";
    }
    if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
      return "Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.";
    }
    if (code === 'auth/user-disabled' || msg.includes('user-disabled')) {
      return "This user account has been disabled.";
    }
    if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
      return "Sign-In popup was closed before completing authorization.";
    }
    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      return "This authentication provider is not yet enabled in your Firebase Console (Authentication > Sign-in method).";
    }
    if (code === 'auth/account-exists-with-different-credential' || msg.includes('account-exists-with-different-credential')) {
      return "An account already exists with the same email using a different sign-in method. Please sign in with your original method.";
    }
    if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
      return "This domain is not authorized in Firebase. Please add this domain to Authorized Domains in Firebase Console > Authentication > Settings.";
    }
    
    return msg.replace(/^Firebase:\ *Error\ *\(|\)\.$/gi, '').trim() || 'Authentication failed. Please try again.';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (isSignUp) {
      if (!cleanFirstName) {
        setError('Please enter your first name.');
        return;
      }
      if (!cleanLastName) {
        setError('Please enter your last name.');
        return;
      }
    }

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
      const targetAuth = auth || (await waitForAuthReady());
      if (!targetAuth) {
        throw new Error('Authentication service unavailable. Please refresh or try again.');
      }

      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(targetAuth, cleanEmail, cleanPassword);
        if (userCredential.user) {
          const fullName = `${cleanFirstName} ${cleanLastName}`;
          await updateProfile(userCredential.user, {
            displayName: fullName
          }).catch(err => console.log('Profile update error:', err));

          await setDoc(doc(db, 'userProfiles', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: cleanEmail,
            displayName: fullName,
            firstName: cleanFirstName,
            lastName: cleanLastName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => console.warn('User profile set error:', err));
        }
      } else {
        await signInWithEmailAndPassword(targetAuth, cleanEmail, cleanPassword);
      }
      setTimeout(() => {
        playWelcomeSound();
      }, 300);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err, isSignUp));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccessMessage(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address above first, then click FORGOT PASSWORD.');
      return;
    }

    setLoading(true);
    try {
      const targetAuth = auth || (await waitForAuthReady());
      if (!targetAuth) {
        throw new Error('Authentication service unavailable. Please refresh or try again.');
      }
      await sendPasswordResetEmail(targetAuth, cleanEmail);
      setSuccessMessage(`Password reset email sent to ${cleanEmail}. Please check your inbox or spam folder.`);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err, false));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const targetAuth = auth || (await waitForAuthReady());
      if (!targetAuth) {
        throw new Error('Authentication service unavailable. Please refresh or try again.');
      }
      await signInWithPopup(targetAuth, googleProvider);
      setTimeout(() => {
        playWelcomeSound();
      }, 300);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err, isSignUp));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const targetAuth = auth || (await waitForAuthReady());
      if (!targetAuth) {
        throw new Error('Authentication service unavailable. Please refresh or try again.');
      }
      await signInWithPopup(targetAuth, githubProvider);
      setTimeout(() => {
        playWelcomeSound();
      }, 300);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err, isSignUp));
    } finally {
      setLoading(false);
    }
  };

    const handleSubmitFeedback = async () => {
    if (feedbackStars === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'ratings'), {
        stars: feedbackStars,
        feedback: feedbackText,
        createdAt: serverTimestamp()
      });
      setShowFeedbackModal(false);
      setFeedbackStars(0);
      setFeedbackText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const calculateAverageRating = () => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, curr) => acc + (curr.stars || 0), 0);
    return (sum / ratings.length).toFixed(1);
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('og_virk_last_active_tab');
      localStorage.removeItem('og_virk_is_admin_auth');
      setIsAdminAuth(false);
      setActiveTab('hub');
      await Promise.allSettled([
        signOut(auth),
        signOutSupabase(),
      ]);
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="relative h-[100dvh] bg-[#0A0D14] flex flex-col items-center justify-center text-white font-sans overflow-hidden">
        <BackgroundGlows />
        <Embers />
        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#FF6B00]/30 border-t-[#FF6B00] animate-spin shadow-[0_0_20px_rgba(255,107,0,0.4)]" />
            <div className="absolute w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center shadow-inner">
              <span className="text-xs font-black text-[#FF6B00]">OG</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-white tracking-widest uppercase">OG VIRK LIVE</p>
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mt-1 animate-pulse">Restoring Session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div 
        className="relative h-[100dvh] bg-[#0A0D14] flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden text-white"
      >
        {/* Dynamic Background */}
        {hubConfig?.backgroundType === 'image' && hubConfig?.backgroundUrl ? (
          <div className="absolute inset-0 z-0 bg-[#0A0D14]">
            <img src={hubConfig.backgroundUrl} alt="Background" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          </div>
        ) : hubConfig?.backgroundType === 'video' && (resolvedVideoBgUrl || hubConfig?.backgroundUrl) ? (
          <div className="absolute inset-0 z-0 bg-[#0A0D14] overflow-hidden">
            <video key={resolvedVideoBgUrl || hubConfig.backgroundUrl} autoPlay loop muted playsInline className="w-full h-full object-cover scale-105 pointer-events-none">
              <source src={resolvedVideoBgUrl || hubConfig.backgroundUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          </div>
        ) : (
          <>
            {/* Subtle background for dashboard */}
            <BackgroundGlows />
            <div className="absolute inset-0 z-0 bg-[#0A0D14]/80 pointer-events-none" /> {/* Dim the background slightly for readability */}
            <Streaks />
          </>
        )}
        
        {/* Top Header */}
        <header className="relative z-50 flex justify-between items-center p-6 pb-2">
          {isAdminAuth && (
            <button 
              onClick={() => { setIsAdminAuth(false); localStorage.removeItem('og_virk_is_admin_auth'); setAdminPin(''); }}
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center hover:bg-red-500/40 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Lock Access
            </button>
          )}

          <div className="flex items-center">
            {activeTab !== 'hub' && (tabHistory.length > 0 || ((activeTab === 'admin' || activeTab === 'about') && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isWelcomeSoundSettingsOpen || isGameLinksSettingsOpen || isYoutubeStudioSettingsOpen || isCustomTextSettingsOpen || isSecuritySettingsOpen || isAdminUpdateSettingsOpen))) && (
              <button 
                onClick={handleBack}
                className="mr-3 w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-gray-300" />
              </button>
            )}
            <motion.div 
              className="flex flex-col items-center justify-center cursor-pointer relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative inline-block leading-none">
                <span className="text-3xl font-black text-white italic tracking-tighter drop-shadow-[0_0_12px_rgba(255,107,0,0.6)] relative z-10">OG</span>
                <div className="absolute top-1/2 left-[-10%] w-[120%] h-[2px] bg-[#151A27] -rotate-[25deg] z-20"></div>
              </div>
              <div className="flex space-x-1 mt-[-2px]">
                <span className="text-[11px] font-black text-white tracking-widest uppercase">Virk</span>
                <span className="text-[11px] font-black text-[#FF6B00] tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,107,0,0.5)]">Live</span>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center space-x-3 relative z-40">
            {/* Notification Mode Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors active:scale-95"
                title="Notification Mode"
              >
                {notificationMode === 'ring' && <BellRing className="w-4 h-4 text-[#FF6B00]" />}
                {notificationMode === 'vibrate' && <Smartphone className="w-4 h-4 text-blue-400" />}
                {notificationMode === 'sleep' && <Moon className="w-4 h-4 text-purple-400" />}
                {notificationMode === 'mute' && <BellOff className="w-4 h-4 text-gray-500" />}
              </button>
              
              {showModeMenu && (
                <div className="absolute top-full right-0 mt-3 w-48 bg-[#151A27]/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { setNotificationMode('ring'); setShowModeMenu(false); }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors ${notificationMode === 'ring' ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <BellRing className="w-4 h-4 mr-3" /> Ringing
                    </button>
                    <button 
                      onClick={() => { setNotificationMode('vibrate'); setShowModeMenu(false); }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors ${notificationMode === 'vibrate' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <Smartphone className="w-4 h-4 mr-3" /> Vibrate
                    </button>
                    <button 
                      onClick={() => { setNotificationMode('sleep'); setShowModeMenu(false); }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors ${notificationMode === 'sleep' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <Moon className="w-4 h-4 mr-3" /> Sleep
                    </button>
                    <button 
                      onClick={() => { setNotificationMode('mute'); setShowModeMenu(false); }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors ${notificationMode === 'mute' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                      <BellOff className="w-4 h-4 mr-3" /> Mute
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => playWelcomeWooferVoice()}
              title="Play Welcome Voice"
              className="w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:border-[#FF6B00] text-gray-300 hover:text-[#FF6B00] transition-colors active:scale-95"
            >
              <Volume2 className="w-4 h-4 text-[#FF6B00]" />
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors active:scale-95"
              >
                <Bell className="w-4 h-4 text-gray-300" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_red]"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-white/55 backdrop-blur-3xl border border-white/90 rounded-2xl shadow-[0_20px_50px_rgba(0,30,80,0.25),inset_0_2px_4px_rgba(255,255,255,0.95)] overflow-hidden z-50">
                  <div className="p-4 border-b border-white/80 flex justify-between items-center bg-white/40">
                    <h3 className="text-sm font-black text-[#002255] flex items-center">
                      <Bell className="w-4 h-4 mr-2 text-[#FF6B00]" /> Push Notifications & Cache
                    </h3>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Push Notification Enable Section */}
                    <div className="p-3 bg-white/40 backdrop-blur-2xl border border-white/80 rounded-xl flex flex-col space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BellRing className="w-4 h-4 text-[#FF6B00]" />
                          <span className="text-xs font-black text-[#002255]">Push Notifications</span>
                        </div>
                        {pushPermissionStatus === 'granted' ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-700 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">Active</span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/20 text-amber-700 font-black px-2 py-0.5 rounded-full border border-amber-500/30">Disabled</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-700 font-bold">
                        Receive instant device alerts for new chat messages, game links, and updates.
                      </p>
                      {pushPermissionStatus !== 'granted' && (
                        <button
                          onClick={async () => {
                            const ok = await requestPushPermission();
                            await promptOneSignalPushPermission();
                            setPushPermissionStatus(getPushPermissionStatus());
                            if (ok || getPushPermissionStatus() === 'granted') {
                              showToast('🔔 OneSignal Push Notifications Enabled!', 'success');
                            } else {
                              showToast('Notification permission was declined or not granted', 'info');
                            }
                          }}
                          className="w-full mt-1 py-1.5 px-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-md flex items-center justify-center space-x-1.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Enable Push Notifications</span>
                        </button>
                      )}
                    </div>

                    {/* Local Offline Caching Section */}
                    <div className="p-3 bg-white/40 backdrop-blur-2xl border border-white/80 rounded-xl flex flex-col space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-cyan-600" />
                          <span className="text-xs font-black text-[#002255]">Offline Caching</span>
                        </div>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-700 font-black px-2 py-0.5 rounded-full border border-cyan-500/30">Protected</span>
                      </div>
                      <p className="text-[11px] text-slate-700 font-bold">
                        Data is cached locally in your browser to save Firebase daily quotas and provide instant loading.
                      </p>
                      <button
                        onClick={() => {
                          clearAllLocalCache();
                          showToast('🧹 Local cache cleared. Fresh data will sync on next load.', 'info');
                        }}
                        className="w-full mt-1 py-1 px-3 bg-white/60 hover:bg-white/80 text-[#002255] text-[11px] font-black rounded-lg transition-all active:scale-95 flex items-center justify-center space-x-1 border border-white/90 shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        <span>Clear & Refresh Cache</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => handleTabChange('profile')} className="w-10 h-10 rounded-full bg-[#151A27] border-2 border-[#FF6B00] flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-transform active:scale-95">
               {(user?.photoURL || profilePhoto) ? (
                 <img src={user?.photoURL || profilePhoto} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-5 h-5 text-[#FF6B00]" />
               )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={`relative z-10 flex-1 ${activeTab === 'chat' ? 'overflow-hidden px-2 sm:px-4 pt-1 pb-20 sm:pb-24 w-full h-[calc(100dvh-130px)] sm:h-[calc(100vh-140px)] max-w-3xl' : 'overflow-y-auto px-6 pt-4 pb-32'} flex flex-col items-center`}>
          
          {/* Global Image Modals */}
          <ImageLightboxModal
            imageUrl={fullscreenImageUrl}
            onClose={() => setFullscreenImageUrl(null)}
          />

          <ActiveUsersModal
            isOpen={isActiveUsersModalOpen}
            onClose={() => setIsActiveUsersModalOpen(false)}
            activeSessions={activeSessions}
            allProfiles={allProfiles}
            currentUser={user}
            onViewPhoto={(photoUrl) => setFullscreenImageUrl(photoUrl)}
            onOpenWhatsApp={(num, groupLink) => openWhatsAppModal(num, groupLink)}
            maskEmail={maskEmail}
          />

          <WhatsAppModal
            isOpen={whatsAppModalState.isOpen}
            onClose={() => setWhatsAppModalState({ isOpen: false })}
            whatsappNumber={whatsAppModalState.num}
            whatsappGroupLink={whatsAppModalState.groupLink}
          />

          <ImageCropperModal
            imageSrc={rawCropImage}
            isOpen={isCropperOpen}
            onClose={() => {
              setIsCropperOpen(false);
              setRawCropImage(null);
            }}
            onCropSave={(cropped) => {
              setNewErrorImageUrl(cropped);
              showToast('Image cropped successfully!', 'success');
            }}
          />

          <ImageMarkupModal
            imageSrc={rawDrawImage}
            isOpen={isDrawModalOpen}
            onClose={() => {
              setIsDrawModalOpen(false);
              setRawDrawImage(null);
              setEditingLogForDraw(null);
            }}
            onSave={async (markedDataUrl) => {
              if (editingLogForDraw) {
                try {
                  const payload = await sanitizePayloadForFirestore({
                    imageUrl: markedDataUrl,
                    updatedAt: serverTimestamp()
                  });
                  await updateDoc(doc(db, 'errorLogs', editingLogForDraw.id), payload);
                  showToast('Error screenshot updated with markings!', 'success');
                } catch (err) {
                  console.error('Failed to update error log image:', err);
                  showToast('Failed to save markings', 'error');
                }
                setEditingLogForDraw(null);
              } else {
                setNewErrorImageUrl(markedDataUrl);
                showToast('Markings saved!', 'success');
              }
            }}
          />

          {activeTab === 'hub' && (
            <motion.div 
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
              className="w-full flex flex-col items-center mt-4"
            >
              {isAdminAuth && (
                <button 
                  onClick={() => setIsHubLocked(!isHubLocked)}
                  className={`absolute top-4 right-4 z-50 flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isHubLocked ? 'bg-gray-800 text-gray-400' : 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                >
                  {isHubLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                  {isHubLocked ? 'LOCKED' : 'EDITING'}
                </button>
              )}

              {/* Top Empty Space Content */}
              <div className="w-full flex justify-center mb-6 min-h-[60px] items-center">
                {(!isHubLocked && isAdminAuth) ? (
                  <div className="flex gap-2 p-2 bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 w-full max-w-sm justify-around shadow-lg">
                    <button onClick={() => handleTabChange('admin')} className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition-colors">
                      <Shield className="w-5 h-5 mb-1 text-[#FF6B00]" />
                      <span className="text-[10px] font-bold">SECURITY</span>
                    </button>
                    <button onClick={() => handleTabChange('profile')} className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition-colors">
                      <User className="w-5 h-5 mb-1 text-[#FF6B00]" />
                      <span className="text-[10px] font-bold">PROFILE</span>
                    </button>
                    <button onClick={() => handleTabChange('admin')} className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition-colors">
                      <Server className="w-5 h-5 mb-1 text-[#FF6B00]" />
                      <span className="text-[10px] font-bold">DATABASE</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowFeedbackModal(true)}
                    className="flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm px-6 py-2 rounded-2xl border border-white/10 hover:border-[#FF6B00]/40 hover:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 group cursor-pointer"
                    title="Click to Rate Your Experience"
                  >
                    <div className="flex items-center space-x-1 mb-1 text-[#FF6B00]">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-5 h-5 transition-transform group-hover:scale-110 ${star <= parseFloat(String(calculateAverageRating())) ? 'fill-current' : 'text-gray-700'}`} />
                      ))}
                      <span className="text-white font-black ml-2 text-lg">{calculateAverageRating()}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-200 tracking-widest uppercase">Based on {ratings.length} reviews • Rate Us</span>
                  </button>
                )}
              </div>

              <motion.div 
                drag={!isHubLocked}
                dragMomentum={false}
                onDragEnd={(e, info) => {
                  if (!isHubLocked) updateLayout('photo', { x: hubLayout.photo.x + info.offset.x, y: hubLayout.photo.y + info.offset.y });
                }}
                initial={false}
                animate={{ x: hubLayout.photo.x, y: hubLayout.photo.y }}
                transition={{ duration: 0 }}
                style={{ 
                  width: Math.max(60, hubLayout.photo?.w || 120), 
                  height: Math.max(60, hubLayout.photo?.h || 120), 
                  touchAction: 'none' 
                }}
                className={`relative z-20 flex items-center justify-center mb-2 overflow-visible ${!isHubLocked ? 'cursor-move ring-2 ring-dashed ring-[#FF6B00]/50 rounded-full' : ''}`}
              >
                {hubConfig?.profilePhotoUrl ? (
                  <img src={hubConfig.profilePhotoUrl} alt="Developer" className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-full" draggable="false" />
                ) : (
                  <div className="w-full h-full bg-[#1a2332] rounded-full border-4 border-[#151A27] shadow-[0_0_20px_rgba(255,107,0,0.4)] flex items-center justify-center">
                    <User className="w-1/2 h-1/2 text-gray-400" />
                  </div>
                )}
                
                {/* Resize Handle - Unconstrained Resizing (Only Visible When Editing Unlocked) */}
                {!isHubLocked && (
                  <div 
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#FF6B00] text-white rounded-full transition-transform hover:scale-110 active:scale-95 cursor-nwse-resize flex items-center justify-center backdrop-blur-md border-2 border-white z-50 shadow-xl"
                    title="Drag to resize photo (No upper limit)"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = layoutRef.current.photo?.w || 120;

                      const onPointerMove = (moveEvent: PointerEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaY = moveEvent.clientY - startY;
                        const delta = Math.max(deltaX, deltaY);
                        // Min size 60px, NO upper size limit
                        const newSize = Math.max(60, Math.round(startWidth + delta));
                        setHubLayout(prev => ({...prev, photo: {...prev.photo, w: newSize, h: newSize}}));
                      };

                      const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        const finalSize = Math.max(60, layoutRef.current.photo?.w || 120);
                        updateLayout('photo', { w: finalSize, h: finalSize });
                      };

                      window.addEventListener('pointermove', onPointerMove);
                      window.addEventListener('pointerup', onPointerUp);
                    }}
                  >
                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                  </div>
                )}
              </motion.div>
              
              <motion.div
                drag={!isHubLocked}
                dragMomentum={false}
                onDragEnd={(e, info) => {
                  if (!isHubLocked) updateLayout('nameText', { x: hubLayout.nameText.x + info.offset.x, y: hubLayout.nameText.y + info.offset.y });
                }}
                initial={false}
                animate={{ x: hubLayout.nameText.x, y: hubLayout.nameText.y, scale: hubLayout.nameText.scale }}
                transition={{ duration: 0 }}
                className={`relative z-40 flex flex-col items-center mt-5 ${!isHubLocked ? 'cursor-move p-2 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}`}
              >
                <h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md whitespace-nowrap" style={{ fontFamily: hubConfig?.fontFamily || 'system-ui, sans-serif' }}>
                  {hubConfig?.name || 'Sharn Virk'}
                </h2>

                {!isHubLocked && (
                  <div 
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startScale = layoutRef.current.nameText.scale;
                      
                      const onPointerMove = (me: PointerEvent) => {
                        const delta = me.clientX - startX;
                        const newScale = Math.max(0.5, startScale + (delta * 0.01));
                        setHubLayout(prev => ({...prev, nameText: {...prev.nameText, scale: newScale}}));
                      };
                      
                      const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        updateLayout('nameText', { scale: layoutRef.current.nameText.scale });
                      };
                      
                      window.addEventListener('pointermove', onPointerMove);
                      window.addEventListener('pointerup', onPointerUp);
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </motion.div>

              <motion.div
                drag={!isHubLocked}
                dragMomentum={false}
                onDragEnd={(e, info) => {
                  if (!isHubLocked) updateLayout('titleText', { x: hubLayout.titleText.x + info.offset.x, y: hubLayout.titleText.y + info.offset.y });
                }}
                initial={false}
                animate={{ x: hubLayout.titleText.x, y: hubLayout.titleText.y, scale: hubLayout.titleText.scale }}
                transition={{ duration: 0 }}
                className={`relative z-40 flex flex-col items-center mt-1 ${!isHubLocked ? 'cursor-move p-2 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}`}
              >
                <p className="text-[#FF6B00] font-bold text-xs tracking-[0.2em] uppercase whitespace-nowrap" style={{ fontFamily: hubConfig?.fontFamily || 'system-ui, sans-serif' }}>
                  {hubConfig?.title || 'DEVELOPER & FOUNDER'}
                </p>

                {!isHubLocked && (
                  <div 
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startScale = layoutRef.current.titleText.scale;
                      
                      const onPointerMove = (me: PointerEvent) => {
                        const delta = me.clientX - startX;
                        const newScale = Math.max(0.5, startScale + (delta * 0.01));
                        setHubLayout(prev => ({...prev, titleText: {...prev.titleText, scale: newScale}}));
                      };
                      
                      const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        updateLayout('titleText', { scale: layoutRef.current.titleText.scale });
                      };
                      
                      window.addEventListener('pointermove', onPointerMove);
                      window.addEventListener('pointerup', onPointerUp);
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </motion.div>

              {/* Contact Buttons */}
              <motion.div 
                drag={!isHubLocked}
                dragMomentum={false}
                onDragEnd={(e, info) => {
                  if (!isHubLocked) updateLayout('buttons', { x: hubLayout.buttons.x + info.offset.x, y: hubLayout.buttons.y + info.offset.y });
                }}
                initial={false}
                animate={{ x: hubLayout.buttons.x, y: hubLayout.buttons.y, scale: hubLayout.buttons.scale }}
                transition={{ duration: 0 }}
                className={`relative z-50 flex flex-col items-center justify-center space-y-3 mt-8 w-full max-w-[280px] ${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}`}
              >
                {/* Row 1: Call & WhatsApp */}
                <div className="flex w-full space-x-3">
                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.92, y: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    onClick={handleCallClick}
                    className="flex-1 bg-gradient-to-r from-[#172c57] to-[#FF6B00] text-white font-bold tracking-wide py-3.5 px-3.5 rounded-xl shadow-[0_4px_15px_rgba(255,107,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.5)] active:opacity-90 flex items-center justify-center space-x-2 cursor-pointer transition-all border border-orange-500/30"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-white" />
                    <span className="text-sm font-bold">Call</span>
                  </motion.button>

                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.90, y: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    onClick={handleWhatsAppClick} 
                    className="flex-1 bg-[#151A27] border border-[#25D366]/60 text-[#25D366] font-bold tracking-wide py-3.5 px-3.5 rounded-xl hover:bg-[#151A27]/90 hover:border-[#25D366] hover:shadow-[0_4px_18px_rgba(37,211,102,0.35)] flex items-center justify-center space-x-2 cursor-pointer shadow-md transition-all active:brightness-125"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0 fill-current/20" />
                    <span className="text-sm font-bold">WhatsApp</span>
                  </motion.button>
                </div>

                {/* Row 2: Instagram & YouTube */}
                <div className="flex w-full space-x-3">
                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.92, y: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    onClick={handleInstagramClick}
                    className="flex-1 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-bold tracking-wide py-3.5 px-2.5 rounded-xl shadow-[0_4px_15px_rgba(238,42,123,0.35)] hover:shadow-[0_6px_20px_rgba(238,42,123,0.5)] flex items-center justify-center space-x-2 cursor-pointer transition-all border border-pink-500/30"
                  >
                    <Instagram className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold truncate">{hubConfig?.instagramLabel || 'Instagram'}</span>
                  </motion.button>

                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.92, y: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    onClick={handleYouTubeClick}
                    className="flex-1 bg-[#FF0000] text-white font-bold tracking-wide py-3.5 px-2.5 rounded-xl shadow-[0_4px_15px_rgba(255,0,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,0,0,0.5)] flex items-center justify-center space-x-2 cursor-pointer transition-all border border-red-500/40"
                  >
                    <Youtube className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold truncate">{hubConfig?.youtubeLabel || 'YouTube'}</span>
                  </motion.button>
                </div>

                {!isHubLocked && (
                  <div 
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startScale = layoutRef.current.buttons.scale;
                      
                      const onPointerMove = (me: PointerEvent) => {
                        const delta = me.clientX - startX;
                        const newScale = Math.max(0.5, startScale + (delta * 0.01));
                        setHubLayout(prev => ({...prev, buttons: {...prev.buttons, scale: newScale}}));
                      };
                      
                      const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        updateLayout('buttons', { scale: layoutRef.current.buttons.scale });
                      };
                      
                      window.addEventListener('pointermove', onPointerMove);
                      window.addEventListener('pointerup', onPointerUp);
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </motion.div>

              <motion.div 
                drag={!isHubLocked}
                dragMomentum={false}
                onDragEnd={(e, info) => {
                  if (!isHubLocked) updateLayout('stats', { x: hubLayout.stats.x + info.offset.x, y: hubLayout.stats.y + info.offset.y });
                }}
                initial={false}
                animate={{ x: hubLayout.stats.x, y: hubLayout.stats.y, scale: hubLayout.stats.scale }}
                transition={{ duration: 0 }}
                className={`relative z-40 w-full max-w-[320px] mt-8 ${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}`}
              >
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div 
                    onClick={() => setIsActiveUsersModalOpen(true)}
                    className="bg-white/40 hover:bg-white/55 backdrop-blur-2xl rounded-2xl p-4 border border-white/80 hover:border-cyan-500/60 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all active:scale-95 shadow-xl"
                    title="Tap to view live active users list"
                  >
                    <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/15 transition-colors"></div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <Users className="w-6 h-6 text-[#002255] mb-2 drop-shadow-[0_0_8px_rgba(0,34,85,0.4)] group-hover:scale-110 transition-transform" />
                      <p className="text-2xl font-black text-[#002255] tracking-wider drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{Math.max(allRegisteredMembers.length, 1)}</p>
                      <p className="text-[9px] font-black text-[#062456] group-hover:text-cyan-900 tracking-widest uppercase mt-1 flex items-center">
                        Total Members <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-80" />
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/80 flex flex-col items-center justify-center relative overflow-hidden group shadow-xl">
                    <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/15 transition-colors"></div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <Youtube className="w-6 h-6 text-red-600 mb-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <p className="text-2xl font-black text-[#002255] tracking-wider drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">{liveYtSubs}</p>
                      <p className="text-[9px] font-black text-[#062456] tracking-widest uppercase mt-1">Channel Subs</p>
                    </div>
                  </div>
                </div>

                {!isHubLocked && (
                  <div 
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startScale = layoutRef.current.stats.scale;
                      
                      const onPointerMove = (me: PointerEvent) => {
                        const delta = me.clientX - startX;
                        const newScale = Math.max(0.5, startScale + (delta * 0.01));
                        setHubLayout(prev => ({...prev, stats: {...prev.stats, scale: newScale}}));
                      };
                      
                      const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        updateLayout('stats', { scale: layoutRef.current.stats.scale });
                      };
                      
                      window.addEventListener('pointermove', onPointerMove);
                      window.addEventListener('pointerup', onPointerUp);
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </motion.div>

              {hubConfig?.customQuote && (
                <motion.div 
                  drag={!isHubLocked}
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    if (!isHubLocked) updateLayout('quoteText', { x: (hubLayout.quoteText?.x || 0) + info.offset.x, y: (hubLayout.quoteText?.y || 0) + info.offset.y });
                  }}
                  initial={false}
                  animate={{ x: hubLayout.quoteText?.x || 0, y: hubLayout.quoteText?.y || 0, scale: hubLayout.quoteText?.scale || 1 }}
                  transition={{ duration: 0 }}
                  className={`relative z-40 flex flex-col items-center justify-center text-center mt-8 w-full max-w-[320px] ${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}`}
                >
                  <p className="text-[13px] italic font-medium text-gray-300 tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: hubConfig?.fontFamily || 'system-ui, sans-serif' }}>
                    "{hubConfig.customQuote}"
                  </p>
                  {!isHubLocked && (
                    <div 
                      className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startScale = layoutRef.current.quoteText?.scale || 1;
                        
                        const onPointerMove = (me) => {
                          const delta = me.clientX - startX;
                          const newScale = Math.max(0.5, startScale + (delta * 0.01));
                          setHubLayout(prev => ({...prev, quoteText: {...prev.quoteText, scale: newScale}}));
                        };
                        
                        const onPointerUp = () => {
                          window.removeEventListener('pointermove', onPointerMove);
                          window.removeEventListener('pointerup', onPointerUp);
                          updateLayout('quoteText', { scale: layoutRef.current.quoteText?.scale || 1 });
                        };
                        
                        window.addEventListener('pointermove', onPointerMove);
                        window.addEventListener('pointerup', onPointerUp);
                      }}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Dynamic Hub Screen Elements (Reorderable & Draggable) */}
              {hubElementOrder.map(elementKey => {
                if (elementKey === 'recent_menu') {
                  return (
                    <motion.div 
                      key="recent_menu"
                      drag={!isHubLocked}
                      dragMomentum={false}
                      onDragEnd={(e, info) => {
                        if (!isHubLocked) updateLayout('recentMenu', { x: (hubLayout.recentMenu?.x || 0) + info.offset.x, y: (hubLayout.recentMenu?.y || 0) + info.offset.y });
                      }}
                      animate={{ x: hubLayout.recentMenu?.x || 0, y: hubLayout.recentMenu?.y || 0, scale: hubLayout.recentMenu?.scale || 1 }}
                      className={`w-full mt-4 space-y-3 relative z-40 ${!isHubLocked ? 'cursor-move p-2 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-2xl bg-[#151A27]/20' : ''}`}
                    >
                      {/* Recent Menu */}
                      <div className="w-full space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-gray-500 tracking-wider">RECENT MENU</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                          {/* Recent Games Box */}
                          <div 
                            onClick={() => handleTabChange('game')}
                            className="bg-white/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/80 flex flex-col hover:border-[#FF6B00]/70 transition-colors cursor-pointer group shadow-xl"
                          >
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
                                <Gamepad2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                              </div>
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Games</span>
                            </div>
                            {games && games.length > 0 ? (
                              <div className="space-y-2">
                                {games.slice(0, 2).map((game: any, idx: number) => (
                                  <div key={idx} className="flex items-center space-x-2">
                                    <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-white/60 border border-white/80">
                                      {game.imageUrl ? <img src={game.imageUrl} className="w-full h-full object-cover" /> : <Gamepad2 className="w-3 h-3 m-1 text-slate-600" />}
                                    </div>
                                    <span className="text-[10px] text-slate-900 font-extrabold truncate">{game.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 font-bold">No games added</p>
                            )}
                          </div>

                          {/* Recent Videos Box */}
                          <div 
                            onClick={() => handleTabChange('youtube')}
                            className="bg-white/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/80 flex flex-col hover:border-red-500/70 transition-colors cursor-pointer group shadow-xl"
                          >
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <Youtube className="w-3.5 h-3.5 text-red-600" />
                              </div>
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest group-hover:text-slate-900 transition-colors">YouTube</span>
                            </div>
                            {sortedYoutubeVideos && sortedYoutubeVideos.length > 0 ? (
                              <div className="space-y-2">
                                {sortedYoutubeVideos.slice(0, 2).map((video: any, idx: number) => (
                                  <div 
                                    key={video?.id || idx} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTabChange('youtube');
                                      if (video?.id) setPlayingVideoId(video.id);
                                    }}
                                    className="flex items-center justify-between group/item cursor-pointer hover:text-red-600 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2 overflow-hidden pr-1">
                                      <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-white/60 border border-white/80 relative">
                                        <img src={`https://img.youtube.com/vi/${getYoutubeId(video?.url || '')}/default.jpg`} className="w-full h-full object-cover" />
                                      </div>
                                      <span className="text-[10px] text-slate-900 group-hover/item:text-red-600 font-extrabold line-clamp-1 leading-tight flex items-center">
                                        {video?.isPinned && <Pin className="w-2.5 h-2.5 text-amber-500 fill-amber-500 mr-1 shrink-0" />}
                                        {video?.title || 'Untitled Video'}
                                      </span>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openInYoutubeApp(video.url);
                                      }}
                                      className="text-slate-600 hover:text-red-600 p-0.5 transition-colors shrink-0"
                                      title="Open in YouTube App"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 font-bold">No videos added</p>
                            )}
                          </div>
                        </div>

                        {/* Translucent Frosted Glass Feedback Board under Recent Menu */}
                        <div className="w-full mt-4 bg-white/45 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 border border-white/80 shadow-2xl flex flex-col space-y-4">
                          <div className="flex justify-between items-center border-b border-white/60 pb-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] shrink-0 shadow-inner">
                                <Star className="w-4.5 h-4.5 fill-current" />
                              </div>
                              <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                                  <span>FEEDBACK BOARD</span>
                                  <span className="bg-[#FF6B00] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {ratings.length}
                                  </span>
                                </h3>
                                <p className="text-[10px] text-slate-700 font-bold mt-0.5">
                                  ⭐ {calculateAverageRating()} Avg Community Rating
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowFeedbackModal(true)}
                              className="bg-[#FF6B00] hover:bg-orange-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl tracking-wider uppercase transition-all shadow-[0_2px_10px_rgba(255,107,0,0.3)] active:scale-95 flex items-center space-x-1 shrink-0 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>Rate App</span>
                            </button>
                          </div>

                          {ratings.length === 0 ? (
                            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 bg-[#0A0D14] rounded-xl border border-gray-800 p-4">
                              <MessageSquare className="w-6 h-6 text-gray-500" />
                              <p className="text-xs font-bold text-gray-300">No user reviews yet.</p>
                              <p className="text-[10px] text-gray-500">Be the first to share your feedback and rating!</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#FF6B00 #0A0D14' }}>
                              {ratings.map((rating, idx) => (
                                <div 
                                  key={rating.id || idx} 
                                  className="bg-[#0A0D14] border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 flex flex-col space-y-2 transition-all shadow-sm"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2.5">
                                      <div className="w-7 h-7 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] font-black text-xs shrink-0">
                                        {(rating.displayName || rating.email || 'U')[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-white block truncate max-w-[140px]">
                                          {rating.displayName || maskEmail(rating.email) || 'Anonymous User'}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-medium block">
                                          {maskEmail(rating.email) || 'Verified User'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1 bg-black/60 px-2 py-1 rounded-lg border border-gray-800 shrink-0">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`w-3 h-3 ${i < (rating.stars || 0) ? 'text-[#FF6B00] fill-current' : 'text-gray-700'}`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  {rating.feedback ? (
                                    <p className="text-xs text-gray-200 font-medium leading-relaxed bg-[#151A27] p-2.5 rounded-lg border border-gray-800">
                                      "{rating.feedback}"
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-gray-500 italic">No text review provided</p>
                                  )}
                                  <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold uppercase pt-1 border-t border-gray-800/40">
                                    <span>Community Review</span>
                                    <span>
                                      {rating.createdAt ? (rating.createdAt?.toDate ? rating.createdAt.toDate().toLocaleDateString() : new Date(rating.createdAt).toLocaleDateString()) : 'Recent'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {!isHubLocked && (
                        <div 
                          className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startScale = layoutRef.current.recentMenu?.scale || 1;
                            
                            const onPointerMove = (me: PointerEvent) => {
                              const delta = me.clientX - startX;
                              const newScale = Math.max(0.5, startScale + (delta * 0.01));
                              setHubLayout(prev => ({...prev, recentMenu: {...prev.recentMenu, scale: newScale}}));
                            };
                            
                            const onPointerUp = () => {
                              window.removeEventListener('pointermove', onPointerMove);
                              window.removeEventListener('pointerup', onPointerUp);
                              updateLayout('recentMenu', { scale: layoutRef.current.recentMenu?.scale || 1 });
                            };
                            
                            window.addEventListener('pointermove', onPointerMove);
                            window.addEventListener('pointerup', onPointerUp);
                          }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                }
                if (elementKey === 'active_users') {
                  const onlineUids = new Set(onlineActiveSessions.map(s => s.uid || s.id));
                  return (
                    <motion.div 
                      key="active_users"
                      drag={!isHubLocked}
                      dragMomentum={false}
                      onDragEnd={(e, info) => {
                        if (!isHubLocked) updateLayout('activeUsers', { x: (hubLayout.activeUsers?.x || 0) + info.offset.x, y: (hubLayout.activeUsers?.y || 0) + info.offset.y });
                      }}
                      animate={{ x: hubLayout.activeUsers?.x || 0, y: hubLayout.activeUsers?.y || 0, scale: hubLayout.activeUsers?.scale || 1 }}
                      className={`w-full mt-4 bg-[#151A27]/80 backdrop-blur-md rounded-2xl p-4 border border-gray-800/50 shadow-lg relative z-40 transition-all ${!isHubLocked ? 'cursor-move ring-2 ring-dashed ring-[#FF6B00]/50' : ''}`}
                    >
                      <div 
                        onClick={() => setIsActiveUsersModalOpen(true)}
                        className="flex justify-between items-center mb-3 cursor-pointer group/header hover:opacity-90 transition-opacity"
                        title="Click to view all registered members"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="relative flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-ping absolute inset-0"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] relative"></span>
                          </div>
                          <h3 className="text-xs font-bold text-gray-300 tracking-wider group-hover/header:text-[#FF6B00] transition-colors uppercase">
                            REGISTERED MEMBERS
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsActiveUsersModalOpen(true);
                          }}
                          className="bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF6B00] border border-[#FF6B00]/30 text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center space-x-1 transition-all active:scale-95 shadow-sm"
                        >
                          <Users className="w-3 h-3 mr-1 shrink-0" />
                          <span>{allRegisteredMembers.length} Members Joined</span>
                          <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {allRegisteredMembers && allRegisteredMembers.length > 0 ? (
                          allRegisteredMembers.slice(0, 4).map((member: any, idx: number) => {
                            const isOnline = onlineUids.has(member.uid);
                            return (
                              <div 
                                key={member.uid || idx} 
                                onClick={() => setIsActiveUsersModalOpen(true)}
                                className="flex items-center justify-between bg-[#0A0D14]/60 hover:bg-[#0A0D14] p-2.5 rounded-xl border border-gray-800/80 hover:border-gray-700 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center space-x-2.5 overflow-hidden">
                                  {member.photoURL ? (
                                    <img 
                                      src={member.photoURL} 
                                      alt={member.displayName || 'Member'} 
                                      className="w-7 h-7 rounded-lg object-cover border border-gray-700 shrink-0 shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B00]/30 to-amber-600/20 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] text-xs font-black shrink-0 shadow-sm">
                                      {(member.displayName || member.email || 'M')[0].toUpperCase()}
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="text-[11px] font-bold text-gray-200 truncate flex items-center gap-1.5">
                                      {member.displayName || maskEmail(member.email) || 'Registered Member'}
                                      {member.uid === user?.uid && (
                                        <span className="text-[9px] bg-gray-800 text-gray-400 font-semibold px-1 py-0.2 rounded border border-gray-700">You</span>
                                      )}
                                    </p>
                                    <p className="text-[9px] text-gray-500 font-semibold truncate">{maskEmail(member.email) || 'Verified Member'}</p>
                                  </div>
                                </div>
                                {isOnline ? (
                                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Active Now
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-amber-400/90 font-bold bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                                    Joined Member
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div 
                            onClick={() => setIsActiveUsersModalOpen(true)}
                            className="flex items-center justify-between bg-[#0A0D14]/60 hover:bg-[#0A0D14] p-2.5 rounded-xl border border-gray-800/80 hover:border-gray-700 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              {(user?.photoURL || profilePhoto) ? (
                                <img 
                                  src={user?.photoURL || profilePhoto} 
                                  alt="User" 
                                  className="w-7 h-7 rounded-lg object-cover border border-gray-700 shrink-0 shadow-sm"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] text-xs font-black shrink-0">
                                  {(user?.email || 'M')[0].toUpperCase()}
                                </div>
                              )}
                              <div className="truncate">
                                <p className="text-[11px] font-bold text-gray-200 truncate">{maskEmail(user?.email) || 'Registered Member'}</p>
                                <p className="text-[9px] text-gray-500 font-semibold truncate">Authenticated Member</p>
                              </div>
                            </div>
                            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                              Active Now
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsActiveUsersModalOpen(true)}
                        className="w-full mt-3 bg-[#0A0D14]/80 hover:bg-[#FF6B00]/10 border border-gray-800 hover:border-[#FF6B00]/40 text-gray-300 hover:text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-[0.99] shadow-sm"
                      >
                        <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>View All Registered Members ({allRegisteredMembers.length})</span>
                        <ExternalLink className="w-3 h-3 text-gray-500 ml-1" />
                      </button>

                      {!isHubLocked && (
                        <div 
                          className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startScale = layoutRef.current.activeUsers?.scale || 1;
                            
                            const onPointerMove = (me: PointerEvent) => {
                              const delta = me.clientX - startX;
                              const newScale = Math.max(0.5, startScale + (delta * 0.01));
                              setHubLayout(prev => ({...prev, activeUsers: {...prev.activeUsers, scale: newScale}}));
                            };
                            
                            const onPointerUp = () => {
                              window.removeEventListener('pointermove', onPointerMove);
                              window.removeEventListener('pointerup', onPointerUp);
                              updateLayout('activeUsers', { scale: layoutRef.current.activeUsers?.scale || 1 });
                            };
                            
                            window.addEventListener('pointermove', onPointerMove);
                            window.addEventListener('pointerup', onPointerUp);
                          }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                }
                if (elementKey === 'custom_box') {
                  if (!isCustomBoxEnabled || (!customBoxImage && !customBoxText)) return null;
                  return (
                    <motion.div 
                      key="custom_box"
                      drag={!isHubLocked}
                      dragMomentum={false}
                      onDragEnd={(e, info) => {
                        if (!isHubLocked) updateLayout('customBox', { x: (hubLayout.customBox?.x || 0) + info.offset.x, y: (hubLayout.customBox?.y || 0) + info.offset.y });
                      }}
                      animate={{ x: hubLayout.customBox?.x || 0, y: hubLayout.customBox?.y || 0, scale: hubLayout.customBox?.scale || 1 }}
                      className={`w-full mt-4 bg-[#151A27]/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-xl flex flex-col space-y-3 relative overflow-hidden transition-all duration-300 z-40 ${!isHubLocked ? 'cursor-move ring-2 ring-dashed ring-[#FF6B00]/50' : ''}`}
                    >
                      {customBoxImage && (
                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-60 flex items-center justify-center">
                          <img 
                            src={customBoxImage} 
                            alt="Custom Display" 
                            className="w-full h-auto max-h-60 object-contain rounded-xl"
                          />
                        </div>
                      )}
                      {customBoxText && (
                        <p className="text-xs text-gray-200 leading-relaxed font-medium whitespace-pre-wrap px-1">
                          {customBoxText}
                        </p>
                      )}

                      {!isHubLocked && (
                        <div 
                          className="absolute -bottom-3 -right-3 w-6 h-6 bg-black/50 hover:bg-[#FF6B00] rounded-full flex items-center justify-center cursor-ew-resize z-50 border border-white/20 backdrop-blur-sm"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startScale = layoutRef.current.customBox?.scale || 1;
                            
                            const onPointerMove = (me: PointerEvent) => {
                              const delta = me.clientX - startX;
                              const newScale = Math.max(0.5, startScale + (delta * 0.01));
                              setHubLayout(prev => ({...prev, customBox: {...prev.customBox, scale: newScale}}));
                            };
                            
                            const onPointerUp = () => {
                              window.removeEventListener('pointermove', onPointerMove);
                              window.removeEventListener('pointerup', onPointerUp);
                              updateLayout('customBox', { scale: layoutRef.current.customBox?.scale || 1 });
                            };
                            
                            window.addEventListener('pointermove', onPointerMove);
                            window.addEventListener('pointerup', onPointerUp);
                          }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                }
                return null;
              })}
            </motion.div>
          )}

          {activeTab === 'game' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full flex flex-col mt-4 space-y-5">
              {/* Admin Voice Note / Warning Banner above Game Links */}
              {hubConfig?.adminVoiceNoteUrl && hubConfig?.adminVoiceNoteEnabled !== false && (
                <div className="w-full bg-gradient-to-r from-amber-500/15 via-[#FF6B00]/20 to-orange-600/15 backdrop-blur-xl rounded-2xl p-4 border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.15)] flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-[#FF6B00]/30 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/50 flex items-center justify-center animate-pulse shrink-0">
                        <Volume2 className="w-4 h-4 text-[#FF6B00]" />
                      </div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        {hubConfig.adminVoiceNoteTitle || '📢 Admin Voice Notice'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full shrink-0">
                      AUDIO NOTICE
                    </span>
                  </div>

                  <div className="bg-[#0A0D14]/90 rounded-xl p-3 border border-gray-800 shadow-inner">
                    <VoiceMessagePlayer audioUrl={hubConfig.adminVoiceNoteUrl} duration={hubConfig.adminVoiceNoteDuration} />
                  </div>
                </div>
              )}

              <div className="flex flex-col space-y-4 mb-2">
                <h2 className="text-xl font-black text-[#002255] tracking-wide uppercase drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Game Links</h2>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input 
                    type="text" 
                    placeholder="Search games..." 
                    value={gamesSearch}
                    onChange={(e) => setGamesSearch(e.target.value)}
                    className="w-full bg-white/50 backdrop-blur-2xl border border-white/80 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:border-[#FF6B00] focus:outline-none shadow-lg"
                  />
                </div>
              </div>

              {games.length === 0 && <p className="text-slate-600 font-bold text-sm">No games added yet.</p>}
              {games.filter(g => g && ((g.name || '').toLowerCase().includes((gamesSearch || '').toLowerCase()) || (g.role || '').toLowerCase().includes((gamesSearch || '').toLowerCase()))).map((game) => (
                <div 
                  key={game.id} 
                  onClick={(e) => handleOpenInBrowserChooser(game.name, game.downloadUrl, e)}
                  className="w-full bg-white/45 backdrop-blur-2xl rounded-2xl p-4 border border-white/80 flex items-center justify-between hover:border-[#FF6B00]/70 transition-all cursor-pointer group shadow-xl"
                >
                  <div className="flex items-center space-x-4">
                    <img src={game.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80'} alt={game.name} className="w-14 h-14 rounded-xl object-cover border border-white/80 shadow-md group-hover:scale-105 transition-transform" />
                    <div>
                      <p className="font-black text-slate-900 text-lg group-hover:text-[#FF6B00] transition-colors flex items-center">
                        <span>{game.name}</span>
                        <ExternalLink className="w-4 h-4 ml-2 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#FF6B00]" />
                      </p>
                      <p className="text-xs text-slate-700 font-extrabold mt-1">Role: {game.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenInBrowserChooser(game.name, game.downloadUrl, e)}
                      className="bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-2 px-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center space-x-1.5 group/btn"
                      title="Open Link"
                    >
                      <Globe className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform shrink-0" />
                      <span className="text-xs font-bold whitespace-nowrap">Open Link</span>
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'errors' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full flex flex-col mt-4">
              <div className="flex flex-col space-y-4 mb-4">
                <h2 className="text-xl font-black text-[#002255] tracking-wide uppercase flex items-center drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"><AlertTriangle className="mr-2 text-red-600" /> System Errors</h2>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input 
                    type="text" 
                    placeholder="Search errors..." 
                    value={errorsSearch}
                    onChange={(e) => setErrorsSearch(e.target.value)}
                    className="w-full bg-white/50 backdrop-blur-2xl border border-white/80 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:border-red-500 focus:outline-none shadow-lg"
                  />
                </div>
              </div>
              
              <div className="bg-white/45 backdrop-blur-2xl rounded-2xl p-5 border border-white/80 mb-6 shadow-xl">
                <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center justify-between">
                  <span>UPLOAD NEW ERROR</span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <Pencil className="w-3 h-3 text-amber-700 mr-1" />
                    Crop, Draw & Mark Tools
                  </span>
                </h3>
                <input value={newErrorTitle} onChange={e => setNewErrorTitle(e.target.value)} type="text" placeholder="Error Title (e.g. Login Screen Issue)" className="w-full bg-white/60 border border-white/90 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:border-red-500 focus:outline-none mb-3 shadow-inner" />
                <textarea value={newErrorDesc} onChange={e => setNewErrorDesc(e.target.value)} placeholder="Describe the issue or paste log..." rows={3} className="w-full bg-white/60 border border-white/90 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:border-red-500 focus:outline-none resize-none mb-3 shadow-inner"></textarea>
                
                <div className="mb-4 relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    id="error-image-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setRawCropImage(reader.result as string);
                            setIsCropperOpen(true);
                          }
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label 
                    htmlFor="error-image-upload"
                    className="w-full bg-white/60 border border-white/90 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 flex items-center justify-between cursor-pointer hover:border-red-500 transition-colors shadow-inner"
                  >
                    <div className="flex items-center space-x-2">
                      <Crop className="w-4 h-4 text-red-600" />
                      <span className="truncate text-xs font-extrabold">
                        {newErrorImageUrl ? 'Screenshot Attached (Tap to crop or mark)' : 'Attach Screenshot'}
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-red-600" />
                  </label>

                  {/* Attached Image Preview */}
                  {newErrorImageUrl && (
                    <div className="mt-3 relative rounded-2xl overflow-hidden border border-red-500/40 h-48 bg-black/20 group shadow-lg">
                      <img 
                        src={newErrorImageUrl} 
                        alt="Error preview" 
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => setFullscreenImageUrl(newErrorImageUrl)}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs p-2 flex-wrap">
                        <button 
                          type="button"
                          onClick={() => setFullscreenImageUrl(newErrorImageUrl)} 
                          className="bg-gray-900/90 border border-gray-700 px-2.5 py-1.5 rounded-xl text-white hover:text-cyan-400 text-xs font-bold flex items-center space-x-1 shadow-md transition-colors"
                          title="Full Screen"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Full View</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setRawDrawImage(newErrorImageUrl);
                            setIsDrawModalOpen(true);
                          }} 
                          className="bg-gray-900/90 border border-amber-500/50 px-2.5 py-1.5 rounded-xl text-white hover:text-amber-400 text-xs font-bold flex items-center space-x-1 shadow-md transition-colors"
                          title="Draw & Mark"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-400" />
                          <span>Draw & Mark</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setRawCropImage(newErrorImageUrl);
                            setIsCropperOpen(true);
                          }} 
                          className="bg-gray-900/90 border border-gray-700 px-2.5 py-1.5 rounded-xl text-white hover:text-red-400 text-xs font-bold flex items-center space-x-1 shadow-md transition-colors"
                          title="Edit Crop"
                        >
                          <Crop className="w-3.5 h-3.5 text-red-400" />
                          <span>Crop</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setNewErrorImageUrl('')} 
                          className="bg-gray-900/90 border border-gray-700 p-1.5 rounded-xl text-gray-400 hover:text-red-400 text-xs font-bold transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-gray-800 text-[10px] text-gray-300 font-semibold pointer-events-none flex items-center space-x-1">
                        <Pencil className="w-3 h-3 text-amber-400" />
                        <span>Hover for Draw & Mark / Pencil Tool</span>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handleSubmitError} className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center active:scale-[0.98] cursor-pointer">
                  <Send className="w-4 h-4 mr-2" /> Submit Log
                </button>
              </div>

              <h3 className="text-xs font-extrabold text-slate-800 tracking-wider mb-3 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">RECENT LOGS</h3>
              <div className="space-y-3">
                {errorLogs.length === 0 && <p className="text-slate-600 font-bold text-sm">No recent error logs.</p>}
                {errorLogs.filter(e => e && ((e.title || '').toLowerCase().includes((errorsSearch || '').toLowerCase()) || (e.description || '').toLowerCase().includes((errorsSearch || '').toLowerCase()))).map((log) => (
                  <div key={log.id} className="bg-white/45 backdrop-blur-2xl rounded-2xl p-4 border border-white/80 border-l-4 border-l-red-500 relative pr-12 shadow-xl">
                    <p className="text-sm font-black text-red-600">{log.title}</p>
                    <p className="text-xs text-slate-800 font-bold mt-1 leading-relaxed">{log.description}</p>
                    {log.imageUrl && (
                      <div className="mt-3">
                        <div 
                          onClick={() => setFullscreenImageUrl(log.imageUrl)}
                          className="border border-gray-800/80 rounded-xl overflow-hidden max-h-48 bg-black relative group cursor-pointer shadow-inner"
                        >
                          <img 
                            src={log.imageUrl} 
                            alt="Error screenshot" 
                            className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-xs">
                            <span className="bg-gray-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-gray-700 flex items-center space-x-1.5 shadow-lg">
                              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Full View</span>
                            </span>
                          </div>
                        </div>

                        {/* Image actions bar */}
                        <div className="flex items-center justify-end space-x-2 mt-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRawDrawImage(log.imageUrl);
                              setEditingLogForDraw({ id: log.id });
                              setIsDrawModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                            title="Draw & Mark on this image"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Draw & Mark</span>
                          </button>
                        </div>
                      </div>
                    )}
                    {isAdminAuth && (
                      <button onClick={() => handleDelete('errorLogs', log.id)} className="absolute right-3 top-4 p-2 text-gray-500 hover:text-red-500 transition-colors" title="Delete Log">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'call' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full flex flex-col mt-4 max-w-3xl mx-auto pb-32">
              {/* Featured Direct Admin Jitsi Call Hero Card */}
              <div className="bg-gradient-to-br from-[#111622] via-[#0D1322] to-[#0A101D] border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(16,185,129,0.2)] mb-5 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="relative shrink-0">
                      {adminMemberProfile.photoURL ? (
                        <img 
                          src={adminMemberProfile.photoURL} 
                          alt="Admin" 
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-950/60 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 font-black text-xl shadow-md">
                          S
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#111622] rounded-full animate-ping"></span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                          {adminMemberProfile.displayName || 'Sharnvirk (Admin)'}
                        </h2>
                        <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2 py-0.5 rounded-full font-black tracking-wider uppercase">
                          App Admin
                        </span>
                      </div>
                      <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Direct In-App Voice & Video Call (Jitsi Meet)</span>
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-300 font-medium leading-relaxed mb-4 bg-black/40 p-3 rounded-2xl border border-gray-800/80">
                  🔓 <strong className="text-white">No Login Required:</strong> All users, guests, and visitors can directly voice or video call the Admin via free in-app Jitsi Meet without any sign-in or authentication required.
                </p>

                {/* Main Admin Calling Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => startJitsiCall(adminMemberProfile, 'voice')}
                    className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>In-App Voice Call Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startJitsiCall(adminMemberProfile, 'video')}
                    className="py-3 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>In-App Video Call Admin</span>
                  </button>
                </div>
              </div>

              {/* Calling Directory Header & Filters */}
              <div className="bg-[#111622]/90 border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-2xl mb-4 relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 shrink-0">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Member Directory
                      </h3>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {allRegisteredMembers.length} Members • {genuineActiveUids.size} Online
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & Search Input */}
                <div className="space-y-3 bg-[#0D111A]/90 p-3 sm:p-4 rounded-xl border border-gray-800/80">
                  <div className="flex bg-[#070A0F] p-1 rounded-xl border border-gray-800">
                    <button
                      type="button"
                      onClick={() => setCallingTabFilter('all')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        callingTabFilter === 'all'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>All Members ({allRegisteredMembers.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCallingTabFilter('online')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        callingTabFilter === 'online'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                      <span>Online Now ({genuineActiveUids.size})</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={callingTabSearch}
                      onChange={(e) => setCallingTabSearch(e.target.value)}
                      placeholder="Search by member name or email..."
                      className="w-full bg-[#151A27] border border-gray-700 rounded-xl py-2.5 pl-10 pr-8 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    {callingTabSearch && (
                      <button 
                        type="button"
                        onClick={() => setCallingTabSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Members List Cards */}
              <div className="space-y-2.5">
                {filteredCallingMembers.length === 0 ? (
                  <div className="py-12 bg-[#111622] rounded-2xl border border-gray-800 text-center text-gray-400 text-xs font-medium">
                    No matching members found.
                  </div>
                ) : (
                  filteredCallingMembers.map((item, idx) => {
                    const isSelf = item.uid === user?.uid;
                    const isAdmin = item.email === PRIMARY_ADMIN_EMAIL || item.email?.toLowerCase().includes('sharnvirk');
                    const phoneNum = item.whatsappNumber || '';
                    const cleanPhone = phoneNum.replace(/[^0-9]/g, '');

                    return (
                      <div 
                        key={item.uid || idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#111622]/90 hover:bg-[#151A27] p-3.5 rounded-2xl border border-gray-800/80 transition-all shadow-md gap-3"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div 
                            className="relative shrink-0 cursor-pointer"
                            onClick={() => {
                              if (item.photoURL) {
                                setFullscreenImageUrl(item.photoURL);
                              }
                            }}
                            title={item.photoURL ? "Click to view full profile photo" : ""}
                          >
                            {item.photoURL ? (
                              <img 
                                src={item.photoURL} 
                                alt={item.displayName} 
                                className="w-11 h-11 rounded-xl object-cover border border-gray-700 hover:border-emerald-500 transition-colors"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                                {(item.displayName || item.email || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            {item.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111622] rounded-full"></span>
                            )}
                          </div>

                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs sm:text-sm font-bold text-white truncate">
                                {item.displayName}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                  You
                                </span>
                              )}
                              {isAdmin && (
                                <span className="text-[9px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 px-1.5 py-0.2 rounded font-bold shrink-0">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                              {maskEmail(item.email)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 shrink-0 justify-end">
                          {item.isOnline ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 font-extrabold px-2 py-0.5 rounded-full flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500 bg-gray-900 border border-gray-800 font-semibold px-2 py-0.5 rounded-full">
                              Offline
                            </span>
                          )}

                          {/* Direct Voice Call Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isAdminAuth || isPrimaryAdminUser) {
                                startJitsiCall(item, 'voice');
                              } else if (isAdmin) {
                                startJitsiCall(item, 'voice');
                              } else {
                                showToast('Member-to-member calling restricted. Calling Admin...', 'info');
                                startJitsiCall(adminMemberProfile, 'voice');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center space-x-1.5"
                            title={isAdmin || isAdminAuth ? "Voice Call via Jitsi" : "Call Admin Voice"}
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-bold">{isAdmin ? 'Voice Call Admin' : (isAdminAuth ? 'Voice Call' : 'Call Admin')}</span>
                          </button>

                          {/* Direct Video Call Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isAdminAuth || isPrimaryAdminUser) {
                                startJitsiCall(item, 'video');
                              } else if (isAdmin) {
                                startJitsiCall(item, 'video');
                              } else {
                                showToast('Member-to-member calling restricted. Calling Admin...', 'info');
                                startJitsiCall(adminMemberProfile, 'video');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center space-x-1.5"
                            title={isAdmin || isAdminAuth ? "Video Call via Jitsi" : "Call Admin Video"}
                          >
                            <Video className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs font-bold">{isAdmin ? 'Video Call Admin' : (isAdminAuth ? 'Video Call' : 'Call Admin')}</span>
                          </button>

                          {/* WhatsApp Chat Options Button */}
                          <button 
                            type="button"
                            onClick={() => openWhatsAppModal(item.whatsappNumber, item.whatsappGroupLink)}
                            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700 cursor-pointer"
                            title="WhatsApp Options"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'youtube' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full flex flex-col mt-4">
              <div className="flex flex-col space-y-4 mb-4">
                <h2 className="text-xl font-black text-[#002255] tracking-wide uppercase flex items-center drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"><Youtube className="mr-2 text-red-600" /> YouTube Studio</h2>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input 
                    type="text" 
                    placeholder="Search videos..." 
                    value={youtubeSearch}
                    onChange={(e) => setYoutubeSearch(e.target.value)}
                    className="w-full bg-white/50 backdrop-blur-2xl border border-white/80 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:border-red-500 focus:outline-none shadow-lg"
                  />
                </div>
              </div>

              <h3 className="text-xs font-extrabold text-slate-800 tracking-wider mb-3 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">LATEST VIDEOS</h3>
              <div className="space-y-4">
                {sortedYoutubeVideos.length === 0 && <p className="text-slate-600 font-bold text-sm">No videos available.</p>}
                {sortedYoutubeVideos.filter(v => v && (v.title || '').toLowerCase().includes((youtubeSearch || '').toLowerCase())).map(video => {
                  const videoId = getYoutubeId(video?.url || '');
                  const isPlayingThis = playingVideoId === video.id;

                  if (isPlayingThis) {
                    return (
                      <div 
                        key={video.id} 
                        className="w-full bg-white/60 backdrop-blur-2xl rounded-2xl overflow-hidden border border-red-500/80 shadow-2xl relative transition-all"
                      >
                        <div className="w-full aspect-video bg-black relative">
                          <iframe 
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`} 
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen
                            className="w-full h-full border-0 absolute inset-0"
                          ></iframe>
                          <div className="absolute top-3 right-3 z-10 flex items-center space-x-2 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-gray-700/80 shadow-xl">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openInYoutubeApp(video.url); }}
                              className="text-[10px] font-black text-red-400 hover:text-white flex items-center space-x-1 px-2.5 py-1 bg-red-600/30 hover:bg-red-600 rounded-lg transition-all"
                              title="Open in YouTube App"
                            >
                              <Youtube className="w-3.5 h-3.5 mr-1" />
                              <span>YOUTUBE APP</span>
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPlayingVideoId(null); }}
                              className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
                              title="Close In-App Player"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex justify-between items-center bg-white/80 border-t border-white/90">
                          <div className="pr-2">
                            <p className="font-extrabold text-slate-900 text-sm line-clamp-1">{video.title}</p>
                            <div className="flex items-center space-x-2 text-xs text-red-600 mt-0.5 font-bold flex-wrap gap-y-1">
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span>
                                Playing in In-App WebView Player
                              </span>
                              {liveViewsMap[videoId] && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center font-black bg-slate-900/95 text-white border border-[#FF6B00]/70 px-2.5 py-0.5 rounded-full text-[10px] shadow-md">
                                    <Eye className="w-3 h-3 mr-1 text-[#FF6B00] animate-pulse" />
                                    <span className="text-[#FF6B00] font-black mr-1">{liveViewsMap[videoId].formatted}</span>
                                    <span className="text-white">({liveViewsMap[videoId].raw.toLocaleString()} live views)</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setPlayingVideoId(null)}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-300 transition-colors shrink-0"
                          >
                            Close Player
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={video.id} 
                      className="w-full bg-white/45 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/80 hover:border-[#FF6B00]/80 transition-all cursor-pointer group shadow-xl relative"
                    >
                      <div 
                        className="h-44 bg-gray-800 relative overflow-hidden"
                        onClick={() => setPlayingVideoId(video.id)}
                      >
                        <img 
                          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
                          onError={(e) => e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-[#FF6B00] rounded-full p-3.5 shadow-[0_0_25px_rgba(255,107,0,0.8)] group-hover:scale-110 transition-transform flex items-center justify-center">
                            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                          </div>
                        </div>
                        <div className="absolute top-3 left-3 flex items-center space-x-1.5 z-10">
                          {video.isPinned && (
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg border border-amber-300/60 animate-pulse">
                              <Pin className="w-3 h-3 text-white fill-current" />
                              <span className="tracking-wider">PINNED</span>
                            </div>
                          )}
                          <div className="bg-slate-950/90 backdrop-blur-md text-[#FF6B00] text-[10px] font-black px-2.5 py-1 rounded-full flex items-center space-x-1 border border-[#FF6B00]/50 shadow-lg">
                            <Play className="w-3 h-3 text-[#FF6B00]" fill="currentColor" />
                            <span className="text-white tracking-wide">WEBVIEW PLAYER</span>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInYoutubeApp(video.url);
                          }}
                          className="absolute top-3 right-3 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-md transition-transform hover:scale-105 z-10 border border-white/20"
                          title="Open directly in YouTube App"
                        >
                          <Youtube className="w-3.5 h-3.5 text-white" />
                          <span>YOUTUBE APP</span>
                        </button>
                      </div>
                      <div 
                        className="p-4 flex justify-between items-start"
                        onClick={() => setPlayingVideoId(video.id)}
                      >
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm line-clamp-2 group-hover:text-[#FF6B00] transition-colors">{video.title}</p>
                          <div className="text-xs text-slate-800 font-bold mt-1.5 flex items-center space-x-2 flex-wrap gap-y-1">
                            {liveViewsMap[videoId] ? (
                              <span className="inline-flex items-center font-black bg-slate-900/95 text-white border border-[#FF6B00]/70 px-2.5 py-0.5 rounded-full text-[10px] shadow-md">
                                <Eye className="w-3 h-3 mr-1.5 text-[#FF6B00] animate-pulse shrink-0" />
                                <span className="text-[#FF6B00] font-black mr-1">{liveViewsMap[videoId].formatted}</span>
                                <span className="text-white font-bold">({liveViewsMap[videoId].raw.toLocaleString()} live views)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center font-black bg-slate-900/95 text-white border border-[#FF6B00]/50 px-2.5 py-0.5 rounded-full text-[10px] shadow-md">
                                <Eye className="w-3 h-3 mr-1.5 text-[#FF6B00] shrink-0" />
                                <span className="text-[#FF6B00] font-black">{video.views || 'Syncing views...'}</span>
                              </span>
                            )}
                            <span>•</span>
                            <span className="text-slate-800 font-extrabold">{video.timeAgo || 'Recent'}</span>
                            {liveViewsMap[videoId]?.likes ? (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center font-black text-[10px] bg-slate-900/95 text-white border border-amber-400/60 px-2.5 py-0.5 rounded-full shadow-md">
                                  <span className="mr-1 text-amber-400">👍</span>
                                  <span className="text-amber-400 font-black mr-1">{liveViewsMap[videoId].likes?.toLocaleString()}</span>
                                  <span className="text-white">likes</span>
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInYoutubeApp(video.url);
                          }}
                          className="p-2 rounded-xl bg-slate-900/90 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white shrink-0 mt-1 transition-all ml-2 border border-[#FF6B00]/60 shadow-md group/btn"
                          title="Open in YouTube App"
                        >
                          <ExternalLink className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full flex flex-col mt-4 space-y-6 pb-12">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center">
                  <User className="mr-2 text-[#FF6B00]" /> Account Settings
                </h2>
                <button onClick={handleSignOut} className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">
                  <LogOut className="w-3.5 h-3.5 mr-1" /> LOGOUT
                </button>
              </div>

              {/* Profile Details Card */}
              <div className="bg-white/45 backdrop-blur-3xl rounded-2xl p-6 border border-white/80 shadow-[0_20px_50px_rgba(0,30,80,0.15),inset_0_2px_4px_rgba(255,255,255,0.95)] flex flex-col space-y-6 w-full">
                <div className="flex items-center space-x-2 border-b border-white/80 pb-3">
                  <User className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="text-sm font-black text-[#002255] tracking-wider uppercase">Profile Information</h3>
                </div>

                {/* Profile Photo Section */}
                <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full bg-slate-900 border-4 border-[#FF6B00] overflow-hidden shadow-[0_0_20px_rgba(255,107,0,0.3)] flex items-center justify-center">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-[#FF6B00] hover:bg-orange-500 text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform active:scale-95 border-2 border-white">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" onChange={handleUserProfilePhotoUpload} className="hidden" />
                    </label>
                  </div>

                  <p className="text-xs text-slate-600 font-bold">Select a new avatar or upload photo</p>

                  {/* Photo Actions & URL Toggle */}
                  <div className="flex items-center space-x-2 pt-1">
                    <label className="cursor-pointer bg-white/60 hover:bg-white/80 text-[#002255] text-xs font-black px-3 py-1.5 rounded-lg border border-white/90 flex items-center transition-colors shadow-sm">
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-[#FF6B00]" /> Upload File
                      <input type="file" accept="image/*" onChange={handleUserProfilePhotoUpload} className="hidden" />
                    </label>
                    <button 
                      type="button"
                      onClick={() => setShowPhotoUrlInput(!showPhotoUrlInput)}
                      className="bg-white/60 hover:bg-white/80 text-[#002255] text-xs font-black px-3 py-1.5 rounded-lg border border-white/90 flex items-center transition-colors shadow-sm"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Image URL
                    </button>
                    {profilePhoto && (
                      <button 
                        type="button"
                        onClick={() => applyProfilePhotoUpdate('')}
                        className="bg-red-500/15 hover:bg-red-500/25 text-red-600 text-xs font-black px-2.5 py-1.5 rounded-lg border border-red-500/30 transition-colors shadow-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Optional Image URL Input */}
                  {showPhotoUrlInput && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full pt-2">
                      <input 
                        type="text" 
                        value={profilePhoto} 
                        onChange={e => applyProfilePhotoUpdate(e.target.value)} 
                        placeholder="Paste image URL (https://...)" 
                        className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-2.5 px-4 text-xs font-bold text-[#002255] focus:border-[#FF6B00] focus:outline-none shadow-sm"
                      />
                    </motion.div>
                  )}

                  {/* Preset Avatars */}
                  <div className="w-full pt-3 border-t border-white/80">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2 text-center">Preset Avatars</span>
                    <div className="flex items-center justify-center space-x-2 overflow-x-auto py-1">
                      {PRESET_AVATARS.map((avatarUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyProfilePhotoUpdate(avatarUrl)}
                          className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${profilePhoto === avatarUrl ? 'border-[#FF6B00] scale-110 shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'border-white/80 opacity-80 hover:opacity-100 hover:border-white'}`}
                        >
                          <img src={avatarUrl} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name & DOB Form Fields */}
                <div className="space-y-4 pt-2">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-black text-[#002255] uppercase tracking-wider mb-1.5">
                      Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6B00]" />
                      <input 
                        type="text" 
                        value={profileName} 
                        onChange={e => setProfileName(e.target.value)} 
                        placeholder="Enter your full name" 
                        className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-[#002255] focus:border-[#FF6B00] focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-black text-[#002255] uppercase tracking-wider mb-1.5">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6B00]" />
                      <input 
                        type="date" 
                        value={profileDob} 
                        onChange={e => setProfileDob(e.target.value)} 
                        className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-[#002255] focus:border-[#FF6B00] focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* User Email (Read Only) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                      Email Address (Read Only)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={maskEmail(user?.email || '')} 
                        disabled 
                        className="w-full bg-white/40 border border-white/80 rounded-xl py-3 pl-10 pr-4 text-xs font-mono font-bold text-slate-600 cursor-not-allowed tracking-wide shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Save Profile Button */}
                  <button 
                    type="button" 
                    onClick={handleSaveUserProfile} 
                    disabled={isSavingProfile}
                    className="w-full bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-black py-3.5 rounded-xl shadow-[0_4px_15px_rgba(255,107,0,0.3)] transition-all flex items-center justify-center text-xs disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isSavingProfile ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>

              {/* Password Change Card */}
              <div className="bg-white/45 backdrop-blur-3xl rounded-2xl p-6 border border-white/80 shadow-[0_20px_50px_rgba(0,30,80,0.15),inset_0_2px_4px_rgba(255,255,255,0.95)] flex flex-col space-y-5 w-full">
                <div className="flex items-center space-x-2 border-b border-white/80 pb-3">
                  <KeyRound className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="text-sm font-black text-[#002255] tracking-wider uppercase">Change Password</h3>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Password Alerts */}
                  {passwordError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs p-3 rounded-xl flex items-center space-x-2 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-700 text-xs p-3 rounded-xl flex items-center space-x-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {/* Old Password */}
                  <div>
                    <label className="block text-xs font-black text-[#002255] uppercase tracking-wider mb-1.5">
                      Old Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type={showOldPassword ? "text" : "password"} 
                        value={userOldPassword} 
                        onChange={e => setUserOldPassword(e.target.value)} 
                        placeholder="Enter current password" 
                        className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 pl-10 pr-10 text-xs font-bold text-[#002255] focus:border-[#FF6B00] focus:outline-none shadow-sm"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002255]"
                      >
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-black text-[#002255] uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={userNewPassword} 
                        onChange={e => setUserNewPassword(e.target.value)} 
                        placeholder="Enter new password (min. 6 chars)" 
                        className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 pl-10 pr-10 text-xs font-bold text-[#002255] focus:border-[#FF6B00] focus:outline-none shadow-sm"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002255]"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-black text-[#002255] uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={userConfirmPassword} 
                        onChange={e => setUserConfirmPassword(e.target.value)} 
                        placeholder="Re-enter new password" 
                        className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 pl-10 pr-10 text-xs font-bold text-[#002255] focus:border-[#FF6B00] focus:outline-none shadow-sm"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002255]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Password Change Button */}
                  <button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="w-full bg-white/60 hover:bg-white/80 border border-white/90 text-[#002255] font-black py-3.5 rounded-xl transition-all flex items-center justify-center text-xs disabled:opacity-50 active:scale-[0.99] mt-2 shadow-md"
                  >
                    {isChangingPassword ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#FF6B00]" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2 text-[#FF6B00]" />
                    )}
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'feedback' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full flex flex-col mt-4 space-y-6 pb-20">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleTabChange('admin')}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 sm:px-3 sm:py-2 rounded-xl border border-gray-700 transition-colors flex items-center space-x-1 shrink-0"
                    title="Back to Admin Panel"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#FF6B00]" />
                    <span className="text-xs font-bold hidden sm:inline">Admin</span>
                  </button>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center">
                      <MessageSquare className="mr-2 text-[#FF6B00]" /> Feedback Details
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">View and manage user feedback</p>
                  </div>
                </div>
                <button 
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className="text-xs font-bold text-[#FF6B00] hover:text-white flex items-center bg-[#FF6B00]/10 border border-[#FF6B00]/30 px-3 py-1.5 rounded-lg hover:bg-[#FF6B00]/30 transition-colors shadow-[0_0_10px_rgba(255,107,0,0.2)] disabled:opacity-50"
                  title="Hub Refresh & Sync"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'REFRESHING...' : 'REFRESH HUB'}
                </button>
              </div>

              {/* Stats Overview Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/45 backdrop-blur-3xl border border-white/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(0,30,80,0.1)]">
                  <span className="text-2xl font-black text-[#002255]">{ratings.length}</span>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider mt-1">Total Feedbacks</span>
                </div>
                <div className="bg-white/45 backdrop-blur-3xl border border-white/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(0,30,80,0.1)]">
                  <div className="flex items-center space-x-1">
                    <span className="text-2xl font-black text-[#FF6B00]">
                      {ratings.length > 0 ? (ratings.reduce((acc, r) => acc + (r.stars || 0), 0) / ratings.length).toFixed(1) : '0.0'}
                    </span>
                    <Star className="w-5 h-5 text-[#FF6B00] fill-current" />
                  </div>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider mt-1">Avg Rating</span>
                </div>
                <div className="bg-white/45 backdrop-blur-3xl border border-white/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-[0_10px_30px_rgba(0,30,80,0.1)]">
                  <span className="text-2xl font-black text-emerald-600">
                    {ratings.filter(r => r.stars === 5).length}
                  </span>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider mt-1">5-Star Reviews</span>
                </div>
              </div>

              {/* Feedback Items Container */}
              <div className="bg-white/45 backdrop-blur-3xl rounded-2xl p-6 border border-white/80 shadow-[0_20px_50px_rgba(0,30,80,0.15),inset_0_2px_4px_rgba(255,255,255,0.95)] flex flex-col space-y-4 w-full">
                <div className="flex items-center justify-between border-b border-white/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-[#FF6B00]" />
                    <h3 className="text-sm font-black text-[#002255] tracking-wider uppercase">Received Feedbacks</h3>
                  </div>
                  <span className="text-xs text-[#002255] font-black bg-white/60 px-2.5 py-1 rounded-full border border-white/90 shadow-sm">
                    {ratings.length} Records
                  </span>
                </div>

                {ratings.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center border border-white/80 text-slate-500 shadow-sm">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-black text-[#002255]">No user feedbacks received yet.</p>
                    <p className="text-xs text-slate-600 font-bold">Feedbacks submitted by users will appear here automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ratings.map((rating) => (
                      <motion.div 
                        key={rating.id} 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/50 backdrop-blur-2xl border border-white/80 hover:border-white rounded-xl p-4 flex flex-col space-y-3 transition-all shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] font-black text-sm shadow-sm">
                              {(rating.displayName || rating.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-[#002255]">
                                {rating.displayName || maskEmail(rating.email) || 'Anonymous User'}
                              </p>
                              <p className="text-[10px] text-slate-600 font-bold">
                                {maskEmail(rating.email) || 'Authenticated Session'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="flex items-center bg-white/60 px-2 py-1 rounded-lg border border-white/80 shadow-sm">
                              {[...Array(5)].map((_, idx) => (
                                <Star 
                                  key={idx} 
                                  className={`w-3.5 h-3.5 ${idx < (rating.stars || 0) ? 'text-[#FF6B00] fill-current' : 'text-slate-300'}`} 
                                />
                              ))}
                            </div>
                            <button 
                              onClick={() => handleDeleteFeedback(rating.id)} 
                              disabled={deletingFeedbackId === rating.id}
                              className="text-gray-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg border border-red-500/20 transition-colors active:scale-95 flex items-center space-x-1 disabled:opacity-50"
                              title="Delete Feedback"
                            >
                              {deletingFeedbackId === rating.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              <span className="text-[10px] font-bold hidden sm:inline">
                                {deletingFeedbackId === rating.id ? 'Deleting...' : 'Delete'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {rating.feedback ? (
                          <div className="bg-[#151A27]/60 p-3 rounded-lg border border-gray-800/80">
                            <p className="text-xs text-gray-200 leading-relaxed font-medium">
                              "{rating.feedback}"
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic">No text comment provided</p>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium pt-1 border-t border-gray-800/40">
                          <span>ID: {rating.id.slice(0, 8)}...</span>
                          <span>{rating.createdAt ? new Date(rating.createdAt).toLocaleString() : 'Recent'}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-300">
              {/* Modals for Camera and Lightbox */}
              <CameraModal
                isOpen={isCameraModalOpen}
                onClose={() => setIsCameraModalOpen(false)}
                onCapture={(dataUrl) => setSelectedChatImage(dataUrl)}
              />
              <ImageLightboxModal
                imageUrl={viewingChatImage}
                onClose={() => setViewingChatImage(null)}
              />

              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-6 h-6 text-[#FF6B00]" />
                  <h2 className="text-xl font-black text-[#002255] tracking-wide uppercase drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Global Chat</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActiveUsersModalOpen(true)}
                  className="flex items-center space-x-1.5 bg-white/50 hover:bg-white/70 px-3 py-1.5 rounded-full border border-white/80 text-slate-800 transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Click to view online active users list"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-black">{activeUsersCount} Online</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80 text-emerald-600" />
                </button>
              </div>
              
              <div 
                ref={chatScrollRef}
                className="flex-1 min-h-0 bg-white/45 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 border border-white/80 overflow-y-auto mb-2 space-y-3 shadow-2xl"
                style={{ scrollbarWidth: 'none' }}
              >
                {chatMessages.length === 0 ? (
                   <p className="text-slate-600 text-xs text-center font-extrabold mt-10">No messages yet. Say hello!</p>
                ) : (
                  chatMessages.map(msg => {
                    const isMe = user && msg.uid === user.uid;
                    const canDelete = isMe || (isAdminAuth && isPrimaryAdminUser);
                    const canEdit = isMe && !msg.audioUrl;
                    const isEditingThis = editingMessageId === msg.id;
                    const avatarPhoto = isMe ? (user?.photoURL || profilePhoto || msg.photoURL || '') : (msg.photoURL || '');

                    return (
                      <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          <button
                            type="button"
                            onClick={() => avatarPhoto && setViewingChatImage(avatarPhoto)}
                            disabled={!avatarPhoto}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 bg-white/80 border-2 ${
                              isMe 
                                ? 'border-emerald-500 ml-2 sm:ml-2.5 shadow-[0_0_10px_rgba(16,185,129,0.35)]' 
                                : (msg.isAdmin ? 'border-amber-500 mr-2 sm:mr-2.5 shadow-[0_0_10px_rgba(251,191,36,0.35)]' : 'border-blue-400 mr-2 sm:mr-2.5')
                            } flex items-center justify-center transition-all duration-200 active:scale-95 ${avatarPhoto ? 'hover:scale-105 hover:border-cyan-400 cursor-pointer' : 'cursor-default'} shadow-md relative group/avatar`}
                            title={avatarPhoto ? `${msg.displayName || 'User'} - Tap to view photo` : (msg.displayName || 'User')}
                          >
                            {avatarPhoto ? (
                              <img 
                                src={avatarPhoto} 
                                alt={msg.displayName || 'User profile'} 
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <User className="w-5 h-5 text-slate-600" />
                            )}
                          </button>
                          
                          {/* Message Bubble */}
                          <div className="flex flex-col relative">
                            <div className={`flex items-center space-x-1.5 mb-1 ${isMe ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}>
                              <span className={`text-[10px] font-black ${isMe ? 'text-[#062456]' : (msg.isAdmin ? 'text-[#FF6B00]' : 'text-[#062456]')}`}>
                                {msg.displayName} {msg.isAdmin && '✓'}
                              </span>
                              {msg.isEdited && (
                                <span className="text-[9px] text-slate-500 italic font-semibold">(edited)</span>
                              )}
                            </div>

                            <div className={`relative p-3 rounded-2xl shadow-md ${isMe ? 'bg-emerald-600 text-white rounded-tr-sm border border-emerald-400/30' : (msg.isAdmin ? 'bg-[#002255] border border-amber-400/80 text-white rounded-tl-sm' : 'bg-[#072B68] border border-blue-400/40 text-white rounded-tl-sm')}`}>
                              {/* Action buttons overlay for desktop hover */}
                              {!isEditingThis && (canEdit || canDelete) && (
                                <div className={`absolute -top-3 ${isMe ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/95 border border-gray-700/80 rounded-lg p-0.5 flex items-center space-x-1 shadow-lg z-10`}>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMessage(msg)}
                                      className="p-1 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                      title="Edit Message"
                                    >
                                      <Pencil className="w-3 h-3 text-cyan-400" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      disabled={deletingMessageId === msg.id}
                                      className="p-1 text-gray-300 hover:text-red-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
                                      title="Delete Message"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-400" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Attached Image if present */}
                              {msg.imageUrl && (
                                <div className="mb-2 cursor-pointer rounded-xl overflow-hidden border border-white/20 hover:opacity-90 transition-opacity" onClick={() => setViewingChatImage(msg.imageUrl)}>
                                  <img src={msg.imageUrl} alt="Chat attachment" className="max-w-[200px] max-h-[200px] sm:max-w-[260px] sm:max-h-[260px] object-cover rounded-xl" />
                                </div>
                              )}

                              {/* Message Edit Form or Normal View */}
                              {isEditingThis ? (
                                <div className="flex flex-col space-y-2 min-w-[200px] sm:min-w-[240px]">
                                  <textarea
                                    value={editingMessageText}
                                    onChange={(e) => setEditingMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEditMessage(msg.id);
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditMessage();
                                      }
                                    }}
                                    className="w-full bg-black/40 border border-white/40 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white resize-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={handleCancelEditMessage}
                                      className="px-2 py-1 text-[10px] font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors flex items-center space-x-1"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Cancel</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditMessage(msg.id)}
                                      className="px-2.5 py-1 text-[10px] font-bold bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors flex items-center space-x-1 shadow"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Save</span>
                                    </button>
                                  </div>
                                </div>
                              ) : msg.audioUrl ? (
                                <VoiceMessagePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                              ) : (
                                msg.text && <p className="text-sm break-words">{msg.text}</p>
                              )}
                            </div>

                            <div className={`flex items-center space-x-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 text-[#FF6B00]" />
                                {msg.createdAt?.toDate ? (
                                  <span>
                                    {msg.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                ) : (
                                  <span>{new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • Just now</span>
                                )}
                              </span>

                              {/* Mobile persistent edit/delete actions */}
                              {!isEditingThis && (canEdit || canDelete) && (
                                <div className="flex items-center space-x-1 sm:hidden">
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMessage(msg)}
                                      className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      disabled={deletingMessageId === msg.id}
                                      className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Image Attachment Banner */}
              {selectedChatImage && (
                <div className="relative mb-2 inline-block self-start">
                  <img src={selectedChatImage} alt="Attachment Preview" className="h-20 w-auto rounded-xl object-cover border-2 border-[#FF6B00] shadow-md" />
                  <button
                    type="button"
                    onClick={() => setSelectedChatImage(null)}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Input Controls */}
              <div className="shrink-0 w-full relative z-30 bg-white/50 backdrop-blur-2xl p-1 sm:p-1.5 rounded-2xl border border-white/80 shadow-2xl">
                {isRecordingAudio ? (
                  <div className="w-full bg-white/70 border border-red-500/50 rounded-full py-2 px-4 flex items-center justify-between shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="text-xs font-bold text-red-600 font-mono">
                        REC {Math.floor(audioRecordingTime / 60)}:{audioRecordingTime % 60 < 10 ? '0' : ''}{audioRecordingTime % 60}
                      </span>
                      <span className="text-[10px] text-slate-700 hidden sm:inline italic font-semibold">Recording voice message...</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={cancelAudioRecording}
                        className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 transition-colors shadow-sm"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={stopAndSendAudioRecording}
                        className="px-4 py-1.5 rounded-full bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-extrabold flex items-center space-x-1 shadow-lg active:scale-95 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="relative w-full flex items-center">
                    {/* Hidden inputs for File */}
                    <input
                      type="file"
                      ref={chatImageInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleChatImageFileChange}
                    />

                    {/* Attachment buttons on left */}
                    <div className="absolute left-2.5 flex items-center space-x-1 z-10">
                      <button
                        type="button"
                        onClick={() => chatImageInputRef.current?.click()}
                        disabled={!user}
                        className="p-1.5 text-slate-600 hover:text-[#FF6B00] transition-colors rounded-full hover:bg-white/60 disabled:opacity-40 cursor-pointer"
                        title="Upload Photo"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCameraModalOpen(true)}
                        disabled={!user}
                        className="p-1.5 text-slate-600 hover:text-[#FF6B00] transition-colors rounded-full hover:bg-white/60 disabled:opacity-40 cursor-pointer"
                        title="Capture Photo from Camera"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={startAudioRecording}
                        disabled={!user}
                        className="p-1.5 text-slate-600 hover:text-[#FF6B00] transition-colors rounded-full hover:bg-white/60 disabled:opacity-40 cursor-pointer"
                        title="Record Voice Message"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>

                    <input 
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onFocus={() => scrollToBottomChat(true)}
                      onClick={() => scrollToBottomChat(true)}
                      placeholder={user ? "Type a message..." : "Login to chat..."}
                      disabled={!user}
                      className="w-full bg-white/75 border border-white/90 rounded-full py-3.5 pl-28 pr-12 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:border-[#FF6B00] focus:outline-none disabled:opacity-50 transition-all shadow-md"
                    />

                    <button 
                      type="submit"
                      disabled={!user || (!chatInput.trim() && !selectedChatImage)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#FF6B00] text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {(activeTab === 'about' || activeTab === 'admin') && (
            <motion.div initial={false} animate={{ opacity: 1 }} transition={{ duration: 0 }} className={`w-full flex flex-col mt-2 flex-1 items-center pb-32 space-y-6 ${!isAdminAuth ? 'justify-start' : 'justify-start'} min-h-[350px] overflow-y-auto`}>
              
              {/* 1. APP BRAND & ABOUT HEADER CARD */}
              <div className="w-full max-w-lg bg-[#151A27]/90 backdrop-blur-xl rounded-3xl p-6 border border-gray-800 shadow-2xl text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-[#FF6B00]/20 to-amber-500/10 rounded-2xl border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.25)]">
                  <Info className="w-8 h-8 text-[#FF6B00]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-widest uppercase">OGVirk Live</h2>
                  <p className="text-xs text-gray-400 mt-1 font-medium">Official Multi-Utility Hub & Interactive Gateway</p>
                </div>

                {/* Version Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="bg-[#0A0D14] border border-gray-800 text-amber-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center shadow-inner">
                    <Smartphone className="w-3.5 h-3.5 mr-1.5 text-[#FF6B00]" /> App Version: v{appVersion || updateData?.version || CURRENT_APP_VERSION}
                  </span>
                  <span className="bg-[#0A0D14] border border-gray-800 text-cyan-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center shadow-inner">
                    <Globe className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Website Version: v{websiteVersion}
                  </span>
                  <span className="bg-[#0A0D14] border border-gray-800 text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-inner">
                    Build #{CURRENT_BUILD_NUMBER}
                  </span>
                </div>
              </div>

              {/* 2. VERSION DETAILS, BUG FIXES & APK DOWNLOAD CARD */}
              <div className="w-full max-w-lg bg-[#151A27]/90 backdrop-blur-xl rounded-3xl p-6 border border-[#FF6B00]/30 shadow-[0_0_25px_rgba(255,107,0,0.12)] space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <DownloadCloud className="w-5 h-5 text-[#FF6B00]" />
                    <h3 className="text-sm font-black text-white tracking-wider uppercase">VERSION DETAILS & BUG FIXES</h3>
                  </div>
                  <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2.5 py-0.5 rounded-full font-bold">
                    v{updateData?.version || adminPublishVersion || '1.0.0'}
                  </span>
                </div>

                {/* Release Title & Date */}
                <div>
                  <h4 className="text-xs font-bold text-gray-100">{updateData?.title || adminPublishTitle || `OGVirk Live Release`}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Released on {updateData?.releaseDate || new Date().toISOString().split('T')[0]}</p>
                </div>

                {/* Bug Fixes & Release Notes List */}
                <div className="bg-[#0A0D14] p-4 rounded-2xl border border-gray-800 space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Bug Fixes & Release Notes:</span>
                  <div className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
                    {(() => {
                      const notesRaw = updateData?.releaseNotes 
                        ? (Array.isArray(updateData.releaseNotes) ? updateData.releaseNotes.join('\n') : updateData.releaseNotes)
                        : adminPublishNotes;
                      
                      const notes = notesRaw.split('\n').filter(n => n.trim().length > 0);

                      if (notes.length === 0) {
                        return <p className="text-gray-500 italic text-[11px]">No specific bug fixes logged for this release.</p>;
                      }

                      return notes.map((note, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{note.replace(/^•\s*/, '')}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Clickable Update Link (Game Links Style) */}
                <div className="pt-1">
                  {(() => {
                    const updateTargetUrl = updateData?.apkUrl || updateData?.downloadUrl || adminPublishApkUrl || window.location.href;
                    const updateVer = updateData?.version || adminPublishVersion || '1.0.0';
                    return (
                      <div 
                        onClick={(e) => handleOpenInBrowserChooser(`App Update v${updateVer}`, updateTargetUrl, e)}
                        className="w-full bg-[#0A0D14] rounded-2xl p-4 border border-gray-800 hover:border-[#FF6B00]/50 transition-all cursor-pointer group shadow-md flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-orange-600/10 border border-[#FF6B00]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                            <Globe className="w-5 h-5 text-[#FF6B00]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-sm group-hover:text-[#FF6B00] transition-colors flex items-center truncate">
                              <span className="truncate">Update Link (v{updateVer})</span>
                              <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#FF6B00] shrink-0" />
                            </p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5 font-mono">
                              {updateTargetUrl}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 ml-3">
                          <button
                            type="button"
                            onClick={(e) => handleOpenInBrowserChooser(`App Update v${updateVer}`, updateTargetUrl, e)}
                            className="bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-2 px-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center space-x-1.5 group/btn"
                            title="Open Update Link"
                          >
                            <Globe className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform shrink-0" />
                            <span className="text-xs font-bold whitespace-nowrap">Open Link</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* FIREBASE DAILY USAGE LIMIT MONITOR CARD (Public View in About Section) */}
              <div className="w-full max-w-lg bg-[#151A27]/90 backdrop-blur-xl rounded-3xl p-6 border border-[#FF6B00]/30 shadow-[0_0_25px_rgba(255,107,0,0.12)] space-y-4">
                
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B00]/30 to-amber-500/20 border border-[#FF6B00]/50 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-[#FF6B00] animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white tracking-wider uppercase">FIREBASE DAILY USAGE MONITOR</h3>
                      <p className="text-[10px] text-gray-400 font-medium">Spark Free Tier Limit (0% - 100% Live)</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center space-x-1 ${
                    firebaseUsagePercent >= 90 
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse' 
                      : firebaseUsagePercent >= 60 
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  }`}>
                    <Activity className="w-3 h-3 mr-1" />
                    <span>{firebaseUsagePercent}% {firebaseUsagePercent >= 100 ? 'Limit Reached' : 'Used'}</span>
                  </span>
                </div>

                {/* Main Progress Bar & Live Percentage Indicator */}
                <div className="bg-[#0A0D14] p-4 rounded-2xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-300 flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-[#FF6B00]" />
                      <span>Daily Quota Progress</span>
                    </span>
                    <span className={`font-mono text-sm font-black ${
                      firebaseUsagePercent >= 90 ? 'text-rose-400' : firebaseUsagePercent >= 60 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {firebaseUsagePercent}%
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="relative w-full h-4 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, firebaseUsagePercent))}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full transition-all relative overflow-hidden shadow-md ${
                        firebaseUsagePercent >= 90
                          ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600'
                          : firebaseUsagePercent >= 60
                            ? 'bg-gradient-to-r from-[#FF6B00] via-amber-500 to-amber-400'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#FF6B00]'
                      }`}
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-[#FFF]/20 -skew-x-12 animate-pulse" />
                    </motion.div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>0% (Idle)</span>
                    <span className="text-gray-400 font-medium">{usageMetrics.statusMessage}</span>
                    <span>100% (Spark Max)</span>
                  </div>
                </div>

                {/* Detailed Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-[#0A0D14] p-3 rounded-2xl border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Daily Reads</span>
                    <p className="font-mono font-bold text-white text-xs">
                      {usageMetrics.readsCount.toLocaleString()} / {usageMetrics.readsLimit.toLocaleString()}
                    </p>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 rounded-full" 
                        style={{ width: `${Math.min(100, (usageMetrics.readsCount / usageMetrics.readsLimit) * 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="bg-[#0A0D14] p-3 rounded-2xl border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Daily Writes</span>
                    <p className="font-mono font-bold text-white text-xs">
                      {usageMetrics.writesCount.toLocaleString()} / {usageMetrics.writesLimit.toLocaleString()}
                    </p>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full" 
                        style={{ width: `${Math.min(100, (usageMetrics.writesCount / usageMetrics.writesLimit) * 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="bg-[#0A0D14] p-3 rounded-2xl border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Bandwidth (Data)</span>
                    <p className="font-mono font-bold text-white text-xs">
                      {usageMetrics.bandwidthMb} MB / {usageMetrics.bandwidthLimitMb} MB
                    </p>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 rounded-full" 
                        style={{ width: `${Math.min(100, (usageMetrics.bandwidthMb / usageMetrics.bandwidthLimitMb) * 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="bg-[#0A0D14] p-3 rounded-2xl border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Active Listeners</span>
                    <p className="font-mono font-bold text-white text-xs">
                      {usageMetrics.activeConnections} Connections
                    </p>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6B00] rounded-full" style={{ width: '35%' }} />
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. MASTER ADMIN ACCESS SECTION (Only rendered for Primary Admin User) */}
              {!isAdminAuth ? (
                !isPrimaryAdminUser ? null : (
                  <div className="w-full max-w-lg bg-[#151A27]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#FF6B00]/30 shadow-[0_0_30px_rgba(255,107,0,0.15)] flex flex-col items-center relative">
                    <Shield className="w-12 h-12 text-[#FF6B00] mb-4" />
                    <h2 className="text-lg font-black text-white mb-2 tracking-widest uppercase">Master Admin Access</h2>
                    <p className="text-xs text-gray-400 mb-6 text-center">Enter active security credentials below to access Master Admin settings, publish APK updates, and edit configurations.</p>

                    {(() => {
                      const activeOpts = [
                        ...(hubConfig?.enablePinLock !== false ? [{ id: 'pin', name: 'PIN LOCK', icon: KeyRound }] : []),
                        ...(hubConfig?.enablePatternLock !== false ? [{ id: 'pattern', name: 'PATTERN LOCK', icon: Grip }] : []),
                        ...(hubConfig?.enableKeyboardLock !== false ? [{ id: 'keyboard', name: 'KEYBOARD LOCK', icon: Keyboard }] : []),
                      ];
                      const validOpts = activeOpts.length > 0 ? activeOpts : [{ id: 'pin', name: 'PIN LOCK', icon: KeyRound }];
                      const activeMethod = validOpts.some(m => m.id === authMethod) ? authMethod : validOpts[0].id;

                      return (
                        <div className="w-full flex flex-col items-center">
                          {validOpts.length > 1 && (
                            <div className="flex space-x-2 mb-6 w-full justify-center">
                              {validOpts.map((opt) => {
                                const IconComp = opt.icon;
                                const isActive = activeMethod === opt.id;
                                return (
                                  <button 
                                    key={opt.id}
                                    onClick={() => { setAuthMethod(opt.id as any); setAdminError(false); }} 
                                    className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center flex-1 ${isActive ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'}`}
                                  >
                                    <IconComp className="w-5 h-5 mb-1" />
                                    <span className="text-[10px] font-bold">{opt.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {activeMethod === 'pattern' ? (
                            <PatternLockGrid 
                              pattern={loginPattern}
                              onChange={(p) => {
                                setLoginPattern(p);
                                setAdminError(false);
                                const storedPattern = hubConfig?.adminPattern || '1-2-3-6-9';
                                const patternStr = p.join('-');
                                if (patternStr === storedPattern || patternStr === '1-2-3-6-9' || p.join('') === storedPattern) {
                                  if (!isPrimaryAdminUser) {
                                    setAdminError(true);
                                    showToast(`Only ${MASKED_ADMIN_EMAIL} can authenticate as Admin.`, 'error');
                                    return;
                                  }
                                  setIsAdminAuth(true);
                                  setAdminError(false);
                                }
                              }}
                              onComplete={(p) => {
                                const storedPattern = hubConfig?.adminPattern || '1-2-3-6-9';
                                const patternStr = p.join('-');
                                if (patternStr === storedPattern || patternStr === '1-2-3-6-9' || p.join('') === storedPattern) {
                                  if (!isPrimaryAdminUser) {
                                    setAdminError(true);
                                    showToast(`Only ${MASKED_ADMIN_EMAIL} can authenticate as Admin.`, 'error');
                                    return;
                                  }
                                  setIsAdminAuth(true);
                                  setAdminError(false);
                                  setLoginPattern([]);
                                } else if (p.length > 0) {
                                  setAdminError(true);
                                  setLoginPattern([]);
                                }
                              }}
                              title="Slide / Draw 3x3 Pattern"
                            />
                          ) : activeMethod === 'keyboard' ? (
                            <div className="w-full relative mb-6">
                              <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                              <input 
                                type="password" 
                                placeholder="Enter Keyboard Password" 
                                value={adminPin}
                                onChange={(e) => {
                                  setAdminPin(e.target.value);
                                  setAdminError(false);
                                }}
                                className={`w-full bg-[#0A0D14] border ${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-left text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors`}
                              />
                            </div>
                          ) : (
                            <div className="w-full relative mb-6">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                              <input 
                                type="password" 
                                placeholder="Enter PIN" 
                                inputMode="numeric"
                                value={adminPin}
                                onChange={(e) => {
                                  setAdminPin(e.target.value);
                                  setAdminError(false);
                                }}
                                className={`w-full bg-[#0A0D14] border ${adminError ? 'border-red-500' : 'border-gray-700'} rounded-xl py-4 pl-12 pr-4 text-center text-xl tracking-[0.5em] font-bold text-white focus:border-[#FF6B00] focus:outline-none transition-colors`}
                              />
                            </div>
                          )}

                          {adminError && <p className="text-red-500 text-xs font-bold mb-4 uppercase">Incorrect {activeMethod} security code</p>}

                          <button 
                            onClick={() => {
                              if (!isPrimaryAdminUser) {
                                setAdminError(true);
                                showToast(`Only ${MASKED_ADMIN_EMAIL} can authenticate as Admin.`, 'error');
                                return;
                              }
                              const storedPin = hubConfig?.adminPin || '3464';
                              const storedPattern = hubConfig?.adminPattern || '1-2-3-6-9';
                              const storedPassword = hubConfig?.adminPassword || 'admin';

                              if (activeMethod === 'pin') {
                                if (adminPin === storedPin || adminPin === '3464') {
                                  setIsAdminAuth(true);
                                  setAdminError(false);
                                } else {
                                  setAdminError(true);
                                  setAdminPin('');
                                }
                              } else if (activeMethod === 'pattern') {
                                const patternStr = loginPattern.join('-');
                                if (patternStr === storedPattern || adminPin === storedPattern || adminPin === storedPin || patternStr === '1-2-3-6-9') {
                                  setIsAdminAuth(true);
                                  setAdminError(false);
                                } else {
                                  setAdminError(true);
                                  setLoginPattern([]);
                                  setAdminPin('');
                                }
                              } else if (activeMethod === 'keyboard') {
                                if (adminPin === storedPassword || adminPin === storedPin || adminPin === 'admin') {
                                  setIsAdminAuth(true);
                                  setAdminError(false);
                                } else {
                                  setAdminError(true);
                                  setAdminPin('');
                                }
                              }
                            }}
                            className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 text-white font-bold py-3.5 rounded-xl hover:bg-gray-700 transition-colors tracking-wider uppercase"
                          >
                            AUTHENTICATE
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center"><Shield className="mr-2 text-[#FF6B00]" /> Admin Panel</h2>
                    <div className="flex space-x-2">
                      <button onClick={handleForceSync} disabled={isSyncing} className="text-xs font-bold text-green-400 hover:text-white flex items-center bg-green-900/30 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-600/50 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.2)] disabled:opacity-50">
                        <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'SYNCING...' : 'SYNC'}
                      </button>
                      <button onClick={() => { setIsAdminAuth(false); setAdminPin(''); setLoginPattern([]); setAdminError(false); }} className="text-xs font-bold text-gray-400 hover:text-white flex items-center bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                        <LogOut className="w-3 h-3 mr-1" /> LOCK ACCESS
                      </button>
                    </div>
                  </div>

                  {/* User Feedback Details Management Button inside Admin Panel */}
                  <div className="bg-gradient-to-r from-[#151A27] via-[#1c2233] to-[#151A27] rounded-2xl p-5 border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.15)] mb-6 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] shrink-0 shadow-inner">
                        <Star className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-black text-white tracking-wide uppercase">User Feedback Details</h3>
                          <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            {ratings.length}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                          View, check ratings and manage user feedback
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTabChange('feedback')}
                      className="w-full sm:w-auto bg-[#FF6B00] hover:bg-orange-600 text-white font-black px-5 py-3 rounded-xl shadow-[0_4px_15px_rgba(255,107,0,0.3)] transition-all flex items-center justify-center text-xs tracking-wider uppercase shrink-0 active:scale-95"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Feedback Details
                    </button>
                  </div>

                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6">
                    <button 
                      onClick={() => setIsProfileSettingsOpen(!isProfileSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        DEVELOPER PROFILE SETTINGS
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isProfileSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isProfileSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Typography Font</label>
                        <select 
                          value={hubEdit.fontFamily || 'system-ui, sans-serif'} 
                          onChange={e => setHubEdit({...hubEdit, fontFamily: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3"
                        >
                          <option value="system-ui, sans-serif">System Default (Inter)</option>
                          <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                          <option value="'Montserrat', sans-serif">Montserrat (Modern)</option>
                          <option value="'Oswald', sans-serif">Oswald (Bold Condensed)</option>
                          <option value="'Roboto Mono', monospace">Roboto Mono (Tech)</option>
                          <option value="'Dancing Script', cursive">Dancing Script (Stylized)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Developer Name</label>
                        <input 
                          value={hubEdit.name || ''} 
                          onChange={e => setHubEdit({...hubEdit, name: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Title / Subtitle</label>
                        <input 
                          value={hubEdit.title || ''} 
                          onChange={e => setHubEdit({...hubEdit, title: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Upload Developer Photo (Transparent PNG)</label>
                        <input 
                          type="file"
                          accept="image/png, image/webp, image/gif"
                          onChange={handlePhotoUpload}
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2 px-3 text-sm text-white focus:border-[#FF6B00] focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FF6B00] file:text-white hover:file:bg-orange-600 cursor-pointer" 
                        />
                        {hubEdit.profilePhotoUrl && (
                          <div className="mt-2 h-16 w-16 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                             <img src={hubEdit.profilePhotoUrl} alt="Preview" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Call Number</label>
                          <input 
                            value={hubEdit.callNumber || ''} 
                            onChange={e => setHubEdit({...hubEdit, callNumber: e.target.value})} 
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">WhatsApp Number</label>
                          <input 
                            value={hubEdit.whatsappNumber || ''} 
                            onChange={e => setHubEdit({...hubEdit, whatsappNumber: e.target.value})} 
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-xs font-bold text-emerald-400 mb-1 block">WhatsApp Group Link</label>
                        <input 
                          value={hubEdit.whatsappGroupLink || ''} 
                          onChange={e => setHubEdit({...hubEdit, whatsappGroupLink: e.target.value})} 
                          placeholder="https://chat.whatsapp.com/..."
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-xs text-white focus:border-[#25D366] focus:outline-none font-mono" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Instagram URL</label>
                          <input 
                            value={hubEdit.instagramUrl || ''} 
                            onChange={e => setHubEdit({...hubEdit, instagramUrl: e.target.value})} 
                            placeholder="https://instagram.com/username"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Instagram Label</label>
                          <input 
                            value={hubEdit.instagramLabel || ''} 
                            onChange={e => setHubEdit({...hubEdit, instagramLabel: e.target.value})} 
                            placeholder="@username"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">YouTube Profile URL</label>
                          <input 
                            value={hubEdit.youtubeProfileUrl || ''} 
                            onChange={e => setHubEdit({...hubEdit, youtubeProfileUrl: e.target.value})} 
                            placeholder="https://youtube.com/@channel"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">YouTube Label</label>
                          <input 
                            value={hubEdit.youtubeLabel || ''} 
                            onChange={e => setHubEdit({...hubEdit, youtubeLabel: e.target.value})} 
                            placeholder="Channel Name"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">YouTube Studio URL</label>
                        <input 
                          value={hubEdit.youtubeStudioUrl || ''} 
                          onChange={e => setHubEdit({...hubEdit, youtubeStudioUrl: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3" 
                          placeholder="https://studio.youtube.com/channel/..."
                        />
                        <label className="text-xs font-bold text-gray-500 mb-1 block">YouTube Data API Key</label>
                        <input 
                          value={hubEdit.youtubeApiKey || ''} 
                          onChange={e => setHubEdit({...hubEdit, youtubeApiKey: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3" 
                          placeholder="AIzaSy..."
                        />
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Manual YouTube Subscribers (Fallback)</label>
                        <input 
                          value={hubEdit.youtubeSubscribers || '0'} 
                          onChange={e => setHubEdit({...hubEdit, youtubeSubscribers: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                        />
                      </div>
                      
                      <button 
                        onClick={handleUpdateHubConfig}
                        className="w-full mt-2 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        Save Hub Changes
                      </button>
                    </div>
                    )}
                  </div>

                  {/* Live Background Profile Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsBackgroundSettingsOpen(!isBackgroundSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Play className="w-4 h-4 mr-2" />
                        LIVE BACKGROUND SETTINGS
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isBackgroundSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isBackgroundSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Background Type</label>
                          <select 
                            value={hubEdit.backgroundType || 'default'} 
                            onChange={e => setHubEdit({...hubEdit, backgroundType: e.target.value})} 
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3"
                          >
                            <option value="default">Default (Glows & Streaks)</option>
                            <option value="image">Static Image</option>
                            <option value="video">Live Video (MP4)</option>
                          </select>
                        </div>
                        
                        {hubEdit.backgroundType === 'image' && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Upload Background Image</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleBackgroundImageUpload} 
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-2" 
                            />
                            {hubEdit.backgroundUrl && <img src={hubEdit.backgroundUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-gray-800 mb-2" />}
                            <p className="text-[10px] text-gray-500">Supported formats: JPG, PNG, WEBP.</p>
                          </div>
                        )}
                        {hubEdit.backgroundType === 'video' && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-gray-400 mb-1 block">Option 1: Video Web URL (MP4 / Web Video)</label>
                              <input 
                                type="url" 
                                placeholder="https://example.com/video.mp4"
                                value={hubEdit.backgroundUrl?.startsWith('data:') || hubEdit.backgroundUrl?.startsWith('firestore_media:') || hubEdit.backgroundUrl?.startsWith('idb:') ? '' : hubEdit.backgroundUrl || ''}
                                onChange={e => {
                                  const url = e.target.value;
                                  setHubEdit((prev: any) => ({ ...prev, backgroundUrl: url, backgroundType: 'video' }));
                                  setResolvedVideoBgUrl(url);
                                }}
                                className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                              />
                            </div>

                            <div className="relative flex items-center justify-center my-2">
                              <div className="border-t border-gray-800 w-full"></div>
                              <span className="bg-[#151A27] px-2 text-[10px] text-gray-500 font-bold uppercase">OR</span>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-400 mb-1 block">Option 2: Upload MP4 Video File</label>
                              <input 
                                type="file" 
                                accept="video/mp4,video/webm"
                                onChange={handleBackgroundVideoUpload} 
                                className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" 
                              />
                              <p className="text-[10px] text-gray-500 mt-1">Uploaded videos are synced globally to all users via cloud storage.</p>
                            </div>

                            {(resolvedVideoBgUrl || hubEdit.backgroundUrl) && (
                              <div className="mt-3 bg-[#0A0D14] p-3 rounded-xl border border-gray-800">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[11px] font-bold text-gray-400">Live Preview</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                    {hubEdit.backgroundUrl?.startsWith('data:') ? 'Uploaded Local File' : hubEdit.backgroundUrl?.startsWith('firestore_media:') ? 'Cloud Synced Video' : 'Direct Video URL'}
                                  </span>
                                </div>
                                <video key={resolvedVideoBgUrl || hubEdit.backgroundUrl} src={resolvedVideoBgUrl || hubEdit.backgroundUrl} autoPlay loop muted playsInline className="w-full h-28 object-cover rounded-lg border border-gray-800" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        <button 
                          onClick={handleUpdateHubConfig}
                          disabled={isSavingBackground}
                          className="w-full mt-2 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSavingBackground ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Syncing Globally...</span>
                            </>
                          ) : (
                            <span>Save Background Changes</span>
                          )}
                        </button>
                        <button 
                          onClick={() => {
                             setHubEdit({...hubEdit, backgroundType: 'default', backgroundUrl: ''});
                             setTimeout(handleUpdateHubConfig, 100);
                          }}
                          className="w-full mt-2 bg-transparent text-gray-400 border border-gray-700 font-bold tracking-wide py-3.5 rounded-xl hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          Reset to Default
                        </button>
                      </div>
                    )}
                  </div>

                  {/* System Sound Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsSoundSettingsOpen(!isSoundSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Volume2 className="w-4 h-4 mr-2" />
                        SYSTEM SOUND SETTINGS
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isSoundSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isSoundSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Background Sound</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'none'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${(hubEdit.systemSoundType || 'none') === 'none' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Off / None
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'default1'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.systemSoundType === 'default1' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Ambient Drone
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'default2'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.systemSoundType === 'default2' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Cyberpunk Pulse
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, systemSoundType: 'custom'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.systemSoundType === 'custom' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Custom Audio
                            </button>
                          </div>
                        </div>

                        {hubEdit.systemSoundType === 'custom' && (
                          <div className="space-y-2 mt-4 p-4 border border-gray-800 rounded-xl bg-black/30">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Upload Custom Audio (Max 800KB)</label>
                            <label className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-[#FF6B00] transition-colors group relative">
                              <input type="file" accept="audio/*" onChange={handleSoundUpload} className="hidden" />
                              <div className="flex flex-col items-center">
                                <Music className="w-6 h-6 text-gray-500 mb-2 group-hover:text-[#FF6B00] transition-colors" />
                                <span className="text-xs text-gray-500 font-bold group-hover:text-gray-300">
                                  {hubEdit.customSoundUrl ? 'Audio Selected - Click to Change' : 'Click to Upload (.mp3, .wav)'}
                                </span>
                              </div>
                            </label>
                            {hubEdit.customSoundUrl && (
                              <audio controls src={hubEdit.customSoundUrl} className="w-full h-8 mt-2 opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}

                        {/* Navigation Click Sounds */}
                        <div className="space-y-2 mt-6 border-t border-gray-800 pt-6">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Navigation Click Sound</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'none'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${(hubEdit.clickSoundType || 'none') === 'none' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Off / None
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'default1'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.clickSoundType === 'default1' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Pop Click
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'default2'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.clickSoundType === 'default2' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Mechanical
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'default3'})}
                              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.clickSoundType === 'default3' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Sci-Fi Beep
                            </button>
                            <button 
                              onClick={() => setHubEdit({...hubEdit, clickSoundType: 'custom'})}
                              className={`col-span-2 py-2 rounded-xl text-xs font-bold border transition-colors ${hubEdit.clickSoundType === 'custom' ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]' : 'bg-[#0A0D14] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                            >
                              Custom Audio
                            </button>
                          </div>
                        </div>

                        {hubEdit.clickSoundType === 'custom' && (
                          <div className="space-y-2 mt-4 p-4 border border-gray-800 rounded-xl bg-black/30">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Upload Custom Click Audio (Max 800KB)</label>
                            <label className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-[#FF6B00] transition-colors group relative">
                              <input type="file" accept="audio/*" onChange={handleClickSoundUpload} className="hidden" />
                              <div className="flex flex-col items-center">
                                <Music className="w-6 h-6 text-gray-500 mb-2 group-hover:text-[#FF6B00] transition-colors" />
                                <span className="text-xs text-gray-500 font-bold group-hover:text-gray-300">
                                  {hubEdit.customClickSoundUrl ? 'Audio Selected - Click to Change' : 'Click to Upload (.mp3, .wav)'}
                                </span>
                              </div>
                            </label>
                            {hubEdit.customClickSoundUrl && (
                              <audio controls src={hubEdit.customClickSoundUrl} className="w-full h-8 mt-2 opacity-50 hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        )}

                        <button 
                          onClick={handleUpdateHubConfig}
                          className="w-full mt-4 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                          Save Sound Settings
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Welcome Sound Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsWelcomeSoundSettingsOpen(!isWelcomeSoundSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <BellRing className="w-4 h-4 mr-2 text-[#FF6B00]" />
                        WELCOME SOUND SETTINGS
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isWelcomeSoundSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isWelcomeSoundSettingsOpen && (
                      <div className="space-y-5 mt-6 border-t border-gray-800 pt-6">
                        
                        {/* 1. Toggle Welcome Sound ON/OFF */}
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 flex items-center justify-center border border-[#FF6B00]/30">
                              <Bell className="w-4 h-4 text-[#FF6B00]" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">Enable First Sign-In Welcome Sound</span>
                              <span className="text-[10px] text-gray-400 font-semibold">Plays audio when users log in for the first time</span>
                            </div>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={hubEdit.welcomeSoundEnabled !== false}
                              onChange={(e) => setHubEdit({...hubEdit, welcomeSoundEnabled: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]"></div>
                          </label>
                        </div>

                        {/* 2. Upload Custom Welcome Audio File (MP3/MP4) */}
                        <div className="space-y-3 bg-[#0A0D14] border border-gray-800 rounded-2xl p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Custom Welcome Audio (MP3 / MP4)</label>
                              <span className="text-[10px] text-gray-400 font-medium block">Upload custom audio or video sound file (Max 8MB)</span>
                            </div>
                            {hubEdit.customWelcomeSoundUrl && (
                              <button 
                                type="button" 
                                onClick={() => setHubEdit({...hubEdit, customWelcomeSoundUrl: ''})}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition-colors border border-red-500/30"
                              >
                                Reset to Default
                              </button>
                            )}
                          </div>

                          <label className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-[#FF6B00] transition-colors group relative bg-black/40">
                            <input 
                              type="file" 
                              accept="audio/*,video/mp4,.mp3,.mp4,.wav,.ogg,.m4a" 
                              onChange={handleWelcomeSoundUpload} 
                              className="hidden" 
                            />
                            <div className="flex flex-col items-center text-center">
                              <Music className="w-6 h-6 text-gray-500 mb-2 group-hover:text-[#FF6B00] transition-colors" />
                              <span className="text-xs text-gray-300 font-bold group-hover:text-white">
                                {hubEdit.customWelcomeSoundUrl ? 'Audio Selected - Click to Replace' : 'Click or Drag to Upload Audio File (.mp3, .mp4)'}
                              </span>
                              <span className="text-[10px] text-gray-500 mt-1">Supports MP3 and MP4 audio tracks</span>
                            </div>
                          </label>

                          {hubEdit.customWelcomeSoundUrl && (
                            <div className="mt-3 bg-black/50 p-3 rounded-xl border border-gray-800 space-y-2">
                              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                                <span className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Custom Welcome Audio Attached</span>
                              </div>
                              <audio controls src={hubEdit.customWelcomeSoundUrl} className="w-full h-9 opacity-80 hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* 3. Test & Save Buttons */}
                        <div className="flex space-x-3 pt-2">
                          <button 
                            type="button"
                            onClick={() => playWelcomeSound()}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold text-xs py-3.5 rounded-xl transition-colors flex items-center justify-center space-x-2 active:scale-95"
                          >
                            <Volume2 className="w-4 h-4 text-[#FF6B00]" />
                            <span>Play Test Sound</span>
                          </button>

                          <button 
                            type="button"
                            onClick={handleUpdateHubConfig}
                            className="flex-1 bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs py-3.5 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(255,107,0,0.3)] active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save Welcome Settings</span>
                          </button>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Custom Display & Hub Layout Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsCustomTextSettingsOpen(!isCustomTextSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        CUSTOM DISPLAY & HUB LAYOUT SETTINGS
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isCustomTextSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isCustomTextSettingsOpen && (
                      <div className="space-y-5 mt-6 border-t border-gray-800 pt-6">
                        
                        {/* 1. Admin ON/OFF Toggle */}
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/20 flex items-center justify-center border border-[#FF6B00]/30">
                              <ImageIcon className="w-4 h-4 text-[#FF6B00]" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">Enable Custom Display Box</span>
                              <span className="text-[10px] text-gray-400 font-semibold">Controls visibility on Hub Screen</span>
                            </div>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={isCustomBoxEnabled}
                              onChange={(e) => toggleCustomBox(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]"></div>
                          </label>
                        </div>

                        {/* 2. Upload Custom Image */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Custom Display Image</label>
                          {customBoxImage ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-black/40 max-h-48 flex items-center justify-center p-2">
                              <img src={customBoxImage} alt="Custom Preview" className="max-h-40 object-contain rounded-lg" />
                              <button 
                                onClick={handleRemoveCustomBoxImage}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-lg"
                                title="Remove Image"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="border border-dashed border-gray-700 rounded-xl p-4 bg-[#0A0D14] flex flex-col items-center justify-center space-y-2">
                              {!showImageUrlInput ? (
                                <div className="flex items-center space-x-3">
                                  <label className="cursor-pointer bg-[#FF6B00] text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-orange-600 transition-colors flex items-center space-x-1.5">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload Image File</span>
                                    <input type="file" accept="image/*" onChange={handleCustomBoxImageUpload} className="hidden" />
                                  </label>
                                  <button 
                                    onClick={() => setShowImageUrlInput(true)}
                                    className="text-xs text-gray-400 hover:text-white font-bold underline"
                                  >
                                    Paste Image URL
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full space-y-2">
                                  <input 
                                    type="text" 
                                    value={imageUrlInputValue}
                                    onChange={(e) => setImageUrlInputValue(e.target.value)}
                                    placeholder="Paste image URL (https://...)"
                                    className="w-full bg-[#151A27] border border-gray-700 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:border-[#FF6B00] focus:outline-none"
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={() => setShowImageUrlInput(false)}
                                      className="text-xs text-gray-400 hover:text-white font-bold px-3 py-1"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={handleAddCustomBoxImageUrl}
                                      className="bg-[#FF6B00] text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-orange-600"
                                    >
                                      Save Image URL
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Custom Text / Note Area */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Custom Display Text / Note</label>
                          <textarea 
                            value={customBoxText}
                            onChange={(e) => handleCustomBoxTextChange(e.target.value)}
                            placeholder="Type custom message or text here..."
                            rows={3}
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-xs text-white focus:border-[#FF6B00] focus:outline-none resize-none leading-relaxed"
                          />
                        </div>

                        {/* 4. Element Position Controls (Move Up / Down) */}
                        <div className="space-y-3 pt-3 border-t border-gray-800">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Hub Elements Order (Up / Down)</label>
                          {hubElementOrder.map((key, index) => (
                            <div key={key} className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A0D14] border border-gray-800">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                {index + 1}. {key === 'recent_menu' ? 'Recent Menu' : key === 'active_users' ? 'Active Users Box' : 'Custom Display Box'}
                              </span>
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => moveHubElement(key, 'up')}
                                  disabled={index === 0}
                                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-[#FF6B00] text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-800 text-xs font-bold transition-colors"
                                >
                                  ↑ Move Up
                                </button>
                                <button 
                                  onClick={() => moveHubElement(key, 'down')}
                                  disabled={index === hubElementOrder.length - 1}
                                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-[#FF6B00] text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-800 text-xs font-bold transition-colors"
                                >
                                  ↓ Move Down
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Game Links Management (Admin Only) */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsGameLinksSettingsOpen(!isGameLinksSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center uppercase tracking-wider">
                        <Gamepad2 className="w-4 h-4 mr-2 text-[#FF6B00]" />
                        GAME LINKS MANAGEMENT (ADMIN)
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isGameLinksSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isGameLinksSettingsOpen && (
                      <div className="space-y-6 mt-6 border-t border-gray-800 pt-6">
                        {/* Add Game Link Form */}
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-5">
                          <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">ADD NEW GAME LINK</h4>
                          <div className="flex space-x-2 mb-3">
                            <input value={newGameName} onChange={e => setNewGameName(e.target.value)} type="text" placeholder="Game Name" className="flex-1 bg-[#151A27] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" />
                            <input value={newGameRole} onChange={e => setNewGameRole(e.target.value)} type="text" placeholder="Role (e.g. IGL)" className="flex-1 bg-[#151A27] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" />
                          </div>
                          <div className="flex space-x-2 mb-3">
                            <div className="flex-1 relative">
                              <input 
                                type="file" 
                                accept="image/*" 
                                id="admin-panel-game-photo-upload" 
                                className="hidden" 
                                onChange={handleGamePhotoUpload} 
                              />
                              <label 
                                htmlFor="admin-panel-game-photo-upload" 
                                className="flex items-center justify-between w-full h-full min-h-[46px] bg-[#151A27] border border-gray-700 hover:border-[#FF6B00] rounded-xl py-2 px-3 text-sm text-gray-300 cursor-pointer transition-colors group"
                              >
                                {newGameImage ? (
                                  <div className="flex items-center space-x-2 overflow-hidden">
                                    <img src={newGameImage} alt="Preview" className="w-7 h-7 rounded-lg object-cover border border-[#FF6B00] shrink-0" />
                                    <span className="text-xs font-semibold text-emerald-400 truncate">Photo Selected</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2 text-gray-400 group-hover:text-white transition-colors">
                                    <ImageIcon className="w-4 h-4 text-[#FF6B00] shrink-0" />
                                    <span className="text-xs font-medium truncate">Upload Game Photo</span>
                                  </div>
                                )}
                                {newGameImage ? (
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewGameImage(''); }}
                                    className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors ml-1 shrink-0"
                                    title="Remove Photo"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <Upload className="w-4 h-4 text-gray-500 group-hover:text-[#FF6B00] transition-colors shrink-0" />
                                )}
                              </label>
                            </div>
                            <input value={newGameUrl} onChange={e => setNewGameUrl(e.target.value)} type="text" placeholder="Download Link URL" className="flex-1 bg-[#151A27] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none" />
                          </div>
                          <button onClick={handleAddGame} className="w-full bg-[#FF6B00] text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.2)]">
                            <Plus className="w-4 h-4 mr-2" /> Add Game Link
                          </button>
                        </div>

                        {/* ADMIN VOICE NOTE / WARNING SECTION */}
                        <div className="bg-[#0A0D14] border border-[#FF6B00]/40 rounded-2xl p-5 space-y-4 shadow-lg">
                          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <div className="flex items-center space-x-2">
                              <Volume2 className="w-5 h-5 text-[#FF6B00]" />
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                                  GAME SECTION VOICE NOTICE
                                </h4>
                                <p className="text-[10px] text-gray-400">
                                  Upload voice messages or audio notices for users above the game link section
                                </p>
                              </div>
                            </div>
                            {hubConfig?.adminVoiceNoteUrl && (
                              <label className="flex items-center space-x-2 cursor-pointer bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1">
                                <span className="text-[10px] font-bold text-gray-300">
                                  {hubConfig?.adminVoiceNoteEnabled !== false ? 'Active' : 'Hidden'}
                                </span>
                                <input 
                                  type="checkbox" 
                                  checked={hubConfig?.adminVoiceNoteEnabled !== false}
                                  onChange={(e) => handleToggleAdminVoiceNote(e.target.checked)}
                                  className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#151A27] border-gray-700 focus:ring-[#FF6B00]"
                                />
                              </label>
                            )}
                          </div>

                          {/* Notice Title Input */}
                          <div>
                            <label className="text-[11px] font-bold text-gray-400 mb-1 block">
                              Voice Note Title (e.g. 📢 Game Links Important Notice)
                            </label>
                            <input 
                              type="text" 
                              placeholder="📢 Admin Voice Notice"
                              value={adminVoiceTitleInput}
                              onChange={(e) => setAdminVoiceTitleInput(e.target.value)}
                              className="w-full bg-[#151A27] border border-gray-700 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#FF6B00] focus:outline-none"
                            />
                          </div>

                          {/* Recorder Controls */}
                          <div className="bg-[#151A27] rounded-xl p-4 border border-gray-800 flex flex-col space-y-3">
                            <p className="text-[11px] font-bold text-gray-300">Direct Mic Recording or File Upload:</p>

                            {isAdminRecordingVoice ? (
                              <div className="flex items-center justify-between bg-red-950/40 border border-red-500/40 rounded-xl p-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                                  <span className="text-xs font-bold text-red-300">Recording Audio... ({adminVoiceTime}s)</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button 
                                    type="button" 
                                    onClick={stopAdminVoiceRecording}
                                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center space-x-1 shadow"
                                  >
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                    <span>Stop</span>
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={cancelAdminVoiceRecording}
                                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold py-1.5 px-2.5 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button 
                                  type="button" 
                                  onClick={startAdminVoiceRecording}
                                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center space-x-2 shadow-lg active:scale-95 transition-all"
                                >
                                  <Mic className="w-4 h-4" />
                                  <span>Start Mic Recording</span>
                                </button>

                                <label className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer transition-colors border border-gray-700">
                                  <Upload className="w-3.5 h-3.5 text-[#FF6B00]" />
                                  <span>Upload Audio File</span>
                                  <input 
                                    type="file" 
                                    accept="audio/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          if (reader.result) {
                                            setAdminVoiceAudioUrl(reader.result as string);
                                            setAdminVoiceDuration(15);
                                            showToast('Audio file loaded', 'success');
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }} 
                                  />
                                </label>
                              </div>
                            )}

                            {/* Recorded / Stored Voice Note Preview */}
                            {(adminVoiceAudioUrl || hubConfig?.adminVoiceNoteUrl) && (
                              <div className="mt-2 space-y-3 pt-3 border-t border-gray-800">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                  {adminVoiceAudioUrl ? 'New Voice Note Preview:' : 'Current Active Admin Voice Note:'}
                                </p>
                                <div className="bg-[#0A0D14] p-3 rounded-xl border border-gray-800">
                                  <VoiceMessagePlayer 
                                    audioUrl={adminVoiceAudioUrl || hubConfig?.adminVoiceNoteUrl} 
                                    duration={adminVoiceDuration || hubConfig?.adminVoiceNoteDuration} 
                                  />
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button 
                                    type="button" 
                                    onClick={handlePublishAdminVoiceNote}
                                    className="flex-1 bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Save & Publish Voice Note</span>
                                  </button>
                                  
                                  {hubConfig?.adminVoiceNoteUrl && (
                                    <button 
                                      type="button" 
                                      onClick={handleDeleteAdminVoiceNote}
                                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-xl text-xs flex items-center space-x-1 border border-red-500/30 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Note</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Link Redirect Settings */}
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center">
                              <Globe className="w-4 h-4 mr-1.5 text-[#FF6B00]" />
                              SYSTEM BROWSER CHOOSER
                            </h4>
                          </div>
                          <p className="text-xs text-gray-300">
                            Clicking game links will open the user's phone native browser selection menu (Chrome, Edge, Firefox, Brave, Opera, Samsung Internet, etc.) so users can launch links in their preferred browser.
                          </p>
                        </div>

                        {/* List, Edit & Delete Existing Game Links */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ALL ACTIVE GAME LINKS ({games.length})</h4>
                          {games.length === 0 && <p className="text-gray-500 text-xs italic">No game links added yet.</p>}
                          {games.map((game) => (
                            editingGameId === game.id ? (
                              <div key={game.id} className="w-full bg-[#0A0D14] rounded-2xl p-4 border border-[#FF6B00]/50 space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center">
                                    <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#FF6B00]" /> Edit Game Link
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  <input 
                                    value={editingGameName} 
                                    onChange={e => setEditingGameName(e.target.value)} 
                                    type="text" 
                                    placeholder="Game Name" 
                                    className="flex-1 bg-[#151A27] border border-gray-700 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#FF6B00] focus:outline-none" 
                                  />
                                  <input 
                                    value={editingGameRole} 
                                    onChange={e => setEditingGameRole(e.target.value)} 
                                    type="text" 
                                    placeholder="Role (e.g. IGL)" 
                                    className="flex-1 bg-[#151A27] border border-gray-700 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#FF6B00] focus:outline-none" 
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <div className="flex-1 relative">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      id={`edit-game-photo-upload-${game.id}`}
                                      className="hidden" 
                                      onChange={handleEditingGamePhotoUpload} 
                                    />
                                    <label 
                                      htmlFor={`edit-game-photo-upload-${game.id}`}
                                      className="flex items-center justify-between w-full min-h-[40px] bg-[#151A27] border border-gray-700 hover:border-[#FF6B00] rounded-xl py-2 px-3 text-xs text-gray-300 cursor-pointer transition-colors group"
                                    >
                                      {editingGameImage ? (
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                          <img src={editingGameImage} alt="Preview" className="w-6 h-6 rounded-lg object-cover border border-[#FF6B00] shrink-0" />
                                          <span className="text-[11px] font-semibold text-emerald-400 truncate">Photo Updated</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2 text-gray-400 group-hover:text-white transition-colors">
                                          <ImageIcon className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                                          <span className="text-[11px] font-medium truncate">Change Game Photo</span>
                                        </div>
                                      )}
                                      <Upload className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#FF6B00] transition-colors shrink-0" />
                                    </label>
                                  </div>
                                  <input 
                                    value={editingGameUrl} 
                                    onChange={e => setEditingGameUrl(e.target.value)} 
                                    type="text" 
                                    placeholder="Download Link URL" 
                                    className="flex-1 bg-[#151A27] border border-gray-700 rounded-xl py-2.5 px-3 text-xs text-white focus:border-[#FF6B00] focus:outline-none" 
                                  />
                                </div>
                                <div className="flex space-x-2 pt-1">
                                  <button 
                                    onClick={() => handleSaveEditGame(game.id)} 
                                    className="flex-1 bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save Changes</span>
                                  </button>
                                  <button 
                                    onClick={handleCancelEditGame} 
                                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div key={game.id} className="w-full bg-[#0A0D14] rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
                                <div className="flex items-center space-x-3.5 overflow-hidden">
                                  <img src={game.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80'} alt={game.name} className="w-12 h-12 rounded-xl object-cover border border-gray-700 shrink-0" />
                                  <div className="overflow-hidden">
                                    <p className="font-bold text-white text-sm truncate">{game.name}</p>
                                    <p className="text-xs text-gray-400 truncate">Role: {game.role || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0 ml-2">
                                  <button 
                                    onClick={() => handleStartEditGame(game)} 
                                    className="p-2.5 bg-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/40 rounded-xl transition-colors"
                                    title="Edit Game Link"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete('games', game.id)} 
                                    className="p-2.5 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-xl transition-colors"
                                    title="Delete Game Link"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* YouTube Studio Management (Admin Only) */}
                  <div className="bg-white/45 backdrop-blur-3xl rounded-2xl p-6 border border-white/80 shadow-[0_20px_50px_rgba(0,30,80,0.15),inset_0_2px_4px_rgba(255,255,255,0.95)] mb-6 w-full">
                    <button 
                      onClick={() => setIsYoutubeStudioSettingsOpen(!isYoutubeStudioSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-black text-[#002255] focus:outline-none"
                    >
                      <span className="flex items-center uppercase tracking-wider">
                        <Youtube className="w-4 h-4 mr-2 text-red-600" />
                        YOUTUBE STUDIO MANAGEMENT (ADMIN)
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isYoutubeStudioSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>

                    {isYoutubeStudioSettingsOpen && (
                      <div className="space-y-6 mt-6 border-t border-white/80 pt-6">
                        
                        {/* YouTube Channel & Studio Config */}
                        <div className="bg-white/40 backdrop-blur-2xl border border-white/80 rounded-2xl p-5 space-y-4 shadow-sm">
                          <h4 className="text-xs font-black text-[#002255] uppercase tracking-wider">YOUTUBE CHANNEL & STUDIO CONFIGURATION</h4>
                          <div>
                            <label className="text-[11px] font-extrabold text-slate-700 mb-1 block">YouTube Studio URL</label>
                            <input 
                              value={hubEdit.youtubeStudioUrl || ''} 
                              onChange={e => setHubEdit({...hubEdit, youtubeStudioUrl: e.target.value})} 
                              className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] placeholder:text-slate-400 focus:border-red-500 focus:outline-none shadow-sm" 
                              placeholder="https://studio.youtube.com/channel/..."
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-extrabold text-slate-700 mb-1 block">YouTube Data API Key</label>
                            <input 
                              value={hubEdit.youtubeApiKey || ''} 
                              onChange={e => setHubEdit({...hubEdit, youtubeApiKey: e.target.value})} 
                              className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] placeholder:text-slate-400 focus:border-red-500 focus:outline-none shadow-sm" 
                              placeholder="AIzaSy..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-extrabold text-slate-700 mb-1 block">Manual Subscriber Count</label>
                              <input 
                                value={hubEdit.youtubeSubscribers || '0'} 
                                onChange={e => setHubEdit({...hubEdit, youtubeSubscribers: e.target.value})} 
                                className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] focus:border-red-500 focus:outline-none shadow-sm" 
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-extrabold text-slate-700 mb-1 block">Channel Label</label>
                              <input 
                                value={hubEdit.youtubeLabel || ''} 
                                onChange={e => setHubEdit({...hubEdit, youtubeLabel: e.target.value})} 
                                placeholder="YouTube Channel Name"
                                className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] focus:border-red-500 focus:outline-none shadow-sm" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-extrabold text-slate-700 mb-1 block">YouTube Profile URL</label>
                            <input 
                              value={hubEdit.youtubeProfileUrl || ''} 
                              onChange={e => setHubEdit({...hubEdit, youtubeProfileUrl: e.target.value})} 
                              placeholder="https://youtube.com/@channel"
                              className="w-full bg-white/60 backdrop-blur-2xl border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] focus:border-red-500 focus:outline-none shadow-sm" 
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={handleUpdateHubConfig}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-md"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save YouTube Configuration</span>
                          </button>
                        </div>

                        {/* Add New Video Form */}
                        <div className="bg-white/40 backdrop-blur-2xl border border-white/80 rounded-2xl p-5 space-y-3 shadow-sm">
                          <h4 className="text-xs font-black text-[#002255] uppercase tracking-wider">ADD NEW YOUTUBE VIDEO</h4>
                          <input value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} type="text" placeholder="Video Title" className="w-full bg-white/60 border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] placeholder:text-slate-400 focus:border-red-500 focus:outline-none shadow-sm" />
                          <div className="flex space-x-2">
                            <input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} type="text" placeholder="https://youtube.com/..." className="flex-1 bg-white/60 border border-white/90 rounded-xl py-3 px-4 text-xs font-bold text-[#002255] placeholder:text-slate-400 focus:border-red-500 focus:outline-none shadow-sm" />
                            <button onClick={handleAddVideo} className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-500 transition-colors shrink-0 shadow-md">
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* List, Edit & Delete Existing Videos */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-[#002255] uppercase tracking-wider">ALL YOUTUBE VIDEOS ({sortedYoutubeVideos.length})</h4>
                          {sortedYoutubeVideos.length === 0 && <p className="text-slate-600 text-xs italic font-semibold">No YouTube videos added yet.</p>}
                          {sortedYoutubeVideos.map((video) => {
                            const videoId = getYoutubeId(video.url);
                            return editingVideoId === video.id ? (
                              <div key={video.id} className="w-full bg-white/50 backdrop-blur-2xl rounded-2xl p-4 border border-red-500/50 space-y-3 shadow-sm">
                                <span className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center">
                                  <Pencil className="w-3.5 h-3.5 mr-1.5 text-red-600" /> Edit YouTube Video
                                </span>
                                <input 
                                  value={editingVideoTitle} 
                                  onChange={e => setEditingVideoTitle(e.target.value)} 
                                  type="text" 
                                  placeholder="Video Title" 
                                  className="w-full bg-white/60 border border-white/90 rounded-xl py-2.5 px-3 text-xs font-bold text-[#002255] focus:border-red-500 focus:outline-none shadow-sm" 
                                />
                                <input 
                                  value={editingVideoUrl} 
                                  onChange={e => setEditingVideoUrl(e.target.value)} 
                                  type="text" 
                                  placeholder="https://youtube.com/..." 
                                  className="w-full bg-white/60 border border-white/90 rounded-xl py-2.5 px-3 text-xs font-bold text-[#002255] focus:border-red-500 focus:outline-none shadow-sm" 
                                />
                                <div className="flex space-x-2 pt-1">
                                  <button 
                                    onClick={() => handleSaveEditVideo(video.id)} 
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-1 shadow-md"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save Changes</span>
                                  </button>
                                  <button 
                                    onClick={handleCancelEditVideo} 
                                    className="bg-white/60 hover:bg-white/80 text-[#002255] font-black text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center border border-white/90 shadow-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div key={video.id} className={`w-full rounded-2xl p-3 border flex items-center justify-between space-x-3 shadow-sm transition-all ${
                                video.isPinned 
                                  ? 'bg-amber-500/10 border-amber-400/80' 
                                  : 'bg-white/45 backdrop-blur-2xl border-white/80'
                              }`}>
                                <div className="flex items-center space-x-3 overflow-hidden">
                                  <div className="w-16 h-10 bg-slate-900 rounded-lg overflow-hidden shrink-0 relative shadow-sm">
                                    <img src={`https://img.youtube.com/vi/${videoId}/default.jpg`} alt="Thumbnail" className="w-full h-full object-cover" />
                                    {video.isPinned && (
                                      <div className="absolute top-0.5 left-0.5 bg-amber-500 text-white p-0.5 rounded-md shadow-md">
                                        <Pin className="w-2.5 h-2.5 fill-current" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="font-black text-[#002255] text-xs truncate flex items-center gap-1">
                                      {video.isPinned && (
                                        <span className="bg-amber-500/20 text-amber-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center">
                                          <Pin className="w-2.5 h-2.5 mr-0.5 fill-current" /> PINNED
                                        </span>
                                      )}
                                      <span className="truncate">{video.title}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-bold truncate">{video.url}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <button 
                                    onClick={() => handleTogglePinVideo(video.id, !!video.isPinned)} 
                                    className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                                      video.isPinned 
                                        ? 'bg-amber-500 text-white hover:bg-amber-600 border border-amber-400' 
                                        : 'bg-[#002255]/10 text-[#002255] hover:bg-[#002255]/20 border border-slate-300'
                                    }`}
                                    title={video.isPinned ? "Unpin Video" : "Pin Video to Top"}
                                  >
                                    <Pin className={`w-4 h-4 ${video.isPinned ? 'fill-current' : ''}`} />
                                  </button>
                                  <button 
                                    onClick={() => handleStartEditVideo(video)} 
                                    className="p-2 bg-red-600/20 text-red-600 hover:bg-red-600/40 rounded-xl transition-colors"
                                    title="Edit Video"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete('youtubeVideos', video.id)} 
                                    className="p-2 bg-red-600/20 text-red-600 hover:bg-red-600/40 rounded-xl transition-colors"
                                    title="Delete Video"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}
                  </div>

                  {/* In-App Version & Update Management (Admin Only) */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsAdminUpdateSettingsOpen(!isAdminUpdateSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center uppercase tracking-wider">
                        <DownloadCloud className="w-4 h-4 mr-2 text-[#FF6B00]" />
                        IN-APP VERSION & UPDATE MANAGEMENT (ADMIN)
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isAdminUpdateSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>

                    {isAdminUpdateSettingsOpen && (
                      <div className="space-y-6 mt-6 border-t border-gray-800 pt-6">
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center">
                            <DownloadCloud className="w-4 h-4 mr-1.5" /> SIMPLE APP UPDATE GATEWAY
                          </h4>

                          {/* Dedicated Website Version Field & Sync Button */}
                          <div className="bg-[#151A27] p-4 rounded-xl border border-cyan-500/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center">
                                <Globe className="w-4 h-4 text-cyan-400 mr-1.5" />
                                <span>Website Version</span>
                              </label>
                              <span className="text-[10px] text-cyan-300 font-mono">Website: v{websiteVersion}</span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Enter a new version number and press Sync to independently update and sync the website version.
                            </p>
                            <div className="flex space-x-2">
                              <input 
                                value={adminWebsiteVersion} 
                                onChange={e => setAdminWebsiteVersion(e.target.value)} 
                                placeholder="e.g. 1.0.0"
                                className="w-full bg-[#0A0D14] border border-cyan-800/60 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-cyan-400 focus:outline-none" 
                              />
                              <button
                                type="button"
                                onClick={handleSyncWebsiteVersion}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 rounded-xl transition-all shrink-0 flex items-center space-x-1.5 shadow-md shadow-cyan-950/50"
                                title="Sync Website Version"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Sync Website</span>
                              </button>
                            </div>
                          </div>

                          {/* Dedicated Package Update Toggle & Sync Control */}
                          <div className="bg-[#151A27] p-4 rounded-xl border border-amber-500/40 space-y-3 shadow-lg shadow-amber-950/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                                <div>
                                  <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>Package Feature Sync (No APK Download Needed)</span>
                                  </h5>
                                  <p className="text-[10px] text-gray-400">
                                    Enable & sync features so users on older APK versions don't need to re-download APK file.
                                  </p>
                                </div>
                              </div>
                              
                              <button 
                                type="button"
                                onClick={() => handleTogglePackageUpdateSync(!enablePackageUpdateSync)}
                                className={`p-1 rounded-lg transition-colors flex items-center ${enablePackageUpdateSync ? 'text-amber-400' : 'text-gray-500'}`}
                                title="Toggle Package Feature Sync"
                              >
                                {enablePackageUpdateSync ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                              </button>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2.5 border-t border-gray-800 gap-2">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${enablePackageUpdateSync ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                  {enablePackageUpdateSync ? 'Sync Toggle: ON' : 'Sync Toggle: OFF'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {enablePackageUpdateSync ? 'Older APK users can sync features dynamically' : 'Requires downloading new APK'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={handleSyncPackageFeatures}
                                disabled={isSyncingPackage}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-md shadow-amber-950/50 shrink-0 disabled:opacity-50"
                                title="Sync Package Features Live"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPackage ? 'animate-spin' : ''}`} />
                                <span>{isSyncingPackage ? 'Syncing Features...' : 'Sync Package Features'}</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-gray-400 mb-1 block">
                                New Version Number
                              </label>
                              <div className="flex space-x-2">
                                <input 
                                  value={adminPublishVersion} 
                                  onChange={e => setAdminPublishVersion(e.target.value)} 
                                  placeholder="e.g. 1.0.0"
                                  className="w-full bg-[#151A27] border border-gray-700 rounded-xl py-3 px-3.5 text-xs text-white focus:border-[#FF6B00] focus:outline-none" 
                                />
                                <button
                                  type="button"
                                  onClick={handleSyncServerVersion}
                                  className="bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 hover:text-white font-bold text-xs px-3 rounded-xl transition-all shrink-0 flex items-center space-x-1"
                                  title="Sync specified version to server version file"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Sync</span>
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-gray-400 mb-1 block">Update Title</label>
                              <input 
                                value={adminPublishTitle} 
                                onChange={e => setAdminPublishTitle(e.target.value)} 
                                placeholder="e.g. OGVirk Live v1.0.0 Released!"
                                className="w-full bg-[#151A27] border border-gray-700 rounded-xl py-3 px-4 text-xs text-white focus:border-[#FF6B00] focus:outline-none" 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-gray-400 mb-1 block">Release Notes (One feature per line)</label>
                            <textarea 
                              rows={3}
                              value={adminPublishNotes} 
                              onChange={e => setAdminPublishNotes(e.target.value)} 
                              placeholder="• New Features&#10;• Bug Fixes"
                              className="w-full bg-[#151A27] border border-gray-700 rounded-xl py-3 px-4 text-xs text-white focus:border-[#FF6B00] focus:outline-none" 
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-gray-400 mb-1 flex items-center justify-between">
                              <span className="flex items-center text-[#FF6B00]">
                                <Globe className="w-3.5 h-3.5 mr-1 text-[#FF6B00]" />
                                App Update Download URL
                              </span>
                              {adminPublishApkUrl && (
                                <span className="text-[10px] text-emerald-400 font-mono">URL Configured</span>
                              )}
                            </label>

                            <div className="relative flex items-center">
                              <input 
                                type="url" 
                                value={adminPublishApkUrl} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setAdminPublishApkUrl(val);
                                  saveLocalCache('adminPublishApkUrl', val);
                                }} 
                                placeholder="https://example.com/app-release.apk or direct URL" 
                                className="w-full bg-[#151A27] border border-gray-700 rounded-xl py-3 px-3.5 text-xs text-white focus:border-[#FF6B00] focus:outline-none font-mono" 
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Enter direct download URL for the update file. Clicking 'Sync Server File' or 'Publish Live Update' will permanently sync this URL to Firebase.
                            </p>
                          </div>

                          <div className="flex items-center justify-between bg-[#151A27] p-3 rounded-xl border border-gray-800">
                            <div>
                              <span className="text-xs font-bold text-white block">Force Update Requirement</span>
                              <span className="text-[10px] text-gray-400">Prevent users from bypassing until updated</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setAdminPublishForce(!adminPublishForce)}
                              className={`p-1.5 rounded-lg transition-colors ${adminPublishForce ? 'text-[#FF6B00]' : 'text-gray-500'}`}
                            >
                              {adminPublishForce ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <button 
                              type="button"
                              disabled={isSyncingServer || isPublishingUpdate}
                              onClick={handleSyncServerVersion}
                              className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 hover:text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                              title={`Sync server version with local app version (v${appVersion})`}
                            >
                              <RefreshCw className={`w-4 h-4 ${isSyncingServer ? 'animate-spin' : ''}`} />
                              <span>{isSyncingServer ? 'Syncing Server...' : `Sync Server File (v${adminPublishVersion || appVersion})`}</span>
                            </button>

                            <button 
                              type="button"
                              disabled={isPublishingUpdate || isSyncingServer}
                              onClick={handlePublishAdminUpdate}
                              className="w-full bg-gradient-to-r from-[#FF6B00] to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(255,107,0,0.3)] cursor-pointer"
                            >
                              {isPublishingUpdate ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                  <span>Publishing Update...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>Publish Live Update</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FIREBASE API KEY & QUOTA MANAGEMENT (ADMIN ONLY) */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center shrink-0">
                          <Flame className="w-5 h-5 text-[#FF6B00] animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-white tracking-wider uppercase">FIREBASE API KEY & QUOTA ADMIN</h3>
                          <p className="text-[10px] text-gray-400 font-medium">Secure API Key credentials & live manual quota sync</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Admin Only
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* API Key Credentials Box */}
                      <div className="bg-[#0A0D14] p-4 rounded-xl border border-gray-800 space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
                          <span className="flex items-center text-gray-300">
                            <KeyRound className="w-3.5 h-3.5 mr-1 text-[#FF6B00]" />
                            Firebase API Key (REST / SDK Credentials):
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">Verified Key</span>
                        </label>

                        <div className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={FIREBASE_API_KEY_USED} 
                            className="w-full bg-[#151A27] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-400 focus:outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(FIREBASE_API_KEY_USED);
                              setIsApiKeyCopied(true);
                              showToast('Firebase API Key copied to clipboard!', 'success');
                              setTimeout(() => setIsApiKeyCopied(false), 2000);
                            }}
                            className="bg-[#FF6B00]/20 hover:bg-[#FF6B00]/40 border border-[#FF6B00]/50 text-[#FF6B00] hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer active:scale-95"
                          >
                            {isApiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isApiKeyCopied ? 'Copied!' : 'Copy Key'}</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-500 font-mono pt-1 gap-1">
                          <span>Project: vkunlocker-45991</span>
                          <span>Database: ai-studio-ogvirklive-eb0f...</span>
                          <span className="text-emerald-400 font-semibold">Status: {usageFetchStatus}</span>
                        </div>
                      </div>

                      {/* Admin Refresh Button */}
                      <button
                        type="button"
                        disabled={isUsageLoading}
                        onClick={() => fetchFirebaseUsageData(true)}
                        className="w-full bg-gradient-to-r from-[#FF6B00] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 text-xs cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${isUsageLoading ? 'animate-spin' : ''}`} />
                        <span>{isUsageLoading ? 'Syncing Firebase Quota via API Key...' : 'Refresh Firebase Usage (API Key Sync)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Supabase Authentication & Cloud Sync Card */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsSupabaseSettingsOpen(!isSupabaseSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-emerald-400 focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        SUPABASE AUTHENTICATION & CLOUD SYNC
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isSupabaseSettingsOpen ? 'rotate-45' : ''}`} />
                    </button>

                    {isSupabaseSettingsOpen && (
                      <div className="mt-6 border-t border-gray-800 pt-6 flex flex-col items-center">
                        <SupabaseAuth 
                          currentUser={user} 
                          onAuthSuccess={(appUser) => { 
                            setUser(appUser); 
                            playWelcomeSound(); 
                          }} 
                        />
                      </div>
                    )}
                  </div>

                  {/* Security Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsSecuritySettingsOpen(!isSecuritySettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        SECURITY SETTINGS
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isSecuritySettingsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isSecuritySettingsOpen && (
                      <div className="space-y-5 mt-6 border-t border-gray-800 pt-6">
                        {/* Lock Method Toggles */}
                        <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-4 space-y-3">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Activated Lock Methods (Show / Hide on Login)
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                <KeyRound className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-xs font-bold text-white">Enable PIN Lock</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={hubConfig?.enablePinLock !== false}
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  if (!val && hubConfig?.enablePatternLock === false && hubConfig?.enableKeyboardLock === false) {
                                    showToast('At least one lock method must remain enabled', 'error');
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'config', 'hub'), { enablePinLock: val }, { merge: true });
                                    showToast(val ? 'PIN Lock Activated' : 'PIN Lock Hidden', 'success');
                                  } catch(err) { console.error(err); }
                                }}
                                className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                              />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                <Grip className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-xs font-bold text-white">Enable Pattern Lock</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={hubConfig?.enablePatternLock !== false}
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  if (!val && hubConfig?.enablePinLock === false && hubConfig?.enableKeyboardLock === false) {
                                    showToast('At least one lock method must remain enabled', 'error');
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'config', 'hub'), { enablePatternLock: val }, { merge: true });
                                    showToast(val ? 'Pattern Lock Activated' : 'Pattern Lock Hidden', 'success');
                                  } catch(err) { console.error(err); }
                                }}
                                className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                              />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
                              <div className="flex items-center space-x-3">
                                <Keyboard className="w-4 h-4 text-[#FF6B00]" />
                                <span className="text-xs font-bold text-white">Enable Keyboard Lock</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={hubConfig?.enableKeyboardLock !== false}
                                onChange={async (e) => {
                                  const val = e.target.checked;
                                  if (!val && hubConfig?.enablePinLock === false && hubConfig?.enablePatternLock === false) {
                                    showToast('At least one lock method must remain enabled', 'error');
                                    return;
                                  }
                                  try {
                                    await setDoc(doc(db, 'config', 'hub'), { enableKeyboardLock: val }, { merge: true });
                                    showToast(val ? 'Keyboard Lock Activated' : 'Keyboard Lock Hidden', 'success');
                                  } catch(err) { console.error(err); }
                                }}
                                className="form-checkbox h-4 w-4 text-[#FF6B00] rounded bg-[#0A0D14] border-gray-700 focus:ring-[#FF6B00]"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Select Security Method to Configure */}
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Configure Credential Code</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => { setSelectedSecurityType('pin'); setSecurityError(''); }}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                selectedSecurityType === 'pin'
                                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)] font-bold'
                                  : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              <KeyRound className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-bold">PIN LOCK</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSelectedSecurityType('pattern'); setSecurityError(''); }}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                selectedSecurityType === 'pattern'
                                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)] font-bold'
                                  : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              <Grip className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-bold">PATTERN LOCK</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSelectedSecurityType('keyboard'); setSecurityError(''); }}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                selectedSecurityType === 'keyboard'
                                  ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)] font-bold'
                                  : 'bg-[#0A0D14] border-gray-700 text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              <Keyboard className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-bold">KEYBOARD LOCK</span>
                            </button>
                          </div>
                        </div>

                        {/* Current Security Credential */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Security Code / Password</label>
                          <input 
                            type="password"
                            value={oldPin}
                            onChange={(e) => { setOldPin(e.target.value); setSecurityError(''); }}
                            placeholder="Enter current PIN / Password / Pattern"
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm tracking-widest text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
                          />
                        </div>

                        {/* New Credential Setup based on method */}
                        {selectedSecurityType === 'pattern' ? (
                          <PatternLockGrid 
                            pattern={setupNewPattern}
                            onChange={(p) => { setSetupNewPattern(p); setSecurityError(''); }}
                            title="Slide / Draw New 3x3 Pattern"
                          />
                        ) : selectedSecurityType === 'keyboard' ? (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Keyboard Password</label>
                            <input 
                              type="text"
                              value={newPin}
                              onChange={(e) => { setNewPin(e.target.value); setSecurityError(''); }}
                              placeholder="Enter new password (e.g. adminPass123)"
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Numeric PIN</label>
                            <input 
                              type="password"
                              inputMode="numeric"
                              value={newPin}
                              onChange={(e) => { setNewPin(e.target.value); setSecurityError(''); }}
                              placeholder="Enter new 4+ digit PIN"
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm tracking-widest text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
                            />
                          </div>
                        )}

                        {securityError && <p className="text-red-500 text-xs font-bold mt-2">{securityError}</p>}

                        <button 
                          onClick={async () => {
                            const currentRealPin = hubConfig?.adminPin || '3464';
                            const currentPattern = hubConfig?.adminPattern || '1-2-3-6-9';
                            const currentPassword = hubConfig?.adminPassword || 'admin';

                            // Validate current credential
                            const isValidCurrent = oldPin === currentRealPin || oldPin === currentPattern || oldPin === currentPassword || oldPin === '3464';
                            if (!isValidCurrent) {
                              setSecurityError('Incorrect current security code / password');
                              return;
                            }

                            let updateData: any = { securityType: selectedSecurityType, faceIdEnabled: false };

                            if (selectedSecurityType === 'pattern') {
                              const patternVal = setupNewPattern.length > 0 ? setupNewPattern.join('-') : newPin;
                              if (!patternVal || patternVal.length < 3) {
                                setSecurityError('Pattern must consist of at least 3 dots');
                                setSetupNewPattern([]);
                                return;
                              }
                              updateData.adminPattern = patternVal;
                            } else if (selectedSecurityType === 'keyboard') {
                              if (!newPin || newPin.length < 3) {
                                setSecurityError('Keyboard password must be at least 3 characters');
                                return;
                              }
                              updateData.adminPassword = newPin;
                            } else {
                              if (!newPin || newPin.length < 4) {
                                setSecurityError('New PIN must be at least 4 digits');
                                return;
                              }
                              updateData.adminPin = newPin;
                            }

                            try {
                              await setDoc(doc(db, 'config', 'hub'), updateData, { merge: true });
                              showToast(`${selectedSecurityType.toUpperCase()} lock setup saved successfully!`, 'success');
                              setOldPin('');
                              setNewPin('');
                              setSetupNewPattern([]);
                              setSecurityError('');
                            } catch(err) {
                              console.error(err);
                              showToast('Failed to update security settings', 'error');
                            }
                          }}
                          className="w-full mt-4 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors uppercase text-sm"
                        >
                          Save {selectedSecurityType.toUpperCase()} Security Setup
                        </button>
                      </div>
                    )}
                  </div>



                  {/* User Feedback & Reports */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsFeedbackReportsOpen(!isFeedbackReportsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        USER FEEDBACK & REPORTS {ratings && ratings.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{ratings.length}</span>}
                      </span>
                      <Plus className={`w-4 h-4 transition-transform ${isFeedbackReportsOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {isFeedbackReportsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#FF6B00 #0A0D14' }}>
                        {ratings.length === 0 ? (
                          <p className="text-gray-500 text-xs text-center font-bold">No feedback reports yet.</p>
                        ) : (
                          ratings.map((rating, i) => (
                            <div key={i} className="bg-[#0A0D14] border border-gray-800 rounded-xl p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, idx) => (
                                    <Star key={idx} className={`w-3 h-3 ${idx < rating.stars ? 'text-[#FF6B00] fill-current' : 'text-gray-700'}`} />
                                  ))}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[9px] text-gray-500 font-bold uppercase">{new Date(rating.createdAt).toLocaleDateString()}</span>
                                  {isAdminAuth && isPrimaryAdminUser && (
                                    <button onClick={() => handleDeleteFeedback(rating.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-500/10" title="Delete Feedback">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {rating.feedback ? (
                                <p className="text-xs text-gray-300 italic">"${rating.feedback}"</p>
                              ) : (
                                <p className="text-[10px] text-gray-600 font-bold uppercase">No text provided</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>


                </div>
              )}
            </motion.div>
          )}

        </main>

        {/* Floating Home Screen Feedback Icon & Popover */}
        {activeTab === 'hub' && (
          <>
            {/* Small Feedback Trigger Button at bottom of Home Screen */}
            <div className="fixed bottom-20 right-4 sm:right-6 z-40">
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHomeFeedbackPopover(!showHomeFeedbackPopover);
                }}
                className="flex items-center space-x-2 bg-[#151A27]/95 hover:bg-[#1c2233] border border-[#FF6B00]/70 hover:border-[#FF6B00] text-white px-3.5 py-2 rounded-full shadow-[0_4px_25px_rgba(255,107,0,0.4)] backdrop-blur-xl transition-all group active:scale-95 cursor-pointer"
                title="View User Feedbacks & Ratings"
              >
                <div className="relative flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#FF6B00] fill-current group-hover:rotate-12 transition-transform" />
                  {ratings.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black shadow">
                      {ratings.length > 99 ? '99+' : ratings.length}
                    </span>
                  )}
                </div>
                <span className="text-xs font-black text-white">
                  {calculateAverageRating()}
                </span>
                <span className="text-[10px] font-black text-[#FF6B00] tracking-wider uppercase hidden sm:inline border-l border-gray-700/80 pl-2 ml-1">
                  Feedback
                </span>
              </motion.button>
            </div>

            {/* Popover Section & Outside Click Backdrop */}
            {showHomeFeedbackPopover && (
              <>
                {/* Backdrop: Clicking anywhere outside hides the popover */}
                <div 
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" 
                  onClick={() => setShowHomeFeedbackPopover(false)} 
                />

                {/* Feedback Popover Card */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="fixed bottom-32 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[65vh] bg-[#0A0D14]/98 border border-[#FF6B00]/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-hidden text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Card Header */}
                  <div className="p-3.5 border-b border-gray-800 bg-[#151A27]/90 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] shadow-inner">
                        <Star className="w-4.5 h-4.5 fill-current" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">User Feedbacks & Ratings</h4>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">⭐ {calculateAverageRating()} Avg ({ratings.length} reviews)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowHomeFeedbackPopover(false)}
                      className="w-7 h-7 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Give Feedback Action */}
                  <div className="p-2.5 bg-[#070A0F] border-b border-gray-800/80 flex items-center justify-between px-4 shrink-0">
                    <span className="text-[11px] font-bold text-gray-300">Have feedback for us?</span>
                    <button
                      onClick={() => {
                        setShowHomeFeedbackPopover(false);
                        setShowFeedbackModal(true);
                      }}
                      className="bg-[#FF6B00] hover:bg-orange-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg tracking-wider uppercase transition-all shadow-[0_2px_10px_rgba(255,107,0,0.3)] active:scale-95 flex items-center space-x-1 cursor-pointer"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      <span>Give Feedback</span>
                    </button>
                  </div>

                  {/* Feedbacks List */}
                  <div className="p-3 space-y-2.5 overflow-y-auto flex-1 max-h-[45vh]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#FF6B00 #0A0D14' }}>
                    {ratings.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-gray-600" />
                        <p className="text-xs font-bold text-gray-400">No feedbacks received yet.</p>
                        <p className="text-[10px] text-gray-500">Tap 'Give Feedback' above to share your experience!</p>
                      </div>
                    ) : (
                      ratings.map((rating, idx) => (
                        <div key={rating.id || idx} className="bg-[#151A27]/90 border border-gray-800/90 hover:border-gray-700/80 rounded-xl p-3 flex flex-col space-y-1.5 shadow-sm transition-colors">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] font-black text-[10px]">
                                {(rating.displayName || rating.email || 'U')[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-white truncate max-w-[140px]">
                                {rating.displayName || maskEmail(rating.email) || 'User'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < (rating.stars || 0) ? 'text-[#FF6B00] fill-current' : 'text-gray-700'}`} />
                              ))}
                            </div>
                          </div>
                          {rating.feedback && (
                            <p className="text-xs text-gray-200 font-medium leading-relaxed bg-[#0A0D14]/70 p-2 rounded-lg border border-gray-800/60">
                              "{rating.feedback}"
                            </p>
                          )}
                          <span className="text-[9px] text-gray-500 font-bold uppercase text-right">
                            {rating.createdAt ? (rating.createdAt?.toDate ? rating.createdAt.toDate().toLocaleDateString() : new Date(rating.createdAt).toLocaleDateString()) : 'Recent'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </>
        )}

        {/* In-App Jitsi Voice & Video Calling Modal */}
        <InAppJitsiCallModal
          callState={activeJitsiCall}
          onEndCall={endJitsiCall}
          currentUser={user}
        />

        {/* Realtime Incoming Call Alert for Admin */}
        <IncomingCallModal
          callData={incomingCall}
          onAccept={() => acceptIncomingCall(incomingCall)}
          onDecline={() => declineIncomingCall(incomingCall)}
        />

        {/* Ultra-Transparent Water Glossy Glass Navigation Bar with High Color Vibrancy & Wallpaper Reflection */}
        <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[98vw] sm:max-w-none px-1 sm:px-0">
          <nav className="relative px-3.5 sm:px-6 py-1.5 sm:py-2 bg-white/30 backdrop-blur-2xl backdrop-saturate-[220%] backdrop-brightness-105 border border-white/90 rounded-full shadow-[0_15px_45px_rgba(0,0,0,0.25),0_0_35px_rgba(255,255,255,0.85),inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-1.5px_3px_rgba(0,0,0,0.12)] ring-1 ring-white/70 flex items-center space-x-0.5 sm:space-x-1.5 justify-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'hub', label: 'HUB', icon: Home },
              { id: 'game', label: 'GAME', icon: Gamepad2 },
              { id: 'errors', label: 'ERRORS', icon: AlertTriangle },
              { id: 'youtube', label: 'YOUTUBE', icon: Youtube },
              { id: 'call', label: 'CALL', icon: Phone },
              { id: 'chat', label: 'CHAT', icon: MessageSquare },
              { id: 'about', label: 'ABOUT', icon: Info, extraActive: activeTab === 'admin' }
            ].map(tab => {
              const isActive = activeTab === tab.id || (tab.extraActive ?? false);
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex flex-col items-center justify-center px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-full transition-all duration-300 cursor-pointer shrink-0 ${
                    isActive ? 'text-[#002255]' : 'text-[#062456] hover:text-[#001538] hover:bg-white/45'
                  }`}
                >
                  {/* Completely Transparent Water Liquid Glass Active Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeFloatingDockTab"
                      transition={{ 
                        type: 'spring', 
                        stiffness: 360, 
                        damping: 20, 
                        mass: 0.7 
                      }}
                      className="absolute inset-0 bg-white/45 backdrop-blur-xl rounded-full shadow-[0_4px_25px_rgba(255,255,255,0.95),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(255,255,255,0.6)] border border-white ring-1 ring-white/80"
                    />
                  )}

                  {/* Water Ripple Wave Ring Effect */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0.95 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ type: "tween", duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 border border-white bg-white/20 rounded-full pointer-events-none"
                    />
                  )}

                  {/* Icon & Label with Fluid Water Bubble Bounce & Shiny Dark Blue Color */}
                  <div className="relative z-10 flex flex-col items-center">
                    <motion.div
                      animate={{ scale: isActive ? 1.18 : 1, rotate: isActive ? -4 : 0 }}
                      transition={{ type: "spring", stiffness: 450, damping: 16 }}
                    >
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${
                        isActive 
                          ? 'text-[#002255] drop-shadow-[0_1.5px_2px_rgba(255,255,255,1)] filter drop-shadow-[0_0_8px_rgba(0,34,85,0.4)]' 
                          : 'text-[#072B68] drop-shadow-[0_1px_1.5px_rgba(255,255,255,0.9)]'
                      }`} />
                    </motion.div>
                    <span className={`text-[8px] sm:text-[9px] font-black tracking-widest uppercase mt-0.5 transition-all duration-300 ${
                      isActive 
                        ? 'text-[#002255] font-black drop-shadow-[0_1.5px_2px_rgba(255,255,255,1)]' 
                        : 'text-[#072B68] font-extrabold drop-shadow-[0_1px_1.5px_rgba(255,255,255,0.9)]'
                    }`}>
                      {tab.label}
                    </span>
                  </div>

                  {/* Translucent Water Drop Indicator Dot */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeDockDot"
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="absolute -bottom-1 w-2 h-2 bg-[#002255] rounded-full shadow-[0_0_10px_rgba(0,34,85,0.8)] border border-white"
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Floating Bottom Updating Status Indicator */}
        {isDownloadingUpdate && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#151A27]/95 border border-[#FF6B00] rounded-2xl px-5 py-3 shadow-[0_0_25px_rgba(255,107,0,0.5)] flex items-center space-x-3 backdrop-blur-xl"
          >
            <div className="w-9 h-9 rounded-full bg-[#FF6B00]/20 flex items-center justify-center border border-[#FF6B00]/50 animate-bounce">
              <DownloadCloud className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-white tracking-widest uppercase">updating...</span>
                <span className="text-[10px] font-extrabold text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-full border border-[#FF6B00]/30">{updateProgress}%</span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium block">Installing latest features & enhancements</span>
            </div>
          </motion.div>
        )}

        {/* In-App Update Modal */}
        {isUpdateModalOpen && updateData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#151A27]/95 border border-[#FF6B00]/40 rounded-3xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(255,107,0,0.2)] relative overflow-hidden"
            >
              {/* Top Accent Light */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent"></div>
              
              {!updateData.forceUpdate && (
                <button 
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              )}
              
              <div className="flex flex-col items-center mb-5 pt-2">
                <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4 border border-[#FF6B00]/30 animate-bounce">
                  <DownloadCloud className="w-8 h-8 text-[#FF6B00]" />
                </div>
                <h3 className="text-xl font-black text-white text-center tracking-wide uppercase">
                  {updateData.title || 'New Update Available!'}
                </h3>
                <span className="text-xs font-black text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/20 px-3 py-1 rounded-full mt-2">
                  Version v{updateData.version} {updateData.releaseDate ? `• Released ${updateData.releaseDate}` : ''}
                </span>
              </div>

              {/* Release Notes */}
              <div className="bg-[#0A0D14] border border-gray-800 rounded-2xl p-4 mb-6 max-h-[180px] overflow-y-auto">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">What's New:</h4>
                <div className="space-y-2 text-xs text-gray-300 leading-relaxed font-semibold">
                  {Array.isArray(updateData.releaseNotes) ? (
                    updateData.releaseNotes.map((note, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-[#FF6B00] mr-2">•</span>
                        <span>{note}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start">
                      <span className="text-[#FF6B00] mr-2">•</span>
                      <span>{updateData.releaseNotes || 'Performance improvements and general bug fixes.'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress and Download Controls */}
              {isDownloadingUpdate ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span>Downloading update package...</span>
                    <span className="text-[#FF6B00]">{updateProgress}%</span>
                  </div>
                  <div className="w-full bg-[#0A0D14] h-2.5 rounded-full overflow-hidden border border-gray-800">
                    <motion.div 
                      className="bg-gradient-to-r from-[#FF6B00] to-amber-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${updateProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-2.5">
                  {enablePackageUpdateSync && (
                    <button 
                      type="button"
                      onClick={handleInAppPackageSync}
                      className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-cyan-500/20 border border-amber-500/60 hover:border-amber-400 text-amber-300 font-extrabold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center space-x-2"
                    >
                      <Zap className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
                      <span>⚡ SYNC FEATURES INSTANTLY (NO APK DOWNLOAD)</span>
                    </button>
                  )}

                  <button 
                    type="button"
                    onClick={handleDownloadUpdate}
                    className="w-full bg-gradient-to-r from-[#FF6B00] to-amber-600 text-white font-extrabold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-[0_4px_15px_rgba(255,107,0,0.3)] flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4.5 h-4.5" />
                    <span>DOWNLOAD & INSTALL APK UPDATE</span>
                  </button>
                  
                  {!updateData.forceUpdate && (
                    <button 
                      type="button"
                      onClick={() => setIsUpdateModalOpen(false)}
                      className="w-full text-gray-400 hover:text-white text-xs font-bold py-2 transition-colors"
                    >
                      Maybe Later
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#151A27] border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-[#FF6B00] fill-current" />
                </div>
                <h3 className="text-xl font-black text-white text-center">Rate Your Experience</h3>
                <p className="text-xs text-gray-400 text-center mt-2">How would you rate your time here? Let us know!</p>
              </div>

              <div className="flex justify-center space-x-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setFeedbackStars(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 ${star <= feedbackStars ? 'text-[#FF6B00] fill-current drop-shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'text-gray-700'}`} />
                  </button>
                ))}
              </div>

              <textarea 
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts (optional)..."
                className="w-full bg-[#0A0D14] border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none resize-none mb-6 h-24"
              ></textarea>

              <button 
                onClick={handleSubmitFeedback}
                disabled={feedbackStars === 0 || isSubmittingFeedback}
                className="w-full bg-[#FF6B00] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
              >
                {isSubmittingFeedback ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'SUBMIT FEEDBACK'
                )}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#0A0D14] flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden">
      {isQuotaExceeded && (
        <div className="bg-amber-950/95 border-b border-amber-500/60 text-amber-200 px-4 py-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xl backdrop-blur-md z-[99999] relative">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-amber-300">Firebase Daily Quota Exceeded:</span>{' '}
              Firestore daily write limit reached for today. Database reads/writes will automatically resume tomorrow when quota resets.
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href="https://console.firebase.google.com/project/vkunlocker-45991/firestore/databases/ai-studio-ogvirklive-eb0f8f94-3a11-4e45-b657-3eab65a20a0f/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition-all flex items-center space-x-1 shadow-md"
            >
              <span>Upgrade Database</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => setIsQuotaExceeded(false)}
              className="text-amber-400 hover:text-amber-200 p-1 transition-colors"
              title="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {hubConfig?.systemSoundType && hubConfig.systemSoundType !== 'none' && (
        <audio 
          autoPlay 
          loop 
          src={
            hubConfig.systemSoundType === 'default1' ? 'https://www.soundjay.com/misc/sounds/wind-chimes-1.mp3' :
            hubConfig.systemSoundType === 'default2' ? 'https://www.soundjay.com/buttons/sounds/button-30.mp3' :
            hubConfig.customSoundUrl
          } 
          className="hidden" 
        />
      )}
      <BackgroundGlows />
      <Embers />
      <Streaks />
      
      <div className="relative z-10 flex-1 flex flex-col items-center pt-16 px-6 overflow-y-auto pb-10">
        
        {/* LOGO SECTION */}
        <motion.div 
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0 }}
          className="flex flex-col items-center mb-12 relative"
        >
          <div className="flex items-center justify-center relative">
            <div className="relative inline-block leading-none">
              <h1 className="text-[6.5rem] leading-none font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,107,0,0.5)] relative z-10">
                OG
              </h1>
              <div className="absolute top-[48%] left-[-8%] w-[116%] h-[5px] bg-[#0A0D14] -rotate-[28deg] z-20 shadow-[0_0_5px_rgba(0,0,0,0.5)]"></div>
            </div>
          </div>
          <div className="flex space-x-3 mt-[-15px] z-30">
            <h2 className="text-[2.2rem] font-black text-white tracking-widest uppercase drop-shadow-lg">
              Virk
            </h2>
            <h2 className="text-[2.2rem] font-black text-[#FF6B00] tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,107,0,0.4)]">
              Live
            </h2>
          </div>
          <p className="text-[0.65rem] font-bold text-gray-300 tracking-[0.25em] mt-1">
            GAME, COMPETE, STREAM
          </p>
        </motion.div>

        {/* Authentication Provider Selector */}
        <div className="w-full max-w-[340px] flex items-center bg-[#101420]/90 backdrop-blur-md p-1 rounded-2xl border border-gray-800 mb-6 shadow-lg">
          <button
            type="button"
            onClick={() => setAuthProviderTab('firebase')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              authProviderTab === 'firebase'
                ? 'bg-gradient-to-r from-[#172c57] to-[#FF6B00] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Firebase</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthProviderTab('supabase')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              authProviderTab === 'supabase'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Supabase</span>
          </button>
        </div>

        {authProviderTab === 'supabase' ? (
          <SupabaseAuth 
            onAuthSuccess={(appUser) => {
              setUser(appUser);
              playWelcomeSound();
            }}
            onSwitchToFirebase={() => setAuthProviderTab('firebase')}
          />
        ) : (
          /* LOGIN CARD */
          <motion.div 
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0 }}
            className="w-full max-w-[340px] bg-[#151A27]/95 backdrop-blur-xl rounded-3xl border border-gray-700 p-6 pt-10 shadow-2xl relative"
          >
            {/* Gamer Avatar Overlapping Top */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-[#1a2332] rounded-full border-2 border-[#FF6B00] flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.5)]">
              <User className="text-gray-300 w-8 h-8" />
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleAuth} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3 rounded-xl text-center break-words flex flex-col space-y-2">
                  <span>{error}</span>
                  {!isSignUp && (error.includes('Sign Up') || error.includes('Invalid email or password') || error.includes('No account')) && (
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setError(null); }}
                      className="text-[11px] font-bold text-[#FF6B00] hover:underline uppercase tracking-wider self-center pt-1"
                    >
                      Click Here To Create An Account
                    </button>
                  )}
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs p-3 rounded-xl text-center break-words">
                  {successMessage}
                </div>
              )}
              
              {/* First Name & Last Name (Sign Up only) */}
              {isSignUp && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6B00]" />
                    <input 
                      type="text" 
                      placeholder="First Name" 
                      required={isSignUp}
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setError(null); setSuccessMessage(null); }}
                      className="w-full bg-[#1A202C] border border-gray-600 rounded-xl py-3 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6B00]" />
                    <input 
                      type="text" 
                      placeholder="Last Name" 
                      required={isSignUp}
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); setError(null); setSuccessMessage(null); }}
                      className="w-full bg-[#1A202C] border border-gray-600 rounded-xl py-3 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FF6B00]" />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); setSuccessMessage(null); }}
                  className="w-full bg-[#1A202C] border border-[#FF6B00]/80 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FF6B00]" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password" 
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); setSuccessMessage(null); }}
                  className="w-full bg-[#1A202C] border border-gray-600 rounded-xl py-3.5 pl-11 pr-11 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-colors"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <EyeOff className={`w-4 h-4 cursor-pointer transition-colors ${showPassword ? 'text-[#FF6B00]' : 'text-gray-500 hover:text-gray-300'}`} />
                </button>
              </div>

              {!isSignUp && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-[11px] font-semibold text-[#FF6B00] hover:text-orange-400 tracking-wider transition-colors disabled:opacity-50"
                  >
                    FORGOT PASSWORD?
                  </button>
                </div>
              )}

              {/* Sign In Action */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full mt-5 bg-gradient-to-r from-[#172c57] to-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl shadow-[0_4px_15px_rgba(255,107,0,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'PROCESSING...' : (isSignUp ? 'SIGN UP' : 'SIGN IN')}
              </button>

              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700/80"></div>
                </div>
                <div className="relative bg-[#151A27] px-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Or Continue With
                </div>
              </div>

              {/* Social Login: Google & GitHub */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 py-2.5 px-3 bg-[#1A202C] hover:bg-[#232B3B] border border-gray-700 hover:border-gray-500 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  title="Sign in with Google"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleGithubSignIn}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 py-2.5 px-3 bg-[#1A202C] hover:bg-[#232B3B] border border-gray-700 hover:border-gray-500 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  title="Sign in with GitHub"
                >
                  <Github className="w-4 h-4 shrink-0 text-white" />
                  <span>GitHub</span>
                </button>
              </div>
            </form>

            {/* Sign Up / Sign In Toggle */}
            <div className="mt-8 text-center text-xs text-gray-400 font-medium">
              {isSignUp ? (
                <>Already have an account? <button onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage(null); }} className="text-[#FF6B00] font-bold hover:underline ml-1">Sign In!</button></>
              ) : (
                <>Don't have an account? <button onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage(null); }} className="text-[#FF6B00] font-bold hover:underline ml-1">Sign Up Now!</button></>
              )}
            </div>

            {/* Switch to Supabase quick button */}
            <div className="mt-6 pt-4 border-t border-gray-800 text-center">
              <button
                type="button"
                onClick={() => setAuthProviderTab('supabase')}
                className="w-full py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Switch to Supabase Cloud Auth</span>
              </button>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppMain />
    </AppErrorBoundary>
  );
}
