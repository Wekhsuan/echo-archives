/* ============================================================
   ECHO FILES — GameLayout: 3-Column Cyberpunk Layout
   ============================================================ */

import type { ReactNode } from 'react';

interface GameLayoutProps {
  leftPanel: ReactNode;
  centerContent: ReactNode;
  rightPanel: ReactNode;
}

export default function GameLayout({
  leftPanel,
  centerContent,
  rightPanel,
}: GameLayoutProps) {
  return (
    <div className="h-full flex">
      {/* Left: Interrogation Panel (20%) */}
      <div className="w-[20%] min-w-[240px] max-w-[320px] border-r border-white/5">
        {leftPanel}
      </div>

      {/* Center: Memory Viewer (flex-1 50%) */}
      <div className="flex-1 min-w-0 relative">
        {centerContent}
      </div>

      {/* Right: Terminal Panel (30%) */}
      <div className="w-[30%] min-w-[320px] max-w-[480px] border-l border-white/5">
        {rightPanel}
      </div>
    </div>
  );
}
