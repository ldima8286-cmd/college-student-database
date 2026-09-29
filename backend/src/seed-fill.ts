/**
 * Дозаполнение пробелов в уже существующей базе.
 *
 * Не трогает существующие записи: пропускает занятия, где уже есть
 * отметки или посещаемость, и не добавляет выдуманных студентов.
 * Заполняет только то, чего нет:
 *   - semesterStart, если не задан;
 *   - расписание для групп, где есть студенты, но нет занятий;
 *   - посещаемость и оценки на прошедших занятиях текущего семестра.
 *
 * Оценки подбираются так, чтобы среднее совпало с текущим performance
 * студента, а посещаемость — с текущим attendance: saveJournalLesson
 * пересчитывает агрегаты, и без этого реальные значения затерелись бы.
 *
 * Использование: npm run db:fill
 */
import {
  initDb,
  getAllStudents,
  getStudentById,
  getSchedule,
  createScheduleEntry,
  getJournalSummaries,
  getMarksByStudent,
  saveJournalLesson,
  setSemesterStart,
  getSettings,
  defaultSemesterStart,
  weekOfDate,
  getStats,
} from './db.js';
import { seedUsers } from './seed.js';
import { logger } from './logger.js';
import type { AttendanceStatus, Student } from './db.js';

const SCHEDULE_TEMPLATE = [
  { day: 1, lesson: 1, subject: 'ЗКИ', teacher: 'Королева', room: '310', week: null },
  { day: 1, lesson: 2, subject: 'Программирование', teacher: 'Смирнов', room: '201', week: null },
  { day: 1, lesson: 3, subject: 'Математика', teacher: 'Петров', room: '105', week: null },
  { day: 1, lesson: 4, subject: 'Иностранный язык', teacher: 'Сидорова', room: '305', week: null },
  { day: 2, lesson: 1, subject: 'Базы данных', teacher: 'Иванова', room: '208', week: null },
  { day: 2, lesson: 2, subject: 'Операционные системы', teacher: 'Козлов', room: '204', week: null },
  { day: 2, lesson: 3, subject: 'Программирование', teacher: 'Смирнов', room: '201', week: null },
  { day: 2, lesson: 4, subject: 'Физическая культура', teacher: 'Волков', room: 'Стадион', week: null },
  { day: 2, lesson: 5, subject: 'Практика', teacher: null, room: '101', week: 'upper' },
  { day: 2, lesson: 5, subject: 'Практика', teacher: null, room: '102', week: 'lower' },
  { day: 3, lesson: 1, subject: 'Математика', teacher: 'Петров', room: '105', week: null },
  { day: 3, lesson: 2, subject: 'Инженерная графика', teacher: 'Морозов', room: '110', week: null },
  { day: 3, lesson: 3, subject: 'Иностранный язык', teacher: 'Сидорова', room: '305', week: null },
  { day: 3, lesson: 4, subject: 'ЗКИ', teacher: 'Агнетов', room: '502', week: 'lower' },
  { day: 3, lesson: 4, subject: 'Программирование', teacher: 'Агнетов', room: '306', week: 'upper' },
  { day: 4, lesson: 1, subject: 'Операционные системы', teacher: 'Козлов', room: '204', week: null },
  { day: 4, lesson: 2, subject: 'Базы данных', teacher: 'Иванова', room: '208', week: null },
  { day: 4, lesson: 3, subject: 'Программирование', teacher: 'Смирнов', room: '201', week: null },
  { day: 5, lesson: 1, subject: 'Математика', teacher: 'Петров', room: '105', week: null },
  { day: 5, lesson: 2, subject: 'Физическая культура', teacher: 'Волков', room: 'Стадион', week: null },
  { day: 5, lesson: 3, subject: 'Иностранный язык', teacher: 'Сидорова', room: '305', week: null },
  { day: 6, lesson: 1, subject: 'Программирование', teacher: 'Смирнов', room: '201', week: null },
  { day: 6, lesson: 2, subject: 'Базы данных', teacher: 'Иванова', room: '208', week: null },
] as const;

function* eachDate(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  for (let t = Date.UTC(fy, fm - 1, fd); t <= Date.UTC(ty, tm - 1, td); t += 86400000) {
    yield new Date(t).toISOString().slice(0, 10);
  }
}

function isoDow(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 + 1;
}

/** Ровно presentCount «present», распределённых равномерно по total занятиям. */
function spreadPresent(total: number, presentCount: number): boolean[] {
  const flags: boolean[] = [];
  for (let i = 0; i < total; i++) {
    const before = Math.floor((i * presentCount) / total);
    const after = Math.floor(((i + 1) * presentCount) / total);
    flags.push(after > before);
  }
  return flags;
}

/**
 * Подбирает целые оценки 1..10, чтобы среднее всех оценок студента
 * (существующих + новых) совпало с target. Число новых оценок выбирается
 * так, чтобы target * (existing + n) было целым — иначе AVG округлится.
 * Берётся наименьшее подходящее n, но не меньше MIN: иначе у студентов
 * с целым средним (4.0, 5.0) нашлась бы ровно одна оценка, и дневник
 * выглядел бы пустым.
 */
const MIN_MARKS = 4;

