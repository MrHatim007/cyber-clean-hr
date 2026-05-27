import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/store';
import { translations } from '../utils/translations';
import { getDocStatus, getRemainingDays } from '../utils/vacationCalculations';

export const Dashboard: React.FC = () => {
  const {
    employees,
    config,
    searchQuery,
    filterStatus,
    filterType,
    filterDept,
    setFilterStatus,
    setFilterType,
    setFilterDept,
  } = useAppStore();

  const [visibleDocsCount, setVisibleDocsCount] = useState(12);

  const t = translations[config.language];

  // Flatten all documents
  const allDocs = useMemo(() => {
    const list: any[] = [];
    employees.forEach(emp => {
      (emp.documents || []).forEach(doc => {
        list.push({
          ...doc,
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          department: emp.department,
          salary: emp.salary,
          parentEmployeeId: emp.id,
          isArchived: emp.isArchived,
        });
      });
    });
    return list;
  }, [employees]);

  // Compute Stats
  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => !e.isArchived);
    const activeDocs = allDocs.filter(d => !d.isArchived);
    
    const activeCount = activeDocs.filter(d => getDocStatus(d.expiryDate, config.threshold) === 'active').length;
    const nearCount = activeDocs.filter(d => getDocStatus(d.expiryDate, config.threshold) === 'near').length;
    const expiredCount = activeDocs.filter(d => getDocStatus(d.expiryDate, config.threshold) === 'expired').length;
    const totalDocsCount = activeDocs.length;

    return {
      totalEmployees: activeEmployees.length,
      activeDocs: activeCount,
      nearDocs: nearCount,
      expiredDocs: expiredCount,
      types: config.docTypes.length,
      depts: config.departments.length,
      activeRatio: totalDocsCount > 0 ? Math.round((activeCount / totalDocsCount) * 100) : 100,
      nearRatio: totalDocsCount > 0 ? Math.round((nearCount / totalDocsCount) * 100) : 0,
      expiredRatio: totalDocsCount > 0 ? Math.round((expiredCount / totalDocsCount) * 100) : 0,
    };
  }, [employees, allDocs, config.threshold]);

  // Filter documents
  const filteredDocs = useMemo(() => {
    return allDocs.filter(d => {
      // Include archived employees only if specifically searched or if viewing all
      if (!searchQuery && d.isArchived) return false;

      const matchesSearch =
        (d.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.specificDocNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

      const status = getDocStatus(d.expiryDate, config.threshold);
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      const matchesType = filterType === 'all' || d.docType === filterType;
      const matchesDept = filterDept === 'all' || d.department === filterDept;

      return matchesSearch && matchesStatus && matchesType && matchesDept;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [allDocs, searchQuery, filterStatus, filterType, filterDept, config.threshold]);

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: t.totalDocs, val: stats.totalEmployees, shadowColor: 'rgba(0, 229, 255, 0.15)', strokeColor: 'text-cyber-blue', bgHover: 'hover:border-cyber-blue/30', valColor: 'text-white', icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          )},
          { label: t.active, val: stats.activeDocs, shadowColor: 'rgba(16, 185, 129, 0.15)', strokeColor: 'text-cyber-emerald', bgHover: 'hover:border-cyber-emerald/30', valColor: 'text-cyber-emerald', icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          )},
          { label: t.expired, val: stats.expiredDocs, shadowColor: 'rgba(244, 63, 94, 0.15)', strokeColor: 'text-cyber-rose', bgHover: 'hover:border-cyber-rose/30', valColor: 'text-cyber-rose', icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          )},
          { label: t.nearExpiry, val: stats.nearDocs, shadowColor: 'rgba(245, 175, 25, 0.15)', strokeColor: 'text-cyber-amber', bgHover: 'hover:border-cyber-amber/30', valColor: 'text-cyber-amber', icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          )},
          { label: t.docTypes, val: stats.types, shadowColor: 'rgba(168, 85, 247, 0.15)', strokeColor: 'text-purple-400', bgHover: 'hover:border-purple-500/30', valColor: 'text-purple-400', icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          )},
          { label: t.depts, val: stats.depts, shadowColor: 'rgba(99, 102, 241, 0.15)', strokeColor: 'text-indigo-400', bgHover: 'hover:border-indigo-500/30', valColor: 'text-indigo-400', icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          )}
        ].map((s, i) => (
          <div
            key={i}
            className={`glass-panel p-6 rounded-[2rem] flex flex-col gap-4 relative group overflow-hidden ${s.bgHover} transition-all duration-300`}
            style={{ boxShadow: `0 8px 32px 0 ${s.shadowColor}` }}
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/5 ${s.strokeColor} flex items-center justify-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {s.icon}
              </svg>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-wider select-none">{s.label}</p>
              <p className={`text-3xl font-black ${s.valColor}`}>{s.val}</p>
            </div>
            <div className={`absolute -bottom-4 -right-4 ${s.strokeColor} opacity-5 group-hover:scale-110 transition-transform duration-500`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {s.icon}
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Ratio Analytics & SVG Gauge Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Circular Ring Ratio */}
        <div className="glass-panel p-8 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
          <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-wider select-none">
            {config.language === 'ar' ? 'نسبة الوثائق السارية' : 'Active Document Ratio'}
          </h3>
          
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-white/5"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-cyber-blue shadow-[0_0_15px_#00e5ff]"
                strokeWidth="8"
                fill="none"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * stats.activeRatio) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black text-white">{stats.activeRatio}%</span>
              <span className="text-[10px] text-cyber-blue font-bold tracking-widest mt-1">ACTIVE</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-[220px] mt-6">
            {config.language === 'ar' 
              ? 'مؤشر نسبي لحالة الوثائق الكلية في المؤسسة لضمان الامتثال الدائم.' 
              : 'Relative ratio of valid documents across the enterprise to ensure constant compliance.'}
          </p>
        </div>

        {/* Detailed Horizontal Breakdown Progress Indicators */}
        <div className="glass-panel p-8 rounded-[3rem] col-span-1 lg:col-span-2 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-wider select-none">
              {config.language === 'ar' ? 'التفصيل الإحصائي للوثائق النشطة' : 'Detailed Stat Breakdown'}
            </h3>
            
            <div className="space-y-6">
              {/* Active */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-cyber-emerald flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald inline-block"></span>
                    {t.active}
                  </span>
                  <span className="text-slate-300 font-mono">{stats.activeDocs} ({stats.activeRatio}%)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-cyber-emerald rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    style={{ width: `${stats.activeRatio}%` }}
                  />
                </div>
              </div>

              {/* Near Expiry */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-cyber-amber flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyber-amber inline-block"></span>
                    {t.nearExpiry}
                  </span>
                  <span className="text-slate-300 font-mono">{stats.nearDocs} ({stats.nearRatio}%)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-cyber-amber rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(245,175,25,0.4)]"
                    style={{ width: `${stats.nearRatio}%` }}
                  />
                </div>
              </div>

              {/* Expired */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-cyber-rose flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyber-rose inline-block animate-pulse"></span>
                    {t.expired}
                  </span>
                  <span className="text-slate-300 font-mono">{stats.expiredDocs} ({stats.expiredRatio}%)</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-cyber-rose rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                    style={{ width: `${stats.expiredRatio}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6 p-4 bg-cyber-rose/10 border border-cyber-rose/20 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyber-rose shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[10px] md:text-xs text-cyber-rose font-bold">
              {config.language === 'ar'
                ? `هناك عدد (${stats.expiredDocs}) وثيقة منتهية تتطلب تدخلاً عاجلاً لإعادة إصدارها وتفادي الغرامات.`
                : `There are (${stats.expiredDocs}) expired documents requiring urgent action to avoid penalties.`}
            </p>
          </div>
        </div>
      </div>

      {/* Smart Filters Header */}
      <div className="glass-panel rounded-[3rem] p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyber-blue/15 rounded-2xl text-cyber-blue">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white select-none">
              {config.language === 'ar' ? 'فلترة ذكية للوثائق والمرفقات' : 'Smart Document Filtering'}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto text-slate-200">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
            >
              <option value="all">{t.filterStatus}</option>
              <option value="active">{t.active}</option>
              <option value="near">{t.nearExpiry}</option>
              <option value="expired">{t.expired}</option>
            </select>
            
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
            >
              <option value="all">{t.filterType}</option>
              {config.docTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
            >
              <option value="all">{t.filterDept}</option>
              {config.departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Urgent Alerts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDocs.length > 0 ? (
            <>
              {filteredDocs.slice(0, visibleDocsCount).map(doc => {
                const status = getDocStatus(doc.expiryDate, config.threshold);
                const remaining = getRemainingDays(doc.expiryDate);
                
                const statusConfig = {
                  active: { color: 'text-cyber-emerald bg-cyber-emerald/10 border-cyber-emerald/20', label: t.active },
                  near: { color: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/20', label: t.nearExpiry },
                  expired: { color: 'text-cyber-rose bg-cyber-rose/10 border-cyber-rose/20', label: t.expired },
                };
                
                const badge = statusConfig[status];

                return (
                  <div
                    key={doc.id}
                    className="glass-panel p-6 rounded-[2.5rem] flex flex-col justify-between glass-panel-hover transition-all duration-300 relative group overflow-hidden"
                  >
                    {doc.isArchived && (
                      <div className="bg-cyber-rose/25 text-cyber-rose border border-cyber-rose/30 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider text-center mb-4 select-none">
                        {t.archivedBadge}
                      </div>
                    )}
                    
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <span className="text-[10px] font-bold text-cyber-blue bg-cyber-blue/10 px-3 py-1 rounded-full uppercase tracking-wider select-none">
                          {t.docNumber}: {doc.employeeId}
                        </span>
                        
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight select-none ${badge.color}`}>
                          <span>{badge.label} ({remaining} {config.language === 'ar' ? 'ي' : 'days'})</span>
                        </div>
                      </div>

                      <h4 className="text-white font-black text-xl mb-3 truncate">{doc.employeeName}</h4>
                      
                      <div className="space-y-2.5 mb-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-2 select-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {doc.docType}
                          </span>
                          <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-slate-300 font-bold">
                            {doc.specificDocNumber || '-'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="truncate">{doc.department}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-cyber-blue font-bold">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{doc.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {filteredDocs.length > visibleDocsCount && (
                <div className="col-span-full flex justify-center mt-6">
                  <button
                    onClick={() => setVisibleDocsCount(prev => prev + 12)}
                    className="px-8 py-3 bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue font-bold rounded-2xl transition-all shadow-lg text-sm border border-cyber-blue/20 outline-none"
                  >
                    {t.loadMoreDocs}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="col-span-full py-20 text-center text-slate-700 font-bold tracking-[0.2em] uppercase select-none">
              {t.noData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
