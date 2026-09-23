import { useEffect, useState } from 'react';
import { Student } from '../types';
import { getMyStudent, saveMyStudent, getMe } from '../api';
import { toast } from 'react-hot-toast';
import { Save, X, User, BookOpen, Users, Mail, Phone, IdCard, Clock, CheckCircle2, Pencil } from 'lucide-react';
import { sanitizePhone, PHONE_MAX_LENGTH, isValidPhone } from '../utils/phone';

const emptyForm = {
  fullName: '',
  course: 1,
  group: '',
  specialty: '',
  email: '',
  phone: '',
};

export default function MyStudentCard() {
  const [card, setCard] = useState<Student | null>(null);
  const [profile, setProfile] = useState<{ fullName?: string; email?: string }>({});
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const [c, me] = await Promise.all([getMyStudent(), getMe().catch(() => null)]);
      setCard(c);
      setProfile(me || {});
      if (c) {
        setForm({
          fullName: c.fullName,
          course: c.course,
          group: c.group,
          specialty: c.specialty,
          email: c.email || '',
          phone: c.phone || '',
        });
      } else if (me) {
        setForm((f) => ({ ...f, fullName: f.fullName || me.fullName || '', email: f.email || me.email || '' }));
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите ФИО';
    else if (form.fullName.trim().length < 2) errs.fullName = 'Минимум 2 символа';
    if (!form.group.trim()) errs.group = 'Введите группу';
    if (!form.specialty.trim()) errs.specialty = 'Введите специальность';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Некорректный email';
    if (form.phone && !isValidPhone(form.phone)) errs.phone = 'Телефон: только цифры, максимум 15';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const saved = await saveMyStudent({
        fullName: form.fullName.trim(),
        course: form.course,
        group: form.group.trim(),
        specialty: form.specialty.trim(),
        email: form.email?.trim() ? form.email.trim() : null,
        phone: form.phone?.trim() ? form.phone.trim() : null,
      });
      setCard(saved);
      setEditing(false);
      toast.success('Анкета отправлена на модерацию');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const statusBadge = (s?: string) =>
    s === 'pending'
      ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"><Clock className="w-3 h-3" /> На модерации</span>
      : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Активна</span>;

  if (card && !editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <IdCard className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{card.fullName}</h2>
                <p className="text-sm text-gray-500">Моя анкета студента</p>
              </div>
            </div>
            {statusBadge(card.status)}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="sm:col-span-2">
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Специальность</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{card.specialty}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Курс</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{card.course}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Группа</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{card.group}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Email</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{card.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Телефон</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{card.phone || '—'}</dd>
            </div>
          </dl>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {card.status === 'pending'
                ? 'Анкета ожидает проверки администратора. Редактирование отправит её на повторную модерацию.'
                : 'Анкета подтверждена администратором. Изменения требуют повторного подтверждения.'}
            </p>
            <button onClick={() => setEditing(true)} className="btn btn-secondary text-sm flex items-center gap-1.5">
              <Pencil className="w-4 h-4" /> Изменить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <IdCard className="w-5 h-5 text-primary-600" />
          Анкета студента
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Заполните данные. Анкета будет отправлена администратору на проверку, а после одобрения появится в базе.
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> ФИО *</label>
            <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={`input ${errors.fullName ? 'border-red-500' : ''}`} placeholder="Иванов Иван Иванович" />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Курс *</label>
            <select value={form.course} onChange={(e) => setForm({ ...form, course: Number(e.target.value) })} className="input">
              {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={c}>{c} курс</option>)}
            </select>
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Группа *</label>
            <input type="text" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}
              className={`input ${errors.group ? 'border-red-500' : ''}`} placeholder="ПРИ-21" />
            {errors.group && <p className="text-red-500 text-xs mt-1">{errors.group}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Специальность *</label>
            <input type="text" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className={`input ${errors.specialty ? 'border-red-500' : ''}`} placeholder="Программирование" />
            {errors.specialty && <p className="text-red-500 text-xs mt-1">{errors.specialty}</p>}
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</label>
            <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`input ${errors.email ? 'border-red-500' : ''}`} placeholder={profile.email || 'student@example.com'} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Телефон</label>
            <input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
              className={`input ${errors.phone ? 'border-red-500' : ''}`} placeholder="+7 (___) ___-__-__" maxLength={PHONE_MAX_LENGTH} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2">
              {submitting
                ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                : <Save className="w-4 h-4" />}
              {submitting ? 'Сохранение...' : 'Отправить на модерацию'}
            </button>
            {card && (
              <button type="button" onClick={() => { setEditing(false); }} className="btn btn-secondary flex items-center gap-2">
                <X className="w-4 h-4" /> Отмена
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}