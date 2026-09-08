import { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  X, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { MODULE_CONTEXTUAL_HELP, ModuleContextHelp, HELP_ARTICLES } from '../data/helpCenterData';

interface ContextualHelpDrawerProps {
  moduleId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToHelpArticle?: (articleId: string) => void;
  onNavigateToWorkflowStep?: (stepId: string) => void;
}

export default function ContextualHelpDrawer({
  moduleId,
  isOpen,
  onClose,
  onNavigateToHelpArticle,
  onNavigateToWorkflowStep
}: ContextualHelpDrawerProps) {
  const [help, setHelp] = useState<ModuleContextHelp | null>(null);

  useEffect(() => {
    if (MODULE_CONTEXTUAL_HELP[moduleId]) {
      setHelp(MODULE_CONTEXTUAL_HELP[moduleId]);
    } else {
      setHelp(MODULE_CONTEXTUAL_HELP['dashboard']);
    }
  }, [moduleId]);

  if (!isOpen || !help) return null;

  const primaryArticle = HELP_ARTICLES.find(a => a.id === help.primaryArticleId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
      <div 
        className="w-full max-w-lg bg-slate-900 border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 bg-slate-850 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                Orientação Operacional CAMO
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {help.moduleName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Fechar guia contextual"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs text-slate-300 font-sans">
          {/* Summary Box */}
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-indigo-200 leading-relaxed">
            {help.shortSummary}
          </div>

          {/* 1. O que estou vendo? */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>1. O que estou vendo nesta tela?</span>
            </div>
            <p className="p-3 bg-slate-800/60 rounded-lg border border-white/5 text-slate-300 leading-relaxed">
              {help.whatAmISeeing}
            </p>
          </div>

          {/* 2. O que isso significa? */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>2. O que isso significa para a aeronavegabilidade?</span>
            </div>
            <p className="p-3 bg-slate-800/60 rounded-lg border border-white/5 text-slate-300 leading-relaxed">
              {help.whatItMeans}
            </p>
          </div>

          {/* 3. O que devo fazer agora? */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>3. O que devo fazer agora? (Ação Operacional)</span>
            </div>
            <p className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-emerald-200 leading-relaxed">
              {help.whatShouldIDoNow}
            </p>
          </div>

          {/* 4. Qual é a consequência dessa decisão? */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>4. Consequência da Inação ou Erro</span>
            </div>
            <p className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-200/90 leading-relaxed">
              {help.consequences}
            </p>
          </div>

          {/* 5. Quando devo enviar para Human Review? */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>5. Quando enviar para Human Review?</span>
            </div>
            <ul className="p-3 bg-slate-800/80 rounded-lg border border-white/5 space-y-1.5 text-slate-300">
              {help.whenToSendToHumanReview.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 6. Artigo Completo no Manual */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              6. Documentação & Manual Completo
            </div>

            {primaryArticle && (
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToHelpArticle) {
                    onNavigateToHelpArticle(primaryArticle.id);
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-left transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-200">
                      {primaryArticle.title}
                    </div>
                    <div className="text-[10px] text-indigo-300 font-mono">
                      Capítulo: {primaryArticle.category} • Versão {primaryArticle.version}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-850 border-t border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono">CAMO Engine Manual v8.0.0</span>
          <button
            onClick={() => {
              onClose();
              if (onNavigateToHelpArticle) {
                onNavigateToHelpArticle(help.primaryArticleId);
              }
            }}
            className="flex items-center space-x-1.5 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <span>Abrir Central de Ajuda Completa</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
