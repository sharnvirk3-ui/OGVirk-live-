const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Search to imports
code = code.replace(
  "Trash2 } from 'lucide-react';",
  "Trash2, Search } from 'lucide-react';"
);

// 2. Add search state variables after existing useState hooks (around line 140)
code = code.replace(
  "const [newErrorImageUrl, setNewErrorImageUrl] = useState('');",
  "const [newErrorImageUrl, setNewErrorImageUrl] = useState('');\n  const [gamesSearch, setGamesSearch] = useState('');\n  const [errorsSearch, setErrorsSearch] = useState('');\n  const [youtubeSearch, setYoutubeSearch] = useState('');"
);

// 3. Add search bar to Games and filter mapping
const gamesHeader = `<h2 className="text-xl font-black text-white mb-2 tracking-wide uppercase">Game Links</h2>`;
const newGamesHeader = `<div className="flex flex-col space-y-4 mb-2">
                <h2 className="text-xl font-black text-white tracking-wide uppercase">Game Links</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search games..." 
                    value={gamesSearch}
                    onChange={(e) => setGamesSearch(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
              </div>`;
code = code.replace(gamesHeader, newGamesHeader);

code = code.replace(
  `{games.length === 0 && <p className="text-gray-500 text-sm">No games added yet.</p>}\n              {games.map((game) => (`,
  `{games.length === 0 && <p className="text-gray-500 text-sm">No games added yet.</p>}
              {games.filter(g => g.name.toLowerCase().includes(gamesSearch.toLowerCase()) || (g.role || '').toLowerCase().includes(gamesSearch.toLowerCase())).map((game) => (`
);


// 4. Add search bar to Errors and filter mapping
const errorsHeader = `<h2 className="text-xl font-black text-white mb-4 tracking-wide uppercase flex items-center"><AlertTriangle className="mr-2 text-red-500" /> System Errors</h2>`;
const newErrorsHeader = `<div className="flex flex-col space-y-4 mb-4">
                <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center"><AlertTriangle className="mr-2 text-red-500" /> System Errors</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search errors..." 
                    value={errorsSearch}
                    onChange={(e) => setErrorsSearch(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>`;
code = code.replace(errorsHeader, newErrorsHeader);

code = code.replace(
  `{errorLogs.length === 0 && <p className="text-gray-500 text-sm">No recent error logs.</p>}\n                {errorLogs.map((log) => (`,
  `{errorLogs.length === 0 && <p className="text-gray-500 text-sm">No recent error logs.</p>}
                {errorLogs.filter(e => e.title.toLowerCase().includes(errorsSearch.toLowerCase()) || e.description.toLowerCase().includes(errorsSearch.toLowerCase())).map((log) => (`
);


// 5. Add search bar to YouTube and filter mapping
const youtubeHeader = `<h2 className="text-xl font-black text-white mb-4 tracking-wide uppercase flex items-center"><Youtube className="mr-2 text-red-500" /> YouTube Studio</h2>`;
const newYoutubeHeader = `<div className="flex flex-col space-y-4 mb-4">
                <h2 className="text-xl font-black text-white tracking-wide uppercase flex items-center"><Youtube className="mr-2 text-red-500" /> YouTube Studio</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search videos..." 
                    value={youtubeSearch}
                    onChange={(e) => setYoutubeSearch(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>`;
code = code.replace(youtubeHeader, newYoutubeHeader);

code = code.replace(
  `{youtubeVideos.length === 0 && <p className="text-gray-500 text-sm">No videos available.</p>}\n                {youtubeVideos.map((video) => (`,
  `{youtubeVideos.length === 0 && <p className="text-gray-500 text-sm">No videos available.</p>}
                {youtubeVideos.filter(v => v.title.toLowerCase().includes(youtubeSearch.toLowerCase())).map((video) => (`
);

fs.writeFileSync('src/App.tsx', code);
