const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Imports
code = code.replace(
  "Volume2, Music } from 'lucide-react';",
  "Volume2, Music, BellRing, BellOff, Moon, Smartphone } from 'lucide-react';"
);

// 2. State
const stateTarget = `  const [showNotifications, setShowNotifications] = useState(false);`;
const stateReplace = `  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationMode, setNotificationMode] = useState('ring');
  const [showModeMenu, setShowModeMenu] = useState(false);`;
code = code.replace(stateTarget, stateReplace);

// 3. UI logic
const headerTarget = `          <div className="flex items-center space-x-3 relative z-40">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}`;

const headerReplace = `          <div className="flex items-center space-x-3 relative z-40">
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
                      className={\`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors \${notificationMode === 'ring' ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}\`}
                    >
                      <BellRing className="w-4 h-4 mr-3" /> Ringing
                    </button>
                    <button 
                      onClick={() => { setNotificationMode('vibrate'); setShowModeMenu(false); }}
                      className={\`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors \${notificationMode === 'vibrate' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}\`}
                    >
                      <Smartphone className="w-4 h-4 mr-3" /> Vibrate
                    </button>
                    <button 
                      onClick={() => { setNotificationMode('sleep'); setShowModeMenu(false); }}
                      className={\`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors \${notificationMode === 'sleep' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}\`}
                    >
                      <Moon className="w-4 h-4 mr-3" /> Sleep
                    </button>
                    <button 
                      onClick={() => { setNotificationMode('mute'); setShowModeMenu(false); }}
                      className={\`w-full flex items-center px-3 py-2 text-sm font-bold rounded-xl transition-colors \${notificationMode === 'mute' ? 'bg-gray-700/50 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}\`}
                    >
                      <BellOff className="w-4 h-4 mr-3" /> Mute
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}`;

code = code.replace(headerTarget, headerReplace);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched notification mode");
