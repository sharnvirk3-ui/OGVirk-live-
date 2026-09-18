const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert State
const stateTarget = `const [showFeedbackModal, setShowFeedbackModal] = useState(false);`;
const stateReplace = `const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);`;
code = code.replace(stateTarget, stateReplace);

// Update Bell Button
const bellTarget = `            <button className="w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg">
              <Bell className="w-4 h-4 text-gray-300" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_red]"></span>
            </button>`;

const bellReplace = `            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-[#151A27] border border-gray-800 flex items-center justify-center relative shadow-lg hover:bg-gray-800 transition-colors active:scale-95"
              >
                <Bell className="w-4 h-4 text-gray-300" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_red]"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-[#151A27]/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
                    <h3 className="text-sm font-bold text-white flex items-center">
                      <Bell className="w-3.5 h-3.5 mr-2 text-[#FF6B00]" /> Notifications
                    </h3>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center min-h-[100px]">
                    <Bell className="w-6 h-6 text-gray-600 mb-2 opacity-50" />
                    <p className="text-xs text-gray-500 font-bold">You're all caught up!</p>
                  </div>
                </div>
              )}
            </div>`;

code = code.replace(bellTarget, bellReplace);

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced bell target");
