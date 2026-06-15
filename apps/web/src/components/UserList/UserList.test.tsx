import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import UserList from './UserList';
import type { RemoteUser } from '../../hooks/useAwareness';

function makeUser(overrides: Partial<RemoteUser> = {}): RemoteUser {
  return {
    clientId: Math.floor(Math.random() * 1000),
    name: 'BraveOtter',
    color: '#1e1e1e',
    cursor: null,
    tool: 'pen',
    lastSeen: Date.now(),
    ...overrides,
  };
}

describe('UserList', () => {
  it('shows an empty state when no users are connected', () => {
    render(<UserList users={[]} localUserId="1" />);
    expect(screen.getByText(/no users yet/i)).toBeInTheDocument();
    expect(screen.getByText(/users \(0\)/i)).toBeInTheDocument();
  });

  it('renders a pill per user with name and color', () => {
    const users = [
      makeUser({ clientId: 1, name: 'Alice' }),
      makeUser({ clientId: 2, name: 'Bob', color: '#e03131', tool: 'rect' }),
    ];
    render(<UserList users={users} localUserId="1" />);
    expect(screen.getAllByTestId('user-pill')).toHaveLength(2);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('marks the local user with (you)', () => {
    const users = [
      makeUser({ clientId: 1, name: 'Alice' }),
      makeUser({ clientId: 2, name: 'Bob' }),
    ];
    render(<UserList users={users} localUserId="1" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.queryByText('Bob (you)')).toBeNull();
  });

  it('renders a tool emoji for the user', () => {
    const users = [makeUser({ clientId: 1, name: 'Alice', tool: 'pen' })];
    render(<UserList users={users} localUserId="1" />);
    expect(screen.getByText('✏️')).toBeInTheDocument();
  });
});
