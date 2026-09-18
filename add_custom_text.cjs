const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add state
code = code.replace(
  "const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);",
  "const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);\n  const [isCustomTextSettingsOpen, setIsCustomTextSettingsOpen] = useState(false);"
);

// 2. Add to handleBack
code = code.replace(
  "if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen)) {",
  "if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isCustomTextSettingsOpen)) {"
);

code = code.replace(
  "setIsSoundSettingsOpen(false);",
  "setIsSoundSettingsOpen(false);\n      setIsCustomTextSettingsOpen(false);"
);

// 3. Add to back button condition
code = code.replace(
  "(activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen))) && (",
  "(activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen || isSoundSettingsOpen || isCustomTextSettingsOpen))) && ("
);

// 4. Add UI block
const uiBlock = `                  {/* Custom Text Settings */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsCustomTextSettingsOpen(!isCustomTextSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        CUSTOM TEXT SETTINGS
                      </span>
                      <Plus className={\`w-4 h-4 transition-transform \${isCustomTextSettingsOpen ? 'rotate-45' : ''}\`} />
                    </button>
                    
                    {isCustomTextSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Text / Quote</label>
                          <textarea 
                            value={hubEdit.customQuote || ''}
                            onChange={(e) => setHubEdit({...hubEdit, customQuote: e.target.value})}
                            placeholder="Enter a custom quote or text here..."
                            rows={3}
                            className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FF6B00] focus:outline-none resize-none"
                          />
                          <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">This text will be displayed prominently on the Hub screen.</p>
                        </div>

                        <button 
                          onClick={handleUpdateHubConfig}
                          className="w-full mt-4 bg-[#FF6B00] text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                          Save Custom Text
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Feedback & Reports */}`;

code = code.replace(
  "                  {/* User Feedback & Reports */}",
  uiBlock
);

fs.writeFileSync('src/App.tsx', code);
console.log('Added custom text settings.');
