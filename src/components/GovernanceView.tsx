import { useState } from 'react';
import { 
  Layers, 
  History, 
  BookOpen, 
  BrainCircuit, 
  Server, 
  Download, 
  RotateCcw, 
  FileText, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import AuditTrailView from './AuditTrailView';
import ArchitectureView from './ArchitectureView';
import HelpCenterView from './HelpCenterView';
import KnowledgeBaseView from './KnowledgeBaseView';

interface GovernanceViewProps {
  state: DatabaseState | null;
  onRefreshState?: (newState: DatabaseState) => void;
  onSelectAd?: (id: string) => void;
  onNavigateView?: (view: string, subTab?: string) => void;
  onOpenDossier?: () => void;
  onResetSeed?: () => void;
  isResetting?: boolean;
  initialTab?: 'audit' | 'manual' | 'dossier' | 'knowledge' | 'system';
  initialArticleId?: string;
}

export default function GovernanceView({
  state,
  onRefreshState,
  onSelectAd,
  onNavigateView,
  onOpenDossier,
  onResetSeed,
  isResetting = false,
  initialTab = 'audit',
  initialArticleId
}: GovernanceViewProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'manual' | 'dossier' | 'knowledge' | 'system'>(initialTab);

  const pendingQuestionsCount = state?.questions.filter(q => q.status === 'PENDING').length || 0;
  const auditCount = state?.auditTrail.length || 0;
  const factsCount = state?.knowledgeFacts.filter(f => !f.isRejected).length || 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Sub-Header Navigation Bar for Governance */}
      <div className="glass-panel border-b border-white/10 px-6 py-3 shrink-0 flex items-center justify-between flex-wrap gap-3 bg-slate-900/70">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trilha de Auditoria</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">{auditCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'manual'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manual CAMO & Suporte</span>
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'dossier'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dossiê de Arquitetura</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Base de Conhecimento</span>
            {pendingQuestionsCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold animate-pulse">
                {pendingQuestionsCount}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">{factsCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Sistema & Ambiente</span>
          </button>
        </div>

        {/* Quick Context Action for Dossier or Reset if on system/dossier tab */}
        {activeTab === 'dossier' && onOpenDossier && (
          <button
            onClick={onOpenDossier}
            className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1 rounded-lg border border-indigo-500/40 transition font-mono shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>Abrir Modal Dossiê Executivo</span>
          </button>
        )}
      </div>

      {/* Main Tab Renderers */}
      <div className="flex-1">
        {activeTab === 'audit' && state && (
          <AuditTrailView state={state} />
        )}

        {activeTab === 'manual' && (
          <HelpCenterView
            initialArticleId={initialArticleId}
            onNavigateView={(view) => {
              if (onNavigateView) onNavigateView(view);
            }}
            onOpenDossier={onOpenDossier}
          />
        )}

        {activeTab === 'dossier' && (
          <ArchitectureView onOpenDossier={onOpenDossier} />
        )}

        {activeTab === 'knowledge' && state && onRefreshState && (
          <KnowledgeBaseView
            state={state}
            onRefreshState={onRefreshState}
            onSelectAd={onSelectAd || (() => {})}
          />
        )}

        {activeTab === 'system' && (
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                Operações do Sistema, Artefatos & Ambiente de Testes
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Acesse artefatos oficiais de auditoria, downloads arquiteturais e ferramentas de reinicialização de base para testes e demonstrações.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Official Architecture PDF */}
              <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Dossiê Arquitetural Oficial (PDF)</h3>
                    <p className="text-xs text-slate-400">Documento executivo consolidado com especificações v2.1</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Gere e faça download do arquivo PDF formal com o mapa de arquitetura, camadas do sistema e evidências regulatórias.
                </p>
                <a
                  href="/api/generate-architecture-pdf"
                  download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
                  className="inline-flex items-center gap-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-mono font-bold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF Oficial</span>
                </a>
              </div>

              {/* Audit Report Markdown */}
              <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Relatório de Auditoria Técnica (.md)</h3>
                    <p className="text-xs text-slate-400">Exportação técnica de eventos e validações de integridade</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Arquivo para fins de auditoria externa e conformidade EASA Part-CAMO com histórico completo das diretrizes.
                </p>
                <a
                  href="/api/download-audit-report"
                  download="AUDITORIA_TECNICA_EXTERNA_ADS.md"
                  className="inline-flex items-center gap-2 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-4 py-2 rounded-lg border border-indigo-500/40 font-mono transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Auditoria (.md)</span>
                </a>
              </div>

              {/* Reset Seed Demo Utility (Safely Relocated) */}
              <div className="glass-panel p-5 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-3 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Ambiente de Demonstração & Reset de Dados</h3>
                    <p className="text-xs text-slate-400">Controle para testes operacionais e redefinição de semente</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Esta operação restaura o banco de dados em memória para a semente canônica do protótipo CAMO (aeronaves Boeing 737-800, diretrizes FAA/EASA e histórico de conformidade).
                </p>
                {onResetSeed && (
                  <button
                    onClick={onResetSeed}
                    disabled={isResetting}
                    className="flex items-center gap-2 text-xs text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 px-4 py-2 rounded-lg transition font-mono disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>{isResetting ? 'Restaurando Banco...' : 'Redefinir Dados de Demonstração (Reset Seed)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
