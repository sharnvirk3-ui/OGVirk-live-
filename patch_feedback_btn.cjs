const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const navAnchor = `{/* Bottom Navigation */}`;
const feedbackBtn = `{/* Feedback Button */}
        <div className="absolute bottom-[95px] w-full z-20 flex justify-center pointer-events-none px-6 pb-2">
          <button 
             onClick={() => setShowFeedbackModal(true)}
             className="pointer-events-auto bg-[#151A27]/90 backdrop-blur-md text-white border border-[#FF6B00]/50 shadow-[0_0_20px_rgba(255,107,0,0.3)] px-6 py-3 rounded-full text-xs font-black tracking-widest uppercase flex items-center hover:bg-[#FF6B00]/20 transition-colors active:scale-95"
          >
             <Star className="w-4 h-4 text-[#FF6B00] mr-2 fill-current" />
             Rate Experience
          </button>
        </div>

        {/* Bottom Navigation */}`;

code = code.replace(navAnchor, feedbackBtn);
fs.writeFileSync('src/App.tsx', code);
