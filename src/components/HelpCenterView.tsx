import { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Compass, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Layers, 
  History, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  Plane,
  Calculator,
  ShieldCheck,
  BrainCircuit,
  Filter,
  FileCheck2,
  Tag,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  HELP_ARTICLES, 
  GLOSSARY_TERMS, 
  GUIDED_CAMO_WORKFLOW, 
  DOCUMENTATION_METADATA,
  HelpArticle,
  GlossaryTerm,
  GuidedWorkflowStep
} from '../data/helpCenterData';

interface HelpCenterViewProps {
  initialTab?: 'manual' | 'workflow' | 'search' | 'glossary' | 'architecture' | 'version';
  initialArticleId?: string;
  onNavigateView: (view: string) => void;
  onOpenDossier?: () => void;
}

export default function HelpCenterView({
  initialTab = 'manual',
  initialArticleId,
  onNavigateView,
  onOpenDossier
}: HelpCenterViewProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'workflow' | 'search' | 'glossary' | 'architecture' | 'version'>(initialTab);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(initialArticleId || HELP_ARTICLES[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [glossaryCategory, setGlossaryCategory] = useState<string>('ALL');
  const [glossaryLetter, setGlossaryLetter] = useState<string>('ALL');
  const [selectedStepNumber, setSelectedStepNumber] = useState<number>(1);
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState<GlossaryTerm | null>(null);

  // Selected active article
  const currentArticle = useMemo(() => {
    return HELP_ARTICLES.find(a => a.id === selectedArticleId) || HELP_ARTICLES[0];
  }, [selectedArticleId]);

  // Categories list
  const categories = [
    { id: 'ALL', label: 'Todos os Capítulos' },
    { id: 'FOUNDATION', label: '1. Fundamentos & Princípios' },
    { id: 'FLEET', label: '2. Frota & Configuração' },
    { id: 'REGULATORY', label: '3. Regulatório & ADs' },
    { id: 'COMPLIANCE', label: '4. Requisitos & Obrigações' },
    { id: 'EVIDENCE', label: '5. Evidências & Provas' },
    { id: 'AIRWORTHINESS', label: '6. Aeronavegabilidade' },
    { id: 'DELIVERY', label: '7. Aquisição & Entrega' },
    { id: 'OPERATIONS', label: '8. Revisão Humana & Operações' }
  ];

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return HELP_ARTICLES.filter(a => {
      const matchCat = selectedCategory === 'ALL' || a.category === selectedCategory;
      const matchQuery = !searchQuery || 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.detailedContent.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  // Client-side search for the dedicated search tab
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const tokens = q.split(/\s+/);
    const results: any[] = [];

    // Articles search
    for (const a of HELP_ARTICLES) {
      let score = 0;
      if (a.title.toLowerCase() === q) score += 100;
      else if (a.title.toLowerCase().includes(q)) score += 60;
      else if (a.subtitle.toLowerCase().includes(q)) score += 30;

      for (const t of tokens) {
        if (a.title.toLowerCase().includes(t)) score += 20;
        if (a.summary.toLowerCase().includes(t)) score += 10;
        if (a.detailedContent.toLowerCase().includes(t)) score += 5;
      }

      if (score > 0) {
        results.push({
          type: 'ARTICLE',
          id: a.id,
          title: a.title,
          subtitle: a.subtitle,
          category: a.category,
          snippet: a.summary,
          score,
          linkId: a.id
        });
      }
    }

    // Glossary search
    for (const g of GLOSSARY_TERMS) {
      let score = 0;
      const termLower = g.term.toLowerCase();
      const acrLower = (g.acronym || '').toLowerCase();
      if (termLower === q || acrLower === q) score += 100;
      else if (termLower.includes(q) || acrLower.includes(q)) score += 60;

      for (const t of tokens) {
        if (termLower.includes(t)) score += 20;
        if (g.definition.toLowerCase().includes(t)) score += 10;
        if (g.operationalRole.toLowerCase().includes(t)) score += 5;
      }

      if (score > 0) {
        results.push({
          type: 'GLOSSARY',
          id: `gloss-${g.term}`,
          title: g.acronym ? `${g.term} (${g.acronym})` : g.term,
          subtitle: `Glossário • ${g.category}`,
          category: g.category,
          snippet: g.definition,
          score,
          termData: g
        });
      }
    }

    // Workflow steps
    for (const s of GUIDED_CAMO_WORKFLOW) {
      let score = 0;
      if (s.title.toLowerCase().includes(q) || s.module.toLowerCase().includes(q)) score += 40;
      for (const t of tokens) {
        if (s.title.toLowerCase().includes(t)) score += 15;
        if (s.whatItDoes.toLowerCase().includes(t)) score += 10;
      }
      if (score > 0) {
        results.push({
          type: 'WORKFLOW',
          id: `step-${s.stepNumber}`,
          title: `Passo ${s.stepNumber}: ${s.title}`,
          subtitle: `Guided Workflow • Módulo: ${s.module}`,
          category: 'WORKFLOW',
          snippet: s.summary,
          score,
          stepNumber: s.stepNumber
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }, [searchQuery]);

  // Glossary filtered list
  const filteredGlossary = useMemo(() => {
    return GLOSSARY_TERMS.filter(g => {
      const matchCat = glossaryCategory === 'ALL' || g.category === glossaryCategory;
      const matchLetter = glossaryLetter === 'ALL' || g.term.toUpperCase().startsWith(glossaryLetter);
      const matchSearch = !searchQuery || 
        g.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.acronym && g.acronym.toLowerCase().includes(searchQuery.toLowerCase())) ||
        g.definition.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchLetter && matchSearch;
    });
  }, [glossaryCategory, glossaryLetter, searchQuery]);

  // Selected workflow step
  const currentStep = useMemo(() => {
    return GUIDED_CAMO_WORKFLOW.find(s => s.stepNumber === selectedStepNumber) || GUIDED_CAMO_WORKFLOW[0];
  }, [selectedStepNumber]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Central de Ajuda & Manual de Utilização do CAMO Engine</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
              FASE 8 HOMOLOGADA
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Guia Operacional & Base de Conhecimento Regulatório
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Manual operacional detalhado, glossário de termos aeronáuticos e fluxo guiado passo a passo para engenheiros e inspetores CAMO em conformidade com FAA 14 CFR Part 39, EASA Part-M e ANAC RBAC 121.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <div className="p-2.5 bg-slate-800/80 border border-white/10 rounded-lg text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Versão Oficial</div>
            <div className="text-xs font-mono font-bold text-emerald-400">v{DOCUMENTATION_METADATA.version}</div>
          </div>
          <button
            onClick={() => setActiveTab('workflow')}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
          >
            <Compass className="w-4 h-4" />
            <span>Guided CAMO Workflow</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-white/10 space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'manual'
              ? 'border-indigo-500 text-indigo-300 bg-white/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Manual de Utilização ({HELP_ARTICLES.length} Artigos)</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'workflow'
              ? 'border-indigo-500 text-indigo-300 bg-white/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Guided CAMO Workflow (6 Etapas)</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'search'
              ? 'border-indigo-500 text-indigo-300 bg-white/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Busca Especializada</span>
        </button>

        <button
          onClick={() => setActiveTab('glossary')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'glossary'
              ? 'border-indigo-500 text-indigo-300 bg-white/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Glossário CAMO ({GLOSSARY_TERMS.length} Termos)</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'border-indigo-500 text-indigo-300 bg-white/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Capability Registry (Fases 1–9)</span>
        </button>

        <button
          onClick={() => setActiveTab('version')}
          className={`px-4 py-2.5 rounded-t-lg transition flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'version'
              ? 'border-indigo-500 text-indigo-300 bg-white/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Versionamento & Histórico</span>
        </button>
      </div>

      {/* TAB 1: MANUAL DE UTILIZAÇÃO */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Navigation: Categories & Article list */}
          <div className="lg:col-span-4 space-y-4">
            {/* Search within manual */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar artigos do manual..."
                className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    selectedCategory === c.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Article Cards List */}
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredArticles.map(article => {
                const isSelected = article.id === selectedArticleId;
                return (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticleId(article.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-white/5">
                        {article.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        v{article.version}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white leading-snug">
                      {article.title}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {article.summary}
                    </div>
                  </button>
                );
              })}

              {filteredArticles.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-lg border border-white/5">
                  Nenhum artigo encontrado para o filtro selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Selected Article Content */}
          <div className="lg:col-span-8 bg-slate-900/80 border border-white/10 rounded-xl p-6 space-y-6 shadow-xl text-slate-200 text-xs leading-relaxed font-sans">
            {/* Article Header */}
            <div className="space-y-2 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Capítulo: {currentArticle.category}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Última Atualização: {currentArticle.lastUpdated} • Versão {currentArticle.version}
                </span>
              </div>

              <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
                {currentArticle.title}
              </h2>
              <p className="text-xs text-indigo-300 font-medium">
                {currentArticle.subtitle}
              </p>
            </div>

            {/* Key Takeaways Callout */}
            <div className="p-4 bg-indigo-950/40 border-l-4 border-indigo-500 rounded-r-lg space-y-2">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pontos Chave Obrigatórios (Key Takeaways)</span>
              </div>
              <ul className="space-y-1.5 text-indigo-100">
                {currentArticle.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Operational Rule */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-emerald-200 font-medium flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Regra Operacional Não Negociável
                </div>
                <div className="mt-0.5">{currentArticle.operationalRule}</div>
              </div>
            </div>

            {/* Detailed Content */}
            <div className="prose prose-invert prose-xs max-w-none text-slate-300 space-y-3 whitespace-pre-line leading-relaxed">
              {currentArticle.detailedContent}
            </div>

            {/* Human Review Triggers (Amber Callout) */}
            <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-lg space-y-2">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Quando Encaminhar para Human Review Obrigatório?</span>
              </div>
              <ul className="space-y-1 text-amber-200/90">
                {currentArticle.whenToUseHumanReview.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Consequences Box (Red Callout) */}
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg text-rose-200 space-y-1">
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Consequência de Erro ou Inobservância Regulatória</span>
              </div>
              <p className="text-rose-200/90 text-xs">{currentArticle.consequences}</p>
            </div>

            {/* Related Glossary Terms & Quick Action */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Termos do Glossário Relacionados
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentArticle.relatedGlossaryTerms.map((termName, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(termName);
                        setActiveTab('glossary');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-white/10 text-[11px] font-mono transition"
                    >
                      {termName}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigateView(currentArticle.relatedModuleView)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-600/20 transition self-start sm:self-auto shrink-0"
              >
                <span>Acessar Módulo no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUIDED CAMO WORKFLOW */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          {/* Step Progress Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {GUIDED_CAMO_WORKFLOW.map(step => {
              const isActive = step.stepNumber === selectedStepNumber;
              return (
                <button
                  key={step.stepNumber}
                  onClick={() => setSelectedStepNumber(step.stepNumber)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      ETAPA {step.stepNumber}
                    </span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <div className="text-xs font-bold truncate">{step.module}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{step.title}</div>
                </button>
              );
            })}
          </div>

          {/* Current Step Detailed Interactive Guide */}
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800">
                  Etapa {currentStep.stepNumber} de 6 • Módulo: {currentStep.module}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1.5">
                  {currentStep.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {currentStep.summary}
                </p>
              </div>

              <button
                onClick={() => onNavigateView(currentStep.viewId)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/20 transition self-start sm:self-auto shrink-0"
              >
                <span>Acessar {currentStep.module} Agora</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* The 6 Fundamental Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Onde estou? */}
              <div className="p-4 bg-slate-800/60 rounded-lg border border-white/5 space-y-1.5">
                <div className="flex items-center space-x-2 text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>1. Onde estou?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentStep.whereAmI}</p>
              </div>

              {/* 2. O que esta etapa faz? */}
              <div className="p-4 bg-slate-800/60 rounded-lg border border-white/5 space-y-1.5">
                <div className="flex items-center space-x-2 text-indigo-300 font-bold uppercase tracking-wider text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>2. O que esta etapa faz?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentStep.whatItDoes}</p>
              </div>

              {/* 3. O que preciso fornecer? */}
              <div className="p-4 bg-slate-800/60 rounded-lg border border-white/5 space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-300 font-bold uppercase tracking-wider text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>3. O que preciso fornecer? (Input de Dados)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentStep.whatToProvide}</p>
              </div>

              {/* 4. O que o sistema pode determinar? */}
              <div className="p-4 bg-slate-800/60 rounded-lg border border-white/5 space-y-1.5">
                <div className="flex items-center space-x-2 text-purple-300 font-bold uppercase tracking-wider text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>4. O que o sistema determina automaticamente?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentStep.whatSystemDetermines}</p>
              </div>

              {/* 5. O que exige Human Review? */}
              <div className="p-4 bg-amber-950/30 rounded-lg border border-amber-500/30 space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>5. O que exige Human Review obrigatório?</span>
                </div>
                <p className="text-amber-200/90 leading-relaxed">{currentStep.whatRequiresHumanReview}</p>
              </div>

              {/* 6. Qual é o próximo passo? */}
              <div className="p-4 bg-slate-800/60 rounded-lg border border-white/5 space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-300 font-bold uppercase tracking-wider text-[11px]">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>6. Qual é o próximo passo no workflow?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentStep.nextStep}</p>
              </div>
            </div>

            {/* Related Manual Articles */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-300">Artigos Aprofundados do Manual:</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentStep.relatedArticleIds.map(artId => {
                  const art = HELP_ARTICLES.find(a => a.id === artId);
                  if (!art) return null;
                  return (
                    <button
                      key={art.id}
                      onClick={() => {
                        setSelectedArticleId(art.id);
                        setActiveTab('manual');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-white/10 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
                    >
                      <span>{art.title}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUSCA ESPECIALIZADA */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Mecanismo de Busca Determinístico CAMO</h2>
              <p className="text-xs text-slate-400">
                Pesquise por termos como <span className="text-indigo-300 font-mono">AD, Requirement, Obligation, Applicability, Evidence, Airworthiness, Delivery, Human Review, AMOC, Supersedence, Due Date, Threshold</span>.
              </p>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-indigo-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite um conceito regulatório, acrônimo, número de AD ou termo operacional..."
                className="w-full bg-slate-950 border border-white/15 rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Quick Keyword Shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-mono">Atalhos rápidos:</span>
              {['AD', 'AMOC', 'Applicability', 'Requirement', 'Obligation', 'Evidence', 'Airworthiness', 'Delivery', 'Human Review', 'Due Date'].map(term => (
                <button
                  key={term}
                  onClick={() => setSearchQuery(term)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-[11px] font-mono border border-white/5 transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Results Area */}
          <div className="space-y-3">
            <div className="text-xs text-slate-400 font-mono">
              {searchQuery ? `${searchResults.length} resultados encontrados para "${searchQuery}"` : 'Digite uma consulta acima para buscar.'}
            </div>

            <div className="space-y-3">
              {searchResults.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-slate-900/80 border border-white/10 rounded-xl space-y-2 hover:border-indigo-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        item.type === 'ARTICLE' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' :
                        item.type === 'GLOSSARY' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' :
                        'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{item.subtitle}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      Relevância: {item.score}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.snippet}</p>

                  <div className="pt-2 flex justify-end">
                    {item.type === 'ARTICLE' && (
                      <button
                        onClick={() => {
                          setSelectedArticleId(item.linkId);
                          setActiveTab('manual');
                        }}
                        className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        <span>Ler Artigo Completo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {item.type === 'GLOSSARY' && (
                      <button
                        onClick={() => {
                          setSelectedGlossaryTerm(item.termData);
                          setActiveTab('glossary');
                        }}
                        className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <span>Ver no Glossário</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {item.type === 'WORKFLOW' && (
                      <button
                        onClick={() => {
                          setSelectedStepNumber(item.stepNumber);
                          setActiveTab('workflow');
                        }}
                        className="flex items-center space-x-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                      >
                        <span>Ver Etapa do Workflow</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {searchQuery && searchResults.length === 0 && (
                <div className="p-8 text-center bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">Nenhum resultado encontrado para "{searchQuery}"</div>
                  <p className="text-xs text-slate-500">
                    Tente buscar por termos genéricos como "AD", "Evidência", "Aeronavegabilidade" ou "Delivery".
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GLOSSÁRIO CAMO */}
      {activeTab === 'glossary' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              {/* Category selector */}
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'REGULATORY', 'COMPLIANCE', 'MAINTENANCE', 'OPERATIONAL'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setGlossaryCategory(cat)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      glossaryCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Todas as Categorias' : cat}
                  </button>
                ))}
              </div>

              {/* Glossary instant search */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar termo..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Letter selector */}
            <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5 text-[11px] font-mono">
              <button
                onClick={() => setGlossaryLetter('ALL')}
                className={`px-2 py-0.5 rounded ${glossaryLetter === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                TODOS
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                <button
                  key={char}
                  onClick={() => setGlossaryLetter(char)}
                  className={`px-1.5 py-0.5 rounded ${glossaryLetter === char ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          {/* Glossary Term Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-white/10 rounded-xl p-5 space-y-3 shadow-md hover:border-indigo-500/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{item.term}</h3>
                    {item.acronym && (
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800">
                        {item.acronym}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                    {item.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.definition}
                </p>

                <div className="p-2.5 bg-slate-800/60 rounded-lg border border-white/5 space-y-1 text-[11px]">
                  <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                    Papel no CAMO Engine
                  </div>
                  <div className="text-slate-300">{item.operationalRole}</div>
                </div>

                {item.warningNote && (
                  <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200/90 text-[11px] flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item.warningNote}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Referência: {item.authorityReference}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ARQUITETURA & REGISTRO DE CAPACIDADES */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Capability Registry Oficial (Fases 1 a 9)</h2>
                <p className="text-xs text-slate-400">
                  Todas as capacidades implementadas e homologadas no código do CAMO Engine.
                </p>
              </div>

              {onOpenDossier && (
                <button
                  onClick={onOpenDossier}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-semibold transition"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ver Dossiê Executivo</span>
                </button>
              )}
            </div>

            {/* Matrix of capabilities */}
            <div className="space-y-3">
              {[
                {
                  id: 'CAP-009-5',
                  phase: 'FASE 9 — ETAPA 5',
                  name: 'Regulatory Fleet Intake, CAMO Register & Analysis Queue Engine',
                  module: 'RegulatoryIntelligenceEngine / CamoRegulatoryRegisterView / AircraftDeliveryAssessmentEngine',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '9.5.0',
                  purpose: 'Screening multi-autoridade (FAA, EASA, ANAC) por frota, detecção de delta (NOVA, INALTERADA, ATUALIZADA, SUPERSEDED, REVOKED), importação idempotente para o Registro do CAMO estritamente como PENDENTE DE ANÁLISE (sem acionamento automático de IA), Fila Operacional de Análise individual e integração com Relatório de Delivery.',
                  inputs: 'Configuração de frota (OEM, modelo, motor, matrícula), candidatos regulatórios, decisões de importação e de análise individual.',
                  outputs: 'Registro regulatório do CAMO (camoRegulatoryRegister), status de análise rastreável (PENDING_ANALYSIS -> ANALYZED), histórico de versões (v1, v2) com diff probatório, confrontação de delivery com visibilidade de ADs pendentes.',
                  security: 'Idempotência canônica (authority + adNumber), cálculo de SHA-256 de payload, proibição estrita de auto-Gemini na importação e isolamento de estado.',
                  auditability: 'Trilha de auditoria por AD (data, autor, versão, hash) e bloqueio/aviso explícito em relatórios de Delivery quando há ADs pendentes de análise.'
                },
                {
                  id: 'CAP-009-4',
                  phase: 'FASE 9 — ETAPA 4',
                  name: 'Open Regulatory Discovery, Diagnostic & Knowledge Base Engine',
                  module: 'RegulatoryIntelligenceEngine / RegulatoryIntelligenceView',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '9.4.0',
                  purpose: 'Busca aberta e adaptativa de ADs com diagnóstico unificado de autoridades (FAA DRS, Federal Register, EASA), paginação e extração de regras de aplicabilidade progressiva.',
                  inputs: 'Modelos e famílias aeronáuticas arbitrárias, filtros por autoridade regulatória, termos de busca.',
                  outputs: 'Diagnóstico estruturado por autoridade, candidatos a AD catalogados e base de conhecimento reutilizável.',
                  security: 'Sanitização de parâmetros de busca e normalização de identificadores.',
                  auditability: 'Relatório diagnóstico em texto e JSON com telemetria das fontes consultadas.'
                },
                {
                  id: 'CAP-009-3',
                  phase: 'FASE 9 — ETAPA 3',
                  name: 'Aircraft Real Configuration & Fleet AD Search Engine',
                  module: 'ApplicabilityEvaluator / ComplianceObligationService / FleetAdSearchView',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '9.3.0',
                  purpose: 'Avaliação dinâmica de configuração real da aeronave (troca de componentes P/N e S/N, segregação canônica de famílias de motor CFM56-7B vs LEAP-1B), recálculo de compliance drift-free e busca de ADs por frota com isolamento físico.',
                  inputs: 'Componentes instalados/removidos, inventário de motores, regras de aplicabilidade, registros de frota.',
                  outputs: 'Status de aplicabilidade atualizado (APPLICABLE/NOT_APPLICABLE/REVIEW_REQUIRED), recálculo determinístico com hash invariante, agregações de busca por frota.',
                  security: 'Isolamento estrito multi-aeronave no camoDb, rejeição de execuções com datas futuras ou horômetros regressivos, validação de integridade física.',
                  auditability: 'Log de cálculo com hash imutável e transições de estado rastreáveis por operador/engenheiro.'
                },
                {
                  id: 'CAP-009-2',
                  phase: 'FASE 9 — ETAPA 2',
                  name: 'Regulatory Lifecycle State Machine & Evidence Engine',
                  module: 'ComplianceObligationService / LifecycleEvaluator',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '9.2.0',
                  purpose: 'Máquina de estados regulatória de 13 estados, cálculo de recorrência e próximo ciclo, terminating action definitiva e supersedence de ADs com preservação probatória.',
                  inputs: 'Obrigações de compliance, evidências de cumprimento, declarações de supersedence e ações terminatórias.',
                  outputs: 'Transições de estado auditadas, novas obrigações de ciclo subsequente, encerramento de recorrências e vínculo de sucessão.',
                  security: 'Invariante estrita: transição para COMPLIED exige evidência verificada; terminating action encerra definitivamente ciclos futuros.',
                  auditability: 'Histórico probatório e trilha de auditoria preservados mesmo após supersedence ou cumprimento.'
                },
                {
                  id: 'CAP-008',
                  phase: 'FASE 8',
                  name: 'Help Center & Guided CAMO Workflow Engine',
                  module: 'HelpCenterService / GuidedWorkflow',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '8.0.0',
                  purpose: 'Central de ajuda, manual de operação, busca determinística, glossário e orientação contextual em 6 etapas.',
                  inputs: 'Consultas de usuários, requisições de ajuda contextual de telas, parâmetros de busca.',
                  outputs: 'Artigos formatados, respostas estruturadas das 6 perguntas operacionais, termos de glossário indexados.',
                  security: 'Sanitização rigorosa de inputs de busca, ausência de eval/HTML injection, controle de acesso a metadados.',
                  auditability: 'Histórico de versões de documentação auditável e rastreável.'
                },
                {
                  id: 'CAP-007',
                  phase: 'FASE 7',
                  name: 'Aircraft Acquisition & Delivery Assessment Engine',
                  module: 'AircraftDeliveryAssessmentEngine',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '7.1.0',
                  purpose: 'Auditoria de entrega e aquisição de aeronaves arrendadas, reconciliação documental com o lessor e selo SHA-256.',
                  inputs: 'Configuração da aeronave candidata pré-entrega, declarações de status do lessor, pacotes de CRS/Form 1.',
                  outputs: 'Matriz de reconciliação de divergências, cálculo de compliance pré-entrega, snapshot imutável com selo criptográfico.',
                  security: 'Isolamento estrito de aeronaves pré-entrega (sandbox) sem contaminação da frota ativa.',
                  auditability: 'Selo de integridade SHA-256 verificável.'
                },
                {
                  id: 'CAP-006-4',
                  phase: 'FASE 6.4.1',
                  name: 'Fleet Airworthiness Control Engine (Decoupling)',
                  module: 'FleetAirworthinessControlEngine',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '6.4.1',
                  purpose: 'Desacoplamento estrito entre status de conformidade regulatória e determinação operacional de voo.',
                  inputs: 'Obrigações da frota, base de regras autorizadas de despacho, concessões regulatórias.',
                  outputs: 'airworthinessStatus, canFly (true, false, null), isGrounded, trilha de justificativa rastreável.',
                  security: 'Impossibilidade de liberação de voo sem regra autorizada correspondente (Fail-Safe NOT_DETERMINED).',
                  auditability: 'Registro de provenance de decisão com hash.'
                },
                {
                  id: 'CAP-006-3',
                  phase: 'FASE 6.3',
                  name: 'Evidence Verification Engine (4D Proofing)',
                  module: 'EvidenceVerificationEngine',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '6.3.0',
                  purpose: 'Verificação probatória de documentos de manutenção sob 4 dimensões (entidade, tempo, tarefa, integridade).',
                  inputs: 'Metadados de CRS, Form 8130-3, cadernetas, horas, ciclos e identificação de técnicos.',
                  outputs: 'Classificação determinística: VALID, INVALID, INSUFFICIENT, REVIEW_REQUIRED.',
                  security: 'Prevenção de falsos cumprimentos; revogação imutável com reabertura automática de obrigações.',
                  auditability: 'Preservação eterna da cadeia probatória de documentos.'
                },
                {
                  id: 'CAP-006-2',
                  phase: 'FASE 6.2',
                  name: 'Due Date & Threshold Engine',
                  module: 'DueDateThresholdEngine',
                  status: 'HOMOLOGATED / OPERATIONAL',
                  version: '6.2.0',
                  purpose: 'Cálculo determinístico de prazos limites de ADs com aritmética de calendário segura e suporte a FH/FC/Dias.',
                  inputs: 'Thresholds de ADs, datas efetivas, contadores de aeronaves, taxas diárias de utilização.',
                  outputs: 'Projeção de Due Date, horômetros limites, identificação de DUE_SOON e OVERDUE.',
                  security: 'Proteção contra ano bissexto e regras de final de mês; detecção de inconsistências de horômetro.',
                  auditability: 'Hash criptográfico do estado de cálculo da obrigação.'
                }
              ].map(cap => (
                <div key={cap.id} className="p-4 bg-slate-800/60 border border-white/10 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/40">
                        {cap.id} • {cap.phase}
                      </span>
                      <span className="text-white font-bold">{cap.name}</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      {cap.status}
                    </span>
                  </div>

                  <p className="text-slate-300">{cap.purpose}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                    <div><span className="text-slate-500">Módulo:</span> {cap.module}</div>
                    <div><span className="text-slate-500">Versão:</span> v{cap.version}</div>
                    <div><span className="text-slate-500">Inputs:</span> {cap.inputs}</div>
                    <div><span className="text-slate-500">Outputs:</span> {cap.outputs}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: VERSIONAMENTO DA DOCUMENTAÇÃO */}
      {activeTab === 'version' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-6 shadow-xl space-y-6">
            <div className="pb-4 border-b border-white/10 space-y-1">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                Metadados de Versionamento & Governança Documental
              </span>
              <h2 className="text-xl font-extrabold text-white">
                Controle de Revisões do Manual Operacional
              </h2>
              <p className="text-xs text-slate-400">
                A documentação técnica do CAMO Engine segue controle estrito de versões, garantindo rastreabilidade perante auditorias da autoridade de aviação civil.
              </p>
            </div>

            {/* Metadata Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Versão Atual Homologada</div>
                <div className="text-sm font-bold text-emerald-400">v{DOCUMENTATION_METADATA.version}</div>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-lg border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Data de Lançamento</div>
                <div className="text-sm font-bold text-white">{DOCUMENTATION_METADATA.releaseDate}</div>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-lg border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Status Regulatório</div>
                <div className="text-sm font-bold text-indigo-300">{DOCUMENTATION_METADATA.status}</div>
              </div>
            </div>

            {/* Regulatory Compliance List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Marcos Regulatórios Atendidos
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {DOCUMENTATION_METADATA.authorityCompliance.map((auth, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{auth}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Revision History Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Histórico de Revisões Oficiais
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="p-2.5 rounded-l">Versão</th>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Resumo da Revisão</th>
                      <th className="p-2.5 rounded-r">Autor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {DOCUMENTATION_METADATA.revisionHistory.map((rev, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2.5 font-mono font-bold text-indigo-300">v{rev.version}</td>
                        <td className="p-2.5 font-mono text-slate-400">{rev.date}</td>
                        <td className="p-2.5 text-slate-200">{rev.summary}</td>
                        <td className="p-2.5 text-slate-400">{rev.author}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
