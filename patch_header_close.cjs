const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const anchor = `            <div className="flex flex-col justify-center">
              <span className="text-sm font-black leading-tight text-white tracking-wide">OG Virk Live</span>
              <span className="text-[9px] text-[#FF6B00] font-bold leading-none tracking-[0.2em] uppercase mt-0.5">YouTuber</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 relative z-40">`;

const replace = `            <div className="flex flex-col justify-center">
              <span className="text-sm font-black leading-tight text-white tracking-wide">OG Virk Live</span>
              <span className="text-[9px] text-[#FF6B00] font-bold leading-none tracking-[0.2em] uppercase mt-0.5">YouTuber</span>
            </div>
          </div>
          </div>

          <div className="flex items-center space-x-3 relative z-40">`;

code = code.replace(anchor, replace);
fs.writeFileSync('src/App.tsx', code);
