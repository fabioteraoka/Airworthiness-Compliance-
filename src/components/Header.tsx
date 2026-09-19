import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  UserCheck, 
  BookOpen,
  Sparkles,
  AlertTriangle,
  Clock,
  ExternalLink,
  X,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface HeaderProps {
  state: DatabaseState | null;
  onSelectView: (view: string, subTab?: string) => void;
}

export default function Header({ state, onSelectView }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notifications on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notifications aggregation
  const pendingQuestions = state?.questions.filter(q => q.status === 'PENDING') || [];
  const overdueObligations = state?.complianceObligations?.filter(o => o.status === 'OVERDUE' || o.temporalCounters?.isOverdue) || [];
  const dueSoonObligations = state?.complianceObligations?.filter(o => o.status === 'DUE_SOON') || [];
  const emergencyAds = state?.requirements.filter(r => r.emergencyAd) || [];

  const totalAlerts = pendingQuestions.length + overdueObligations.length + emergencyAds.length;

  const fleetCount = state?.aircraft.length || 0;
  const adCount = state?.requirements.length || 0;

  return (
    <header 
      className="h-16 glass-panel border-b border-white/10 text-slate-100 flex items-center justify-between px-6 sticky top-0 z-30 select-none"
      role="banner"
    >
      {/* Brand & CAMO Identity */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onSelectView('dashboard')}
          className="flex items-center gap-3 text-left group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1 transition"
          aria-label="Ir para o Dashboard Operacional"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 border border-indigo-400/40 group-hover:bg-indigo-500 transition">
            <span className="font-extrabold text-xl text-white tracking-wider">A</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight uppercase text-white">
                Airworthiness Compliance Intelligence
              </h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                CAMO Engine v2.1
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">
              OPERADOR: {state?.operator.name ? state.operator.name.toUpperCase() : 'BLUE-SKY LOGISTICS'} | {state?.operator.camoCertificate || 'CAMO-PT.042'}
            </p>
          </div>
        </button>
      </div>

      {/* Center status indicators / Quick stats & AI Engine */}
      <div className="hidden md:flex items-center gap-6">
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-400 font-medium">Frota Ativa</p>
          <p className="text-xs font-bold text-white font-mono">{fleetCount} Aeronaves</p>
        </div>
        <div className="text-right border-l border-white/10 pl-6">
          <p className="text-[10px] uppercase text-slate-400 font-medium">Diretrizes Avaliadas</p>
          <p className="text-xs font-bold text-indigo-300 font-mono">{adCount} Registros</p>
        </div>

        {/* AI & Rule Engine Status Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-[11px] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>AI Engine Online (Gemini 3.7)</span>
          </span>
        </div>
      </div>

      {/* Right Controls: Notifications, Help, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Popover */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-lg border transition ${
              totalAlerts > 0
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300 hover:bg-rose-900/40'
                : 'bg-slate-800/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Notificações e Alertas Operacionais CAMO"
            aria-label={`Notificações: ${totalAlerts} alertas pendentes`}
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-slate-200">Alertas & Notificações CAMO</span>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 max-h-80 overflow-y-auto space-y-2.5">
                {emergencyAds.length > 0 && (
                  <div 
                    onClick={() => {
                      setShowNotifications(false);
                      onSelectView('ads');
                    }}
                    className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 cursor-pointer hover:bg-rose-500/25 transition"
                  >
                    <div className="flex items-center justify-between text-rose-300 font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                        <span>{emergencyAds.length} Diretriz{emergencyAds.length > 1 ? 'es' : ''} de Emergência</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono">Urgente</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Diretrizes com cumprimento emergencial requerem análise prioritária na frota.
                    </p>
                  </div>
                )}

                {overdueObligations.length > 0 && (
                  <div 
                    onClick={() => {
                      setShowNotifications(false);
                      onSelectView('obligations');
                    }}
                    className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 cursor-pointer hover:bg-amber-500/25 transition"
                  >
                    <div className="flex items-center justify-between text-amber-300 font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{overdueObligations.length} Obrigação{overdueObligations.length > 1 ? 'ões' : ''} Vencida{overdueObligations.length > 1 ? 's' : ''}</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono">Ação Req.</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Prazos limites ultrapassados. Verifique aeronaves e emita parecer técnico FAPT.
                    </p>
                  </div>
                )}

                {pendingQuestions.length > 0 && (
                  <div 
                    onClick={() => {
                      setShowNotifications(false);
                      onSelectView('governance', 'knowledge');
                    }}
                    className="p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/25 transition"
                  >
                    <div className="flex items-center justify-between text-indigo-300 font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{pendingQuestions.length} Dado{pendingQuestions.length > 1 ? 's' : ''} Ausente{pendingQuestions.length > 1 ? 's' : ''} (Missing Data)</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono">Feedback</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Perguntas operacionais pendentes na Base de Conhecimento para desambiguação de aplicabilidade.
                    </p>
                  </div>
                )}

                {totalAlerts === 0 && (
                  <div className="py-6 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-300 text-xs">Nenhum Alerta Crítico Pendente</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Todas as obrigações e diretrizes estão em conformidade.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global Help & Manual Button */}
        <button
          onClick={() => onSelectView('governance', 'manual')}
          title="Central de Ajuda & Manual Operacional CAMO"
          className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1.5 rounded-lg border border-indigo-500/40 transition font-mono shadow-sm"
          aria-label="Abrir Manual Operacional CAMO e Suporte"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
          <span className="hidden sm:inline font-semibold">Manual CAMO</span>
        </button>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-white/10">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 font-bold text-xs font-mono shadow-sm">
            FT
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <span>{state?.currentUser.name || 'Eng. Fábio Teraoka'}</span>
              <UserCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {state?.currentUser.role ? state.currentUser.role.replace(/_/g, ' ') : 'CHIEF CAMO ENGINEER'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
