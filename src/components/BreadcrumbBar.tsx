import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { BreadcrumbItem, NavigationState, buildHashRoute } from '../services/navigationService';

interface BreadcrumbBarProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export default function BreadcrumbBar({
  breadcrumbs,
  onNavigate,
  onBack,
  canGoBack = false
}: BreadcrumbBarProps) {
  if (!breadcrumbs || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb Navigation"
      className="bg-slate-900/80 border-b border-white/10 px-6 py-2.5 flex items-center justify-between text-xs backdrop-blur-xs select-none sticky top-16 z-20"
    >
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
        {canGoBack && onBack && (
          <button
            onClick={onBack}
            title="Voltar ao contexto anterior"
            className="flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded transition border border-white/5 mr-2 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Voltar</span>
          </button>
        )}

        <ol className="flex items-center space-x-1.5 flex-nowrap">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isFirst = index === 0;

            return (
              <li key={item.id} className="flex items-center space-x-1.5 flex-shrink-0">
                {!isFirst && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                )}

                {item.clickable && !isLast ? (
                  <button
                    onClick={() => onNavigate(item)}
                    className="flex items-center space-x-1.5 text-slate-400 hover:text-indigo-300 transition hover:underline font-medium"
                  >
                    {isFirst && <Home className="w-3 h-3 text-slate-400" />}
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <span 
                    className={`flex items-center space-x-1.5 font-semibold ${
                      isLast ? 'text-indigo-200 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20' : 'text-slate-300'
                    }`}
                  >
                    {isFirst && <Home className="w-3 h-3 text-indigo-400" />}
                    <span className="truncate max-w-[280px] sm:max-w-md">{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="hidden lg:flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>CAMO Context Synchronized</span>
      </div>
    </nav>
  );
}
