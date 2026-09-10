import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  UploadCloud, 
  Plane, 
  BrainCircuit, 
  FileCheck2, 
  History, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Globe2,
  Calculator,
  ShieldCheck,
  BookOpen,
  Search
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  state: DatabaseState | null;
}

export default function Sidebar({ currentView, onSelectView, state }: SidebarProps) {
  const adCount = state?.requirements.length || 0;
  const applicableCount = state?.assessments.filter(a => a.result === 'APPLICABLE').length || 0;
  const reviewRequiredCount = state?.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length || 0;
  const pendingQuestionsCount = state?.questions.filter(q => q.status === 'PENDING').length || 0;
  const fleetCount = state?.aircraft.length || 0;
  const factsCount = state?.knowledgeFacts.filter(f => !f.isRejected).length || 0;
  const faptCount = state?.fapts.length || 0;
  const obligationsCount = state?.complianceObligations?.length || 0;
  const overdueObligationsCount = state?.complianceObligations?.filter(o => o.status === 'OVERDUE' || o.temporalCounters?.isOverdue).length || 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'fleet-ad-search',
      label: 'Busca de AD por Frota',
      icon: Search,
      badge: 'NOVO'
    },
    {
      id: 'regulatory',
      label: 'Conectores Regulatórios',
      icon: Globe2,
      badge: 'FAA / FR'
    },
    {
      id: 'obligations',
      label: 'Prazos & Limites (Due Dates)',
      icon: Calculator,
      count: obligationsCount,
      alertCount: overdueObligationsCount > 0 ? overdueObligationsCount : null
    },
    {
      id: 'delivery',
      label: 'Aquisição & Redelivery',
      icon: ShieldCheck,
      badge: 'FASE 7'
    },
    {
      id: 'help',
      label: 'Central de Ajuda & Manual',
      icon: BookOpen,
      badge: 'FASE 8'
    },
    {
      id: 'upload',
      label: 'Upload & Análise de AD',
      icon: UploadCloud,
      badge: 'AI + Regras'
    },
    {
      id: 'ads',
      label: 'Gestão de Diretrizes (ADs)',
      icon: FileSpreadsheet,
      count: adCount
    },
    {
      id: 'fleet',
      label: 'Inventário da Frota',
      icon: Plane,
      count: fleetCount
    },
    {
      id: 'knowledge',
      label: 'Base de Conhecimento',
      icon: BrainCircuit,
      count: factsCount,
      alertCount: pendingQuestionsCount > 0 ? pendingQuestionsCount : null
    },
    {
      id: 'fapt',
      label: 'Relatórios de Conformidade',
      icon: FileCheck2,
      count: faptCount
    },
    {
      id: 'audit',
      label: 'Trilha de Auditoria & Logs',
      icon: History,
      badge: null
    },
    {
      id: 'architecture',
      label: 'Arquitetura do Sistema',
      icon: Layers,
      badge: 'Dossiê'
    }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/10 text-slate-300 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] select-none">
      {/* Navigation list */}
      <div className="p-3 space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          CAMO Navigation
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all ${
                isActive
                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold shadow-sm'
                  : 'hover:bg-white/5 border border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.alertCount && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-600 text-white animate-pulse">
                    {item.alertCount}
                  </span>
                )}
                {item.count !== undefined && item.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-white/10 uppercase font-semibold">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Metrics Card & System Status */}
      <div className="p-3 m-3 space-y-3">
        <div className="p-3 bg-slate-900/60 rounded-lg border border-white/10 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center justify-between tracking-wider">
            <span>Fleet AD Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center text-amber-400">
              <span className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Applicable:</span>
              </span>
              <span className="font-bold">{applicableCount}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300">
              <span className="flex items-center space-x-1">
                <HelpCircle className="w-3 h-3" />
                <span>Review Req.:</span>
              </span>
              <span className="font-bold">{reviewRequiredCount}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Knowledge Facts:</span>
              </span>
              <span className="font-bold">{factsCount}</span>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg border border-white/5 text-slate-500 text-[10px] font-mono uppercase tracking-widest text-center">
          MVP v1.0.4 • EASA/FAA
        </div>
      </div>
    </aside>
  );
}
