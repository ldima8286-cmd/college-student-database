import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api', () => ({
  getPublicStats: vi.fn(),
  getRecentStudents: vi.fn(),
  isAuthenticated: vi.fn(() => false),
}));

import { getPublicStats, getRecentStudents, isAuthenticated } from '../api';
import PublicShowcase from '../pages/PublicShowcase';

describe('PublicShowcase page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAuthenticated as any).mockReturnValue(false);
  });

  it('renders aggregate stats without auth and hides the student list', async () => {
    (getPublicStats as any).mockResolvedValue({
      stats: { total: 42, withDebt: 3, avgAttendance: 88, avgPerformance: 4.2 },
      byCourse: [{ course: 1, count: 10 }],
      updatedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <PublicShowcase />
      </MemoryRouter>
    );

    expect(screen.getByText('Открытая статистика колледжа')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('4.20')).toBeInTheDocument();
    });
    // Без авторизации список студентов не запрашивается и не показывается
    expect(screen.getByText('Доступно после входа')).toBeInTheDocument();
    expect(getRecentStudents).not.toHaveBeenCalled();
    expect(getPublicStats).toHaveBeenCalledTimes(1);
  });

  it('shows recent students to an authenticated user', async () => {
    (isAuthenticated as any).mockReturnValue(true);
    (getPublicStats as any).mockResolvedValue({
      stats: { total: 42, withDebt: 3, avgAttendance: 88, avgPerformance: 4.2 },
      byCourse: [{ course: 1, count: 10 }],
      updatedAt: new Date().toISOString(),
    });
    (getRecentStudents as any).mockResolvedValue([
      { id: '1', fullName: 'Иванов Иван', course: 2, group: 'ИС-21', specialty: 'Информационные системы', performance: 4.5, attendance: 95 },
    ]);

    render(
      <MemoryRouter>
        <PublicShowcase />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Иванов Иван')).toBeInTheDocument());
    expect(getRecentStudents).toHaveBeenCalledTimes(1);
  });

  it('shows error state and retry button on failure', async () => {
    (getPublicStats as any).mockRejectedValue(new Error('Не удалось загрузить статистику'));
    render(
      <MemoryRouter>
        <PublicShowcase />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Не удалось загрузить статистику')).toBeInTheDocument());
    expect(screen.getByText('Повторить')).toBeInTheDocument();
  });
});