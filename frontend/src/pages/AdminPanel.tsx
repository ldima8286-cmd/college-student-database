import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  GraduationCap, LogOut, Home, Users, AlertTriangle, BarChart3,
  TrendingUp, BookOpen, LayoutGrid, Table,
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, X,
  Shield, Activity, Clock, Database, FileText, User,
} from 'lucide-react';
import { Student, SortField, SortOrder, ViewMode } from '../types';
import { getStudents, deleteStudent, toggleDebt, deleteAllStudents, getStats, logout, getAnalytics, batchDeleteStudents, batchExportStudents } from '../api';
import StudentForm from '../components/StudentForm';
import StudentTable from '../components/StudentTable';
import StudentCards from '../components/StudentCards';
import ConfirmDialog from '../components/ConfirmDialog';
import ThemeToggle from '../components/ThemeToggle';
import ImportExport from '../components/ImportExport';
import BatchActions from '../components/BatchActions';
import Pagination from '../components/Pagination';
import PdfExport from '../components/PdfExport';

export default function AdminPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<SortField>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterDebt, setFilterDebt] = useState<boolean | undefined>(undefined);
  const [filterCourse, setFilterCourse] = useState<number | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, s, a] = await Promise.all([
        getStudents({ search: debouncedSearch, page, limit: 20, sortBy, sortOrder, filterDebt, filterCourse }),
        getStats(),
        getAnalytics().catch(() => null),
      ]);
      setStudents(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStats(s);
      setAnalytics(a);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sortBy, sortOrder, filterDebt, filterCourse]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = (student: Student) => {
    setConfirmDialog({
      isOpen: true, title: 'Удалить студента?',
      message: `Вы уверены, что хотите удалить ${student.fullName}?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteStudent(student.id);
          toast.success('Студент удалён');
          loadData();
          if (editingStudent?.id === student.id) { setEditingStudent(null); setShowForm(false); }
        } catch (err: any) { toast.error(err.message); }
      },
    });
  };

  const handleToggleDebt = async (student: Student) => {
    try {
      await toggleDebt(student.id);
      toast.success(student.academicDebt ? 'Задолженность снята' : 'Задолженность добавлена');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteAll = () => {
    setConfirmDialog({
      isOpen: true, title: 'Удалить ВСЕХ студентов?',
      message: 'Это действие необратимо. Все записи будут удалены.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const count = await deleteAllStudents();
          toast.success(`Удалено ${count} записей`);
          loadData();
          setEditingStudent(null); setShowForm(false);
        } catch (err: any) { toast.error(err.message); }
      },
    });
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Вы вышли');
    window.location.href = '/login';
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await batchDeleteStudents(ids);
      toast.success(`Удалено ${ids.length} записей`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBatchExport = async (ids: string[]) => {
    try {
      const data = await batchExportStudents(ids);
      toast.success(`Экспортировано ${data.length} записей`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog((p) => ({ ...p, isOpen: false })); }}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />

      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Админ-панель</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/admin/audit" className="btn btn-ghost text-sm flex items-center gap-1">
                <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Аудит</span>
              </Link>
              <Link to="/admin/profile" className="btn btn-ghost text-sm flex items-center gap-1">
                <User className="w-4 h-4" />
              </Link>
              <Link to="/" className="btn btn-ghost text-sm flex items-center gap-1">
                <Home className="w-4 h-4" /> <span className="hidden sm:inline">Сайт</span>
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost text-sm flex items-center gap-1 text-red-600">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20">
              <Users className="w-8 h-8 text-primary-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-gray-500">Всего студентов</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.withDebt}</p>
                <p className="text-xs text-gray-500">С задолженностью</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20">
              <Activity className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgAttendance}%</p>
                <p className="text-xs text-gray-500">Посещаемость</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20">
              <TrendingUp className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgPerformance.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Успеваемость</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ImportExport onImportComplete={loadData} />
            <PdfExport students={students} />
            <select value={filterCourse ?? ''} onChange={(e) => { setFilterCourse(e.target.value ? Number(e.target.value) : undefined); setPage(1); }} className="input w-auto">
              <option value="">Все курсы</option>
              {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={c}>{c} курс</option>)}
            </select>

            <select value={filterDebt === undefined ? '' : filterDebt ? 'true' : 'false'} onChange={(e) => { setFilterDebt(e.target.value === '' ? undefined : e.target.value === 'true'); setPage(1); }} className="input w-auto">
              <option value="">Все</option>
              <option value="false">Без задолженности</option>
              <option value="true">С задолженностью</option>
            </select>

            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                <Table className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button onClick={() => { setEditingStudent(null); setShowForm(!showForm); }} className="btn btn-primary text-sm flex items-center gap-1">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">{showForm ? 'Закрыть' : 'Добавить'}</span>
            </button>

            <button onClick={handleDeleteAll} className="btn btn-danger text-sm flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Удалить всех</span>
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 animate-slide-down">
            <StudentForm
              editingStudent={editingStudent}
              onSuccess={() => { loadData(); setEditingStudent(null); setShowForm(false); }}
              onCancel={() => { setEditingStudent(null); setShowForm(false); }}
            />
          </div>
        )}

        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Найдено: {total} {total === 1 ? 'студент' : total < 5 ? 'студента' : 'студентов'}
        </div>

        <BatchActions
          students={students}
          onBatchDelete={handleBatchDelete}
          onBatchExport={handleBatchExport}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />

        {/* Table / Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Нет студентов</h3>
            <p className="text-gray-500">{debouncedSearch ? 'Измените запрос' : 'Добавьте первого студента'}</p>
          </div>
        ) : viewMode === 'table' ? (
          <StudentTable
            students={students} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
            onEdit={(s) => { setEditingStudent(s); setShowForm(true); }}
            onDelete={handleDelete} onToggleDebt={handleToggleDebt}
          />
        ) : (
          <StudentCards
            students={students}
            onEdit={(s) => { setEditingStudent(s); setShowForm(true); }}
            onDelete={handleDelete} onToggleDebt={handleToggleDebt}
          />
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

        {/* Analytics section */}
        {analytics && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.byCourse?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> По курсам
                </h3>
                <div className="space-y-3">
                  {analytics.byCourse.map((item: any) => (
                    <div key={item.course} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16">{item.course} курс</span>
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(item.count / analytics.stats.total) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{item.count}</span>
                      {item.withDebt > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
                          {item.withDebt} задолж.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.bySpecialty?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> По специальностям
                </h3>
                <div className="space-y-3">
                  {analytics.bySpecialty.slice(0, 8).map((item: any) => (
                    <div key={item.specialty} className="flex items-center gap-3">
                      <span className="text-sm font-medium truncate w-40" title={item.specialty}>{item.specialty}</span>
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(item.count / analytics.stats.total) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
