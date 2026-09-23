export const PHONE_MAX_LENGTH = 16; // '+' + до 15 цифр
export const PHONE_MAX_DIGITS = 15;

export function sanitizePhone(input: string): string {
  const hasPlus = input.startsWith('+');
  const digits = input.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
  return `${hasPlus ? '+' : ''}${digits}`.slice(0, PHONE_MAX_LENGTH);
}

export function formatStoredPhone(input: string | null | undefined): string {
  return input ?? '';
}

export function isValidPhone(input: string): boolean {
  if (!input) return true;
  if (input.length > PHONE_MAX_LENGTH) return false;
  return /^\+?[\d\s()-]*$/.test(input) && input.replace(/\D/g, '').length <= PHONE_MAX_DIGITS;
}