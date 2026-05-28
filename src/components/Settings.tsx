import React, { useState } from 'react';
import { useAppStore } from '../store/store';
import { translations } from '../utils/translations';
import { BackupSchema } from '../utils/schemas';

export const Settings: React.FC = () => {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const showNotification = useAppStore(state => state.showNotification);
  const importBackup = useAppStore(state => state.importBackup);
  const employees = useAppStore(state => state.employees);

  const [newType, setNewType] = useState('');
  const [newDept, setNewDept] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const t = translations[config.language];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processLogoFile(file);
    e.target.value = '';
  };

  const processLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification(t.logoUploadError);
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      showNotification(
        config.language === 'ar'
          ? 'حجم الصورة كبير جداً! الحد الأقصى المسموح به هو 1.5 ميجابايت'
          : 'Image size is too large! Maximum allowed size is 1.5MB'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateConfig({ ...config, logoUrl: base64 });
      showNotification(t.logoUploaded);
    };
    reader.onerror = () => {
      showNotification(t.logoUploadError);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    if (window.confirm(config.language === 'ar' ? 'هل أنت متأكد من حذف شعار الشركة؟' : 'Are you sure you want to remove the company logo?')) {
      const updated = { ...config };
      delete updated.logoUrl;
      updateConfig(updated);
      showNotification(t.logoRemoved);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

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



  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expiry and Backup Threshold */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-[3rem] shadow-xl flex flex-col justify-between">
          <div>
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
        </div>

        {/* Company Logo Card */}
        <div className="lg:col-span-1 glass-panel p-8 rounded-[3rem] shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-white mb-8 select-none flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyber-blue animate-pulse-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.companyLogo}
            </h3>

            {config.logoUrl ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="relative group/logo">
                  <img
                    src={config.logoUrl}
                    alt="Company Logo"
                    className="h-28 w-28 object-contain border border-white/10 p-2 bg-slate-900/50 shadow-inner rounded-3xl transition-transform duration-300 group-hover/logo:scale-105"
                  />
                </div>
                <button
                  onClick={handleRemoveLogo}
                  className="px-4 py-2 bg-cyber-rose/10 hover:bg-cyber-rose text-cyber-rose hover:text-white border border-cyber-rose/20 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t.removeLogo}
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-[2rem] p-6 text-center transition-all duration-300 ${
                  isDragOver ? 'border-cyber-blue bg-cyber-blue/5' : 'border-white/10 hover:border-white/20 bg-slate-950/20'
                }`}
              >
                <label className="flex flex-col items-center justify-center cursor-pointer select-none space-y-3">
                  <div className="p-4 bg-white/5 rounded-2xl text-slate-400 group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-300">
                      {config.language === 'ar' ? 'اسحب الشعار هنا أو اضغط للاختيار' : 'Drag logo here or click to select'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {config.language === 'ar' ? 'صيغ PNG, JPG (الحد الأقصى 1.5MB)' : 'PNG, JPG (Max 1.5MB)'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
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
    </div>
  );
};
