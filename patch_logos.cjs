const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace Header Logo
const headerTarget = `            <motion.div 
              className="flex items-center space-x-3 cursor-pointer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-[#FF6B00] rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] text-white font-black px-3.5 py-2 rounded-xl text-xl tracking-widest shadow-xl border border-white/20 flex items-center justify-center">
                  OG
                </div>
              </motion.div>
              <div className="flex flex-col justify-center">
                <span className="text-lg font-black leading-tight text-white tracking-wide drop-shadow-md">OG Virk Live</span>
                <span className="text-[10px] text-[#FF6B00] font-bold leading-none tracking-[0.25em] uppercase mt-1 drop-shadow-[0_0_5px_rgba(255,107,0,0.5)]">YouTuber</span>
              </div>
            </motion.div>`;

const headerReplace = `            <motion.div 
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
            </motion.div>`;

if (code.includes(headerTarget)) {
  code = code.replace(headerTarget, headerReplace);
}

// Replace Hub Logo
const hubTarget = `          <div className="flex items-center justify-center">
            {/* Wing abstract left */}
            <svg className="w-10 h-10 text-orange-500 absolute -left-8 top-0 drop-shadow-[0_0_10px_rgba(255,107,0,0.8)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 2L12 10l-3-3L2 22l8-4 4 4 8-20z" opacity="0.8"/>
            </svg>
            <h1 className="text-[5.5rem] leading-none font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,107,0,0.6)]">
              OG
            </h1>
          </div>
          <h2 className="text-[2rem] font-black text-white tracking-widest uppercase mt-[-10px] drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
            Virk Live
          </h2>`;

const hubReplace = `          <div className="flex items-center justify-center relative">
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
          </div>`;

if (code.includes(hubTarget)) {
  code = code.replace(hubTarget, hubReplace);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced logos successfully.");
