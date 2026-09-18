const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const bgAnchor = `        {/* Subtle background for dashboard */}
        <BackgroundGlows />
        <div className="absolute inset-0 z-0 bg-[#0A0D14]/80 pointer-events-none" /> {/* Dim the background slightly for readability */}
        <Streaks />`;
const bgReplace = `        {/* Dynamic Background */}
        {hubConfig?.backgroundType === 'image' && hubConfig?.backgroundUrl ? (
          <div className="absolute inset-0 z-0 bg-[#0A0D14]">
            <img src={hubConfig.backgroundUrl} alt="Background" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          </div>
        ) : hubConfig?.backgroundType === 'video' && hubConfig?.backgroundUrl ? (
          <div className="absolute inset-0 z-0 bg-[#0A0D14] overflow-hidden">
            <video autoPlay loop muted playsInline className="w-full h-full object-cover scale-105 pointer-events-none">
              <source src={hubConfig.backgroundUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          </div>
        ) : (
          <>
            {/* Subtle background for dashboard */}
            <BackgroundGlows />
            <div className="absolute inset-0 z-0 bg-[#0A0D14]/80 pointer-events-none" /> {/* Dim the background slightly for readability */}
            <Streaks />
          </>
        )}`;

code = code.replace(bgAnchor, bgReplace);
fs.writeFileSync('src/App.tsx', code);
