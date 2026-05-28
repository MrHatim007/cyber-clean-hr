import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from './store/store';
import { translations } from './utils/translations';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { EmployeeModal } from './components/EmployeeModal';
import { EmployeeCard } from './components/EmployeeCard';
import { Autocomplete } from './components/Autocomplete';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { checkLeaveOverlap, calculateVacationBalance, getDaysBetween, getDocStatus } from './utils/vacationCalculations';
import type { EmployeeType } from './utils/schemas';
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  const employees = useAppStore(state => state.employees);
  const config = useAppStore(state => state.config);
  const activeTab = useAppStore(state => state.activeTab);
  const searchQuery = useAppStore(state => state.searchQuery);
  const filterStatus = useAppStore(state => state.filterStatus);
  const filterType = useAppStore(state => state.filterType);
  const filterDept = useAppStore(state => state.filterDept);
  const notification = useAppStore(state => state.notification);
  const loading = useAppStore(state => state.loading);
  const loadData = useAppStore(state => state.loadData);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const setSearchQuery = useAppStore(state => state.setSearchQuery);
  const setFilterStatus = useAppStore(state => state.setFilterStatus);
  const setFilterType = useAppStore(state => state.setFilterType);
  const setFilterDept = useAppStore(state => state.setFilterDept);
  const toggleLanguage = useAppStore(state => state.toggleLanguage);
  const addLeaveDirectly = useAppStore(state => state.addLeaveDirectly);
  const deleteLeaveDirectly = useAppStore(state => state.deleteLeaveDirectly);
  const previewFile = useAppStore(state => state.previewFile);
  const setPreviewFile = useAppStore(state => state.setPreviewFile);
  const highlightedEmployeeId = useAppStore(state => state.highlightedEmployeeId);
  const currentUser = useAppStore(state => state.currentUser);
  const logoutUser = useAppStore(state => state.logoutUser);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeType | null>(null);
  
  // Local debounced search query state to prevent UI jank during typing
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Leave Form inside Leaves tab
  const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveNotes, setLeaveNotes] = useState('');

  // Pagination for Employee list
  const [visibleActiveCount, setVisibleActiveCount] = useState(12);
  const [visibleArchivedCount, setVisibleArchivedCount] = useState(12);

  const t = translations[config.language];
  const isRTL = config.language === 'ar';

  // Load data on start and setup hash router listener
  useEffect(() => {
    loadData();

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const allowed = ['dashboard', 'management', 'leaves', 'archive', 'settings', 'users'];
      if (allowed.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadData, setActiveTab]);

  // Clear pagination on tab switch or search
  useEffect(() => {
    setVisibleActiveCount(12);
    setVisibleArchivedCount(12);
  }, [activeTab, searchQuery, filterStatus, filterType, filterDept]);



  // Sync local search when global query changes (e.g., on config language toggling or backups)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce the search box keystrokes to minimize global state changes & heavy card re-renders
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 150);
    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);

  // Sync dir attribute
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = config.language;
  }, [config.language, isRTL]);

  // Redirect to first allowed tab if activeTab is not allowed
  useEffect(() => {
    if (loading || !currentUser) return;

    const allowedTabs = [
      { id: 'dashboard', permission: 'canViewDashboard' },
      { id: 'management', permission: 'canViewManagement' },
      { id: 'leaves', permission: 'canViewLeaves' },
      { id: 'archive', permission: 'canViewArchive' },
      { id: 'settings', permission: 'canViewSettings' },
      { id: 'users', permission: 'canViewSettings' },
    ].filter(item => {
      if (item.id === 'users') return currentUser.role === 'admin';
      if (currentUser.role === 'admin') return true;
      return currentUser.permissions[item.permission as keyof typeof currentUser.permissions];
    });

    const isAllowed = allowedTabs.some(tab => tab.id === activeTab);
    if (!isAllowed && allowedTabs.length > 0) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [currentUser, activeTab, loading, setActiveTab]);

  const handleEditClick = (emp: EmployeeType) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  // Leaves logs grouped for display in leaves tab
  const globalLeavesList = useMemo(() => {
    const list: any[] = [];
    employees.forEach(emp => {
      if (emp.isArchived) return;
      (emp.leaves || []).forEach(leave => {
        list.push({
          ...leave,
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          department: emp.department,
          parentEmployeeId: emp.id,
        });
      });
    });
    return list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [employees]);

  // Filtered active employees
  const filteredActiveEmployees = useMemo(() => {
    return employees.filter(emp => {
      const isSearching = searchQuery.trim().length > 0;
      
      // If employee is archived, only show them if we are actively searching
      if (emp.isArchived && !isSearching) return false;

      const matchesSearch =
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.documents.some(d => d.specificDocNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      // If they are archived and don't match the search, filter them out
      if (emp.isArchived && !matchesSearch) return false;

      const matchesDept = filterDept === 'all' || emp.department === filterDept;

      const matchesDocFilters = emp.documents.some(d => {
        const status = getDocStatus(d.expiryDate, config.threshold);
        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        const matchesType = filterType === 'all' || d.docType === filterType;
        return matchesStatus && matchesType;
      });

      const hasDocs = emp.documents.length > 0;
      const activeDocFiltering = filterStatus !== 'all' || filterType !== 'all';

      if (activeDocFiltering && !hasDocs) return false;

      return matchesSearch && matchesDept && (!activeDocFiltering || matchesDocFilters);
    });
  }, [employees, searchQuery, filterStatus, filterType, filterDept, config.threshold]);

  // Filtered archived employees
  const filteredArchivedEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.isArchived) return false;

      const matchesSearch =
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.documents.some(d => d.specificDocNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = filterDept === 'all' || emp.department === filterDept;

      const matchesDocFilters = emp.documents.some(d => {
        const status = getDocStatus(d.expiryDate, config.threshold);
        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        const matchesType = filterType === 'all' || d.docType === filterType;
        return matchesStatus && matchesType;
      });

      const hasDocs = emp.documents.length > 0;
      const activeDocFiltering = filterStatus !== 'all' || filterType !== 'all';

      if (activeDocFiltering && !hasDocs) return false;

      return matchesSearch && matchesDept && (!activeDocFiltering || matchesDocFilters);
    });
  }, [employees, searchQuery, filterStatus, filterType, filterDept, config.threshold]);

  // Make sure the highlighted employee is within the visible paginated slice
  useEffect(() => {
    if (highlightedEmployeeId) {
      const activeIdx = filteredActiveEmployees.findIndex(emp => emp.id === highlightedEmployeeId);
      if (activeIdx !== -1 && activeIdx >= visibleActiveCount) {
        setVisibleActiveCount(activeIdx + 1);
      }
      const archivedIdx = filteredArchivedEmployees.findIndex(emp => emp.id === highlightedEmployeeId);
      if (archivedIdx !== -1 && archivedIdx >= visibleArchivedCount) {
        setVisibleArchivedCount(archivedIdx + 1);
      }
    }
  }, [highlightedEmployeeId, filteredActiveEmployees, filteredArchivedEmployees, visibleActiveCount, visibleArchivedCount]);

  const handleAddLeaveDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployeeId || !leaveStartDate || !leaveEndDate) {
      useAppStore.getState().showNotification(
        config.language === 'ar' 
          ? 'يرجى اختيار الموظف وتحديد تواريخ الإجازة!' 
          : 'Please select employee and choose leave dates!'
      );
      return;
    }

    if (new Date(leaveEndDate) < new Date(leaveStartDate)) {
      useAppStore.getState().showNotification(
        config.language === 'ar' 
          ? 'تاريخ انتهاء الإجازة لا يمكن أن يسبق تاريخ البدء!' 
          : 'Leave end date cannot be before start date!'
      );
      return;
    }

    const emp = employees.find(e => e.id === leaveEmployeeId);
    if (!emp) return;

    // Time-slot overlap check
    const isOverlapped = checkLeaveOverlap(emp.leaves || [], leaveStartDate, leaveEndDate);
    if (isOverlapped) {
      useAppStore.getState().showNotification(
        config.language === 'ar'
          ? 'خطأ تداخل زمني: الموظف لديه إجازة مسجلة في نفس الفترة!'
          : 'Date Overlap Error: Employee already has an active leave booked during this period!'
      );
      return;
    }

    const dummyLeave = { startDate: leaveStartDate, endDate: leaveEndDate, notes: leaveNotes };
    const tempEmp = { ...emp, leaves: [...(emp.leaves || []), { ...dummyLeave, id: 'temp' }] };
    const balance = calculateVacationBalance(tempEmp);

    const executeSave = async () => {
      const ok = await addLeaveDirectly(leaveEmployeeId, {
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        notes: leaveNotes,
      });
      if (ok) {
        setLeaveEmployeeId('');
        setLeaveStartDate('');
        setLeaveEndDate('');
        setLeaveNotes('');
      }
    };

    if (balance.remaining < 0) {
      if (window.confirm(t.warningOverrun)) {
        await executeSave();
      }
    } else {
      await executeSave();
    }
  };

  const handleDeleteLeaveDirect = (parentEmpId: string, leaveId: string) => {
    if (window.confirm(t.deleteConfirm)) {
      deleteLeaveDirectly(parentEmpId, leaveId);
    }
  };

  const canEditManagement = currentUser?.role === 'admin' || currentUser?.permissions.canEditManagement;
  const canEditLeaves = currentUser?.role === 'admin' || currentUser?.permissions.canEditLeaves;

  if (!loading && currentUser === null) {
    return (
      <div className="min-h-screen bg-[#05060a] text-slate-100 font-cairo overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Global Notifications even during Login */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-6 left-1/2 z-[300] bg-cyber-blue text-slate-950 font-black px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-cyber-blue/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-slate-100 font-cairo overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Global Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 z-[300] bg-cyber-blue text-slate-950 font-black px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-cyber-blue/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 z-[100] transition-all duration-300 backdrop-blur-3xl bg-white/5 border-white/5 lg:translate-x-0 w-72 
        ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} 
        ${isRTL ? (isSidebarOpen ? 'translate-x-0' : 'translate-x-full') : (isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}`}
      >
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyber-blue to-indigo-600 flex items-center justify-center shadow-xl shadow-cyber-blue/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tighter text-white select-none">{t.title}</span>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar select-none">
            {[
              { id: 'dashboard', icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              ), label: t.dashboard, permission: 'canViewDashboard' as const },
              { id: 'management', icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              ), label: t.management, permission: 'canViewManagement' as const },
              { id: 'leaves', icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              ), label: t.leavesTab, permission: 'canViewLeaves' as const },
              { id: 'archive', icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              ), label: t.archive, permission: 'canViewArchive' as const },
              { id: 'settings', icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              ), label: t.settings, permission: 'canViewSettings' as const },
              { id: 'users', icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              ), label: t.usersTab, permission: 'canViewSettings' as const }
            ].filter(item => {
              if (!currentUser) return false;
              if (item.id === 'users') return currentUser.role === 'admin';
              if (currentUser.role === 'admin') return true;
              return currentUser.permissions[item.permission];
            }).map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold cursor-pointer outline-none ${activeTab === item.id ? 'bg-cyber-blue text-slate-950 shadow-xl shadow-cyber-blue/15' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {item.icon}
                </svg>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/5 select-none space-y-3">
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all text-xs font-black uppercase cursor-pointer outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              {config.language === 'ar' ? 'English UI' : 'اللغة العربية'}
            </button>
            
            <button
              onClick={() => logoutUser()}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-cyber-rose/10 hover:bg-cyber-rose text-cyber-rose hover:text-white transition-all text-xs font-black uppercase cursor-pointer outline-none border border-cyber-rose/15 hover:border-cyber-rose/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(false)}
          onTouchStart={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm lg:hidden transition-opacity border-none outline-none cursor-pointer w-full h-full block"
          aria-label="Close sidebar"
        />
      )}

      {/* Main Content Shell */}
      <main className={`transition-all duration-300 lg:p-12 p-5 ${isRTL ? 'lg:mr-72' : 'lg:ml-72'}`}>
        
        {/* Mobile Header Bar */}
        <div className="flex lg:hidden items-center justify-between mb-8 select-none">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 cursor-pointer outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyber-blue flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="font-black text-white text-sm">{t.title}</span>
          </div>
          {canEditManagement ? (
            <button
              onClick={handleAddClick}
              className="p-4 bg-cyber-blue rounded-2xl text-slate-950 shadow-lg cursor-pointer outline-none animate-pulse-glow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ) : (
            <div className="w-[53px]" /> // Placeholder to maintain centered layout grid alignment
          )}
        </div>

        {/* Desktop Top Header Bar */}
        <div className="hidden lg:flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase select-none">
              {activeTab === 'leaves' ? t.leavesTab : activeTab === 'users' ? t.usersTab : (t[activeTab as keyof typeof t] as string)}
            </h1>
            <p className="text-slate-500 font-bold mt-1 select-none">
              {config.language === 'ar'
                ? 'تتبع دقيق ومراقبة حية لصلاحيات الوثائق وإجازات الموظفين'
                : 'Precise real-time monitoring of document expiry and employee leave balances'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <svg xmlns="http://www.w3.org/2000/svg" className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} text-slate-500`} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 focus:ring-2 focus:ring-cyber-blue outline-none text-sm transition-all text-white placeholder:text-slate-600 font-bold ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
              />
            </div>
            
            {canEditManagement && (
              <button
                onClick={handleAddClick}
                className="bg-cyber-blue hover:bg-cyan-500 text-slate-950 font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-cyber-blue/10 cursor-pointer outline-none select-none text-sm animate-pulse-glow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t.addDoc}
              </button>
            )}
          </div>
        </div>

        {/* Core Tab Routing */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh] select-none">
            <div className="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="min-h-[60vh]">
            {/* Dashboard Tab */}
            <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
              <Dashboard />
            </div>

             {/* Settings Tab */}
            <div className={activeTab === 'settings' ? '' : 'hidden'}>
              <Settings />
            </div>

            {/* User Management Tab */}
            {currentUser?.role === 'admin' && (
              <div className={activeTab === 'users' ? '' : 'hidden'}>
                <UserManagement />
              </div>
            )}

            {/* Management (Active Employees) Tab */}
            <div className={activeTab === 'management' ? '' : 'hidden'}>
              <div className={`space-y-6 ${highlightedEmployeeId ? '' : 'animate-in fade-in duration-300'}`}>
                {/* Filter Sub-header */}
                <div className="glass-panel rounded-[2.5rem] p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3 select-none">
                    <div className="p-3 bg-cyber-blue/15 rounded-2xl text-cyber-blue">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-black text-slate-200">
                      {config.language === 'ar' ? 'إدارة الموظفين والملفات المرفقة' : 'Active Employee Records'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto text-slate-200">
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
                    >
                      <option value="all">{t.filterStatus}</option>
                      <option value="active">{t.active}</option>
                      <option value="near">{t.nearExpiry}</option>
                      <option value="expired">{t.expired}</option>
                    </select>

                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
                    >
                      <option value="all">{t.filterType}</option>
                      {config.docTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <select
                      value={filterDept}
                      onChange={e => setFilterDept(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
                    >
                      <option value="all">{t.filterDept}</option>
                      {config.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid Employees Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredActiveEmployees.length > 0 ? (
                    <>
                      {filteredActiveEmployees.slice(0, visibleActiveCount).map(emp => (
                        <EmployeeCard key={emp.id} employee={emp} onEdit={handleEditClick} />
                      ))}
                      
                      {/* Load More Trigger */}
                      {filteredActiveEmployees.length > visibleActiveCount && (
                        <div className="col-span-full flex justify-center mt-6">
                          <button
                            onClick={() => setVisibleActiveCount(prev => prev + 12)}
                            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer outline-none"
                          >
                            {t.loadMoreEmployees}
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

            {/* Archive Tab */}
            <div className={activeTab === 'archive' ? '' : 'hidden'}>
              <div className={`space-y-6 ${highlightedEmployeeId ? '' : 'animate-in fade-in duration-300'}`}>
                {/* Filter Sub-header */}
                <div className="glass-panel rounded-[2.5rem] p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3 select-none">
                    <div className="p-3 bg-cyber-blue/15 rounded-2xl text-cyber-blue">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-black text-slate-200">
                      {config.language === 'ar' ? 'أرشيف الموظفين الموقوفين' : 'Archived Employee Ledgers'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto text-slate-200">
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
                    >
                      <option value="all">{t.filterStatus}</option>
                      <option value="active">{t.active}</option>
                      <option value="near">{t.nearExpiry}</option>
                      <option value="expired">{t.expired}</option>
                    </select>

                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
                    >
                      <option value="all">{t.filterType}</option>
                      {config.docTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <select
                      value={filterDept}
                      onChange={e => setFilterDept(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-xs font-bold focus:border-cyber-blue outline-none transition-all cursor-pointer"
                    >
                      <option value="all">{t.filterDept}</option>
                      {config.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid Employees Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredArchivedEmployees.length > 0 ? (
                    <>
                      {filteredArchivedEmployees.slice(0, visibleArchivedCount).map(emp => (
                        <EmployeeCard key={emp.id} employee={emp} onEdit={handleEditClick} />
                      ))}
                      
                      {/* Load More Trigger */}
                      {filteredArchivedEmployees.length > visibleArchivedCount && (
                        <div className="col-span-full flex justify-center mt-6">
                          <button
                            onClick={() => setVisibleArchivedCount(prev => prev + 12)}
                            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer outline-none"
                          >
                            {t.loadMoreEmployees}
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

            {/* Leaves Tab */}
            <div className={activeTab === 'leaves' ? '' : 'hidden'}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                {/* Left Column: Direct leave Logger */}
                {canEditLeaves && (
                  <div className="lg:col-span-1 p-8 bg-white/5 border border-white/10 rounded-[3rem] shadow-xl space-y-6 self-start">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-cyber-blue/15 rounded-2xl text-cyber-blue">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyber-blue animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-black text-white select-none">
                        {config.language === 'ar' ? 'تسجيل إجازة للموظف' : 'Record Employee Leave'}
                      </h3>
                    </div>

                    <form onSubmit={handleAddLeaveDirect} className="space-y-4">
                      {/* Autocomplete Input Selector */}
                      <Autocomplete
                        label={t.holderName}
                        placeholder={config.language === 'ar' ? 'ابحث باسم أو رقم الموظف...' : 'Search employee name or ID...'}
                        value={leaveEmployeeId}
                        onChange={setLeaveEmployeeId}
                      />

                      {/* Start Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase block ml-1 select-none">
                          {config.language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          required
                          value={leaveStartDate}
                          onChange={e => setLeaveStartDate(e.target.value)}
                          onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:border-cyber-blue outline-none transition-all"
                        />
                      </div>

                      {/* End Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase block ml-1 select-none">
                          {config.language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                        </label>
                        <input
                          type="date"
                          required
                          value={leaveEndDate}
                          onChange={e => setLeaveEndDate(e.target.value)}
                          onClick={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          onFocus={e => { try { (e.target as any).showPicker(); } catch (err) {} }}
                          className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:border-cyber-blue outline-none transition-all"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase block ml-1 select-none">
                          {config.language === 'ar' ? 'السبب / الملاحظات' : 'Reason / Notes'}
                        </label>
                        <input
                          type="text"
                          value={leaveNotes}
                          onChange={e => setLeaveNotes(e.target.value)}
                          placeholder="..."
                          className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:border-cyber-blue outline-none transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 bg-cyber-blue hover:bg-cyan-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-cyber-blue/10 transition-all text-xs uppercase tracking-wider cursor-pointer outline-none"
                      >
                        {config.language === 'ar' ? 'تسجيل وإعتماد الإجازة' : 'Log and Approve Leave'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Right Column: Vacation Ledgers and Logs List */}
                <div className={`${canEditLeaves ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
                  {/* Vacation Balances List */}
                  <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] shadow-xl space-y-6">
                    <h3 className="text-lg font-black text-white flex items-center gap-2 select-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyber-emerald animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {config.language === 'ar' ? 'أرصدة إجازات الموظفين (تراكمية بدون حد أقصى)' : 'Employee Vacation Balances (Unlimited carryover)'}
                    </h3>

                    <div className="space-y-4 max-h-[16rem] overflow-y-auto pr-1 custom-scrollbar">
                      {employees.filter(emp => !emp.isArchived).length > 0 ? (
                        employees
                          .filter(emp => !emp.isArchived)
                          .map(emp => {
                            const balance = calculateVacationBalance(emp);
                            return (
                              <div key={emp.id} className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <h4 className="text-sm font-black text-white">{emp.employeeName}</h4>
                                  <span className="text-[10px] text-slate-500 font-bold">{t.docNumber}: {emp.employeeId} | {emp.department}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-500 block font-bold">{t.vacationBalance}:</span>
                                    <span className={`text-xs font-black ${balance.remaining <= 5 ? 'text-cyber-rose' : 'text-cyber-emerald'}`}>
                                      {balance.remaining} {t.days} / {balance.granted} (مستحق)
                                    </span>
                                  </div>
                                  <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${balance.remaining <= 5 ? 'bg-cyber-rose' : 'bg-cyber-emerald'}`}
                                      style={{ width: `${Math.max(0, Math.min(100, (balance.remaining / balance.granted) * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-center py-6 text-slate-700 font-bold select-none">{t.noData}</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Leaves History list */}
                  <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] shadow-xl space-y-6">
                    <h3 className="text-lg font-black text-white flex items-center gap-2 select-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyber-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {config.language === 'ar' ? 'سجل الإجازات الأخير للمؤسسة' : 'Recent Enterprise Leaves History'}
                    </h3>

                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {globalLeavesList.length > 0 ? (
                        globalLeavesList.map(leave => {
                          const duration = getDaysBetween(leave.startDate, leave.endDate);
                          return (
                            <div key={leave.id} className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-white">{leave.employeeName}</h4>
                                  <span className="px-2.5 py-0.5 rounded-lg bg-cyber-blue/15 border border-cyber-blue/20 text-[10px] text-cyber-blue font-bold">
                                    {duration} {t.days}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 font-bold">
                                  {leave.notes || (config.language === 'ar' ? 'لا توجد ملاحظات' : 'No notes')}
                                </p>
                                <div className="text-[10px] text-slate-500 flex gap-4 font-mono select-all">
                                  <span>{config.language === 'ar' ? 'من' : 'From'}: {leave.startDate}</span>
                                  <span>{config.language === 'ar' ? 'إلى' : 'To'}: {leave.endDate}</span>
                                </div>
                              </div>
                              {canEditLeaves && (
                                  <button
                                    onClick={() => handleDeleteLeaveDirect(leave.parentEmployeeId, leave.id)}
                                    className="p-2 bg-cyber-rose/10 hover:bg-cyber-rose text-cyber-rose hover:text-white rounded-xl transition-all cursor-pointer border border-cyber-rose/10 outline-none"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                          );
                        })
                      ) : (
                        <p className="text-center py-10 text-slate-700 font-bold select-none">{t.noLeaves}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Advanced Employee Form Modal Overlay */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={editingEmployee}
      />

      {/* Global Beautiful Document Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-10 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="relative w-full max-w-5xl h-[85vh] bg-[#070911]/90 rounded-[3.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/40">
                <div className="flex items-center gap-3 truncate max-w-[50%]">
                  <div className="p-3 bg-cyber-blue/15 rounded-2xl text-cyber-blue shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="truncate">
                    <h3 className="text-md font-black text-white truncate" title={previewFile.name}>{previewFile.name}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
                      {previewFile.url.startsWith('data:application/pdf') ? 'PDF Document' : 'Image File'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 select-none">
                  {/* Download */}
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewFile.url;
                      link.download = previewFile.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-3 bg-white/5 hover:bg-cyber-emerald/20 hover:text-cyber-emerald rounded-full text-slate-400 transition-all cursor-pointer border border-white/5 hover:border-cyber-emerald/20 animate-pulse-glow"
                    title={config.language === 'ar' ? 'تحميل الملف' : 'Download file'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {/* Print */}
                  <button
                    onClick={() => {
                      const w = window.open();
                      if (w) {
                        w.document.write(`<iframe src="${previewFile.url}" style="border:none; width:100%; height:100vh;"></iframe>`);
                        w.document.close();
                        w.focus();
                        setTimeout(() => {
                          w.print();
                          w.close();
                        }, 500);
                      }
                    }}
                    className="p-3 bg-white/5 hover:bg-cyber-blue/20 hover:text-cyber-blue rounded-full text-slate-400 transition-all cursor-pointer border border-white/5 hover:border-cyber-blue/20"
                    title={config.language === 'ar' ? 'طباعة الوثيقة' : 'Print document'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>

                  {/* Close */}
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-3 bg-white/5 hover:bg-cyber-rose/20 hover:text-cyber-rose rounded-full text-slate-400 transition-all cursor-pointer border border-white/5 hover:border-cyber-rose/20"
                    title={config.language === 'ar' ? 'إغلاق المعاينة' : 'Close preview'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* View Content Area */}
              <div className="flex-1 bg-slate-950/70 p-4 md:p-8 flex items-center justify-center overflow-auto relative">
                {previewFile.url.startsWith('data:application/pdf') ? (
                  <iframe
                    src={previewFile.url}
                    className="w-full h-full rounded-2xl border border-white/5 shadow-2xl"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={previewFile.url}
                      alt={previewFile.name}
                      className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5 select-all"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
