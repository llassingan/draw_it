import type { RemoteUser } from '../../hooks/useAwareness';

export interface UserListProps {
  users: RemoteUser[];
  localUserId: string | null;
}

function toolEmoji(tool: string): string {
  if (tool === 'pen') return '✏️';
  if (tool === 'rect') return '▭';
  if (tool === 'eraser') return '⌫';
  if (tool === 'select') return '↘';
  return '•';
}

export default function UserList({ users, localUserId }: UserListProps): JSX.Element {
  return (
    <div
      className="pointer-events-auto absolute right-4 top-4 z-30 flex max-h-[60vh] w-48 flex-col gap-1 overflow-y-auto rounded-2xl border border-board-border bg-white p-2 shadow-md"
      data-testid="user-list"
    >
      <div className="px-1 pb-1 text-xs font-semibold text-gray-500">
        Users ({users.length})
      </div>
      {users.length === 0 ? (
        <div className="px-1 text-xs text-gray-400">No users yet</div>
      ) : (
        users.map((u) => {
          const isLocal = String(u.clientId) === localUserId;
          return (
            <div
              key={u.clientId}
              data-testid="user-pill"
              data-client-id={u.clientId}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: u.color }}
              />
              <span className="flex-1 truncate text-gray-800">
                {u.name}
                {isLocal && <span className="ml-1 text-xs text-gray-400">(you)</span>}
              </span>
              <span aria-hidden="true" className="text-base">
                {toolEmoji(u.tool)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
