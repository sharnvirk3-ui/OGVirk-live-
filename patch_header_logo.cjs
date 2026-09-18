const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `            <div className="flex items-center space-x-3">
            <div className="bg-[#FF6B00] text-white font-black px-2.5 py-1.5 rounded-lg text-sm tracking-wider shadow-lg">
              OG
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-black leading-tight text-white tracking-wide">OG Virk Live</span>
              <span className="text-[9px] text-[#FF6B00] font-bold leading-none tracking-[0.2em] uppercase mt-0.5">YouTuber</span>
            </div>
          </div>`;

const newLogo = `            <motion.div 
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

if (code.includes(target)) {
  code = code.replace(target, newLogo);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully replaced logo.");
} else {
  console.log("Could not find the target logo string.");
}
