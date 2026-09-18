const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const stateTarget = "const [chatInput, setChatInput] = useState('');";
const stateReplace = "const [chatInput, setChatInput] = useState('');\n  const [userScratchpad, setUserScratchpad] = useState('');";
if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateReplace);
}

const uiTarget = `                    ) : (
                      <p className="text-[10px] text-gray-600 font-bold">No videos added</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>`;

const uiReplace = `                    ) : (
                      <p className="text-[10px] text-gray-600 font-bold">No videos added</p>
                    )}
                  </div>
                </div>

                {/* Animated Dynamic Text Box */}
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
                </div>

              </div>
            </motion.div>`;

if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplace);
  console.log("UI replaced successfully.");
} else {
  console.log("UI target not found.");
}

fs.writeFileSync('src/App.tsx', code);
