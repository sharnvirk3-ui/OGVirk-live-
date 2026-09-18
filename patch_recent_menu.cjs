const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `              {/* Placeholder for feed/stats to make it look full */}
              <div className="w-full mt-12 space-y-4">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-xs font-bold text-gray-500 tracking-wider">RECENT ACTIVITY</h3>
                </div>
                <div className="w-full bg-[#151A27]/80 backdrop-blur-md rounded-2xl p-5 border border-gray-800/50 flex items-center space-x-4">
                   <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-[#FF6B00]">
                      <Gamepad2 className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-bold text-white text-sm">Ranked Match Won</p>
                     <p className="text-xs text-gray-500 mt-0.5">+24 MMR • 2h ago</p>
                   </div>
                </div>
                <div className="w-full bg-[#151A27]/80 backdrop-blur-md rounded-2xl p-5 border border-gray-800/50 flex items-center space-x-4">
                   <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Youtube className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-bold text-white text-sm">New Stream Highlight</p>
                     <p className="text-xs text-gray-500 mt-0.5">1.2k Views • 5h ago</p>
                   </div>
                </div>
              </div>`;

const replace = `              {/* Recent Menu */}
              <div className="w-full mt-12 space-y-4 relative z-40">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-xs font-bold text-gray-500 tracking-wider">RECENT MENU</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Recent Games Box */}
                  <div 
                    onClick={() => handleTabChange('game')}
                    className="bg-[#151A27]/80 backdrop-blur-md rounded-2xl p-4 border border-gray-800/50 flex flex-col hover:border-[#FF6B00]/50 transition-colors cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
                        <Gamepad2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Games</span>
                    </div>
                    {games && games.length > 0 ? (
                      <div className="space-y-2">
                        {games.slice(0, 2).map((game: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-black/50">
                              {game.imageUrl ? <img src={game.imageUrl} className="w-full h-full object-cover" /> : <Gamepad2 className="w-3 h-3 m-1 text-gray-500" />}
                            </div>
                            <span className="text-[10px] text-gray-300 font-bold truncate">{game.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 font-bold">No games added</p>
                    )}
                  </div>

                  {/* Recent Videos Box */}
                  <div 
                    onClick={() => handleTabChange('youtube')}
                    className="bg-[#151A27]/80 backdrop-blur-md rounded-2xl p-4 border border-gray-800/50 flex flex-col hover:border-red-500/50 transition-colors cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Youtube className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">YouTube</span>
                    </div>
                    {youtubeVideos && youtubeVideos.length > 0 ? (
                      <div className="space-y-2">
                        {youtubeVideos.slice(0, 2).map((video: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-black/50">
                              <img src={\`https://img.youtube.com/vi/\${getYoutubeId(video.url)}/default.jpg\`} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] text-gray-300 font-bold line-clamp-1 leading-tight">{video.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 font-bold">No videos added</p>
                    )}
                  </div>
                </div>
              </div>`;

if(code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Could not find target");
}
