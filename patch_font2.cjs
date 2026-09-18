const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldAdminInputs = `<div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Developer Name</label>`;

const newAdminInputs = `<div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Typography Font</label>
                        <select 
                          value={hubEdit.fontFamily || 'system-ui, sans-serif'} 
                          onChange={e => setHubEdit({...hubEdit, fontFamily: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-3"
                        >
                          <option value="system-ui, sans-serif">System Default (Inter)</option>
                          <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                          <option value="'Montserrat', sans-serif">Montserrat (Modern)</option>
                          <option value="'Oswald', sans-serif">Oswald (Bold Condensed)</option>
                          <option value="'Roboto Mono', monospace">Roboto Mono (Tech)</option>
                          <option value="'Dancing Script', cursive">Dancing Script (Stylized)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Developer Name</label>`;

code = code.replace(oldAdminInputs, newAdminInputs);
fs.writeFileSync('src/App.tsx', code);
