import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ArrowUpDown,
  Building2,
  Users,
  Clock,
  CalendarClock,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../api';
import {
  Department,
  Employee,
  Shift,
  ShiftAssignment,
  LeaveType,
} from '../types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { EditEmployeeModal } from '../components/EditEmployeeModal';

interface CrudPageProps {
  onShowToast: (
    type: 'success' | 'error',
    title: string,
    message: string,
    sqlPreview?: string
  ) => void;
}

/* ============================================================================
 * 1. DEPARTMENTS PAGE (`Department` Table)
 * ============================================================================ */
export const DepartmentsPage: React.FC<CrudPageProps> = ({ onShowToast }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [location, setLocation] = useState('');
  const [managerName, setManagerName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dept_id' | 'dept_name' | 'employee_count'>('dept_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/departments');
      setDepartments(res.data || []);
    } catch (err: any) {
      onShowToast('error', 'Failed to load departments', err.message);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/departments', {
        method: 'POST',
        body: JSON.stringify({
          dept_name: deptName,
          dept_code: deptCode,
          location,
          manager_name: managerName,
        }),
      });
      onShowToast('success', 'Department Inserted', res.message, res.sqlLog?.interpolatedSql);
      setDeptName('');
      setDeptCode('');
      setLocation('');
      setManagerName('');
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Insert Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/departments/${deleteTarget.dept_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Department Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Foreign Key Constraint Blocked Deletion', err.message, err.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return departments
      .filter(
        (d) =>
          !searchQuery.trim() ||
          d.dept_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.dept_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.manager_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const factor = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'dept_name') return a.dept_name.localeCompare(b.dept_name) * factor;
        if (sortBy === 'employee_count')
          return ((a.employee_count || 0) - (b.employee_count || 0)) * factor;
        return (a.dept_id - b.dept_id) * factor;
      });
  }, [departments, searchQuery, sortBy, sortDir]);

  const toggleSort = (col: 'dept_id' | 'dept_name' | 'employee_count') => {
    if (sortBy === col) setSortDir((p) => (p === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Departments Master (<span className="font-mono text-xl">Department</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Insert new departments, view dynamic employee counts via <span className="font-mono text-xs">LEFT JOIN Employee</span>, and test <span className="font-mono text-xs">ON DELETE RESTRICT</span> foreign key protection.
        </p>
      </div>

      {/* INSERT FORM */}
      <form
        onSubmit={handleInsert}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">
              INSERT INTO Department
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            PRIMARY KEY: dept_id · UNIQUE: dept_name, dept_code
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department Name (<span className="font-mono">dept_name</span>) *
            </label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g., Cloud Analytics"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department Code (<span className="font-mono">dept_code</span>) *
            </label>
            <input
              type="text"
              required
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              placeholder="e.g., CLD-06"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location (<span className="font-mono">location</span>) *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Block B, Floor 3"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department Head (<span className="font-mono">manager_name</span>) *
            </label>
            <input
              type="text"
              required
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="e.g., Siddharth Menon"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Inserting...' : 'Insert Department'}</span>
          </button>
        </div>
      </form>

      {/* VIEW TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Department Records ({filtered.length} rows)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Try deleting a department with &gt;0 employees vs a newly inserted empty department to demonstrate Foreign Key constraints.
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, code, manager..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('dept_id')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>dept_id (PK)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('dept_name')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Department Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Manager Name</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('employee_count')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Employees (LEFT JOIN)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading Department table...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching departments found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.dept_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{d.dept_id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{d.dept_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{d.dept_code}</td>
                    <td className="py-2.5 px-4 text-slate-600">{d.location}</td>
                    <td className="py-2.5 px-4 text-slate-700">{d.manager_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-800 tabular-nums">
                      {d.employee_count ?? 0} employee(s)
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(d)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        tableName="Department"
        primaryKeyColumn="dept_id"
        primaryKeyValue={deleteTarget?.dept_id || ''}
        recordLabel={deleteTarget ? `${deleteTarget.dept_name} (${deleteTarget.dept_code})` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};

/* ============================================================================
 * 2. EMPLOYEES PAGE (`Employee` Table)
 * ============================================================================ */
export const EmployeesPage: React.FC<CrudPageProps> = ({ onShowToast }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState(todayStr);
  const [designation, setDesignation] = useState('');
  const [deptId, setDeptId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'emp_id' | 'first_name' | 'hire_date'>('emp_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        apiRequest('/api/employees'),
        apiRequest('/api/departments'),
      ]);
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
      if (!deptId && deptRes.data?.length > 0) {
        setDeptId(String(deptRes.data[0].dept_id));
      }
    } catch (err: any) {
      onShowToast('error', 'Failed to load employees', err.message);
    } finally {
      setLoading(false);
    }
  }, [deptId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          hire_date: hireDate,
          designation,
          dept_id: Number(deptId),
        }),
      });
      onShowToast('success', 'Employee Inserted', res.message, res.sqlLog?.interpolatedSql);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setDesignation('');
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Insert Employee Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/employees/${deleteTarget.emp_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Employee Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast(
        'error',
        'Foreign Key Constraint Blocked Deletion',
        err.message,
        err.sqlLog?.interpolatedSql
      );
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (updatedData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    hire_date: string;
    designation: string;
    dept_id: number;
  }) => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const res = await apiRequest(`/api/employees/${editTarget.emp_id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      });
      onShowToast('success', 'Employee Details Updated', res.message, res.sqlLog?.interpolatedSql);
      setEditTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message, err.sqlLog?.interpolatedSql);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return employees
      .filter((emp) => {
        const matchesSearch =
          !searchQuery.trim() ||
          `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(emp.emp_id).includes(searchQuery);
        const matchesDept = deptFilter === 'ALL' || String(emp.dept_id) === deptFilter;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        const factor = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'first_name') return a.first_name.localeCompare(b.first_name) * factor;
        if (sortBy === 'hire_date') return a.hire_date.localeCompare(b.hire_date) * factor;
        return (a.emp_id - b.emp_id) * factor;
      });
  }, [employees, searchQuery, deptFilter, sortBy, sortDir]);

  const toggleSort = (col: 'emp_id' | 'first_name' | 'hire_date') => {
    if (sortBy === col) setSortDir((p) => (p === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Employees Directory (<span className="font-mono text-xl">Employee</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Insert employee master records with <span className="font-mono text-xs">dept_id</span> foreign key dropdown populated from <span className="font-mono text-xs">Department</span>, and inspect the joined view.
        </p>
      </div>

      {/* INSERT FORM */}
      <form
        onSubmit={handleInsert}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">
              INSERT INTO Employee
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              First Name (<span className="font-mono">first_name</span>) *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g., Tanvi"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Last Name (<span className="font-mono">last_name</span>) *
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g., Deshmukh"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email (<span className="font-mono">email</span> UNIQUE) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tanvi.d@chronoscorp.in"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone (<span className="font-mono">phone</span>) *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91-98201-44120"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hire Date (<span className="font-mono">hire_date</span>) *
            </label>
            <input
              type="date"
              required
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Designation (<span className="font-mono">designation</span>) *
            </label>
            <input
              type="text"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g., Data Engineer"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department (Foreign Key <span className="font-mono">dept_id</span>) *
            </label>
            <select
              required
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  #{d.dept_id} · {d.dept_name} ({d.dept_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Inserting...' : 'Insert Employee'}</span>
          </button>
        </div>
      </form>

      {/* VIEW TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Employees Joined View ({filtered.length} rows)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SQL: <span className="font-mono">SELECT e.*, d.dept_name, d.dept_code FROM Employee e INNER JOIN Department d ON e.dept_id = d.dept_id</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, role..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.dept_id} value={String(d.dept_id)}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('emp_id')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>emp_id (PK)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('first_name')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Full Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Department (FK dept_id)</th>
                <th className="py-3 px-4">Email & Phone</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('hire_date')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Hire Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading Employee table...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching employees found.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.emp_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{emp.emp_id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{emp.designation}</td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {emp.dept_name}{' '}
                      <span className="font-mono text-slate-500 tabular-nums">
                        (dept_id: {emp.dept_id})
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-slate-800">{emp.email}</div>
                      <div className="font-mono text-slate-500 tabular-nums">{emp.phone}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {emp.hire_date}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditTarget(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 rounded transition-colors"
                          title="Edit Employee Names & Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditEmployeeModal
        isOpen={Boolean(editTarget)}
        employee={editTarget}
        departments={departments}
        onSave={handleSaveEdit}
        onClose={() => setEditTarget(null)}
        isSaving={isSaving}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        tableName="Employee"
        primaryKeyColumn="emp_id"
        primaryKeyValue={deleteTarget?.emp_id || ''}
        recordLabel={
          deleteTarget
            ? `${deleteTarget.first_name} ${deleteTarget.last_name} (Emp #${deleteTarget.emp_id})`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};

/* ============================================================================
 * 3. SHIFTS PAGE (`Shift` Table)
 * ============================================================================ */
export const ShiftsPage: React.FC<CrudPageProps> = ({ onShowToast }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:30');
  const [graceMins, setGraceMins] = useState('15');

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/shifts');
      setShifts(res.data || []);
    } catch (err: any) {
      onShowToast('error', 'Failed to load shifts', err.message);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/shifts', {
        method: 'POST',
        body: JSON.stringify({
          shift_name: shiftName,
          start_time: startTime,
          end_time: endTime,
          grace_mins: Number(graceMins),
        }),
      });
      onShowToast('success', 'Shift Inserted', res.message, res.sqlLog?.interpolatedSql);
      setShiftName('');
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Insert Shift Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/shifts/${deleteTarget.shift_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Shift Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast(
        'error',
        'Foreign Key Constraint Blocked Deletion',
        err.message,
        err.sqlLog?.interpolatedSql
      );
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = shifts.filter(
    (s) =>
      !searchQuery.trim() || s.shift_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Work Shifts Configuration (<span className="font-mono text-xl">Shift</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure shift schedules, start/end times, and grace periods (<span className="font-mono text-xs">CHECK grace_mins BETWEEN 0 AND 120</span>).
        </p>
      </div>

      <form
        onSubmit={handleInsert}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">INSERT INTO Shift</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            PRIMARY KEY: shift_id · UNIQUE: shift_name
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shift Name (<span className="font-mono">shift_name</span>) *
            </label>
            <input
              type="text"
              required
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="e.g., Weekend Support Shift"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Start Time (<span className="font-mono">start_time</span>) *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              End Time (<span className="font-mono">end_time</span>) *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Grace Period Mins (<span className="font-mono">grace_mins</span>) *
            </label>
            <input
              type="number"
              min={0}
              max={120}
              required
              value={graceMins}
              onChange={(e) => setGraceMins(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Inserting...' : 'Insert Shift'}</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900">
            Shift Records ({filtered.length} rows)
          </h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shift name..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">shift_id (PK)</th>
                <th className="py-3 px-4">Shift Name</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">End Time</th>
                <th className="py-3 px-4">Grace Period</th>
                <th className="py-3 px-4">Active Assignments (LEFT JOIN)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading Shift table...
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.shift_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{s.shift_id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{s.shift_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {s.start_time}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {s.end_time}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {s.grace_mins} mins
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {s.assignment_count ?? 0} assignment(s)
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        tableName="Shift"
        primaryKeyColumn="shift_id"
        primaryKeyValue={deleteTarget?.shift_id || ''}
        recordLabel={deleteTarget ? `${deleteTarget.shift_name} (#${deleteTarget.shift_id})` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};

/* ============================================================================
 * 4. SHIFT ASSIGNMENTS PAGE (`Shift_Assignment` Table)
 * ============================================================================ */
export const ShiftAssignmentsPage: React.FC<CrudPageProps> = ({ onShowToast }) => {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [empId, setEmpId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('2026-12-31');

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ShiftAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [saRes, empRes, shRes] = await Promise.all([
        apiRequest('/api/shift-assignments'),
        apiRequest('/api/employees'),
        apiRequest('/api/shifts'),
      ]);
      setAssignments(saRes.data || []);
      setEmployees(empRes.data || []);
      setShifts(shRes.data || []);
      if (!empId && empRes.data?.length > 0) setEmpId(String(empRes.data[0].emp_id));
      if (!shiftId && shRes.data?.length > 0) setShiftId(String(shRes.data[0].shift_id));
    } catch (err: any) {
      onShowToast('error', 'Failed to load shift assignments', err.message);
    } finally {
      setLoading(false);
    }
  }, [empId, shiftId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endDate < startDate) {
      onShowToast(
        'error',
        'Validation Error',
        'End Date must be greater than or equal to Start Date (end_date >= start_date).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/shift-assignments', {
        method: 'POST',
        body: JSON.stringify({
          emp_id: Number(empId),
          shift_id: Number(shiftId),
          start_date: startDate,
          end_date: endDate,
        }),
      });
      onShowToast('success', 'Shift Assignment Created', res.message, res.sqlLog?.interpolatedSql);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Insert Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/shift-assignments/${deleteTarget.assignment_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Shift Assignment Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Delete Failed', err.message, err.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = assignments.filter(
    (a) =>
      !searchQuery.trim() ||
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.shift_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.dept_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Employee Shift Assignments (<span className="font-mono text-xl">Shift_Assignment</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Map employees to shifts over a date range with <span className="font-mono text-xs">emp_id</span> and <span className="font-mono text-xs">shift_id</span> foreign key dropdowns and <span className="font-mono text-xs">end_date &gt;= start_date</span> validation.
        </p>
      </div>

      <form
        onSubmit={handleInsert}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">
              INSERT INTO Shift_Assignment
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            FKs: emp_id, shift_id · CHECK (end_date &gt;= start_date)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employee (FK <span className="font-mono">emp_id</span>) *
            </label>
            <select
              required
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {employees.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  #{emp.emp_id} · {emp.first_name} {emp.last_name} ({emp.dept_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shift (FK <span className="font-mono">shift_id</span>) *
            </label>
            <select
              required
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {shifts.map((s) => (
                <option key={s.shift_id} value={s.shift_id}>
                  #{s.shift_id} · {s.shift_name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Start Date (<span className="font-mono">start_date</span>) *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              End Date (<span className="font-mono">end_date</span>) *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Inserting...' : 'Insert Shift Assignment'}</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Shift Assignments Joined View ({filtered.length} rows)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SQL: <span className="font-mono">SELECT sa.*, e.first_name, e.last_name, d.dept_name, s.shift_name FROM Shift_Assignment sa INNER JOIN Employee e ... INNER JOIN Shift s</span>
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee or shift..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">assignment_id (PK)</th>
                <th className="py-3 px-4">Employee (FK emp_id)</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift (FK shift_id)</th>
                <th className="py-3 px-4">Timings</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading Shift_Assignment table...
                  </td>
                </tr>
              ) : (
                filtered.map((sa) => (
                  <tr key={sa.assignment_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{sa.assignment_id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {sa.first_name} {sa.last_name}{' '}
                      <span className="font-mono font-normal text-slate-500">
                        (#{sa.emp_id})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{sa.dept_name}</td>
                    <td className="py-2.5 px-4 text-slate-800">
                      {sa.shift_name}{' '}
                      <span className="font-mono text-slate-500">(#{sa.shift_id})</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 tabular-nums">
                      {sa.start_time.slice(0, 5)} – {sa.end_time.slice(0, 5)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-800 tabular-nums">
                      {sa.start_date}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-800 tabular-nums">
                      {sa.end_date}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(sa)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        tableName="Shift_Assignment"
        primaryKeyColumn="assignment_id"
        primaryKeyValue={deleteTarget?.assignment_id || ''}
        recordLabel={
          deleteTarget
            ? `Assignment #${deleteTarget.assignment_id} (${deleteTarget.first_name} ${deleteTarget.last_name} → ${deleteTarget.shift_name})`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};

/* ============================================================================
 * 5. LEAVE TYPES PAGE (`Leave_Type` Table)
 * ============================================================================ */
export const LeaveTypesPage: React.FC<CrudPageProps> = ({ onShowToast }) => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveName, setLeaveName] = useState('');
  const [maxDays, setMaxDays] = useState('12');
  const [isPaid, setIsPaid] = useState('1');
  const [description, setDescription] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/leave-types');
      setLeaveTypes(res.data || []);
    } catch (err: any) {
      onShowToast('error', 'Failed to load leave types', err.message);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/leave-types', {
        method: 'POST',
        body: JSON.stringify({
          leave_name: leaveName,
          max_days_per_year: Number(maxDays),
          is_paid: Number(isPaid),
          description,
        }),
      });
      onShowToast('success', 'Leave Type Inserted', res.message, res.sqlLog?.interpolatedSql);
      setLeaveName('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      onShowToast('error', 'Insert Leave Type Failed', err.message, err.sqlLog?.interpolatedSql);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/api/leave-types/${deleteTarget.leave_type_id}`, {
        method: 'DELETE',
      });
      onShowToast('success', 'Leave Type Deleted', res.message, res.sqlLog?.interpolatedSql);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      onShowToast(
        'error',
        'Foreign Key Constraint Blocked Deletion',
        err.message,
        err.sqlLog?.interpolatedSql
      );
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Leave Types Catalog (<span className="font-mono text-xl">Leave_Type</span> Table)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage organizational leave policies, maximum annual day quotas, and paid/unpaid status.
        </p>
      </div>

      <form
        onSubmit={handleInsert}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">INSERT INTO Leave_Type</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            PRIMARY KEY: leave_type_id · CHECK (max_days_per_year BETWEEN 1 AND 365)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Leave Category Name (<span className="font-mono">leave_name</span>) *
            </label>
            <input
              type="text"
              required
              value={leaveName}
              onChange={(e) => setLeaveName(e.target.value)}
              placeholder="e.g., Paternity / Parental Leave"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Max Days / Year (<span className="font-mono">max_days_per_year</span>) *
            </label>
            <input
              type="number"
              min={1}
              max={365}
              required
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Compensation Type (<span className="font-mono">is_paid</span>) *
            </label>
            <select
              value={isPaid}
              onChange={(e) => setIsPaid(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="1">1 — Paid Leave</option>
              <option value="0">0 — Unpaid Leave (LOP)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Policy Description (<span className="font-mono">description</span>) *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Paid childcare leave for new parents"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Inserting...' : 'Insert Leave Type'}</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Leave_Type Records ({leaveTypes.length} rows)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">leave_type_id (PK)</th>
                <th className="py-3 px-4">Leave Name</th>
                <th className="py-3 px-4">Max Days / Year</th>
                <th className="py-3 px-4">Paid Status</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Requests Linked (LEFT JOIN)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading Leave_Type table...
                  </td>
                </tr>
              ) : (
                leaveTypes.map((lt) => (
                  <tr key={lt.leave_type_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      #{lt.leave_type_id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{lt.leave_name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-800 tabular-nums">
                      {lt.max_days_per_year} days
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={
                          lt.is_paid
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {lt.is_paid ? 'Paid (1)' : 'Unpaid (0)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{lt.description}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                      {lt.request_count ?? 0} request(s)
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(lt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        tableName="Leave_Type"
        primaryKeyColumn="leave_type_id"
        primaryKeyValue={deleteTarget?.leave_type_id || ''}
        recordLabel={
          deleteTarget ? `${deleteTarget.leave_name} (#${deleteTarget.leave_type_id})` : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
