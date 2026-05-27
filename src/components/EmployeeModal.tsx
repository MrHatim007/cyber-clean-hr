import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/store';
import { EmployeeSchema } from '../utils/schemas';
import type { EmployeeType, DocumentType, LeaveType } from '../utils/schemas';
import { translations } from '../utils/translations';
import { checkLeaveOverlap, calculateVacationBalance } from '../utils/vacationCalculations';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeType | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, employee }) => {
  const { config, addEmployee, updateEmployee, showNotification } = useAppStore();
  const t = translations[config.language];

  // Local Form State
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [baseSalary, setBaseSalary] = useState<number | string>('');
  const [allowances, setAllowances] = useState<number | string>('');
  const [startDate, setStartDate] = useState('');
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [leaves, setLeaves] = useState<LeaveType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state with editing employee on open
  useEffect(() => {
    if (employee) {
      setEmployeeId(employee.employeeId);
      setEmployeeName(employee.employeeName);
      setDepartment(employee.department);
      setBaseSalary(employee.baseSalary);
      setAllowances(employee.allowances);
      setStartDate(employee.startDate);
      setDocuments(employee.documents || []);
      setLeaves(employee.leaves || []);
    } else {
      setEmployeeId('');
      setEmployeeName('');
      setDepartment('');
      setBaseSalary('');
      setAllowances('');
      setStartDate('');
      setDocuments([]);
      setLeaves([]);
    }
    setErrors({});
  }, [employee, isOpen]);

  // Live total salary calculation
  const totalSalary = useMemo(() => {
    const base = Number(baseSalary) || 0;
    const allow = Number(allowances) || 0;
    return (base + allow).toFixed(2);
  }, [baseSalary, allowances]);

  // Hypothetical Vacation Balance Calculation
  const hypotheticalBalance = useMemo(() => {
    const tempEmp = {
      startDate,
      leaves,
    };
    return calculateVacationBalance(tempEmp);
  }, [startDate, leaves]);

  const handleAddDocument = () => {
    const newDoc: DocumentType = {
      id: 'doc_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      docType: config.docTypes[0] || '',
      specificDocNumber: '',
      startDate: '',
      expiryDate: '',
      notes: '',
    };
    setDocuments([...documents, newDoc]);
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const handleUpdateDocument = (id: string, key: keyof DocumentType, value: string) => {
    setDocuments(documents.map(d => (d.id === id ? { ...d, [key]: value } : d)));
  };

  const handleAddLeave = () => {
    const newLeave: LeaveType = {
      id: 'leave_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      startDate: '',
      endDate: '',
      notes: '',
    };
    setLeaves([...leaves, newLeave]);
  };

  const handleRemoveLeave = (id: string) => {
    setLeaves(leaves.filter(l => l.id !== id));
  };

  const handleUpdateLeave = (id: string, key: keyof LeaveType, value: string) => {
    setLeaves(leaves.map(l => (l.id === id ? { ...l, [key]: value } : l)));
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      showNotification(
        config.language === 'ar'
          ? 'حجم الملف كبير جداً! الحد الأقصى المسموح به هو 2.5 ميجابايت.'
          : 'File size too large! The maximum allowed size is 2.5MB.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setDocuments(documents.map(d => (d.id === id ? {
        ...d,
        fileUrl: dataUrl,
        fileName: file.name,
        fileSize: Math.round(file.size / 1024),
      } : d)));
      showNotification(
        config.language === 'ar'
          ? 'تم إرفاق الملف بنجاح!'
          : 'File attached successfully!'
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (id: string) => {
    setDocuments(documents.map(d => (d.id === id ? {
      ...d,
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
    } : d)));
  };

  const validateForm = (): boolean => {
    const rawData = {
      id: employee?.id || 'new',
      employeeId,
      employeeName,
      department,
      baseSalary: Number(baseSalary) || 0,
      allowances: Number(allowances) || 0,
      startDate,
      isArchived: employee ? employee.isArchived : false,
      documents,
      leaves,
    };

    const parseResult = EmployeeSchema.safeParse(rawData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach(err => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      showNotification(config.language === 'ar' ? 'يرجى مراجعة وتصحيح الحقول الحمراء!' : 'Please review and fix highlighted fields!');
      return false;
    }

    // Document Validation (Dates check)
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (new Date(doc.expiryDate) < new Date(doc.startDate)) {
        showNotification(
          config.language === 'ar'
            ? `تاريخ انتهاء الوثيقة #${i + 1} لا يمكن أن يكون قبل تاريخ البدء!`
            : `Document #${i + 1} expiry date cannot be before start date!`
        );
        return false;
      }
    }

    // Leave Validation (Dates check)
    for (let i = 0; i < leaves.length; i++) {
      const leave = leaves[i];
      if (new Date(leave.endDate) < new Date(leave.startDate)) {
        showNotification(
          config.language === 'ar'
            ? `تاريخ انتهاء الإجازة #${i + 1} لا يمكن أن يكون قبل تاريخ البدء!`
            : `Leave #${i + 1} end date cannot be before start date!`
        );
        return false;
      }
    }

    // Checking for self overlapping leaves
    let hasOverlap = false;
    for (let i = 0; i < leaves.length; i++) {
      const a = leaves[i];
      for (let j = i + 1; j < leaves.length; j++) {
        const b = leaves[j];
        if (checkLeaveOverlap([b], a.startDate, a.endDate)) {
          hasOverlap = true;
          break;
        }
      }
    }

    if (hasOverlap) {
      showNotification(
        config.language === 'ar'
          ? 'خطأ تداخل الإجازات: تداخل زمني تم رصده في التواريخ!'
          : 'Leave Overlap Error: Time conflict detected between logged leaves!'
      );
      return false;
    }

    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      employeeId,
      employeeName,
      department,
      baseSalary: Number(baseSalary) || 0,
      allowances: Number(allowances) || 0,
      startDate,
      isArchived: employee ? employee.isArchived : false,
      documents,
      leaves,
    };

    const proceedSave = async () => {
      if (employee) {
        await updateEmployee(employee.id, payload);
      } else {
        await addEmployee(payload);
      }
      onClose();
    };

    // Vacation overrun warnings check
    if (hypotheticalBalance.remaining < 0) {
      if (window.confirm(t.warningOverrun)) {
        await proceedSave();
      }
    } else {
      await proceedSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <form
        onSubmit={handleSave}
        className="relative w-full max-w-2xl bg-[#0a0c14] md:rounded-[4rem] rounded-t-[3rem] shadow-2xl border-t md:border border-white/10 overflow-hidden animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-10 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter">
              {employee ? t.edit : t.addDoc}
            </h2>
            <p className="text-slate-500 text-sm mt-1 select-none">
              {config.language === 'ar'
                ? 'أدخل بيانات الموظف والوثائق بدقة لتفعيل التنبيهات الذكية'
                : 'Enter employee data and documents accurately to enable smart notifications'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-4 bg-white/5 rounded-full text-slate-500 hover:text-white transition-all cursor-pointer outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Employee Main Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 border border-white/5 rounded-3xl">
            {/* Employee Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-2 select-none">
                {t.holderName}
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                className={`w-full bg-slate-950 border-2 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyber-blue outline-none transition-all shadow-inner ${errors.employeeName ? 'border-cyber-rose' : 'border-slate-900'}`}
              />
              {errors.employeeName && <span className="text-[10px] text-cyber-rose">{errors.employeeName}</span>}
            </div>

            {/* Employee ID */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-2 select-none">
                {t.docNumber}
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className={`w-full bg-slate-950 border-2 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyber-blue outline-none transition-all shadow-inner ${errors.employeeId ? 'border-cyber-rose' : 'border-slate-900'}`}
              />
              {errors.employeeId && <span className="text-[10px] text-cyber-rose">{errors.employeeId}</span>}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-2 select-none">
                {t.dept}
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className={`w-full bg-slate-950 border-2 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyber-blue outline-none cursor-pointer ${errors.department ? 'border-cyber-rose' : 'border-slate-900'}`}
              >
                <option value="">{t.filterDept}...</option>
                {config.departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && <span className="text-[10px] text-cyber-rose">{errors.department}</span>}
            </div>

            {/* Hire Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-2 select-none">
                {t.startDate}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                className={`w-full bg-slate-950 border-2 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyber-blue outline-none transition-all shadow-inner ${errors.startDate ? 'border-cyber-rose' : 'border-slate-900'}`}
              />
              {errors.startDate && <span className="text-[10px] text-cyber-rose">{errors.startDate}</span>}
            </div>

            {/* Salary Sub-objects */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-2 select-none">
                {t.baseSalary}
              </label>
              <input
                type="number"
                value={baseSalary}
                onChange={e => setBaseSalary(e.target.value)}
                placeholder="0"
                className={`w-full bg-slate-950 border-2 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyber-blue outline-none transition-all shadow-inner ${errors.baseSalary ? 'border-cyber-rose' : 'border-slate-900'}`}
              />
              {errors.baseSalary && <span className="text-[10px] text-cyber-rose">{errors.baseSalary}</span>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-2 select-none">
                {t.allowances}
              </label>
              <input
                type="number"
                value={allowances}
                onChange={e => setAllowances(e.target.value)}
                placeholder="0"
                className={`w-full bg-slate-950 border-2 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyber-blue outline-none transition-all shadow-inner ${errors.allowances ? 'border-cyber-rose' : 'border-slate-900'}`}
              />
              {errors.allowances && <span className="text-[10px] text-cyber-rose">{errors.allowances}</span>}
            </div>

            {/* Total Salary Preview */}
            <div className="md:col-span-2 p-4 bg-cyber-emerald/5 rounded-2xl border border-cyber-emerald/10 flex justify-between items-center select-none">
              <span className="text-xs text-slate-400 font-bold">
                {config.language === 'ar' ? 'الراتب الإجمالي (الأساسي + البدلات):' : 'Total Salary (Base + Allowances):'}
              </span>
              <span className="text-lg font-black text-cyber-emerald font-mono">{totalSalary}</span>
            </div>
          </div>

          {/* Accrued Leave & Vacation balance preview inside the form */}
          {startDate && (
            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2 select-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyber-blue animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t.leaveTitle}
                </h3>
                <button
                  type="button"
                  onClick={handleAddLeave}
                  className="px-4 py-2 bg-cyber-blue/10 hover:bg-cyber-blue text-cyber-blue hover:text-white border border-cyber-blue/20 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer outline-none"
                >
                  {t.addLeaveBtn}
                </button>
              </div>

              <div className="p-4 bg-cyber-emerald/5 border border-cyber-emerald/10 rounded-2xl flex justify-between items-center text-xs select-none">
                <span className="text-slate-400 font-bold">
                  {config.language === 'ar' ? 'الرصيد المتبقي التقديري (بعد اعتماد تذاكر الإجازة):' : 'Estimated Remaining Vacation Balance:'}
                </span>
                <span className={`text-sm font-black ${hypotheticalBalance.remaining < 0 ? 'text-cyber-rose animate-pulse' : 'text-cyber-emerald'}`}>
                  {hypotheticalBalance.remaining} / {hypotheticalBalance.granted} {t.days}
                </span>
              </div>

              {/* Leaves ledger rows */}
              <div className="space-y-4 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {leaves.length > 0 ? (
                  leaves.map((leave, idx) => {
                    const days = leave.startDate && leave.endDate ? Math.max(1, Math.round((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 3600 * 24)) + 1) : 0;
                    return (
                      <div key={leave.id} className="p-5 bg-slate-900 border border-white/5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <span className="text-xs font-black text-cyber-blue">
                            {config.language === 'ar' ? `إجازة #${idx + 1}` : `Leave #${idx + 1}`}
                            {days > 0 && ` (${days} ${t.days})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLeave(leave.id)}
                            className="text-cyber-rose hover:bg-cyber-rose/20 p-1.5 rounded-lg transition-all cursor-pointer outline-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase select-none">{config.language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                            <input
                              type="date"
                              required
                              value={leave.startDate}
                              onChange={e => handleUpdateLeave(leave.id, 'startDate', e.target.value)}
                              onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                              onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                              className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase select-none">{config.language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
                            <input
                              type="date"
                              required
                              value={leave.endDate}
                              onChange={e => handleUpdateLeave(leave.id, 'endDate', e.target.value)}
                              onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                              onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                              className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase select-none">{config.language === 'ar' ? 'السبب / ملاحظات' : 'Reason / Notes'}</label>
                          <input
                            type="text"
                            value={leave.notes}
                            onChange={e => handleUpdateLeave(leave.id, 'notes', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 text-xs select-none">
                    {t.noLeaves}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Attached Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white select-none">
                {t.attachments}
              </h3>
              <button
                type="button"
                onClick={handleAddDocument}
                className="px-4 py-2 bg-cyber-blue/10 hover:bg-cyber-blue text-cyber-blue hover:text-white border border-cyber-blue/20 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer outline-none"
              >
                {t.addDocumentBtn}
              </button>
            </div>

            <div className="space-y-4">
              {documents.length > 0 ? (
                documents.map((doc, idx) => (
                  <div key={doc.id} className="p-6 bg-slate-950/70 border border-white/5 rounded-3xl relative space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-xs font-black text-cyber-blue">
                        {config.language === 'ar' ? `المستند المرفق #${idx + 1}` : `Attached Document #${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-cyber-rose hover:bg-cyber-rose/20 p-1.5 rounded-lg transition-all cursor-pointer outline-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Type Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase select-none">{t.type}</label>
                        <select
                          value={doc.docType}
                          onChange={e => handleUpdateDocument(doc.id, 'docType', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none cursor-pointer"
                        >
                          {config.docTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* Specific Document Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase select-none">{t.specificDocNumber}</label>
                        <input
                          type="text"
                          required
                          value={doc.specificDocNumber}
                          onChange={e => handleUpdateDocument(doc.id, 'specificDocNumber', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                        />
                      </div>

                      {/* Start Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase select-none">{t.startDate}</label>
                        <input
                          type="date"
                          required
                          value={doc.startDate}
                          onChange={e => handleUpdateDocument(doc.id, 'startDate', e.target.value)}
                          onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase select-none">{t.expiryDate}</label>
                        <input
                          type="date"
                          required
                          value={doc.expiryDate}
                          onChange={e => handleUpdateDocument(doc.id, 'expiryDate', e.target.value)}
                          onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                        />
                      </div>
                    </div>

                    {/* Document Notes & File Attachment Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Notes */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase select-none">{config.language === 'ar' ? 'ملاحظات وتنبيهات للوثيقة' : 'Document Notes'}</label>
                        <input
                          type="text"
                          value={doc.notes}
                          onChange={e => handleUpdateDocument(doc.id, 'notes', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-cyber-blue outline-none"
                        />
                      </div>
                      
                      {/* File attachment */}
                      <div className="space-y-1 flex flex-col justify-end">
                        <label className="text-[10px] font-black text-slate-500 uppercase select-none">{t.attachments}</label>
                        {doc.fileName ? (
                          <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs">
                            <div className="flex items-center gap-2 truncate max-w-[70%]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-cyber-blue shrink-0 animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-white truncate font-bold" title={doc.fileName}>{doc.fileName}</span>
                              <span className="text-[9px] text-slate-500 font-mono shrink-0">({doc.fileSize}KB)</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {doc.fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const w = window.open();
                                    if (w) w.document.write(`<iframe src="${doc.fileUrl}" style="border:none; width:100%; height:100vh;"></iframe>`);
                                  }}
                                  className="text-cyber-blue hover:bg-cyber-blue/15 p-1 rounded-lg transition-colors cursor-pointer outline-none"
                                  title={config.language === 'ar' ? 'معاينة الملف' : 'Preview file'}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(doc.id)}
                                className="text-cyber-rose hover:bg-cyber-rose/15 p-1 rounded-lg transition-colors cursor-pointer outline-none"
                                title={config.language === 'ar' ? 'حذف الملف' : 'Delete file'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-between p-2.5 bg-slate-950 hover:bg-white/[0.02] border border-slate-900 hover:border-cyber-blue/35 rounded-xl cursor-pointer transition-all text-xs text-slate-500 font-bold select-none">
                            <span className="truncate">{t.uploadPlaceholder}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={e => handleFileChange(doc.id, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 text-xs select-none">
                  {t.noDocuments}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-8 border-t border-white/5 flex gap-4 shrink-0 bg-[#0a0c14]">
          <button
            type="submit"
            className="flex-1 py-5 bg-cyber-blue hover:bg-cyan-500 text-slate-950 font-black rounded-3xl shadow-xl shadow-cyber-blue/20 transition-all uppercase tracking-wider text-xs cursor-pointer outline-none"
          >
            {t.save}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-3xl transition-all border border-white/5 uppercase text-xs cursor-pointer outline-none"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
};
