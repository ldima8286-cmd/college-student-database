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
  } catch (err: any) {
    logger.error('Failed to seed users:', err.message);
  }
}