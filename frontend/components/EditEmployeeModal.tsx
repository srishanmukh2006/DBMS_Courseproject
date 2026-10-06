import React, { useState, useEffect } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { Employee, Department } from '../types';

interface EditEmployeeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  departments: Department[];
  onSave: (updatedEmployee: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    hire_date: string;
    designation: string;
    dept_id: number;
  }) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  employee,
  departments,
  onSave,
  onClose,
  isSaving = false,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [designation, setDesignation] = useState('');
  const [deptId, setDeptId] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (employee) {
      setFirstName(employee.first_name || '');
      setLastName(employee.last_name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setHireDate(employee.hire_date || '');
      setDesignation(employee.designation || '');
      setDeptId(String(employee.dept_id || ''));
      setFormError('');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !hireDate ||
      !designation.trim() ||
      !deptId
    ) {
      setFormError('All fields (Name, Email, Phone, Hire Date, Designation, Department) are required.');
      return;
    }

    try {
      setFormError('');
      await onSave({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        hire_date: hireDate,
        designation: designation.trim(),
        dept_id: Number(deptId),
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to update employee');
    }
  };

  const previewSql = `UPDATE Employee SET first_name = '${firstName}', last_name = '${lastName}', email = '${email}', phone = '${phone}', hire_date = '${hireDate}', designation = '${designation}', dept_id = ${deptId} WHERE emp_id = ${employee.emp_id};`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-employee-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 id="edit-employee-title" className="text-base font-semibold text-slate-900">
                Edit Employee Details
              </h3>
              <p className="text-xs text-slate-500">
                Target Record: <span className="font-mono font-semibold text-slate-700">emp_id = {employee.emp_id}</span> ·{' '}
                {employee.first_name} {employee.last_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {formError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                First Name (<span className="font-mono">first_name</span>) *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address (<span className="font-mono">email</span>) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number (<span className="font-mono">phone</span>) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Designation / Job Title (<span className="font-mono">designation</span>) *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
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

          {/* SQL Preview */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Parameterized SQL Query Preview:
            </div>
            <div className="bg-slate-950 text-sky-300 font-mono text-xs p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
              {previewSql}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes (UPDATE)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
