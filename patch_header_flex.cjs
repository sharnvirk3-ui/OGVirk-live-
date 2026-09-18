const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const badHeader = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">
          {tabHistory.length > 0 && (
            <button 
              onClick={handleBack}
              className="mr-3 w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </button>
          )}
          {isAdminAuth && (
            <button 
              onClick={() => { setIsAdminAuth(false); setAdminPin(''); }}
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center hover:bg-red-500/40 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Lock Access
            </button>
          )}

          <div className="flex items-center space-x-3">`;

const goodHeader = `<header className="relative z-10 flex justify-between items-center p-6 pb-2">
          {isAdminAuth && (
            <button 
              onClick={() => { setIsAdminAuth(false); setAdminPin(''); }}
              className="absolute left-1/2 -translate-x-1/2 top-8 z-50 bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center hover:bg-red-500/40 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Lock Access
            </button>
          )}

          <div className="flex items-center">
            {tabHistory.length > 0 && (
              <button 
                onClick={handleBack}
                className="mr-3 w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-gray-300" />
              </button>
            )}
            <div className="flex items-center space-x-3">`;

code = code.replace(badHeader, goodHeader);
fs.writeFileSync('src/App.tsx', code);
