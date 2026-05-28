import React, { useState } from 'react';
import { useAppStore } from '../store/store';
import { translations } from '../utils/translations';
import { BackupSchema, type UserType } from '../utils/schemas';

export const Settings: React.FC = () => {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const showNotification = useAppStore(state => state.showNotification);
  const importBackup = useAppStore(state => state.importBackup);
  const employees = useAppStore(state => state.employees);
  const currentUser = useAppStore(state => state.currentUser);
  const users = useAppStore(state => state.users);
  const addUser = useAppStore(state => state.addUser);
  const deleteUser = useAppStore(state => state.deleteUser);

  const [newType, setNewType] = useState('');
  const [newDept, setNewDept] = useState('');
  
  // User creation form fields
  const [userNameField, setUserNameField] = useState('');
  const [passwordField, setPasswordField] = useState('');
  const [roleField, setRoleField] = useState<'admin' | 'user'>('user');
  const [permissionsField, setPermissionsField] = useState({
    canViewDashboard: true,
    canViewManagement: true,
    canEditManagement: false,
    canViewLeaves: true,
    canEditLeaves: false,
    canViewArchive: true,
    canEditArchive: false,
    canViewSettings: false,
  });

  const t = translations[config.language];

  const handleThresholdChange = (val: number) => {
    updateConfig({ ...config, threshold: val });
  };

  const handleAddType = () => {
    const trimmed = newType.trim();
    if (trimmed && !config.docTypes.includes(trimmed)) {
      updateConfig({ ...config, docTypes: [...config.docTypes, trimmed] });
      setNewType('');
    }
  };

  const handleRemoveType = (type: string) => {
    if (window.confirm(t.deleteConfirm)) {
      updateConfig({ ...config, docTypes: config.docTypes.filter(t => t !== type) });
    }
  };

  const handleAddDept = () => {
    const trimmed = newDept.trim();
    if (trimmed && !config.departments.includes(trimmed)) {
      updateConfig({ ...config, departments: [...config.departments, trimmed] });
      setNewDept('');
    }
  };

  const handleRemoveDept = (dept: string) => {
    if (window.confirm(t.deleteConfirm)) {
      updateConfig({ ...config, departments: config.departments.filter(d => d !== dept) });
    }
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify({ docs: employees, config }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `employee_docs_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showNotification(config.language === 'ar' ? 'تم تصدير النسخة الاحتياطية بنجاح!' : 'Backup exported successfully!');
    } catch {
      showNotification(config.language === 'ar' ? 'فشل تصدير الملف!' : 'Failed to export backup!');
    }
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Strict Schema Validation using Zod
        const result = BackupSchema.safeParse(parsed);
        if (result.success) {
          await importBackup(result.data);
        } else {
          showNotification(t.invalidFile);
          console.error('Validation errors:', result.error.issues);
        }
      } catch (err) {
        showNotification(config.language === 'ar' ? 'فشل قراءة الملف المختار أو الصيغة غير مدعومة!' : 'Failed to read selected file or invalid format!');
      }
    };
    fileReader.readAsText(file);
    // Clear value to allow triggering change on same file select
    e.target.value = '';
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = userNameField.trim();
    if (trimmedUser.length < 3) {
      showNotification(t.usernameError);
      return;
    }
    if (passwordField.length < 4) {
      showNotification(t.passwordError);
      return;
    }
    if (users.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
      showNotification(config.language === 'ar' ? 'اسم المستخدم هذا مسجل بالفعل!' : 'This username is already taken!');
      return;
    }

    const newUser: UserType = {
      id: 'usr_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      username: trimmedUser,
      password: passwordField,
      role: roleField,
      permissions: roleField === 'admin' ? {
        canViewDashboard: true,
        canViewManagement: true,
        canEditManagement: true,
        canViewLeaves: true,
        canEditLeaves: true,
        canViewArchive: true,
        canEditArchive: true,
        canViewSettings: true,
      } : {
        ...permissionsField
      }
    };

    await addUser(newUser);
    setUserNameField('');
    setPasswordField('');
    setRoleField('user');
    setPermissionsField({
      canViewDashboard: true,
      canViewManagement: true,
      canEditManagement: false,
      canViewLeaves: true,
      canEditLeaves: false,
      canViewArchive: true,
      canEditArchive: false,
      canViewSettings: false,
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Expiry and Backup Threshold */}
      <div className="glass-panel p-8 rounded-[3rem] shadow-xl">
        <h3 className="text-xl font-black text-white mb-8 select-none flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyber-blue animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {config.language === 'ar' ? 'تهيئة التنبيهات والنسخ الاحتياطي' : 'Notifications & Backup Configuration'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          {/* Threshold slider */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 select-none block">
              {config.language === 'ar' 
                ? `فترة الإنذار المبكر للانتهاء: (${config.threshold} يوم)` 
                : `Early Expiry Warning Period: (${config.threshold} days)`}
            </label>
            <input
              type="range"
              min="5"
              max="90"
              value={config.threshold}
              onChange={e => handleThresholdChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyber-blue outline-none border border-white/5"
            />
          </div>

          {/* Backup Import/Export */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportJSON}
              className="flex-1 min-w-[150px] py-4 bg-cyber-blue text-slate-950 font-black rounded-2xl shadow-xl shadow-cyber-blue/15 hover:bg-cyan-500 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.exportJSON}
            </button>

            <label className="flex-1 min-w-[150px] py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all border border-white/10 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{t.importJSON}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Dynamic List Configuration panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Document Types */}
        <div className="glass-panel p-8 rounded-[3rem] shadow-xl">
          <h4 className="text-sm font-black uppercase tracking-widest text-cyber-blue mb-6 flex items-center gap-2 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.manageTypes}
          </h4>
          
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder={t.addType}
              value={newType}
              onChange={e => setNewType(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddType()}
              className="flex-1 bg-slate-950 border border-slate-900 rounded-2xl py-4 px-6 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
            />
            <button
              onClick={handleAddType}
              className="p-4 bg-cyber-blue text-slate-950 hover:bg-cyan-500 rounded-2xl transition-all shadow-lg cursor-pointer outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {config.docTypes.map(item => (
              <div
                key={item}
                className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/[0.08] transition-all"
              >
                <span className="text-xs font-bold text-slate-300">{item}</span>
                <button
                  onClick={() => handleRemoveType(item)}
                  className="p-1.5 text-slate-600 hover:text-cyber-rose transition-all opacity-0 group-hover:opacity-100 cursor-pointer outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Departments */}
        <div className="glass-panel p-8 rounded-[3rem] shadow-xl">
          <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {t.manageDepts}
          </h4>
          
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder={t.addDept}
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDept()}
              className="flex-1 bg-slate-950 border border-slate-900 rounded-2xl py-4 px-6 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
            />
            <button
              onClick={handleAddDept}
              className="p-4 bg-indigo-600 text-white hover:bg-indigo-500 rounded-2xl transition-all shadow-lg cursor-pointer outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {config.departments.map(item => (
              <div
                key={item}
                className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/[0.08] transition-all"
              >
                <span className="text-xs font-bold text-slate-300">{item}</span>
                <button
                  onClick={() => handleRemoveDept(item)}
                  className="p-1.5 text-slate-600 hover:text-cyber-rose transition-all opacity-0 group-hover:opacity-100 cursor-pointer outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management Section (Admin Only) */}
      {currentUser?.role === 'admin' && (
        <div className="glass-panel p-8 rounded-[3rem] shadow-xl space-y-8 animate-in fade-in duration-300">
          <h3 className="text-xl font-black text-white select-none flex items-center gap-3 border-b border-white/5 pb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyber-blue animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {t.manageUsers}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create User Form */}
            <form onSubmit={handleAddUserSubmit} className="lg:col-span-5 space-y-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
              <h4 className="text-sm font-black text-cyber-blue select-none">
                {t.addUser}
              </h4>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block select-none">
                  {t.username}
                </label>
                <input
                  type="text"
                  value={userNameField}
                  onChange={e => setUserNameField(e.target.value)}
                  placeholder={config.language === 'ar' ? 'اسم المستخدم الجديد' : 'New username'}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3 px-4 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block select-none">
                  {t.password}
                </label>
                <input
                  type="password"
                  value={passwordField}
                  onChange={e => setPasswordField(e.target.value)}
                  placeholder={config.language === 'ar' ? 'كلمة المرور' : 'Password'}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3 px-4 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block select-none">
                  {t.role}
                </label>
                <select
                  value={roleField}
                  onChange={e => setRoleField(e.target.value as 'admin' | 'user')}
                  className="w-full bg-slate-950 border border-slate-900 rounded-2xl py-3 px-4 text-xs font-bold focus:border-cyber-blue outline-none text-white transition-all shadow-inner cursor-pointer"
                >
                  <option value="user">{t.user}</option>
                  <option value="admin">{t.admin}</option>
                </select>
              </div>

              {roleField === 'user' && (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  <label className="text-xs font-black text-slate-300 block select-none">
                    {t.permissionsLabel}
                  </label>
                  <div className="space-y-3">
                    {Object.keys(permissionsField).map((permKey) => {
                      const key = permKey as keyof typeof permissionsField;
                      return (
                        <label key={key} className="flex items-center gap-3 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={permissionsField[key]}
                            onChange={e => setPermissionsField({ ...permissionsField, [key]: e.target.checked })}
                            className="w-4.5 h-4.5 rounded border-slate-900 bg-slate-950 text-cyber-blue focus:ring-cyber-blue cursor-pointer accent-cyber-blue"
                          />
                          <span>{t.permissions[key]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-cyber-blue text-slate-950 font-black rounded-2xl shadow-xl shadow-cyber-blue/15 hover:bg-cyan-500 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t.addUser}
              </button>
            </form>

            {/* Users List */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-sm font-black text-indigo-400 select-none">
                {config.language === 'ar' ? 'الحسابات المسجلة حالياً' : 'Currently Registered Accounts'}
              </h4>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="p-5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl transition-all space-y-4 flex flex-col md:flex-row md:items-center justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-white">{u.username}</span>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${u.role === 'admin' ? 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                          {u.role === 'admin' ? t.admin : t.user}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        {config.language === 'ar' ? 'كلمة المرور: ' : 'Password: '}
                        <span className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-white/5 select-all">{u.password}</span>
                      </div>
                      
                      {u.role === 'user' && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.keys(u.permissions).map((permKey) => {
                            const key = permKey as keyof typeof u.permissions;
                            if (!u.permissions[key]) return null;
                            return (
                              <span key={key} className="px-2 py-0.5 text-[9px] font-bold bg-white/5 text-slate-400 rounded-md border border-white/5">
                                {t.permissions[key]}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {u.role !== 'admin' && (
                      <button
                        onClick={() => {
                          if (window.confirm(t.deleteConfirm)) {
                            deleteUser(u.id);
                          }
                        }}
                        className="px-4 py-2 text-xs font-black bg-cyber-rose/10 hover:bg-cyber-rose/20 text-cyber-rose rounded-xl border border-cyber-rose/20 hover:border-cyber-rose/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none md:self-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t.delete}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
