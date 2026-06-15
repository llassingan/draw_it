import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useBoardStore } from '../../store/boardStore';
import Toolbar from './Toolbar';

describe('Toolbar', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  it('renders all three tool buttons and the color picker', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('tool-pen')).toBeInTheDocument();
    expect(screen.getByTestId('tool-rect')).toBeInTheDocument();
    expect(screen.getByTestId('tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('clicking a tool button updates the store', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTestId('tool-rect'));
    expect(useBoardStore.getState().tool).toBe('rect');
    await user.click(screen.getByTestId('tool-eraser'));
    expect(useBoardStore.getState().tool).toBe('eraser');
  });

  it('clicking a color swatch updates the store', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTestId('color-#e03131'));
    expect(useBoardStore.getState().color).toBe('#e03131');
  });

  it('shows the active tool with aria-pressed', () => {
    useBoardStore.setState({ tool: 'rect' });
    render(<Toolbar />);
    expect(screen.getByTestId('tool-rect')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tool-pen')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the active color with aria-pressed', () => {
    useBoardStore.setState({ color: '#1971c2' });
    render(<Toolbar />);
    expect(screen.getByTestId('color-#1971c2')).toHaveAttribute('aria-pressed', 'true');
  });
});
