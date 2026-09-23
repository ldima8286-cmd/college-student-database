import { test, expect } from '@playwright/test';

test('public showcase page loads without authentication', async ({ page }) => {
  await page.goto('/public');
  await expect(page.locator('text=Открытая статистика колледжа')).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('text=База данных учащихся')).toBeVisible();
});

test('unauthenticated user redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});

test('wrong password shows error', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'user@college.local');
  await page.fill('input[type="password"]', 'wrong-password');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Неверный email или пароль')).toBeVisible();
});

test('user can login and see their profile card', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'user@college.local');
  await page.fill('input[type="password"]', 'user123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Моя анкета')).toBeVisible();
});

test('admin can login and see admin panel', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@college.local');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin');
  await expect(page.locator('h1', { hasText: 'Админ-панель' })).toBeVisible();
});

test('forgot password page opens from login', async ({ page }) => {
  await page.goto('/login');
  await page.click('text=Забыли пароль?');
  await expect(page).toHaveURL(/forgot-password/);
  await expect(page.locator('text=Восстановление пароля')).toBeVisible();
});