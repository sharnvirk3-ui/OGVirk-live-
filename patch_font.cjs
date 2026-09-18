const fs = require('fs');

// 1. Update index.css with Google Fonts (Handled cleanly via index.html)

// 2. Update App.tsx
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// A. Save font family in updateHubConfig
code = code.replace(
  "youtubeApiKey: hubEdit.youtubeApiKey || ''",
  "youtubeApiKey: hubEdit.youtubeApiKey || '',\n        fontFamily: hubEdit.fontFamily || 'system-ui, sans-serif'"
);

// B. Apply font to Name
code = code.replace(
  `<h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md whitespace-nowrap">`,
  `<h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md whitespace-nowrap" style={{ fontFamily: hubConfig?.fontFamily || 'system-ui, sans-serif' }}>`
);

// C. Apply font to Title
code = code.replace(
  `<p className="text-[#FF6B00] font-bold text-xs tracking-[0.2em] uppercase whitespace-nowrap">`,
  `<p className="text-[#FF6B00] font-bold text-xs tracking-[0.2em] uppercase whitespace-nowrap" style={{ fontFamily: hubConfig?.fontFamily || 'system-ui, sans-serif' }}>`
);

// D. Add the dropdown to Admin UI
const oldAdminInputs = `                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Developer Name</label>`;
const newAdminInputs = `                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Typography Font</label>
                        <select 
                          value={hubEdit.fontFamily || 'system-ui, sans-serif'} 
                          onChange={e => setHubEdit({...hubEdit, fontFamily: e.target.value})} 
                          className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none mb-4"
                        >
                          <option value="system-ui, sans-serif">System Default (Inter)</option>
                          <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                          <option value="'Montserrat', sans-serif">Montserrat (Modern)</option>
                          <option value="'Oswald', sans-serif">Oswald (Bold Condensed)</option>
                          <option value="'Roboto Mono', monospace">Roboto Mono (Tech)</option>
                          <option value="'Dancing Script', cursive">Dancing Script (Stylized)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Developer Name</label>`;
code = code.replace(oldAdminInputs, newAdminInputs);

fs.writeFileSync('src/App.tsx', code);
