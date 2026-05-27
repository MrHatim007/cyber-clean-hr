import React, { useMemo, useRef, useEffect } from 'react';
import type { EmployeeType } from '../utils/schemas';
import { useAppStore } from '../store/store';
import { translations } from '../utils/translations';
import { calculateVacationBalance, getDocStatus } from '../utils/vacationCalculations';

interface EmployeeCardProps {
  employee: EmployeeType;
  onEdit: (emp: EmployeeType) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onEdit }) => {
  const {
    config,
    deleteEmployee,
    archiveEmployee,
    restoreEmployee,
    setPreviewFile,
    highlightedEmployeeId,
    setHighlightedEmployeeId,
  } = useAppStore();
  
  const t = translations[config.language];
  const isRTL = config.language === 'ar';

  const vacation = useMemo(() => {
    return calculateVacationBalance(employee);
  }, [employee]);

  const cardRef = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightedEmployeeId === employee.id;

  useEffect(() => {
    if (isHighlighted) {
      // Smooth scroll the card into view
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Auto-clear highlight in store after 3 seconds (duration of CSS animation)
      const timer = setTimeout(() => {
        setHighlightedEmployeeId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, employee.id, setHighlightedEmployeeId]);

  const handleDelete = () => {
    if (window.confirm(t.deleteConfirm)) {
      deleteEmployee(employee.id);
    }
  };

  const handleArchive = () => {
    if (window.confirm(t.archiveConfirm)) {
      archiveEmployee(employee.id);
    }
  };

  const handleRestore = () => {
    if (window.confirm(t.restoreConfirm)) {
      restoreEmployee(employee.id);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`glass-panel p-8 rounded-[3rem] hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between shadow-xl ${isHighlighted ? 'animate-flash-glow' : ''}`}
    >
      <div>
        {/* Top Header Card Info */}
        <div className="flex justify-between items-start mb-6 gap-2">
          <div className="p-3 bg-cyber-blue/10 rounded-2xl text-cyber-blue shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className={`${isRTL ? 'text-left' : 'text-right'} truncate`}>
            <span className="text-cyber-emerald font-bold text-xs bg-cyber-emerald/10 border border-cyber-emerald/20 px-3 py-1 rounded-xl inline-block max-w-full truncate select-all">
              {t.salary}: {employee.salary?.toFixed(2) || '0.00'}
            </span>
            {employee.allowances > 0 && (
              <span className="text-[10px] text-slate-500 block mt-1 truncate">
                ({t.baseSalary}: {employee.baseSalary} + {t.allowances}: {employee.allowances})
              </span>
            )}
          </div>
        </div>

        {/* Name and ID */}
        <h3 className="text-white font-black text-2xl mb-1 truncate select-all">{employee.employeeName}</h3>
        <p className="text-slate-500 text-xs font-bold font-mono tracking-wider mb-4 select-all">
          {t.docNumber}: {employee.employeeId}
        </p>
        <span className="text-xs text-cyber-blue font-bold mb-4 bg-cyber-blue/10 inline-block px-3 py-1 rounded-lg select-all">
          {employee.department}
        </span>

        {/* Accrued Vacation Ledger Summary */}
        {employee.startDate && (
          <div className="mb-6 p-4 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-400 flex items-center gap-1.5 select-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyber-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t.vacationBalance}:
              </span>
              <span className={vacation.remaining <= 5 ? 'text-cyber-rose' : vacation.remaining <= 15 ? 'text-cyber-amber' : 'text-cyber-emerald'}>
                {vacation.remaining} / {vacation.granted} {t.days}
              </span>
            </div>
            
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  vacation.remaining <= 5 
                    ? 'bg-cyber-rose shadow-[0_0_10px_rgba(244,63,94,0.5)]' 
                    : vacation.remaining <= 15 
                      ? 'bg-cyber-amber shadow-[0_0_10px_rgba(245,175,25,0.5)]' 
                      : 'bg-cyber-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (vacation.remaining / vacation.granted) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 italic select-none">
              {config.language === 'ar'
                ? `رصيد الخدمة المستمر (السنة رقم ${vacation.currentYearIndex})`
                : `Active Service Ledger (Year ${vacation.currentYearIndex})`}
            </p>
          </div>
        )}

        {/* Embedded Document List */}
        <div className="border-t border-white/5 pt-4 mt-2 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider select-none">
            {config.language === 'ar' ? 'المستندات المرفقة للموظف' : 'Attached Employee Documents'} ({employee.documents?.length || 0})
          </h4>
          {employee.documents && employee.documents.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {employee.documents.map(doc => {
                const status = getDocStatus(doc.expiryDate, config.threshold);
                const badgeConfig = {
                  active: 'text-cyber-emerald bg-cyber-emerald/10 border-cyber-emerald/20',
                  near: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20',
                  expired: 'text-cyber-rose bg-cyber-rose/10 border-cyber-rose/20',
                };
                
                return (
                  <div key={doc.id} className="p-3 bg-slate-950/65 border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-300 truncate max-w-[60%]">{doc.docType}</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${badgeConfig[status]}`}>
                        {status === 'active' ? t.active : status === 'near' ? t.nearExpiry : t.expired}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>{t.specificDocNumber}: {doc.specificDocNumber || '-'}</span>
                      <span>{t.expiryDate}: {doc.expiryDate || '-'}</span>
                    </div>
                    {doc.notes && (
                      <p className="text-[10px] text-slate-400 italic font-bold">
                        {config.language === 'ar' ? 'ملاحظة: ' : 'Note: '}{doc.notes}
                      </p>
                    )}
                    {doc.fileName && doc.fileUrl && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                        <span className="truncate max-w-[70%] font-bold text-slate-400 flex items-center gap-1" title={doc.fileName}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyber-blue shrink-0 animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {doc.fileName}
                        </span>
                        <button
                          onClick={() => setPreviewFile({ url: doc.fileUrl!, name: doc.fileName! })}
                          className="text-cyber-blue hover:text-white transition-all cursor-pointer font-black flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {config.language === 'ar' ? 'معاينة' : 'Preview'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic select-none">{t.noDocuments}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-6 border-t border-white/5 mt-6 flex-wrap">
        {employee.isArchived ? (
          <>
            <button
              onClick={handleRestore}
              className="flex-1 py-3.5 bg-cyber-emerald hover:bg-emerald-600 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 outline-none shadow-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
              </svg>
              {t.restoreAction}
            </button>
            <button
              onClick={handleDelete}
              className="px-5 py-4 bg-cyber-rose/10 hover:bg-cyber-rose text-cyber-rose hover:text-white rounded-2xl transition-all border border-cyber-rose/20 outline-none cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(employee)}
              className="flex-1 py-3 bg-cyber-blue/10 hover:bg-cyber-blue text-cyber-blue hover:text-white rounded-2xl transition-all font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-cyber-blue/20 outline-none cursor-pointer shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t.edit}
            </button>
            
            <button
              onClick={handleArchive}
              className="px-4 py-3 bg-cyber-amber/10 hover:bg-cyber-amber text-cyber-amber hover:text-white rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-1.5 border border-cyber-amber/20 outline-none cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {t.archiveAction}
            </button>
            
            <button
              onClick={handleDelete}
              className="px-4 py-3 bg-cyber-rose/10 hover:bg-cyber-rose text-cyber-rose hover:text-white rounded-xl transition-all border border-cyber-rose/20 outline-none cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
