import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
}) => {
  const dialog=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);
  close.current=onClose;
  const heading=useId();
  useEffect(() => {
    if(!isOpen) return;
    const origin=document.activeElement as HTMLElement | null;
    const overflow=document.body.style.overflow;
    const panel=dialog.current!;
    const focusable=()=>Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(el=>el.getClientRects().length);
    document.body.style.overflow='hidden';
    (panel.querySelector<HTMLElement>('[data-initial-focus]') ?? focusable()[0] ?? panel).focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();close.current();return;}
      if(event.key!=='Tab') return;
      const elements=focusable();
      const first=elements[0],last=elements.at(-1);
      if(!first || !panel.contains(document.activeElement) || (event.shiftKey ? document.activeElement===first : document.activeElement===last)){
        event.preventDefault();(event.shiftKey?last??panel:first??panel).focus();
      }
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);origin?.focus();};
  },[isOpen]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-2 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div 
        className={`hub-dialog hub-enter relative z-10 my-2 flex max-h-[calc(100dvh-1rem)] w-full ${widthClasses[maxWidth]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:my-8 sm:max-h-[calc(100dvh-4rem)]`}
        ref={dialog}
        tabIndex={-1}
        aria-labelledby={title ? heading : undefined}
        aria-label={title ? undefined : "Detalhes"}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-[#1F3057] dark:bg-[#131F3D]/50 sm:px-6 sm:py-4.5">
            <div className="min-w-0">
              {title && <h3 id={heading} className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 overflow-y-auto p-4 text-slate-800 dark:text-slate-200 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