function planMarkValues(target: number, existingSum: number, existingCount: number): number[] {
  for (let n = MIN_MARKS; n <= 15; n++) {
    const want = target * (existingCount + n);
    if (!Number.isInteger(want)) continue;
    const need = want - existingSum;
    if (need < n || need > 10 * n) continue;
    const out = new Array<number>(n).fill(10);
    let sum = 10 * n;
    while (sum > need) {
      const i = out.findIndex((m) => m > 1);
      if (i === -1) break;
      out[i] -= 1;
      sum -= 1;
    }
    return out;
  }
  const base = Math.max(1, Math.min(10, Math.round(target)));
  return new Array<number>(6).fill(base);
}

interface StudentPlan {
  student: Student;
  present: boolean[];
  markAt: Map<number, number>;
}

async function main(): Promise<void> {
  await initDb();
  await seedUsers();

  const semesterStart = defaultSemesterStart();
  await setSemesterStart(semesterStart);
  const settings = await getSettings();
  const today = new Date().toISOString().slice(0, 10);
  logger.info(`Семестр: ${settings.semesterStart}, заполняю по ${today}`);

  // Явная пагинация: getAllStudents() по умолчанию возвращает только 50 записей,
  // и дозаполнение молча пропускало бы всё, что дальше первой страницы.
  const PAGE = 500;
  const students: Student[] = [];
  for (let page = 1; ; page++) {
    const batch = await getAllStudents(undefined, page, PAGE, 'fullName', 'asc');
    students.push(...batch.students);
    if (students.length >= batch.total || batch.students.length === 0) break;
  }
  if (students.length === 0) {
    logger.info('Студентов в базе нет — нечего дозаполнять.');
    process.exit(0);
  }
  const before = new Map(students.map((s) => [s.id, { a: s.attendance, p: s.performance }]));

  const byGroup = new Map<string, Student[]>();
  for (const s of students) {
    if (!byGroup.has(s.group)) byGroup.set(s.group, []);
    byGroup.get(s.group)!.push(s);
  }

  let lessons = 0;
  let filledSlots = 0;
  let marks = 0;

  for (const [group, members] of byGroup) {
    let entries = await getSchedule(group);
    if (entries.length === 0) {
      for (const t of SCHEDULE_TEMPLATE) {
        await createScheduleEntry({
          group,
          dayOfWeek: t.day,
          lessonNumber: t.lesson,
          subject: t.subject,
          teacher: t.teacher,
          room: t.room,
          week: t.week,
        });
      }
      entries = await getSchedule(group);
      lessons = entries.length;
      logger.info(`${group}: расписания не было, создано ${entries.length} занятий`);
    }

    const slots: { id: string; date: string }[] = [];
    for (const date of eachDate(semesterStart, today)) {
      const dow = isoDow(date);
      if (dow === 7) continue;
      const week = weekOfDate(date, semesterStart);
      const summaries = await getJournalSummaries(group, date, week);
      const byId = new Map(summaries.map((s) => [s.scheduleId, s]));
      for (const e of entries) {
        if (e.dayOfWeek !== dow) continue;
        if (e.week !== null && e.week !== week) continue;
        const s = byId.get(e.id);
        if (s && (s.marked > 0 || s.present + s.late + s.absent > 0)) continue;
        slots.push({ id: e.id, date });
      }
    }

    const plans: StudentPlan[] = [];
    for (const s of members) {
      const existing = await getMarksByStudent(s.id);
      const sum = existing.reduce((acc, m) => acc + m.mark, 0);
      const values = planMarkValues(s.performance, sum, existing.length);
      const markAt = new Map<number, number>();
      if (slots.length > 0 && values.length > 0) {
        values.forEach((v, i) => {
          const idx = values.length === 1 ? 0 : Math.round((i * (slots.length - 1)) / (values.length - 1));
          markAt.set(idx, v);
        });
      }
      const presentCount = Math.round((s.attendance * slots.length) / 100);
      plans.push({ student: s, present: spreadPresent(slots.length, presentCount), markAt });
      if (slots.length > 0) marks += markAt.size;
    }

    for (let i = 0; i < slots.length; i++) {
      const payload = plans.map((p) => {
        const isPresent = p.present[i];
        const status: AttendanceStatus = isPresent ? (i % 7 === 3 ? 'late' : 'present') : 'absent';
        const mark = p.markAt.get(i);
        return mark === undefined
          ? { studentId: p.student.id, status }
          : { studentId: p.student.id, status, mark };
      });
      await saveJournalLesson(slots[i].id, slots[i].date, payload);
      filledSlots++;
    }
    logger.info(`${group}: заполнено ${slots.length} занятий для ${members.length} студентов`);
  }

  const stats = await getStats();
  logger.info('--- итог ---');
  logger.info(`занятий создано: ${lessons}, заполнено отметками: ${filledSlots}, новых оценок: ${marks}`);
  logger.info(
    `студентов: ${stats.total}, с долгом: ${stats.withDebt}, ` +
    `успеваемость: ${stats.avgPerformance.toFixed(2)}, посещаемость: ${stats.avgAttendance.toFixed(1)}%`
  );

  logger.info('--- посещаемость и успеваемость до/после ---');
  for (const s of students) {
    const now = await getStudentById(s.id);
    const b = before.get(s.id)!;
    logger.info(
      `${s.group} ${s.fullName}: посещаемость ${b.a}% -> ${now?.attendance}%, ` +
      `успеваемость ${b.p} -> ${now?.performance}`
    );
  }
  process.exit(0);
}

main().catch((err) => {
  logger.error('Не удалось дозаполнить базу:', err);
  process.exit(1);
});
