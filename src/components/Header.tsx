import { 
  ShieldCheck, 
  Plane, 
  RotateCcw, 
  Bell, 
  UserCheck, 
  FileText,
  AlertTriangle,
  Cpu,
  Layers,
  Download,
  BookOpen
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface HeaderProps {
  state: DatabaseState | null;
  onResetSeed: () => void;
  onSelectView: (view: string) => void;
  onOpenDossier: () => void;
  isResetting: boolean;
}

export default function Header({ state, onResetSeed, onSelectView, onOpenDossier, isResetting }: HeaderProps) {
  const pendingQuestionsCount = state?.questions.filter(q => q.status === 'PENDING').length || 0;
  const reviewRequiredCount = state?.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length || 0;
  const fleetCount = state?.aircraft.length || 0;
  const adCount = state?.requirements.length || 0;

  return (
    <header className="h-16 glass-panel border-b border-white/10 text-slate-100 flex items-center justify-between px-6 sticky top-0 z-30 select-none">
      {/* Brand & CAMO Identity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 border border-indigo-400/40">
          <span className="font-extrabold text-xl text-white tracking-wider">A</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight uppercase text-white">
              Airworthiness Compliance Intelligence
            </h1>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              CAMO Intelligence
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono tracking-wide">
            OPERATOR: {state?.operator.name ? state.operator.name.toUpperCase() : 'BLUE-SKY LOGISTICS'} | {state?.operator.camoCertificate || 'CAMO-PT.042'}
          </p>
        </div>
      </div>

      {/* Center status indicators / Quick stats */}
      <div className="hidden md:flex items-center gap-6">
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-400 font-medium">Active Fleet</p>
          <p className="text-xs font-bold text-white font-mono">{fleetCount} Aircraft</p>
        </div>
        <div className="text-right border-l border-white/10 pl-6">
          <p className="text-[10px] uppercase text-slate-400 font-medium">AD Directives</p>
          <p className="text-xs font-bold text-indigo-300 font-mono">{adCount} Evaluated</p>
        </div>

        {pendingQuestionsCount > 0 ? (
          <button 
            onClick={() => onSelectView('knowledge')}
            className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-600/30 transition shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold">{pendingQuestionsCount} Missing Data Item{pendingQuestionsCount > 1 ? 's' : ''} (Action Req.)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px]">Rule Engine Synced</span>
          </div>
        )}
      </div>

      {/* User & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Download Official PDF */}
        <a
          href="/api/generate-architecture-pdf"
          download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
          title="Baixar Dossiê Arquitetural Oficial em PDF"
          className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg border border-indigo-400/40 transition font-mono font-bold shadow-md shadow-indigo-600/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Baixar PDF Oficial</span>
          <span className="sm:hidden">PDF</span>
        </a>

        {/* Central de Ajuda & Manual */}
        <button
          onClick={() => onSelectView('help')}
          title="Central de Ajuda, Manual Operacional e Guided CAMO Workflow"
          className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1.5 rounded-lg border border-indigo-500/40 transition font-mono shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
          <span className="hidden sm:inline">Manual CAMO</span>
        </button>

        {/* Dossiê / Arquitetura do Sistema Button */}
        <button
          onClick={onOpenDossier}
          title="Abrir Dossiê Executivo da Arquitetura e Mapa do Sistema"
          className="hidden md:flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1.5 rounded-lg border border-indigo-500/40 transition font-mono shadow-sm"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-300" />
          <span>Ver Dossiê</span>
        </button>

        {/* Download Audit Report */}
        <a
          href="/api/download-audit-report"
          download="AUDITORIA_TECNICA_EXTERNA_ADS.md"
          title="Baixar Arquivo Completo da Auditoria Técnica (.md)"
          className="hidden lg:flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1.5 rounded-lg border border-indigo-500/40 transition font-mono shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-indigo-300" />
          <span>Auditoria (.md)</span>
        </a>

        {/* Reset Demo Data */}
        <button
          onClick={onResetSeed}
          disabled={isResetting}
          title="Reset fleet & AD database to sample CAMO state"
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 px-2.5 py-1.5 rounded-lg border border-white/10 transition disabled:opacity-50 font-mono"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-indigo-400 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden xl:inline">Reset Seed</span>
        </button>

        {/* User Badge */}
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
              {state?.currentUser.role.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
