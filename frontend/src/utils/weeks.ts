import type { ScheduleWeek } from '../types';

export const WEEK_LABELS: Record<ScheduleWeek, string> = {
  upper: 'Верхняя',
  lower: 'Нижняя',
};

export const WEEK_SHORT: Record<ScheduleWeek, string> = {
  upper: 'В',
  lower: 'Н',
};

export function weekOfDate(date: string, semesterStart: string): ScheduleWeek {
  const weekNumber = Math.floor((Date.parse(date) - Date.parse(semesterStart)) / 86400000 / 7);
  return weekNumber % 2 === 0 ? 'lower' : 'upper';
}