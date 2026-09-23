import { getAllUsers, createUser } from './db.js';
import { hashPassword } from './auth.js';
import { env } from './env.js';
import { logger } from './logger.js';

export async function seedUsers(): Promise<void> {
  try {
    const users = await getAllUsers();

    if (!users.some((u) => u.role === 'admin')) {
      const adminEmail = env.ADMIN_EMAIL;
      const existing = users.find((u) => u.email === adminEmail);
      if (!existing) {
        await createUser({
          email: adminEmail,
          passwordHash: await hashPassword(env.ADMIN_PASSWORD),
          fullName: 'Администратор',
          role: 'admin',
        });
        logger.info(`Admin user seeded: ${adminEmail}`);
      }
    }

    if (!users.some((u) => u.email === env.USER_EMAIL)) {
      await createUser({
        email: env.USER_EMAIL,
        passwordHash: await hashPassword(env.USER_PASSWORD),
        fullName: 'Пользователь',
        role: 'user',
      });
      logger.info(`Default user seeded: ${env.USER_EMAIL}`);
    }

    if (!users.some((u) => u.email === env.CURATOR_EMAIL)) {
      await createUser({
        email: env.CURATOR_EMAIL,
        passwordHash: await hashPassword(env.CURATOR_PASSWORD),
        fullName: 'Куратор',
        role: 'curator',
        group: env.CURATOR_GROUP,
      });
      logger.info(`Curator seeded: ${env.CURATOR_EMAIL} -> ${env.CURATOR_GROUP}`);
    }

    await seedSubjects();
  } catch (err: any) {
    logger.error('Failed to seed users:', err.message);
  }
}

async function seedSubjects(): Promise<void> {
  try {
    const { listSubjects, createSubject } = await import('./db.js');
    const existing = await listSubjects();
    const names = ['Математика', 'Программирование', 'Базы данных', 'Операционные системы', 'Инженерная графика', 'Физическая культура', 'Иностранный язык'];
    for (const name of names) {
      if (!existing.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        await createSubject(name);
      }
    }
  } catch (err: any) {
    logger.error('Failed to seed subjects:', err.message);
  }
}