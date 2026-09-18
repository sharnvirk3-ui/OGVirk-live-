const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldHeader = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">`;
const newHeader = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">
          {isAdminAuth && (
            <button 
              onClick={() => { setIsAdminAuth(false); setAdminPin(''); }}
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center hover:bg-red-500/40 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Lock Access
            </button>
          )}`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync('src/App.tsx', code);
