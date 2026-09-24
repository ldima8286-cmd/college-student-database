import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { combine, timestamp, printf, colorize } = winston.format;

const logDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(timestamp(), logFormat),
    }),
  ],
});
