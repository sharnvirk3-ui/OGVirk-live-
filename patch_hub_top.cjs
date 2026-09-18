const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const anchor = `                  {isHubLocked ? 'LOCKED' : 'EDITING'}
                </button>
              )}`;

const injection = `                  {isHubLocked ? 'LOCKED' : 'EDITING'}
                </button>
              )}

              {/* Top Empty Space Content */}
              <div className="w-full flex justify-center mb-6 min-h-[60px] items-center">
                {(!isHubLocked && isAdminAuth) ? (
                  <div className="flex gap-2 p-2 bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 w-full max-w-sm justify-around shadow-lg">
                    <button onClick={() => setActiveTab('admin')} className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition-colors">
                      <Shield className="w-5 h-5 mb-1 text-[#FF6B00]" />
                      <span className="text-[10px] font-bold">SECURITY</span>
                    </button>
                    <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition-colors">
                      <User className="w-5 h-5 mb-1 text-[#FF6B00]" />
                      <span className="text-[10px] font-bold">PROFILE</span>
                    </button>
                    <button onClick={() => setActiveTab('admin')} className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition-colors">
                      <Server className="w-5 h-5 mb-1 text-[#FF6B00]" />
                      <span className="text-[10px] font-bold">DATABASE</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm px-6 py-2 rounded-2xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center space-x-1 mb-1 text-[#FF6B00]">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={\`w-5 h-5 \${star <= parseFloat(calculateAverageRating()) ? 'fill-current' : 'text-gray-700'}\`} />
                      ))}
                      <span className="text-white font-black ml-2 text-lg">{calculateAverageRating()}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Based on {ratings.length} reviews</span>
                  </div>
                )}
              </div>`;

code = code.replace(anchor, injection);
fs.writeFileSync('src/App.tsx', code);
