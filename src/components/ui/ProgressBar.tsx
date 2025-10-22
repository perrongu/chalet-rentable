import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: 'emerald' | 'sky' | 'violet' | 'amber';
  className?: string;
}

export function ProgressBar({ 
  value, 
  max = 100, 
  label, 
  color = 'emerald',
  className 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-slate-600">{label}</span>
          <span className="text-xs font-semibold text-slate-700">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

