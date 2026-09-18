const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldHeader = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">
          {isAdminAuth && (
            <button 
              onClick={() => { setIsAdminAuth(false); setAdminPin(''); }}
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center hover:bg-red-500/40 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Lock Access
            </button>
          )}
          <button className="w-12 h-12 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg">
            <Bell className="w-5 h-5 text-gray-300" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_red]"></span>
          </button>
          <button onClick={() => setActiveTab('profile')} className="w-12 h-12 rounded-full bg-[#151A27] border-2 border-[#FF6B00] flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-transform active:scale-95">
             {user.photoURL ? (
               <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <User className="w-6 h-6 text-[#FF6B00]" />
             )}
          </button>
        </header>`;

const newHeader = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">
          {isAdminAuth && (
            <button 
              onClick={() => { setIsAdminAuth(false); setAdminPin(''); }}
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center hover:bg-red-500/40 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Lock Access
            </button>
          )}

          <div className="flex items-center space-x-3">
            <div className="bg-[#FF6B00] text-white font-black px-2.5 py-1.5 rounded-lg text-sm tracking-wider shadow-lg">
              OG
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-black leading-tight text-white tracking-wide">OG Virk Live</span>
              <span className="text-[9px] text-[#FF6B00] font-bold leading-none tracking-[0.2em] uppercase mt-0.5">YouTuber</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 relative z-40">
            <button className="w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg">
              <Bell className="w-4 h-4 text-gray-300" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_red]"></span>
            </button>
            <button onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-[#151A27] border-2 border-[#FF6B00] flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-transform active:scale-95">
               {user.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-5 h-5 text-[#FF6B00]" />
               )}
            </button>
          </div>
        </header>`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync('src/App.tsx', code);
