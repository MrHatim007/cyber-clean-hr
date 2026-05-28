import React, { useState } from 'react';
import { useAppStore } from '../store/store';
import { translations } from '../utils/translations';

export const Login: React.FC = () => {
  const config = useAppStore(state => state.config);
  const toggleLanguage = useAppStore(state => state.toggleLanguage);
  const loginUser = useAppStore(state => state.loginUser);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = translations[config.language];
  const isRtl = config.language === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      setError(t.usernameError);
      return;
    }
    if (password.length < 4) {
      setError(t.passwordError);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await loginUser(trimmedUsername, password);
      if (!success) {
        setError(t.invalidLogin);
      }
    } catch (err) {
      setError(config.language === 'ar' ? 'حدث خطأ غير متوقع!' : 'An unexpected error occurred!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 p-4 md:p-8 font-sans">
      {/* Dynamic colorful neon blobs for premium aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyber-blue/10 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

      {/* Main card */}
      <div 
        className="w-full max-w-[460px] glass-panel p-8 md:p-10 rounded-[3rem] shadow-2xl relative border border-white/10 flex flex-col justify-between"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Language selector toggle button */}
        <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-10`}>
          <button
            onClick={() => toggleLanguage()}
            className="px-4 py-2 text-xs font-black bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all border border-white/10 flex items-center gap-1.5 cursor-pointer outline-none active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.31 16.5 3 19" />
            </svg>
            {config.language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Branding header */}
        <div className="text-center mt-6 mb-8 select-none">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-cyber-blue to-indigo-500 rounded-3xl shadow-xl shadow-cyber-blue/20 mb-4 animate-bounce-slow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white leading-tight mb-2">
            {t.loginTitle}
          </h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            {config.language === 'ar' 
              ? 'يرجى إدخال اسم المستخدم وكلمة المرور للوصول للنظام' 
              : 'Please enter your username and password to gain access'}
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-cyber-rose/10 border border-cyber-rose/20 text-xs font-bold text-cyber-rose flex items-center gap-3 animate-in fade-in duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 block tracking-wide select-none">
              {t.username}
            </label>
            <div className="relative">
              <span className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} flex items-center text-slate-500`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={isRtl ? 'أدخل اسم المستخدم' : 'Enter username'}
                className={`w-full bg-slate-950/80 border border-white/5 rounded-2xl py-4.5 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm font-bold text-white placeholder-slate-600 focus:border-cyber-blue outline-none transition-all shadow-inner focus:ring-1 focus:ring-cyber-blue/20`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 block tracking-wide select-none">
              {t.password}
            </label>
            <div className="relative">
              <span className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} flex items-center text-slate-500`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m0-6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-6z" />
                </svg>
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter password'}
                className={`w-full bg-slate-950/80 border border-white/5 rounded-2xl py-4.5 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm font-bold text-white placeholder-slate-600 focus:border-cyber-blue outline-none transition-all shadow-inner focus:ring-1 focus:ring-cyber-blue/20`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4.5 bg-gradient-to-r from-cyber-blue to-indigo-600 text-slate-950 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-cyber-blue/15 hover:shadow-cyber-blue/25 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none mt-2"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t.loginBtn}
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center mt-8 select-none">
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
            {config.language === 'ar' ? 'نظام إدارة الموارد البشرية والوثائق الآمن v3.0.0' : 'Secure HR & Doc Management System v3.0.0'}
          </p>
        </div>
      </div>
    </div>
  );
};
