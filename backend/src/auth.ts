import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it-in-production';

export interface UserPayload {
  id: string;
  username: string;
  role: 'admin' | 'teacher';
  fullName: string;
  groupFilter?: string;
}

export const generateToken = (user: UserPayload): string => {
  return jwt.sign(user, SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    return jwt.verify(token, SECRET) as UserPayload;
  } catch {
    return null;
  }
};