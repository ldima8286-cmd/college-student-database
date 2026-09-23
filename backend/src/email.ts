import nodemailer from 'nodemailer';
import { env } from './env.js';
import { logger } from './logger.js';

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.info(`[email] (SMTP not configured) To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err: any) {
    logger.error(`Email failed to ${to}: ${err.message}`);
  }
}

export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  await sendMail(
    userEmail,
    'Добро пожаловать в систему учёта студентов',
    `<h2>Здравствуйте, ${userName}!</h2><p>Ваш аккаунт успешно создан в системе учёта студентов колледжа.</p>`
  );
}

export async function sendDebtNotification(studentEmail: string, studentName: string): Promise<void> {
  await sendMail(
    studentEmail,
    'Уведомление о задолженности',
    `<h2>Уважаемый(ая) ${studentName}!</h2><p>Сообщаем, что у вас имеется академическая задолженность. Просим связаться с учебной частью.</p>`
  );
}

export async function sendPasswordResetEmail(userEmail: string, resetUrl: string): Promise<void> {
  await sendMail(
    userEmail,
    'Восстановление пароля',
    `<h2>Восстановление пароля</h2><p>Для сброса пароля перейдите по ссылке (действует 15 минут):</p>
     <p><a href="${resetUrl}">Сбросить пароль</a></p>
     <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>`
  );
}