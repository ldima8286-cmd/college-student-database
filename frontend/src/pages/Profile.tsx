import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Save, Lock, Loader2, Camera } from 'lucide-react';
import { getMe, updateProfile, changePassword, isAdmin } from '../api';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { sanitizePhone, PHONE_MAX_LENGTH, isValidPhone } from '../utils/phone';
import { sanitizeFullName, isValidFullName } from '../utils/fullName';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getMe();
        setUser(data);
        setFullName(data.fullName || '');
        setPhone(data.phone || '');
        setAvatar(data.avatar || '');
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 2MB)');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone && !isValidPhone(phone)) {
      toast.error('Телефон: только цифры, максимум 12');
      return;
    }
    if (!isValidFullName(fullName)) {
      toast.error('ФИО: только буквы, пробел, тире и точка');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ fullName, phone, avatar: avatar || null });
      toast.success('Профиль обновлён');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Минимум 6 символов');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({ oldPassword, newPassword });
      toast.success('Пароль изменён');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to={isAdmin() ? '/admin' : '/'} className="btn btn-ghost text-sm flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <User className="w-6 h-6 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Профиль</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <form onSubmit={handleSaveProfile} className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Личные данные</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary-600 text-white cursor-pointer hover:bg-primary-700 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize mb-1">{user?.role}</p>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Убрать фото
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">ФИО</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(sanitizeFullName(e.target.value))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Телефон</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                className="input"
                placeholder="+375 (__) ___-__-__"
                maxLength={PHONE_MAX_LENGTH}
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary mt-4 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Изменить пароль
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">Текущий пароль</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Подтвердите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={changingPassword} className="btn btn-primary mt-4 flex items-center gap-2">
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {changingPassword ? 'Изменение...' : 'Изменить пароль'}
          </button>
        </form>
      </main>
    </div>
  );
}
