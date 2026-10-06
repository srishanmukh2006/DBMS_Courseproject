import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarRange,
  Building2,
  Users,
  Clock,
  CalendarClock,
  FileText,
  BarChart3,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
} from 'lucide-react';
import { ModulePageId, SqlLogEntry, ToastNotification } from './types';
import { onSqlExecuted, apiRequest } from './api';
import { SqlConsolePanel } from './components/SqlConsolePanel';
import { DashboardPage } from './pages/DashboardPage';
import { MarkAttendancePage } from './pages/MarkAttendancePage';
import { LeaveManagementPage } from './pages/LeaveManagementPage';
import {
  DepartmentsPage,
  EmployeesPage,
  ShiftsPage,
  ShiftAssignmentsPage,
  LeaveTypesPage,
} from './pages/EntityCrudPages';
import { ReportsPage } from './pages/ReportsPage';
import { VivaDocsPage } from './pages/VivaDocsPage';

interface NavItem {
  id: ModulePageId;
  label: string;
  tableBadge?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'operations' | 'tables' | 'analytics';
}

const SIDEBAR_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    icon: LayoutDashboard,
    group: 'operations',
  },
  {
    id: 'mark-attendance',
    label: 'Mark Attendance',
    tableBadge: 'Attendance',
    icon: CalendarCheck,
    group: 'operations',
  },
  {
    id: 'leave-management',
    label: 'Leave Management',
    tableBadge: 'Leave_Request',
    icon: CalendarRange,
    group: 'operations',
  },
  {
    id: 'departments',
    label: 'Departments',
    tableBadge: 'Department',
    icon: Building2,
    group: 'tables',
  },
  {
    id: 'employees',
    label: 'Employees',
    tableBadge: 'Employee',
    icon: Users,
    group: 'tables',
  },
  {
    id: 'shifts',
    label: 'Work Shifts',
    tableBadge: 'Shift',
    icon: Clock,
    group: 'tables',
  },
  {
    id: 'shift-assignments',
    label: 'Shift Assignments',
    tableBadge: 'Shift_Assignment',
    icon: CalendarClock,
    group: 'tables',
  },
  {
    id: 'leave-types',
    label: 'Leave Types',
    tableBadge: 'Leave_Type',
    icon: FileText,
    group: 'tables',
  },
  {
    id: 'reports',
    label: 'Reports & Presentation-II',
    icon: BarChart3,
    group: 'analytics',
  },
  {
    id: 'viva-docs',
    label: 'Viva & REST API SQL',
    icon: BookOpen,
    group: 'analytics',
  },
];

