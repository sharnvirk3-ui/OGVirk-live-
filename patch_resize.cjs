const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const uiTarget = `                {/* Animated Dynamic Text Box */}
                <div className="w-full mt-6 relative p-[2px] rounded-2xl group transition-all duration-500 hover:shadow-[0_0_20px_rgba(255,107,0,0.3)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-argb rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative bg-[#0A0D14]/95 backdrop-blur-xl rounded-[14px] w-full p-1 h-full flex flex-col">
                    <textarea 
                      value={userScratchpad}
                      onChange={(e) => setUserScratchpad(e.target.value)}
                      placeholder="Type custom text..."
                      className="w-full min-h-[80px] bg-transparent text-white text-sm font-medium tracking-wide focus:outline-none p-3 resize-y"
                    />
                  </div>
                </div>`;

const uiReplace = `                {/* Animated Dynamic Text Box */}
                <div className="mt-6 relative p-[3px] rounded-2xl group transition-all duration-500 hover:shadow-[0_0_25px_rgba(255,107,0,0.4)] resize overflow-hidden min-h-[120px] max-w-full flex flex-col" style={{ width: '100%' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-argb rounded-2xl opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="relative bg-[#0A0D14]/95 backdrop-blur-xl rounded-[14px] w-full h-full p-1 flex flex-col flex-1">
                    <textarea 
                      value={userScratchpad}
                      onChange={(e) => setUserScratchpad(e.target.value)}
                      placeholder="Type custom text here... (Drag bottom-right corner to resize)"
                      className="w-full h-full flex-1 bg-transparent text-white text-sm font-medium tracking-wide focus:outline-none p-3 resize-none"
                    />
                  </div>
                </div>`;

if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplace);
  console.log("Resize UI replaced.");
} else {
  console.log("Resize UI target not found.");
}

fs.writeFileSync('src/App.tsx', code);
