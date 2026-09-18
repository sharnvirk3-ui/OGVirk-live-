const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  `{youtubeVideos.length === 0 && <p className="text-gray-500 text-sm">No videos available.</p>}\n                {youtubeVideos.map(video => {`,
  `{youtubeVideos.length === 0 && <p className="text-gray-500 text-sm">No videos available.</p>}
                {youtubeVideos.filter(v => v.title.toLowerCase().includes(youtubeSearch.toLowerCase())).map(video => {`
);

fs.writeFileSync('src/App.tsx', code);
