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
  Search,
  Sparkles
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  state: DatabaseState | null;
}

interface NavSection {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: any;
    count?: number | null;
    alertCount?: number | null;
    badge?: string | null;
  }>;
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
  const candidateCount = state?.adCandidates?.length || 0;
  const kbCount = state?.regulatoryKnowledgeBase?.length || 0;
  const registerCount = state?.camoRegulatoryRegister?.length || 0;
  const pendingAnalysisCount = state?.camoRegulatoryRegister?.filter(r => r.analysisStatus === 'PENDING_ANALYSIS').length || 0;

  const navSections: NavSection[] = [
    {
      title: 'Frota & Operações',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Operacional',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'fleet',
          label: 'Inventário da Frota',
          icon: Plane,
          count: fleetCount
        }
      ]
    },
    {
      title: 'Inteligência Regulatória',
      items: [
        {
          id: 'regulatory-intel',
          label: 'Inteligência & Lacunas',
          icon: Sparkles,
          badge: 'Descoberta'
        },
        {
          id: 'analysis-phase',
          label: 'Fase de Análise',
          icon: FileCheck2,
          count: registerCount,
          alertCount: pendingAnalysisCount > 0 ? pendingAnalysisCount : null,
          badge: 'Operacional'
        },
        {
          id: 'camo-register',
          label: 'Regulatory Register',
          icon: Layers,
          count: registerCount,
          badge: 'Repositório'
        },
        {
          id: 'knowledge',
          label: 'Base de Conhecimento',
          icon: BrainCircuit,
          count: kbCount > 0 ? kbCount : factsCount,
          alertCount: pendingQuestionsCount > 0 ? pendingQuestionsCount : null
        },
        {
          id: 'regulatory',
          label: 'Fontes & Conectores',
          icon: Globe2,
          badge: 'FAA/EASA'
        }
      ]
    },
    {
      title: 'Conformidade & Diretrizes',
      items: [
        {
          id: 'ads',
          label: 'Diretrizes (ADs)',
          icon: FileSpreadsheet,
          count: adCount
        },
        {
          id: 'upload',
          label: 'Upload & Extração de AD',
          icon: UploadCloud,
          badge: 'AI Engine'
        },
        {
          id: 'fapt',
          label: 'Relatórios FAPT',
          icon: FileCheck2,
          count: faptCount
        }
      ]
    },
    {
      title: 'Aeronavegabilidade & Prazos',
      items: [
        {
          id: 'obligations',
          label: 'Prazos & Limites (Due Dates)',
          icon: Calculator,
          count: obligationsCount,
          alertCount: overdueObligationsCount > 0 ? overdueObligationsCount : null
        },
        {
          id: 'delivery',
          label: 'Aquisição & Delivery',
          icon: ShieldCheck,
          badge: null
        }
      ]
    },
    {
      title: 'Governança & Suporte',
      items: [
        {
          id: 'audit',
          label: 'Auditoria & Logs',
          icon: History,
          badge: 'SHA-256'
        },
        {
          id: 'architecture',
          label: 'Arquitetura & Dossiê',
          icon: Layers,
          badge: 'Dossiê'
        },
        {
          id: 'help',
          label: 'Central de Ajuda CAMO',
          icon: BookOpen,
          badge: null
        }
      ]
    }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/10 text-slate-300 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] select-none overflow-y-auto">
      {/* Navigation list */}
      <div className="p-3 space-y-4">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold shadow-sm'
                      : 'hover:bg-white/5 border border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.alertCount && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-600 text-white animate-pulse">
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
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-white/10 uppercase font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
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
