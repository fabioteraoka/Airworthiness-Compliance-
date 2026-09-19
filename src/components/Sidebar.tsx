import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Plane, 
  Calculator, 
  ShieldCheck, 
  Layers, 
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Compass
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { getPrimaryNavForView, PrimaryView } from '../services/navigationService';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string, subTab?: string) => void;
  state: DatabaseState | null;
}

interface NavItemConfig {
  id: PrimaryView;
  label: string;
  icon: any;
  count?: number | null;
  alertCount?: number | null;
  badge?: string | null;
  description?: string;
}

interface NavSectionConfig {
  workspaceId: string;
  title: string;
  items: NavItemConfig[];
}

export default function Sidebar({ currentView, onSelectView, state }: SidebarProps) {
  // Domain Counters
  const fleetCount = state?.aircraft.length || 0;
  const adCount = state?.requirements.length || 0;
  const pendingAnalysisCount = state?.camoRegulatoryRegister?.filter(r => r.analysisStatus === 'PENDING_ANALYSIS').length || 0;
  const sbRepositoryCount = state?.sbRepository?.length || 0;
  const adSbDependenciesCount = state?.adSbDependencies?.length || 0;
  const technicalReferencesCount = sbRepositoryCount > 0 ? sbRepositoryCount : adSbDependenciesCount;
  const obligationsCount = state?.complianceObligations?.length || 0;
  const overdueObligationsCount = state?.complianceObligations?.filter(o => o.status === 'OVERDUE' || o.temporalCounters?.isOverdue).length || 0;
  const pendingQuestionsCount = state?.questions.filter(q => q.status === 'PENDING').length || 0;

  // Additional Operational Metric Counters for Bottom Card
  const applicableCount = state?.assessments.filter(a => a.result === 'APPLICABLE').length || 0;
  const reviewRequiredCount = state?.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length || 0;
  const factsCount = state?.knowledgeFacts.filter(f => !f.isRejected).length || 0;

  // Active Primary Item derived from Canonical Route (Phase 1 engine)
  const activePrimary = getPrimaryNavForView(currentView);

  // Cockpit (Outside Workspaces)
  const cockpitItem: NavItemConfig = {
    id: 'dashboard',
    label: 'Dashboard Operacional',
    icon: LayoutDashboard,
    badge: null,
    description: 'Cockpit e visão gerencial'
  };

  // 4 Workspaces as defined in Architecture Gate v2.1
  const workspaces: NavSectionConfig[] = [
    {
      workspaceId: 'w1-fleet-operations',
      title: 'Frota & Operações',
      items: [
        {
          id: 'fleet',
          label: 'Gestão da Frota',
          icon: Plane,
          count: fleetCount,
          description: 'Aeronaves, Motores, Componentes e Matriz Frota × AD'
        },
        {
          id: 'delivery',
          label: 'Delivery & Pré-Compra',
          icon: ShieldCheck,
          badge: 'Leasing',
          description: 'Transição, Aquisição e Redelivery Técnico'
        }
      ]
    },
    {
      workspaceId: 'w2-regulatory-engineering',
      title: 'Engenharia Regulatória',
      items: [
        {
          id: 'regulatory-intel',
          label: 'Inteligência Regulatória',
          icon: Sparkles,
          badge: 'Descoberta',
          description: 'Descoberta Operacional, Fontes Oficiais & Vault'
        },
        {
          id: 'ads',
          label: 'Diretrizes (ADs)',
          icon: FileSpreadsheet,
          count: adCount,
          alertCount: pendingAnalysisCount > 0 ? pendingAnalysisCount : null,
          description: 'Acervo Ativo, Mesa de Análise IA e Extração'
        },
        {
          id: 'technical-references',
          label: 'Referências Técnicas (SB/RB)',
          icon: FileText,
          count: technicalReferencesCount > 0 ? technicalReferencesCount : null,
          description: 'Service Bulletins, Documentos OEM e Validação Cruzada'
        }
      ]
    },
    {
      workspaceId: 'w3-compliance-airworthiness',
      title: 'Conformidade & Aeronavegabilidade',
      items: [
        {
          id: 'obligations',
          label: 'Obrigações & Prazos Limites',
          icon: Calculator,
          count: obligationsCount,
          alertCount: overdueObligationsCount > 0 ? overdueObligationsCount : null,
          description: 'Due Dates, Timeline Temporal e Acervo FAPT'
        }
      ]
    },
    {
      workspaceId: 'w4-governance-knowledge-system',
      title: 'Governança, Conhecimento & Sistema',
      items: [
        {
          id: 'governance',
          label: 'Governança & Suporte',
          icon: Layers,
          alertCount: pendingQuestionsCount > 0 ? pendingQuestionsCount : null,
          badge: 'Compliance',
          description: 'Auditoria, Manual CAMO, Dossiê e Base de Conhecimento'
        }
      ]
    }
  ];

  return (
    <aside 
      className="w-64 glass-panel border-r border-white/10 text-slate-300 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] select-none overflow-y-auto"
      role="navigation"
      aria-label="Navegação Principal CAMO"
    >
      {/* Navigation list */}
      <div className="p-3 space-y-4">
        {/* Cockpit Section */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Cockpit</span>
            <span className="text-[8px] font-mono text-indigo-400 font-semibold uppercase">Visão Geral</span>
          </div>
          {(() => {
            const Icon = cockpitItem.icon;
            const isActive = activePrimary === cockpitItem.id;
            return (
              <button
                key={cockpitItem.id}
                onClick={() => onSelectView(cockpitItem.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 font-semibold shadow-sm'
                    : 'hover:bg-white/5 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={cockpitItem.description}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">{cockpitItem.label}</span>
                </div>
              </button>
            );
          })()}
        </div>

        {/* 4 Workspaces */}
        {workspaces.map((workspace) => (
          <div key={workspace.workspaceId} className="space-y-1">
            <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {workspace.title}
            </div>
            {workspace.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePrimary === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 font-semibold shadow-sm'
                      : 'hover:bg-white/5 border border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  title={item.description}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {item.alertCount && item.alertCount > 0 ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-600 text-white animate-pulse" title={`${item.alertCount} pendências requerem atenção`}>
                        {item.alertCount}
                      </span>
                    ) : null}
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
            <span>Status CAMO & Frota</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Monitoramento contínuo ativo"></span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center text-amber-400">
              <span className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Aplicáveis:</span>
              </span>
              <span className="font-bold">{applicableCount}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300">
              <span className="flex items-center space-x-1">
                <HelpCircle className="w-3 h-3" />
                <span>Revisão Req.:</span>
              </span>
              <span className="font-bold">{reviewRequiredCount}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Base Conhec.:</span>
              </span>
              <span className="font-bold">{factsCount} fatos</span>
            </div>
          </div>
        </div>

        <div className="p-2 rounded-lg border border-white/5 text-slate-500 text-[9px] font-mono uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
          <Compass className="w-3 h-3 text-indigo-400" />
          <span>CAMO v2.1 • 4 Workspaces</span>
        </div>
      </div>
    </aside>
  );
}
