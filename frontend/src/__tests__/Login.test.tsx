import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../api', () => ({
  login: vi.fn(),
}));

import { login } from '../api';
import Login from '../pages/Login';

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('База данных учащихся')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Войти/ })).toBeInTheDocument();
  });

  it('shows validation error on empty submit', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Войти/ }));
    await waitFor(() => expect(screen.getByText('Введите email и пароль')).toBeInTheDocument());
  });

  it('navigates to admin panel on successful admin login', async () => {
    (login as any).mockResolvedValue({ role: 'admin' });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>HOME_PLACEHOLDER</div>} />
          <Route path="/admin" element={<div>ADMIN_PLACEHOLDER</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'admin@college.local' } });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /Войти/ }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('admin@college.local', 'admin123'));
    await waitFor(() => expect(screen.getByText('ADMIN_PLACEHOLDER')).toBeInTheDocument());
  });

  it('shows error when credentials are invalid', async () => {
    (login as any).mockRejectedValue(new Error('Неверный email или пароль'));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'bad@test.local' } });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Войти/ }));

    await waitFor(() => expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument());
  });
});