import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Ajuster la position si le tooltip sort de l'écran
      let newPosition = position;
      
      if (position === 'top' && triggerRect.top - tooltipRect.height < 0) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > window.innerHeight) {
        newPosition = 'top';
      } else if (position === 'left' && triggerRect.left - tooltipRect.width < 0) {
        newPosition = 'right';
      } else if (position === 'right' && triggerRect.right + tooltipRect.width > window.innerWidth) {
        newPosition = 'left';
      }
      
      setAdjustedPosition(newPosition);
    }
  }, [isVisible, position]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-slate-800 rounded-lg shadow-lg',
            'whitespace-nowrap pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionClasses[adjustedPosition],
            className
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              'absolute w-2 h-2 bg-slate-800 rotate-45',
              adjustedPosition === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
              adjustedPosition === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
              adjustedPosition === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
              adjustedPosition === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
}

interface TooltipSimpleProps {
  content: string;
  children: ReactNode;
}

export function TooltipSimple({ content, children }: TooltipSimpleProps) {
  return (
    <span
      className="group relative inline-block cursor-help border-b border-dotted border-slate-400"
      title={content}
    >
      {children}
      <span className="invisible group-hover:visible absolute z-50 px-3 py-2 text-sm text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
        {content}
      </span>
    </span>
  );
}

