import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsPanel from '../components/StatsPanel';

const mockStats = {
  total: 150,
  withDebt: 12,
  avgAttendance: 87,
  avgPerformance: 4.2,
  byCourse: { 1: 40, 2: 35, 3: 45, 4: 30 },
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
