import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/store';

interface AutocompleteProps {
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  label: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  label,
}) => {
  const { employees, config } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isRTL = config.language === 'ar';

  // Find selected employee to pre-fill input text
  const selectedEmp = useMemo(() => {
    return employees.find(emp => emp.id === value);
  }, [value, employees]);

  useEffect(() => {
    if (selectedEmp) {
      setSearchTerm(`${selectedEmp.employeeName} (${selectedEmp.employeeId})`);
    } else {
      setSearchTerm('');
    }
  }, [selectedEmp]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return employees.filter(emp => {
      if (emp.isArchived) return false;
      
      // If search input matches prefilled text exactly, don't filter out other items
      if (selectedEmp && term === `${selectedEmp.employeeName} (${selectedEmp.employeeId})`.toLowerCase()) {
        return true;
      }
      
      return (
        emp.employeeName.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term)
      );
    });
  }, [employees, searchTerm, selectedEmp]);

  // Virtualization constants
  const itemHeight = 52;
  const visibleCount = 6;
  const listHeight = itemHeight * visibleCount;
  const totalHeight = filteredEmployees.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(
    filteredEmployees.length,
    Math.floor((scrollTop + listHeight) / itemHeight) + 2
  );

  const visibleItems = useMemo(() => {
    return filteredEmployees.slice(startIndex, endIndex).map((emp, index) => ({
      item: emp,
      top: (startIndex + index) * itemHeight,
    }));
  }, [filteredEmployees, startIndex, endIndex]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset to original selected employee name if user clicks away
        if (selectedEmp) {
          setSearchTerm(`${selectedEmp.employeeName} (${selectedEmp.employeeId})`);
        } else {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedEmp]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative w-full">
      <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 select-none">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            // If user clears the text, clear the selected ID
            if (!e.target.value) {
              onChange('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-slate-950 border-2 border-slate-900 rounded-2xl py-3.5 px-4 text-xs font-bold text-white focus:border-cyber-blue outline-none transition-all shadow-inner"
        />
        
        {/* Toggle icon indicator */}
        <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} text-slate-500 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Floating Options Container */}
      {isOpen && (
        <div className="absolute z-[120] w-full mt-2 bg-[#0c0f17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{ height: `${Math.min(listHeight, totalHeight)}px` }}
            className="overflow-y-auto custom-scrollbar relative"
          >
            <div style={{ height: `${totalHeight}px`, width: '100%' }}>
              {visibleItems.map(({ item, top }) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onChange(item.id);
                    setSearchTerm(`${item.employeeName} (${item.employeeId})`);
                    setIsOpen(false);
                  }}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: 0,
                    right: 0,
                    height: `${itemHeight}px`,
                  }}
                  className="p-3.5 hover:bg-cyber-blue/15 hover:text-white cursor-pointer text-xs flex justify-between items-center border-b border-white/5 last:border-0 transition-colors"
                >
                  <span className="font-bold text-white truncate max-w-[60%]">
                    {item.employeeName}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    ID: {item.employeeId}
                  </span>
                </div>
              ))}
              
              {filteredEmployees.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  {config.language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
