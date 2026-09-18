const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add state variable
code = code.replace(
  "const [isAdminAuth, setIsAdminAuth] = useState(false);",
  "const [isAdminAuth, setIsAdminAuth] = useState(false);\n  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);"
);

// 2. Change 'HUB CUSTOMIZATION' block
const oldBlock = `<div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6">
                    <h3 className="text-sm font-bold text-[#FF6B00] mb-4 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      HUB CUSTOMIZATION
                    </h3>
                    
                    <div className="space-y-4">`;

const newBlock = `<div className="bg-[#151A27]/80 rounded-2xl p-6 border border-[#FF6B00]/30 shadow-[0_0_15px_rgba(255,107,0,0.1)] mb-6">
                    <button 
                      onClick={() => setIsProfileSettingsOpen(!isProfileSettingsOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-[#FF6B00] focus:outline-none"
                    >
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        DEVELOPER PROFILE SETTINGS
                      </span>
                      <Plus className={\`w-4 h-4 transition-transform \${isProfileSettingsOpen ? 'rotate-45' : ''}\`} />
                    </button>
                    
                    {isProfileSettingsOpen && (
                      <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">`;

code = code.replace(oldBlock, newBlock);

// 3. Close the condition block after the Save Hub Changes button
const oldClose = `                        Save Hub Changes
                      </button>
                    </div>
                  </div>`;

const newClose = `                        Save Hub Changes
                      </button>
                    </div>
                    )}
                  </div>`;

code = code.replace(oldClose, newClose);

fs.writeFileSync('src/App.tsx', code);
