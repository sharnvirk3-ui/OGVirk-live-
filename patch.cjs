const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add RefreshCw to lucide-react imports
const importTarget = "import { User, Lock, Unlock, EyeOff, LogOut, Bell, Gamepad2, AlertTriangle, Youtube, MessageSquare, Mail, Home, Phone, MessageCircle, Shield, Play, Send, Plus, Users, Server, Trash2, Search, Star, ChevronLeft, Volume2, Music, BellRing, BellOff, Moon, Smartphone, Instagram } from 'lucide-react';";
const importReplacement = "import { User, Lock, Unlock, EyeOff, LogOut, Bell, Gamepad2, AlertTriangle, Youtube, MessageSquare, Mail, Home, Phone, MessageCircle, Shield, Play, Send, Plus, Users, Server, Trash2, Search, Star, ChevronLeft, Volume2, Music, BellRing, BellOff, Moon, Smartphone, Instagram, RefreshCw } from 'lucide-react';";
if (code.includes(importTarget)) {
    code = code.replace(importTarget, importReplacement);
} else {
    console.log("Warning: lucide import target not found");
}

// 2. Add handleForceSync function
const funcTarget = "  const handleUpdateHubConfig = async () => {";
const funcReplacement = `  const handleForceSync = async () => {
    try {
      await setDoc(doc(db, 'config', 'hub'), { lastSync: serverTimestamp() }, { merge: true });
      showToast('Global sync triggered successfully!', 'success');
    } catch(err) {
      console.error(err);
      showToast('Sync failed', 'error');
    }
  };

  const handleUpdateHubConfig = async () => {`;
if (code.includes(funcTarget)) {
    code = code.replace(funcTarget, funcReplacement);
} else {
    console.log("Warning: funcTarget not found");
}

// 3. Update Admin Panel Header
const headerTarget = `                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center"><Shield className="mr-2 text-[#FF6B00]" /> Admin Panel</h2>
                    <button onClick={() => { setIsAdminAuth(false); setAdminPin(''); }} className="text-xs font-bold text-gray-400 hover:text-white flex items-center bg-gray-800 px-3 py-1.5 rounded-lg">
                      <LogOut className="w-3 h-3 mr-1" /> LOCK
                    </button>
                  </div>`;
const headerReplacement = `                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center"><Shield className="mr-2 text-[#FF6B00]" /> Admin Panel</h2>
                    <div className="flex space-x-2">
                      <button onClick={handleForceSync} className="text-xs font-bold text-green-400 hover:text-white flex items-center bg-green-900/30 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-600/50 transition-colors shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                        <RefreshCw className="w-3 h-3 mr-1" /> SYNC
                      </button>
                      <button onClick={() => { setIsAdminAuth(false); setAdminPin(''); }} className="text-xs font-bold text-gray-400 hover:text-white flex items-center bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                        <LogOut className="w-3 h-3 mr-1" /> LOCK
                      </button>
                    </div>
                  </div>`;
if (code.includes(headerTarget)) {
    code = code.replace(headerTarget, headerReplacement);
} else {
    console.log("Warning: headerTarget not found");
}

// 4. Update Feedback UI to have max height and scrollbar
const feedbackTarget = `                    {isFeedbackReportsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        {ratings.length === 0 ? (`;
const feedbackReplacement = `                    {isFeedbackReportsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#FF6B00 #0A0D14' }}>
                        {ratings.length === 0 ? (`;
if (code.includes(feedbackTarget)) {
    code = code.replace(feedbackTarget, feedbackReplacement);
} else {
    console.log("Warning: feedbackTarget not found");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patch applied.");
