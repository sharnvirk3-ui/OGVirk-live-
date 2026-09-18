const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const anchor = `                    </div>
                    )}
                  </div>`;
                  
const replace = `                    </div>
                    )}
                  </div>

                  {/* Live Background Profile Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsBackgroundSettingsOpen(!isBackgroundSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <Play className="w-4 h-4 mr-2" />
                        LIVE BACKGROUND SETTINGS
                      </span>
                      <Plus className={\`w-4 h-4 transition-transform \${isBackgroundSettingsOpen ? 'rotate-45' : ''}\`} />
                    </button>
                    
                    {isBackgroundSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Background Type</label>
                          <select 
                            value={hubEdit.backgroundType || 'default'} 
                            onChange={e => setHubEdit({...hubEdit, backgroundType: e.target.value})} 
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3"
                          >
                            <option value="default">Default (Glows & Streaks)</option>
                            <option value="image">Static Image</option>
                            <option value="video">Live Video (MP4)</option>
                          </select>
                        </div>
                        
                        {(hubEdit.backgroundType === 'image' || hubEdit.backgroundType === 'video') && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Media URL (MP4 / PNG / JPG / WEBP)</label>
                            <input 
                              value={hubEdit.backgroundUrl || ''} 
                              onChange={e => setHubEdit({...hubEdit, backgroundUrl: e.target.value})} 
                              className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3" 
                              placeholder="https://example.com/background.mp4"
                            />
                            <p className="text-[10px] text-gray-500">Provide a direct link to the image or video file.</p>
                          </div>
                        )}
                        
                        <button 
                          onClick={handleUpdateHubConfig}
                          className="w-full mt-2 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                          Save Background Changes
                        </button>
                        <button 
                          onClick={() => {
                             setHubEdit({...hubEdit, backgroundType: 'default', backgroundUrl: ''});
                             setTimeout(handleUpdateHubConfig, 100);
                          }}
                          className="w-full mt-2 bg-transparent text-gray-400 border border-gray-700 font-bold tracking-wide py-3.5 rounded-xl hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          Reset to Default
                        </button>
                      </div>
                    )}
                  </div>`;

code = code.replace(anchor, replace);
fs.writeFileSync('src/App.tsx', code);
