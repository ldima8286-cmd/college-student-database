import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

vi.mock('../api', () => ({
  login: vi.fn(),
}));

const renderLogin = () => render(
  <BrowserRouter><Login /></BrowserRouter>
);

describe('Login', () => {
  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('База данных учащихся')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument();
  });

  it('shows role buttons', () => {
    renderLogin();
    expect(screen.getByText('Пользователь')).toBeInTheDocument();
    expect(screen.getByText('Администратор')).toBeInTheDocument();
  });

  it('shows password hints', () => {
    renderLogin();
    expect(screen.getByText(/user123/)).toBeInTheDocument();
    expect(screen.getByText(/admin123/)).toBeInTheDocument();
  });
});
