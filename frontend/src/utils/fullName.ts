const ALLOWED_CHARS = /[^\p{L}\s'’.\-]/gu;

export function sanitizeFullName(input: string): string {
  return input
    .replace(ALLOWED_CHARS, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function isValidFullName(input: string): boolean {
  if (!input) return false;
  if (input.length < 2 || input.length > 200) return false;
  if (!/\p{L}/u.test(input)) return false;
  return /^[\p{L}\s'’.\-]+$/u.test(input);
}