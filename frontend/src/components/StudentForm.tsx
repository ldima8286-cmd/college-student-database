import { useState, useEffect } from 'react';
import { Student } from '../types';
import { createStudent, updateStudent } from '../api';
import { toast } from 'react-hot-toast';
import { Save, X, User, BookOpen, Users, Percent, GraduationCap, Mail, Phone } from 'lucide-react';

interface Props {
  editingStudent: Student | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const emptyForm = {
  fullName: '',
  course: 1,
  group: '',
  specialty: '',
  attendance: 100,
  performance: 4.0,
  academicDebt: false,
  email: '',
  phone: '',
};

export default function StudentForm({ editingStudent, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingStudent) {
      const { id, createdAt, updatedAt, ...rest } = editingStudent;
      setForm({ ...rest, email: rest.email || '', phone: rest.phone || '' });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [editingStudent]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Введите ФИО';
    else if (form.fullName.trim().length < 2) errs.fullName = 'Минимум 2 символа';
    if (!form.group.trim()) errs.group = 'Введите группу';
    if (!form.specialty.trim()) errs.specialty = 'Введите специальность';
    if (form.attendance < 0 || form.attendance > 100) errs.attendance = '0-100';
    if (form.performance < 0 || form.performance > 5) errs.performance = '0-5';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Некорректный email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      ...form,
      email: form.email?.trim() ? form.email.trim() : null,
      phone: form.phone?.trim() ? form.phone.trim() : null,
    };
    try {
      setSubmitting(true);
      if (editingStudent) {
        await updateStudent(editingStudent.id, payload);
        toast.success('Студент обновлён');
      } else {
        await createStudent(payload);
        toast.success('Студент добавлен');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {editingStudent ? (
          <><GraduationCap className="w-5 h-5 text-primary-600" /> Редактировать студента</>
        ) : (
          <><GraduationCap className="w-5 h-5 text-primary-600" /> Новый студент</>
        )}
      </h3>
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
            className={`input ${errors.email ? 'border-red-500' : ''}`} placeholder="student@example.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Телефон</label>
          <input type="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input" placeholder="+7 (___) ___-__-__" />
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" /> Посещаемость: {form.attendance}%
          </label>
          <input type="range" min="0" max="100" value={form.attendance}
            onChange={(e) => setForm({ ...form, attendance: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className={`font-medium ${form.attendance >= 90 ? 'text-emerald-600' : form.attendance >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
              {form.attendance}%
            </span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Успеваемость: {form.performance.toFixed(1)}
          </label>
          <input type="range" min="0" max="5" step="0.1" value={form.performance}
            onChange={(e) => setForm({ ...form, performance: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span className={`font-medium ${form.performance >= 4.5 ? 'text-emerald-600' : form.performance >= 3.5 ? 'text-amber-600' : 'text-red-600'}`}>
              {form.performance.toFixed(1)}
            </span>
            <span>5.0</span>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" checked={form.academicDebt}
                onChange={(e) => setForm({ ...form, academicDebt: e.target.checked })} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-red-500 transition-colors"></div>
              <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-full transition-transform"></div>
            </div>
            <span className="text-sm font-medium">Академическая задолженность</span>
          </label>
        </div>

        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2">
            {submitting ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : <Save className="w-4 h-4" />}
            {submitting ? 'Сохранение...' : editingStudent ? 'Сохранить' : 'Добавить'}
          </button>
          {editingStudent && (
            <button type="button" onClick={onCancel} className="btn btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
