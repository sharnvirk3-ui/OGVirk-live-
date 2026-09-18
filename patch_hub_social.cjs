const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `                className={\`relative z-40 flex items-center justify-center space-x-4 mt-8 w-full max-w-[280px] \${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}\`}
              >
                <a href={hubConfig?.callNumber ? \`tel:\${hubConfig.callNumber}\` : '#'} className="flex-1 bg-gradient-to-r from-[#172c57] to-[#FF6B00] text-white font-bold tracking-wide py-3.5 px-4 rounded-xl shadow-[0_4px_15px_rgba(255,107,0,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center space-x-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="text-sm">Call</span>
                </a>
                <a href={hubConfig?.whatsappNumber ? \`https://wa.me/\${hubConfig.whatsappNumber}\` : '#'} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#151A27] border border-[#25D366]/50 text-[#25D366] font-bold tracking-wide py-3.5 px-4 rounded-xl hover:bg-[#151A27]/80 transition-colors active:scale-[0.98] flex items-center justify-center space-x-2">
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">WhatsApp</span>
                </a>`;

const replacement = `                className={\`relative z-40 flex flex-col items-center justify-center space-y-3 mt-8 w-full max-w-[280px] \${!isHubLocked ? 'cursor-move p-4 ring-2 ring-dashed ring-[#FF6B00]/50 rounded-xl' : ''}\`}
              >
                <div className="flex w-full space-x-4">
                  <a href={hubConfig?.callNumber ? \`tel:\${hubConfig.callNumber}\` : '#'} className="flex-1 bg-gradient-to-r from-[#172c57] to-[#FF6B00] text-white font-bold tracking-wide py-3.5 px-4 rounded-xl shadow-[0_4px_15px_rgba(255,107,0,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center space-x-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Call</span>
                  </a>
                  <a href={hubConfig?.whatsappNumber ? \`https://wa.me/\${hubConfig.whatsappNumber}\` : '#'} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#151A27] border border-[#25D366]/50 text-[#25D366] font-bold tracking-wide py-3.5 px-4 rounded-xl hover:bg-[#151A27]/80 transition-colors active:scale-[0.98] flex items-center justify-center space-x-2">
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm">WhatsApp</span>
                  </a>
                </div>

                {(hubConfig?.instagramUrl || hubConfig?.youtubeProfileUrl) && (
                  <div className="flex w-full space-x-4">
                    {hubConfig?.instagramUrl && (
                      <a href={hubConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-bold tracking-wide py-3.5 px-2 rounded-xl shadow-[0_4px_15px_rgba(238,42,123,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center space-x-2">
                        <Instagram className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{hubConfig.instagramLabel || 'Instagram'}</span>
                      </a>
                    )}
                    {hubConfig?.youtubeProfileUrl && (
                      <a href={hubConfig.youtubeProfileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#FF0000] text-white font-bold tracking-wide py-3.5 px-2 rounded-xl shadow-[0_4px_15px_rgba(255,0,0,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center space-x-2">
                        <Youtube className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{hubConfig.youtubeLabel || 'YouTube'}</span>
                      </a>
                    )}
                  </div>
                )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully patched hub buttons.");
} else {
  console.log("Error: Target string not found.");
}
