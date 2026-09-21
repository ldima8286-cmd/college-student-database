import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('text=База данных учащихся')).toBeVisible();
});

test('user can login as viewer', async ({ page }) => {
  await page.goto('/login');
  await page.click('text=Пользователь');
  await page.fill('input[type="password"]', 'user123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Просмотр')).toBeVisible();
});

test('admin can login and see management', async ({ page }) => {
  await page.goto('/login');
  await page.click('text=Администратор');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Управление')).toBeVisible();
});

test('wrong password shows error', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="password"]', 'wrong');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Неверный пароль')).toBeVisible();
});

test('unauthenticated user redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});
