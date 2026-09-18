const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add PatternLockGrid component right before App component
const patternGridComp = `
interface PatternLockGridProps {
  pattern: number[];
  onChange: (p: number[]) => void;
  onComplete?: (p: number[]) => void;
  title?: string;
}

const PatternLockGrid = ({ pattern, onChange, onComplete, title = "Slide / Draw 3x3 Pattern" }: PatternLockGridProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [dragPoint, setDragPoint] = React.useState<{ x: number; y: number } | null>(null);

  const getDotPos = (dotIdx: number) => {
    const row = Math.floor((dotIdx - 1) / 3);
    const col = (dotIdx - 1) % 3;
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width / 3;
    const h = rect.height / 3;
    return { x: col * w + w / 2, y: row * h + h / 2 };
  };

  const handlePointerDown = (dot: number, e: React.PointerEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    if (!pattern.includes(dot)) {
      onChange([dot]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragPoint({ x, y });

    const w = rect.width / 3;
    const h = rect.height / 3;

    for (let dot = 1; dot <= 9; dot++) {
      const row = Math.floor((dot - 1) / 3);
      const col = (dot - 1) % 3;
      const dotX = col * w + w / 2;
      const dotY = row * h + h / 2;
      const dist = Math.hypot(x - dotX, y - dotY);

      if (dist < 32) {
        if (!pattern.includes(dot)) {
          onChange([...pattern, dot]);
        }
      }
    }
  };

  const handlePointerEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setDragPoint(null);
      if (onComplete) onComplete(pattern);
    }
  };

  return (
    <div className="w-full flex flex-col items-center mb-4 select-none">
      <p className="text-xs font-bold text-gray-300 mb-2">{title}</p>
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="relative w-64 h-64 bg-[#0A0D14] border border-gray-800 rounded-2xl p-2 touch-none flex items-center justify-center shadow-inner overflow-hidden"
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {pattern.map((dot, idx) => {
            if (idx === 0) return null;
            const p1 = getDotPos(pattern[idx - 1]);
            const p2 = getDotPos(dot);
            return (
              <line
                key={\`line-\${idx}\`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#FF6B00"
                strokeWidth="5"
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(255,107,0,0.9)]"
              />
            );
          })}
          {isDrawing && pattern.length > 0 && dragPoint && (
            <line
              x1={getDotPos(pattern[pattern.length - 1]).x}
              y1={getDotPos(pattern[pattern.length - 1]).y}
              x2={dragPoint.x}
              y2={dragPoint.y}
              stroke="#FF6B00"
              strokeWidth="3"
              strokeDasharray="4 4"
              strokeLinecap="round"
              className="opacity-80"
            />
          )}
        </svg>

        <div className="grid grid-cols-3 gap-3 w-full h-full z-20">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
            const isSelected = pattern.includes(dot);
            const order = pattern.indexOf(dot) + 1;
            return (
              <div
                key={dot}
                onPointerDown={(e) => handlePointerDown(dot, e)}
                onClick={() => {
                  if (!pattern.includes(dot)) {
                    onChange([...pattern, dot]);
                  }
                }}
                className="flex items-center justify-center cursor-pointer"
              >
                <div
                  className={\`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-150 \${
                    isSelected
                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_0_20px_rgba(255,107,0,0.8)] scale-110'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-[#FF6B00]/50 hover:text-white'
                  }\`}
                >
                  {isSelected ? (
                    <span className="text-xs font-black">{order}</span>
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between w-64 mt-3 px-1">
        <span className="text-[11px] font-mono text-gray-400">
          Pattern: {pattern.length > 0 ? pattern.join(' ➔ ') : 'Slide or tap dots'}
        </span>
        {pattern.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-[#FF6B00] font-bold hover:underline"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
`;

if (!code.includes('PatternLockGrid')) {
  code = code.replace('export default function App() {', patternGridComp + '\nexport default function App() {');
  console.log("Added PatternLockGrid component.");
}

fs.writeFileSync('src/App.tsx', code);
