import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import Cursors from './Cursors';
import type { RemoteUser } from '../../hooks/useAwareness';

function makeUser(overrides: Partial<RemoteUser> = {}): RemoteUser {
  return {
    clientId: 7,
    name: 'Alice',
    color: '#1e1e1e',
    cursor: null,
    tool: 'pen',
    lastSeen: Date.now(),
    ...overrides,
  };
}

describe('Cursors', () => {
  it('renders nothing when all users have null cursor', () => {
    const { container } = render(<Cursors users={[makeUser()]} localTool="pen" />);
    expect(container.querySelectorAll('[data-testid="remote-cursor"]')).toHaveLength(0);
  });

  it('renders a cursor element for each user with a position', () => {
    const users = [
      makeUser({ clientId: 1, name: 'Alice', cursor: { x: 100, y: 200 } }),
      makeUser({ clientId: 2, name: 'Bob', cursor: { x: 300, y: 400 } }),
    ];
    render(<Cursors users={users} localTool="pen" />);
    expect(screen.getAllByTestId('remote-cursor')).toHaveLength(2);
    expect(screen.getByText('Alice ✏️')).toBeInTheDocument();
    expect(screen.getByText('Bob ✏️')).toBeInTheDocument();
  });

  it('positions the cursor at the user coordinates', () => {
    const user = makeUser({ cursor: { x: 250, y: 175 } });
    render(<Cursors users={[user]} localTool="pen" />);
    const el = screen.getByTestId('remote-cursor');
    expect(el.style.left).toBe('250px');
    expect(el.style.top).toBe('175px');
  });
});
