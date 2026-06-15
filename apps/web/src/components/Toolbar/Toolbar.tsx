import { PALETTE, type Tool } from '@whiteboard/shared';

import { useBoardStore } from '../../store/boardStore';

const TOOL_BUTTONS: ReadonlyArray<{ tool: Tool; label: string; icon: string; testId: string }> = [
  { tool: 'pen', label: 'Pen', icon: '✏️', testId: 'tool-pen' },
  { tool: 'rect', label: 'Rectangle', icon: '▭', testId: 'tool-rect' },
  { tool: 'eraser', label: 'Eraser', icon: '⌫', testId: 'tool-eraser' },
];

export default function Toolbar(): JSX.Element {
  const tool = useBoardStore((s) => s.tool);
  const color = useBoardStore((s) => s.color);
  const setTool = useBoardStore((s) => s.setTool);
  const setColor = useBoardStore((s) => s.setColor);

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-board-border bg-white px-3 py-2 shadow-md"
      data-testid="toolbar"
      role="toolbar"
    >
      <div className="flex items-center gap-1">
        {TOOL_BUTTONS.map(({ tool: t, label, icon, testId }) => {
          const active = tool === t;
          return (
            <button
              key={t}
              type="button"
              aria-label={label}
              aria-pressed={active}
              data-testid={testId}
              onClick={() => setTool(t)}
              className={[
                'flex h-10 w-10 items-center justify-center rounded-lg text-lg transition',
                active
                  ? 'bg-blue-500 text-white shadow-inner'
                  : 'bg-board-surface text-gray-700 hover:bg-gray-200',
              ].join(' ')}
            >
              {icon}
            </button>
          );
        })}
      </div>

      <div className="mx-1 h-6 w-px bg-board-border" />

      <div className="flex items-center gap-1.5" data-testid="color-picker">
        {PALETTE.map((c) => {
          const active = color === c;
          return (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={active}
              data-testid={`color-${c}`}
              onClick={() => setColor(c)}
              className={[
                'h-7 w-7 rounded-full border transition',
                active ? 'ring-2 ring-blue-500 ring-offset-1' : 'ring-1 ring-transparent hover:scale-110',
              ].join(' ')}
              style={{ background: c }}
            />
          );
        })}
      </div>
    </div>
  );
}
