const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `                          Reset to Default
                        </button>
                      </div>
                    )}
                  </div>`;
                  
const replace = `                          Reset to Default
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Feedback & Reports */}
                  <div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6 w-full">
                    <button 
                      onClick={() => setIsFeedbackReportsOpen(!isFeedbackReportsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        USER FEEDBACK & REPORTS {ratings && ratings.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{ratings.length}</span>}
                      </span>
                      <Plus className={\`w-4 h-4 transition-transform \${isFeedbackReportsOpen ? 'rotate-45' : ''}\`} />
                    </button>
                    
                    {isFeedbackReportsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6 max-h-80 overflow-y-auto pr-2">
                        {ratings.length === 0 ? (
                          <p className="text-gray-500 text-xs text-center font-bold">No feedback reports yet.</p>
                        ) : (
                          ratings.map((rating, i) => (
                            <div key={i} className="bg-[#0A0D14] border border-gray-800 rounded-xl p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, idx) => (
                                    <Star key={idx} className={\`w-3 h-3 \${idx < rating.stars ? 'text-[#FF6B00] fill-current' : 'text-gray-700'}\`} />
                                  ))}
                                </div>
                                <span className="text-[9px] text-gray-500 font-bold uppercase">{new Date(rating.createdAt).toLocaleDateString()}</span>
                              </div>
                              {rating.feedback ? (
                                <p className="text-xs text-gray-300 italic">"\${rating.feedback}"</p>
                              ) : (
                                <p className="text-[10px] text-gray-600 font-bold uppercase">No text provided</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  
  const stateAnchor = `const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);`;
  const stateReplace = `const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [isFeedbackReportsOpen, setIsFeedbackReportsOpen] = useState(false);`;
  code = code.replace(stateAnchor, stateReplace);

  const handleBackAnchor = `if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen)) {`;
  const handleBackReplace = `if (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen)) {`;
  code = code.replace(handleBackAnchor, handleBackReplace);
  
  const handleBackAnchor2 = `      setIsProfileSettingsOpen(false);
      setIsBackgroundSettingsOpen(false);
      return;`;
  const handleBackReplace2 = `      setIsProfileSettingsOpen(false);
      setIsBackgroundSettingsOpen(false);
      setIsFeedbackReportsOpen(false);
      return;`;
  code = code.replace(handleBackAnchor2, handleBackReplace2);

  const headerCondAnchor = `{(tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen))) && (`;
  const headerCondReplace = `{(tabHistory.length > 0 || (activeTab === 'admin' && (isProfileSettingsOpen || isBackgroundSettingsOpen || isFeedbackReportsOpen))) && (`;
  code = code.replace(headerCondAnchor, headerCondReplace);
  
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully added Feedback Section");
} else {
  console.log("Still not found.");
}
