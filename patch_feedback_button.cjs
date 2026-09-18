const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `{/* Feedback Button */}
        <div className="absolute bottom-[95px] w-full z-20 flex justify-center pointer-events-none px-6 pb-2">
          <button 
             onClick={() => setShowFeedbackModal(true)}
             className="pointer-events-auto bg-[#151A27]/90 backdrop-blur-md text-white border border-[#FF6B00]/50 shadow-[0_0_20px_rgba(255,107,0,0.3)] px-6 py-3 rounded-full text-xs font-black tracking-widest uppercase flex items-center hover:bg-[#FF6B00]/20 transition-colors active:scale-95"
          >
             <Star className="w-4 h-4 text-[#FF6B00] mr-2 fill-current" />
             Rate Experience
          </button>
        </div>`;

const replace = `{/* Feedback Button */}
        <div className="absolute bottom-[95px] right-6 z-20 flex justify-end pointer-events-none pb-2">
          <button 
             onClick={() => setShowFeedbackModal(true)}
             className="pointer-events-auto bg-[#151A27]/90 backdrop-blur-md text-[#FF6B00] border border-[#FF6B00]/50 shadow-[0_0_15px_rgba(255,107,0,0.4)] w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#FF6B00]/20 transition-colors active:scale-95 group"
             title="Report Issue / Feedback"
          >
             <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully replaced Feedback button.");
} else {
  console.log("Could not find the target string.");
}
