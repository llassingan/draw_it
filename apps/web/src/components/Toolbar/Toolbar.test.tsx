import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useBoardStore } from '../../store/boardStore';
import Toolbar from './Toolbar';

describe('Toolbar', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
  });

  it('renders all five tool buttons and the color picker', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('tool-pen')).toBeInTheDocument();
    expect(screen.getByTestId('tool-rect')).toBeInTheDocument();
    expect(screen.getByTestId('tool-triangle')).toBeInTheDocument();
    expect(screen.getByTestId('tool-circle')).toBeInTheDocument();
    expect(screen.getByTestId('tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('renders the zoom controls', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-out')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-reset')).toBeInTheDocument();
  });

  it('clicking a tool button updates the store', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(screen.getByTestId('tool-rect'));
    expect(useBoardStore.getState().tool).toBe('rect');
    await user.click(screen.getByTestId('tool-triangle'));
    expect(useBoardStore.getState().tool).toBe('triangle');
    await user.click(screen.getByTestId('tool-circle'));
    expect(useBoardStore.getState().tool).toBe('circle');
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

  it('zoom-in and zoom-out buttons mutate the store', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const initial = useBoardStore.getState().zoom;
    await user.click(screen.getByTestId('zoom-in'));
    expect(useBoardStore.getState().zoom).toBeGreaterThan(initial);
    await user.click(screen.getByTestId('zoom-out'));
    expect(useBoardStore.getState().zoom).toBe(initial);
  });

  it('zoom-reset returns to 100%', async () => {
    const user = userEvent.setup();
    useBoardStore.setState({ zoom: 2.5 });
    render(<Toolbar />);
    await user.click(screen.getByTestId('zoom-reset'));
    expect(useBoardStore.getState().zoom).toBe(1);
  });

  it('the zoom-reset button label shows the current percentage', () => {
    useBoardStore.setState({ zoom: 1.5 });
    render(<Toolbar />);
    expect(screen.getByTestId('zoom-reset').textContent).toBe('150%');
  });
});
