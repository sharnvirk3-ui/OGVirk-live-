const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update authenticated user wrapper
code = code.replace(
  `<div className="relative min-h-[100dvh] bg-[#0A0D14] flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden text-white">`,
  `<div className="relative h-[100dvh] bg-[#0A0D14] flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden text-white">`
);

// Keep nav as absolute but we could also make it fixed if we want to be safe, but absolute inside a h-[100dvh] wrapper works well.
// Wait, is it better to make it fixed bottom-0? If the wrapper is h-[100dvh], absolute bottom-0 works because wrapper is relatively positioned and exactly screen height.
// Let's use 'fixed' just to be absolutely bulletproof against Safari weirdness if needed, but fixed can be glitchy with bottom safe areas.
// Instead, let's keep it absolute bottom-0. But let's remove pb-32 from main if it's no longer needed, wait, pb-32 on main is good because it gives padding at the bottom so content isn't hidden under the nav bar.

fs.writeFileSync('src/App.tsx', code);
