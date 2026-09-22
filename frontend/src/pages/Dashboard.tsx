import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Search, LogOut, Table, LayoutGrid,
  BookOpen, LogIn, User,
} from 'lucide-react';
import { Student, SortField, SortOrder, ViewMode } from '../types';
import { getStudents, getStats, toggleDebt, getRole, logout, isAdmin } from '../api';
import { toast } from 'react-hot-toast';
import StudentTable from '../components/StudentTable';
import StudentCards from '../components/StudentCards';
import StatsPanel from '../components/StatsPanel';
import ChartsPanel from '../components/ChartsPanel';
import ThemeToggle from '../components/ThemeToggle';
import ImportExport from '../components/ImportExport';
import Pagination from '../components/Pagination';
import InstallPWA from '../components/InstallPWA';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<SortField>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterDebt, setFilterDebt] = useState<boolean | undefined>(undefined);
  const [filterCourse, setFilterCourse] = useState<number | undefined>(undefined);
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();
  const role = getRole();
  const isUserAdmin = role === 'admin';

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, s] = await Promise.all([
        getStudents({ search: debouncedSearch, page, limit: 20, sortBy, sortOrder, filterDebt, filterCourse }),
        getStats(),
      ]);
      setStudents(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStats(s);
    } catch (err: any) {
      if (err.message.includes('авторизация') || err.message.includes('401')) {
        navigate('/login');
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sortBy, sortOrder, filterDebt, filterCourse, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleDebt = async (student: Student) => {
    try {
      await toggleDebt(student.id);
      toast.success(student.academicDebt ? 'Задолженность снята' : 'Задолженность добавлена');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Вы вышли');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-primary-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                База данных учащихся
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isUserAdmin
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {isUserAdmin ? 'Админ' : 'Просмотр'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <InstallPWA />
              {isUserAdmin && (
                <Link to="/admin/profile" className="btn btn-ghost text-sm flex items-center gap-1">
                  <User className="w-4 h-4" />
                </Link>
              )}
              {isUserAdmin && (
                <Link to="/admin" className="btn btn-primary text-sm">
                  Управление
                </Link>
              )}
              <button onClick={handleLogout} className="btn btn-ghost text-sm flex items-center gap-1 text-red-600">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatsPanel stats={stats} /><ChartsPanel stats={stats} />

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImportExport onImportComplete={loadData} />
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Курс</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setFilterCourse(undefined); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCourse === undefined ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                Все
              </button>
              {[1, 2, 3, 4, 5, 6].map(c => (
                <button key={c} onClick={() => { setFilterCourse(c); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCourse === c ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по ФИО, группе, специальности..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select value={filterCourse ?? ''} onChange={(e) => { setFilterCourse(e.target.value ? Number(e.target.value) : undefined); setPage(1); }} className="input w-auto">
                <option value="">Все курсы</option>
                {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={c}>{c} курс</option>)}
              </select>
              <select value={filterDebt === undefined ? '' : filterDebt ? 'true' : 'false'} onChange={(e) => { setFilterDebt(e.target.value === '' ? undefined : e.target.value === 'true'); setPage(1); }} className="input w-auto">
                <option value="">Все студенты</option>
                <option value="false">Без задолженности</option>
                <option value="true">С задолженностью</option>
              </select>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  <Table className="w-4 h-4" /> Таблица
                </button>
                <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  <LayoutGrid className="w-4 h-4" /> Карточки
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Найдено: {total} {total === 1 ? 'студент' : total < 5 ? 'студента' : 'студентов'}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Нет студентов</h3>
            <p className="text-gray-500">
              {debouncedSearch ? 'Попробуйте изменить поисковый запрос' : 'Нет записей для отображения'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <StudentTable
            students={students} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
            onEdit={() => {}} onDelete={() => {}} onToggleDebt={handleToggleDebt}
            readOnly={!isUserAdmin}
          />
        ) : (
          <StudentCards
            students={students}
            onEdit={() => {}} onDelete={() => {}} onToggleDebt={handleToggleDebt}
            readOnly={!isUserAdmin}
          />
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </main>
    </div>
  );
}