export const DashboardLayout: React.FC = () => {
  const [activePage, setActivePage] = useState<ModulePageId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastQuery, setLastQuery] = useState<SqlLogEntry | null>(null);
  const [queryHistory, setQueryHistory] = useState<SqlLogEntry[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Subscribe to all executed SQL queries across API calls
  useEffect(() => {
    const unsubscribe = onSqlExecuted((log) => {
      setLastQuery(log);
      setQueryHistory((prev) => [log, ...prev.filter((item) => item.id !== log.id)].slice(0, 40));
    });

    // Also load initial SQL history from backend
    apiRequest('/api/sql-history')
      .then((res) => {
        if (res.history?.length > 0) {
          setQueryHistory(res.history);
          setLastQuery((prev) => prev || res.history[0]);
        }
      })
      .catch(() => {});

    return unsubscribe;
  }, []);

  const showToast = useCallback(
    (
      type: 'success' | 'error',
      title: string,
      message: string,
      sqlPreview?: string
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [{ id, type, title, message, sqlPreview }, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavClick = (page: ModulePageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark — 5 Clean Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
            aria-label="Toggle sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('dashboard');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            ChronosDBMS
          </a>
        </div>

        {/* Zone 2: 5 Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
              activePage === 'dashboard' ? 'text-slate-900 font-semibold underline' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('mark-attendance')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
              activePage === 'mark-attendance' ? 'text-slate-900 font-semibold underline' : ''
            }`}
          >
            Mark Attendance
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('leave-management')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
              activePage === 'leave-management' ? 'text-slate-900 font-semibold underline' : ''
            }`}
          >
            Leave Management
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('reports')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
              activePage === 'reports' ? 'text-slate-900 font-semibold underline' : ''
            }`}
          >
            Reports
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('viva-docs')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
              activePage === 'viva-docs' ? 'text-slate-900 font-semibold underline' : ''
            }`}
          >
            Viva & API SQL
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleNavClick('mark-attendance')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            + Log Attendance
          </button>
        </div>
      </header>

      {/* Main Workspace Container: Sidebar (260px) + Content Viewport */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 w-64 shadow-xl' : 'hidden'
          } lg:static lg:block lg:w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between overflow-y-auto`}
        >
          <div className="p-4 space-y-6">
            {/* Group 1: Core Modules & Extra Screens */}
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400">
                Core Operations
              </div>
              <div className="space-y-1">
                {SIDEBAR_ITEMS.filter((i) => i.group === 'operations').map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.tableBadge && (
                        <span
                          className={`font-mono text-[10px] ${
                            active ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {item.tableBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Entity Tables (INSERT / VIEW / DELETE) */}
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400">
                Database Entity Tables (CRUD)
              </div>
              <div className="space-y-1">
                {SIDEBAR_ITEMS.filter((i) => i.group === 'tables').map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.tableBadge && (
                        <span
                          className={`font-mono text-[10px] ${
                            active ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {item.tableBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 3: Analytical Queries & Viva Documentation */}
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400">
                SQL Reports & Viva Reference
              </div>
              <div className="space-y-1">
                {SIDEBAR_ITEMS.filter((i) => i.group === 'analytics').map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quiet Schema Summary in Sidebar Footer */}
          <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-800">DBMS Course Project</div>
            <div>7 Normalized Tables · 3NF Schema</div>
            <div className="font-mono text-[11px] text-slate-400">
              mysql2 Pool · Parameterized SQL
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1320px] mx-auto w-full">
          {activePage === 'dashboard' && (
            <DashboardPage onNavigate={handleNavClick} onShowToast={showToast} />
          )}
          {activePage === 'mark-attendance' && (
            <MarkAttendancePage onShowToast={showToast} />
          )}
          {activePage === 'leave-management' && (
            <LeaveManagementPage onShowToast={showToast} />
          )}
          {activePage === 'departments' && <DepartmentsPage onShowToast={showToast} />}
          {activePage === 'employees' && <EmployeesPage onShowToast={showToast} />}
          {activePage === 'shifts' && <ShiftsPage onShowToast={showToast} />}
          {activePage === 'shift-assignments' && (
            <ShiftAssignmentsPage onShowToast={showToast} />
          )}
          {activePage === 'leave-types' && <LeaveTypesPage onShowToast={showToast} />}
          {activePage === 'reports' && <ReportsPage onShowToast={showToast} />}
          {activePage === 'viva-docs' && <VivaDocsPage />}
        </main>
      </div>

      {/* Live SQL Console / Last Executed Query Panel (Docked at bottom for Viva Demo) */}
      <div className="sticky bottom-0 z-30">
        <SqlConsolePanel
          lastQuery={lastQuery}
          queryHistory={queryHistory}
          onClearHistory={() => setQueryHistory([])}
        />
      </div>

      {/* Toast Notification Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white border rounded-xl p-4 shadow-lg flex items-start gap-3 ${
                t.type === 'error' ? 'border-rose-300' : 'border-emerald-300'
              }`}
            >
              {t.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-xs font-semibold text-slate-900">{t.title}</div>
                <div className="text-xs text-slate-600">{t.message}</div>
                {t.sqlPreview && (
                  <div className="font-mono text-[11px] text-sky-300 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 truncate">
                    {t.sqlPreview}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="p-1 text-slate-400 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
