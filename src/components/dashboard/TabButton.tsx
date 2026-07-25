interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  variant?: 'primary' | 'overdue' | 'warning';
}

export function TabButton({ label, active, onClick, count, variant }: TabButtonProps) {
  const countColor = variant === 'overdue' ? 'bg-red-500' : variant === 'warning' ? 'bg-orange-500' : 'bg-emerald-600';
  const textColor = active 
    ? (variant === 'overdue' ? 'text-red-700' : variant === 'warning' ? 'text-orange-700' : 'text-[#006c4a]')
    : 'text-slate-500 hover:text-slate-700';

  return (
    <button type="button"
      onClick={onClick}
      className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 ${
        active 
          ? 'bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/50 ' + textColor 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`${countColor} text-white text-[9px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold animate-in zoom-in px-1`}>
          {count}
        </span>
      )}
    </button>
  );
}
