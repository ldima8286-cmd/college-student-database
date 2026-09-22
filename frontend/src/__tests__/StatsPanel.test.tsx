import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsPanel from '../components/StatsPanel';

const mockStats = {
  total: 150,
  withDebt: 12,
  avgAttendance: 87,
  avgPerformance: 4.2,
  byCourse: { 1: 40, 2: 35, 3: 45, 4: 30 },
  byCourseStats: [
    { course: 1, count: 40, avgPerformance: 4.1, avgAttendance: 88 },
    { course: 2, count: 35, avgPerformance: 3.9, avgAttendance: 84 },
    { course: 3, count: 45, avgPerformance: 4.4, avgAttendance: 90 },
    { course: 4, count: 30, avgPerformance: 4.0, avgAttendance: 86 },
  ],
  bySpecialty: { 'Программирование': 80, 'Дизайн': 70 },
};

describe('StatsPanel', () => {
  it('renders nothing when stats is null', () => {
    const { container } = render(<StatsPanel stats={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all stat cards', () => {
    render(<StatsPanel stats={mockStats} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
  });

  it('renders course distribution', () => {
    render(<StatsPanel stats={mockStats} />);
    expect(screen.getByText('1 курс:')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });
});
