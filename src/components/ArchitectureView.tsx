import { useState, useEffect } from 'react';
import { 
  Layers, 
  BrainCircuit, 
  ShieldCheck, 
  UserCheck, 
  Database, 
  GitMerge, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  Lock,
  Boxes,
  FileCheck2,
  HelpCircle,
  Clock,
  Plane,
  Printer,
  Download,
  Copy,
  Check,
  Globe2,
  Search,
  Key,
  ExternalLink,
  Activity,
  Server,
  Share2,
  AlertTriangle,
  FileText,
  Workflow,
  CheckCircle,
  ChevronRight,
  Shield,
  FileSearch,
  ListFilter
} from 'lucide-react';

interface ArchitectureViewProps {
  onOpenDossier?: () => void;
}

export default function ArchitectureView({ onOpenDossier }: ArchitectureViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'ingestion' | 'phases' | 'capabilities' | 'submodules_api' | 'security' | 'live_dossier'>('overview');
  const [copied, setCopied] = useState(false);
  const [dossierText, setDossierText] = useState<string>('');
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);
  const [dossierSearch, setDossierSearch] = useState<string>('');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('all');
  const [searchCapability, setSearchCapability] = useState<string>('');

  // Multi-Document Living Governance State
  type GovernanceDocId = 'dossier' | 'roadmap' | 'capabilities' | 'ai_guide';
  const [selectedDoc, setSelectedDoc] = useState<GovernanceDocId>('dossier');
  const [docCache, setDocCache] = useState<Record<string, string>>({});

  const governanceDocs: { id: GovernanceDocId; name: string; file: string; role: string; endpoint: string; downloadId: string }[] = [
    {
      id: 'dossier',
      name: 'Dossiê Técnico de Arquitetura',
      file: 'DOSSIE_ARQUITETURA_SISTEMA_CAMO.md',
      role: 'Topologia, submódulos, endpoints REST e invariantes de missão crítica.',
      endpoint: '/api/architecture-dossier',
      downloadId: 'dossier'
    },
    {
      id: 'roadmap',
      name: 'Visão do Produto & Roadmap',
      file: 'PRODUCT_VISION_ROADMAP.md',
      role: 'Direção estratégica integrada PCM + CAMO, limites de escopo e esteira P0/P1/P2/FUTURE.',
      endpoint: '/api/system/product-vision',
      downloadId: 'roadmap'
    },
    {
      id: 'capabilities',
      name: 'Capability Registry Oficial',
      file: 'CAPABILITY_REGISTRY.md',
      role: 'Catálogo canônico das 26 capacidades regulatórias auditadas (CAP-001 a CAP-026).',
      endpoint: '/api/system/capabilities',
      downloadId: 'capabilities'
    },
    {
      id: 'ai_guide',
      name: 'Guia de Desenvolvimento para IA',
      file: 'AI_DEVELOPMENT_GUIDE.md',
      role: 'Contrato inegociável, 12 regras de ouro e ciclo de 7 passos para evolução autônoma.',
      endpoint: '/api/system/ai-development-guide',
      downloadId: 'ai-guide'
    }
  ];

  useEffect(() => {
    if (activeTab === 'live_dossier') {
      loadDocumentContent(selectedDoc);
    }
  }, [activeTab, selectedDoc]);

  const loadDocumentContent = (docId: GovernanceDocId) => {
    if (docCache[docId]) {
      setDossierText(docCache[docId]);
      return;
    }
    const docMeta = governanceDocs.find(d => d.id === docId);
    if (!docMeta) return;

    setLoadingDossier(true);
    fetch(docMeta.endpoint)
      .then(res => res.json())
      .then(data => {
        const text = data.content || data.markdown || '';
        setDocCache(prev => ({ ...prev, [docId]: text }));
        setDossierText(text);
        setLoadingDossier(false);
      })
      .catch(err => {
        console.error(`Erro ao carregar documento ${docId}:`, err);
        setLoadingDossier(false);
      });
  };

  const copyDossier = () => {
    if (dossierText) {
      navigator.clipboard.writeText(dossierText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    const docMeta = governanceDocs.find(d => d.id === selectedDoc);
    if (docMeta) {
      fetch(docMeta.endpoint)
        .then(res => res.json())
        .then(data => {
          navigator.clipboard.writeText(data.content || data.markdown || '');
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        });
    }
  };

  // 26 Canonical Capabilities (Release 9.5.2)
  const capabilities = [
    { id: 'CAP-001', name: 'Extração Estruturada com Gemini 3.7 Flash', domain: 'Ingestão & Extração', submodule: 'server/geminiService.ts', desc: 'Ingestão de PDFs regulatórios aeronáuticos e mapeamento estrito para esquema JSON tipado.' },
    { id: 'CAP-002', name: 'Normalização Tipada de Requisitos e Ações', domain: 'Ingestão & Extração', submodule: 'server/camoEngine/camoRuleEngineV2.ts', desc: 'Conversão de termos aeronáuticos textuais em estruturas padronizadas de inspeção e prazos.' },
    { id: 'CAP-003', name: 'Resolução de Modelos Canônicos de Aeronaves', domain: 'Motor Determinístico', submodule: 'server/camoEngine/camoRuleEngineV2.ts', desc: 'Resolução determinística de famílias (ex: B737-800 vs B737-8 MAX) evitando falsos-positivos.' },
    { id: 'CAP-004', name: 'Avaliação Booleana Determinística de Frota', domain: 'Motor Determinístico', submodule: 'server/camoEngine/camoRuleEngineV2.ts', desc: 'Cruzamento matemático de applicabilityRules contra a frota física do operador sem inferência livre.' },
    { id: 'CAP-005', name: 'Invariante Zero de Incerteza (Review-Required)', domain: 'Motor Determinístico', submodule: 'server/camoEngine/camoRuleEngineV2.ts', desc: 'Falta de dados físicos resulta estritamente em REVIEW_REQUIRED, jamais em NOT_APPLICABLE.' },
    { id: 'CAP-006', name: 'Ciclo Interativo de Perguntas & Memória Técnica', domain: 'Memória Técnica', submodule: 'server/camoEngine/knowledgeBaseService.ts', desc: 'Geração de questionamentos ao analista CAMO para sanar lacunas e gravação de Knowledge Facts.' },
    { id: 'CAP-007', name: 'Varredura Contínua na Federal Register API', domain: 'Conectores Oficiais', submodule: 'server/regulatoryConnectors/federalRegisterConnector.ts', desc: 'Consulta automatizada diária e sob demanda de publicações da FAA Title 14 CFR Part 39.' },
    { id: 'CAP-008', name: 'Scoping Filter de Frota', domain: 'Conectores Oficiais', submodule: 'server/regulatoryConnectors/fleetScopingFilter.ts', desc: 'Triagem preliminar rápida de diretrizes candidatas descartando documentos 100% fora do escopo.' },
    { id: 'CAP-009', name: 'Cofre de Documentos Oficiais com Anti-SSRF', domain: 'Segurança & Cofre', submodule: 'server/regulatoryConnectors/officialDocumentAcquisitionService.ts', desc: 'Aquisição segura de PDFs com whitelist governamental, bloqueio RFC 1918 e hash SHA-256.' },
    { id: 'CAP-010', name: 'Pipeline Autônomo de Descoberta FAA', domain: 'Pipeline Autônomo', submodule: 'server/camoEngine/camoAutonomousPipeline.ts', desc: 'Orquestrador de 8 estágios atômicos para varredura, screening e consolidação com aprovação humana.' },
    { id: 'CAP-011', name: 'Máquina de Estados de Obrigações (13 Estados)', domain: 'Ciclo de Vida', submodule: 'server/camoEngine/complianceObligationService.ts', desc: 'Ciclo de vida regulatório completo desde IDENTIFIED até COMPLIED, SUPERSEDED ou REVOKED.' },
    { id: 'CAP-012', name: 'Motor de Vencimento Multidimensional (Due Date)', domain: 'Ciclo de Vida', submodule: 'server/camoEngine/dueDateEngine.ts', desc: 'Cálculo dinâmico 3D de vencimento por Data Calendárica, Horas de Voo (FH) e Ciclos (FC).' },
    { id: 'CAP-013', name: 'Cadeia de Custódia e Verificação de Evidências', domain: 'Evidências & Auditoria', submodule: 'server/camoEngine/evidenceVerificationService.ts', desc: 'Anexação de Form 8130-3, ordens de serviço e laudos com status PENDING, VERIFIED ou REJECTED.' },
    { id: 'CAP-014', name: 'Emissão e Assinatura Digital de Laudos FAPT', domain: 'Evidências & Auditoria', submodule: 'server/camoEngine/faptService.ts', desc: 'Geração de Folhas de Análise e Parecer Técnico com carimbo de tempo, hash SHA-256 e chancela CAMO.' },
    { id: 'CAP-015', name: 'Auditoria Criptográfica SHA-256 Imutável', domain: 'Evidências & Auditoria', submodule: 'server/dataStore.ts', desc: 'Trilha de auditoria append-only para cada mutação de estado, assinatura e decisão humana.' },
    { id: 'CAP-016', name: 'Controle de Aeronavegabilidade Contínua da Frota', domain: 'Operações & Frota', submodule: 'server/camoEngine/fleetAirworthinessControlEngine.ts', desc: 'Consolidação em tempo real da aeronavegabilidade de cada aeronave com princípio de não-diluição.' },
    { id: 'CAP-017', name: 'Sandbox de Avaliação de Pré-Entrega (Delivery)', domain: 'Operações & Frota', submodule: 'server/camoEngine/aircraftDeliveryAssessmentEngine.ts', desc: 'Inspeção de aeronaves candidatas em ambiente isolado antes da incorporação na frota do operador.' },
    { id: 'CAP-018', name: 'Central de Ajuda, Manual e Guided Workflow', domain: 'Governança & Suporte', submodule: 'server/camoEngine/helpCenterService.ts', desc: 'Base de conhecimento integrada com fluxos guiados, FAQs e matriz de conformidade regulatória.' },
    { id: 'CAP-019', name: 'Configuração Real de Aeronave (Rotáveis P/N e S/N)', domain: 'Configuração Real', submodule: 'server/camoEngine/aircraftConfigurationEngine.ts', desc: 'Rastreabilidade de histórico de instalação de componentes, motores (ESN) e part numbers físicos.' },
    { id: 'CAP-020', name: 'Rastreabilidade de Modificações e Softwares', domain: 'Configuração Real', submodule: 'server/camoEngine/aircraftConfigurationEngine.ts', desc: 'Rastreio de Service Bulletins executados e versões de software embarcado para aplicabilidade de ADs.' },
    { id: 'CAP-021', name: 'Screening Multi-Autoridade por Frota e Modelo', domain: 'Inteligência Regulatória', submodule: 'server/camoEngine/regulatoryIntelligenceEngine.ts', desc: 'Consulta às autoridades (FAA, EASA, ANAC) por família com reconciliação de deltas.' },
    { id: 'CAP-022', name: 'CAMO Regulatory Register com Fila de Análise', domain: 'Inteligência Regulatória', submodule: 'server/camoEngine/camoRegulatoryRegisterService.ts', desc: 'Registro interno com importação idempotente PENDING_ANALYSIS e Fila de Análise sem Auto-Gemini.' },
    { id: 'CAP-023', name: 'Inventário Unificado de ADs da Frota', domain: 'Inteligência Regulatória', submodule: 'server/camoEngine/camoRegulatoryRegisterService.ts', desc: 'Visão consolidada de todas as ADs descobertas por modelo com contadores de aplicabilidade.' },
    { id: 'CAP-024', name: 'Governança Viva e Testes Adversariais Automatizados', domain: 'Governança & Suporte', submodule: 'test/phase9-stage6-security-architecture.test.ts', desc: 'Bateria de testes adversariais para segurança, SSRF, invariantes de estado e integridade criptográfica.' },
    { id: 'CAP-025', name: 'Gestão Cadastral da Frota, Edição & Descomissionamento', domain: 'Operações & Frota', submodule: 'server.ts, FleetView.tsx', desc: 'Edição cadastral em tempo real de células, inativação com justificativa e exclusão com desvinculação em cascata.' },
    { id: 'CAP-026', name: 'Governança Viva, Memória Estratégica & Guia para IA', domain: 'Governança & Suporte', submodule: 'PRODUCT_VISION_ROADMAP.md, AI_DEVELOPMENT_GUIDE.md', desc: 'Cadeia documental canônica: Product Vision (PCM + CAMO), Contrato com IA e Registro de Capacidades vivos.' }
  ];

  const domains = ['all', 'Ingestão & Extração', 'Motor Determinístico', 'Memória Técnica', 'Conectores Oficiais', 'Segurança & Cofre', 'Pipeline Autônomo', 'Ciclo de Vida', 'Evidências & Auditoria', 'Operações & Frota', 'Configuração Real', 'Inteligência Regulatória', 'Governança & Suporte'];

  const filteredCaps = capabilities.filter(c => {
    const matchesDomain = capabilityFilter === 'all' || c.domain === capabilityFilter;
    const matchesSearch = !searchCapability || 
      c.id.toLowerCase().includes(searchCapability.toLowerCase()) ||
      c.name.toLowerCase().includes(searchCapability.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchCapability.toLowerCase()) ||
      c.submodule.toLowerCase().includes(searchCapability.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div id="camo-architecture-view" className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
              <span className="flex items-center space-x-1.5 text-indigo-400">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Arquitetura de Engenharia CAMO & Governança Viva</span>
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                Release 9.5.2 Auditada
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                128/128 Testes Green
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                26 Capacidades Ativas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
              Dossiê Arquitetural & Mapa de Engenharia do Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed font-sans">
              O sistema opera sobre um princípio de segurança não negociável: 
              <strong className="text-white"> A IA extrai e estrutura documentos aeronáuticos; o Motor Determinístico impõe conformidade matemática estrita; e a Autoridade Regulatória permanece 100% com o Engenheiro CAMO humano.</strong>
            </p>
          </div>

          {/* Action Buttons: PDF & Downloads */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              id="btn-download-pdf"
              href="/api/generate-architecture-pdf"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
              title="Baixar Dossiê Arquitetural Oficial em PDF (Release 9.5.2)"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition border border-indigo-400/40"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Baixar PDF Oficial</span>
            </a>

            <button
              id="btn-open-interactive-dossier"
              onClick={() => onOpenDossier && onOpenDossier()}
              title="Abrir Dossiê em Modal Interativo"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>Modal Executivo</span>
            </button>

            <a
              id="btn-download-md"
              href="/api/download-architecture-dossier"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.md"
              title="Baixar Especificação Completa em Markdown"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Baixar .MD</span>
            </a>

            <button
              id="btn-copy-dossier"
              onClick={copyDossier}
              title="Copiar Especificação Técnica para Área de Transferência"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">VERSÃO HOMOLOGADA</span>
            <span className="text-white font-bold">Release 9.5.2 (Living Governance)</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">SUÍTE REGULATÓRIA</span>
            <span className="text-emerald-400 font-bold">128/128 Pass (12 Suítes)</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">INFRAESTRUTURA</span>
            <span className="text-indigo-300 font-bold">14 Módulos | 27 Visões | 75+ APIs</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">SEGURANÇA & ISOLAMENTO</span>
            <span className="text-purple-400 font-bold">Anti-SSRF + SHA-256 + 14 Testes</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-slate-900/70 border border-white/10 rounded-xl p-1.5 flex flex-wrap items-center gap-1 text-xs font-mono">
        {[
          { id: 'overview', label: '1. Visão Executiva & 3 Pilares', icon: ShieldCheck },
          { id: 'ingestion', label: '2. Os 3 Fluxos de Ingestão de ADs', icon: Workflow },
          { id: 'phases', label: '3. Mapa Completo de Fases (1 a 9.6)', icon: GitMerge },
          { id: 'capabilities', label: '4. Capability Registry (26 Caps)', icon: Boxes },
          { id: 'submodules_api', label: '5. Catálogo de APIs & 14 Módulos', icon: Server },
          { id: 'security', label: '6. Segurança & Invariantes', icon: Lock },
          { id: 'live_dossier', label: '7. Governança Viva & Documentação (.MD)', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center space-x-2 transition ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: VISÃO EXECUTIVA & 3 PILARES */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                1. Os Três Pilares Fundamentais de Inteligência em Aeronavegabilidade
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Pillar 1 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-mono">1. IA / LLM (Gemini 3.7 Flash)</h3>
                <div className="text-xs text-indigo-300 font-semibold uppercase font-mono">Extração & Estruturação de Documentos</div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Lê PDFs aeronáuticos e páginas regulatórias não estruturadas (FAA/EASA/ANAC). Extrai modelos, faixas de MSN, part numbers (P/Ns), intervalos de inspeção e ações mandatórias em esquema tipado.
                </p>
                <div className="p-2.5 bg-slate-900/80 rounded border border-rose-500/30 text-[11px] text-rose-300 font-mono">
                  <span className="font-bold">Regra de Ouro:</span> A IA <u>nunca</u> declara uma aeronave como "Compliant" ou "Not Applicable" por conta própria.
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-mono">2. Motor de Regras Determinístico V2</h3>
                <div className="text-xs text-indigo-300 font-semibold uppercase font-mono">Lógica Booleana & Avaliação Objetiva</div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Executa checagens exatas contra a frota do operador. Cruza modelos canônicos, posições de motores, componentes instalados e modificações.
                </p>
                <div className="p-2.5 bg-slate-900/80 rounded border border-indigo-500/30 text-[11px] text-indigo-300 font-mono">
                  <span className="font-bold">Regra de Ouro:</span> Sob falta de dados, o sistema emite obrigatoriamente <code>REVIEW_REQUIRED</code>, jamais <code>NOT_APPLICABLE</code>.
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-purple-900/40 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-mono">3. Engenheiro CAMO Humano</h3>
                <div className="text-xs text-purple-300 font-semibold uppercase font-mono">Autoridade Regulatória & Assinatura Digital</div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Responde a questionamentos técnicos gerados pelo sistema com evidências documentais (cadernetas, Form 8130-3), consolidando a memória técnica (<strong>Knowledge Facts</strong>) e chancelando digitalmente os laudos FAPT.
                </p>
                <div className="p-2.5 bg-slate-900/80 rounded border border-purple-500/30 text-[11px] text-purple-300 font-mono">
                  <span className="font-bold">Regra de Ouro:</span> Trilha de auditoria completa e chancela formal para conformidade com RBAC 121 / EASA Part-M.
                </div>
              </div>
            </div>
          </div>

          {/* Invariantes Operacionais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>INVARIANTE ZERO DILUIÇÃO</span>
              </span>
              <p className="text-xs text-slate-300">
                Uma aeronave com 99 ADs cumpridas e 1 pendente é classificada como <strong>NON_COMPLIANT</strong>. Não há conformidade parcial ou diluída na aviação comercial.
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>INVARIANTE PROBATÓRIA</span>
              </span>
              <p className="text-xs text-slate-300">
                A transição de uma obrigação para o estado <strong>COMPLIED</strong> é sumariamente rejeitada pelo motor a menos que exista evidência física válida e verificada.
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>ISOLAMENTO DE SANDBOX</span>
              </span>
              <p className="text-xs text-slate-300">
                Avaliações de pré-entrega (Delivery Assessment) e frotas distintas operam em espaços segregados sem contaminação dos dados físicos operacionais ativos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OS 3 FLUXOS DE INGESTÃO DE ADs */}
      {activeTab === 'ingestion' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Workflow className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  Os Três Fluxos Distintos de Ingestão e Processamento de ADs
                </h2>
              </div>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
                Arquitetura Homologada Release 9.5.2
              </span>
            </div>

            <div className="space-y-6">
              {/* Fluxo 1 */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold font-mono">
                      FLUXO 1
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono">Upload Manual Avulso de ADs / SBs</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Sob Demanda / Pontual</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Projetado para inclusão direta de diretrizes emergenciais, ordens técnicas locais, boletins de serviço do fabricante (Boeing/Airbus) ou ADs estrangeiras que requerem análise imediata.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-slate-900 rounded border border-white/5">
                    <strong className="text-indigo-400 block">1. Entrada</strong>
                    Upload de PDF ou texto via tela de Ingestão Manual.
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-white/5">
                    <strong className="text-indigo-400 block">2. Extração IA</strong>
                    Gemini 3.7 Flash extrai esquemas, faixas de MSN e ações.
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-white/5">
                    <strong className="text-indigo-400 block">3. Avaliação</strong>
                    Rule Engine V2 cruza com a frota e gera questionamentos.
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-white/5">
                    <strong className="text-emerald-400 block">4. Conclusão</strong>
                    Emissão e assinatura de Laudo Preliminar FAPT.
                  </div>
                </div>
              </div>

              {/* Fluxo 2 */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold font-mono">
                      FLUXO 2
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono">Pipeline Autônomo da FAA (8 Estágios Atômicos)</h3>
                  </div>
                  <span className="text-xs font-mono text-purple-300">Autônomo & Incremental</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Varredura contínua de publicações da FAA Title 14 CFR Part 39 via Federal Register API. Executa triagem rápida de frota (curto-circuito seguro se não afetar a frota), aquisição com cofre anti-SSRF e submissão ao gateway de aprovação humana.
                </p>
                <div className="p-3 bg-slate-900 rounded-lg border border-white/5 text-xs font-mono text-slate-300 space-y-1.5">
                  <div className="text-[10px] text-purple-400 uppercase font-bold">Estágios do Pipeline:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>• 1. DISCOVERY</div>
                    <div>• 2. FLEET_SCREENING</div>
                    <div>• 3. OFFICIAL_ACQUISITION</div>
                    <div>• 4. DOCUMENT_INTELLIGENCE</div>
                    <div>• 5. REQUIREMENT_STRUCTURING</div>
                    <div>• 6. CAMO_RULE_ENGINE</div>
                    <div>• 7. FLEET_CONSOLIDATION</div>
                    <div>• 8. HUMAN_REVIEW_GATEWAY</div>
                  </div>
                </div>
              </div>

              {/* Fluxo 3 */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono">
                      FLUXO 3
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono">
                      Inteligência & Lacunas → Descoberta de ADs → CAMO Register → Fila de Análise
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">Fluxo Canônico FASE 9.5+</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  A origem da operação é a área <strong>Inteligência & Lacunas</strong>. O CAMO consulta as autoridades regulatórias por frota/modelo, classifica os deltas (<code>NEW</code>, <code>UNCHANGED</code>, <code>UPDATED</code>, <code>SUPERSEDED</code>, <code>REVOKED</code>) e importa de forma idempotente para o <strong>CAMO Regulatory Register</strong>.
                </p>
                <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/30 text-xs font-mono space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Regra Inviolável de Governança: PROIBIÇÃO DE AUTO-GEMINI</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    A importação em massa para o CAMO Register grava estritamente com status <strong>PENDING_ANALYSIS</strong>. Nenhuma chamada de IA é disparada automaticamente na importação, preservando custos e garantindo que o engenheiro CAMO comande o momento exato de cada análise técnica na <strong>Fila de Análise</strong>.
                  </p>
                  <p className="text-slate-300 text-[11px] font-sans">
                    <strong>Integração com Delivery:</strong> ADs importadas como <code>PENDING_ANALYSIS</code> refletem obrigatoriamente no laudo de pré-entrega como pendentes de análise técnica e não conformes até prova em contrário.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAPA COMPLETO DE FASES (1 A 9.6) */}
      {activeTab === 'phases' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <GitMerge className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  Mapa Detalhado de Fases e Módulos Operacionais (Fases 1 à 9.6)
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
                124/124 Testes Automatizados Aprovados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fase 1 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 1</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Fundação CAMO, 3 Pilares & Memória Técnica</h3>
                <p className="text-xs text-slate-300">Extração tipada via IA, motor booleano determinístico, ciclo de perguntas para dados ausentes e repositório de Knowledge Facts.</p>
              </div>

              {/* Fase 2 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 2</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Rule Engine V2, Modelos Canônicos & FAPT</h3>
                <p className="text-xs text-slate-300">Diferenciação canônica precisa por família (B737_NG vs B737_MAX), rastreabilidade de modificações e emissão de Folhas de Parecer Técnico (FAPT).</p>
              </div>

              {/* Fase 3 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 3</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Conectores Oficiais & Fleet Scoping Filter</h3>
                <p className="text-xs text-slate-300">Integração com a Federal Register API dos EUA e filtro de triagem rápida de frota antes da aquisição completa de PDFs.</p>
              </div>

              {/* Fase 4 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 4</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Cofre Criptográfico & Defesa Anti-SSRF</h3>
                <p className="text-xs text-slate-300">Aquisição segura de PDFs oficiais com defesa SSRF em 23 vetores, validação de redirect per-hop e cofre idempotente com hash SHA-256.</p>
              </div>

              {/* Fase 5 & 5.1 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 5 & 5.1</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Descoberta Contínua & Pipeline Autônomo FAA</h3>
                <p className="text-xs text-slate-300">Pipeline de 8 estágios atômicos para varredura na FAA, deduplicação idempotente e proveniência granular campo a campo.</p>
              </div>

              {/* Fase 6 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 6</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Ciclo de Vida 13 Estados & Due Date 3D</h3>
                <p className="text-xs text-slate-300">Máquina de 13 estados de obrigações, motor de vencimento multidimensional (CAL/FH/FC), cadeia de custódia e integridade SHA-256.</p>
              </div>

              {/* Fase 7 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 7</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Delivery Assessment & Sandbox Pré-Entrega</h3>
                <p className="text-xs text-slate-300">Avaliação pré-aquisição isolada dos dados físicos da frota, conciliação de evidências de lessor e emissão de laudo de entrega.</p>
              </div>

              {/* Fase 8 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 8</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Central de Ajuda, Manual & Guided Workflow</h3>
                <p className="text-xs text-slate-300">Manual operacional completo do analista CAMO, glossário técnico, FAQs e guias passo a passo integrados aos módulos.</p>
              </div>

              {/* Fase 9.1-9.5 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">FASE 9.1 A 9.5</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Auditado</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Configuração Real, CAMO Register & Fila de Análise</h3>
                <p className="text-xs text-slate-300">Histórico de instalação de P/N e S/N, screening multi-autoridade por frota, CAMO Register com PENDING_ANALYSIS e Inventário Unificado de ADs.</p>
              </div>

              {/* Fase 9.6 */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">FASE 9.6</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Release 9.5.2</span></span>
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Governança Viva, Auditoria do Estado Real & Testes Adversariais</h3>
                <p className="text-xs text-slate-300">14 testes de segurança/isolamento/invariantes, catálogo vivo de APIs (70+ endpoints), 24 capacidades oficiais e documentação técnica viva.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CAPABILITY REGISTRY (24 CAPACIDADES) */}
      {activeTab === 'capabilities' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Boxes className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                    Registro Oficial de Capacidades do Sistema (CAP-001 a CAP-024)
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Catálogo canônico das 24 capacidades operacionais e regulatórias do sistema CAMO.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold self-start sm:self-auto">
                24/24 Capacidades Ativas
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative grow">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por código, nome, módulo ou descrição..."
                  value={searchCapability}
                  onChange={(e) => setSearchCapability(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <ListFilter className="w-4 h-4 text-slate-400" />
                <select
                  value={capabilityFilter}
                  onChange={(e) => setCapabilityFilter(e.target.value)}
                  className="bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {domains.map(d => (
                    <option key={d} value={d}>{d === 'all' ? 'Todos os Domínios' : d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCaps.map(cap => (
                <div key={cap.id} className="p-4 bg-slate-950/60 rounded-xl border border-white/10 hover:border-indigo-500/40 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                      {cap.id}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Auditada</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono">{cap.name}</h3>
                  <div className="text-[11px] text-purple-300 font-mono flex items-center space-x-2">
                    <span className="text-slate-500">Domínio:</span>
                    <span>{cap.domain}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{cap.desc}</p>
                  <div className="pt-1.5 border-t border-white/5 text-[10px] font-mono text-slate-400 flex items-center space-x-1 truncate">
                    <span className="text-slate-500">Submódulo:</span>
                    <code className="text-indigo-300">{cap.submodule}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CATÁLOGO DE APIs & 14 SUBMÓDULOS */}
      {activeTab === 'submodules_api' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                    Os 14 Submódulos de Engenharia e Inventário de 70+ Endpoints
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Arquitetura modular de backend desacoplada e padronizada.
                </p>
              </div>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
                Release 9.5.2
              </span>
            </div>

            {/* 14 Submodules Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                14 Submódulos Especializados do Backend (Node.js/Express)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                {[
                  { name: 'camoRuleEngineV2.ts', role: 'Motor Booleano Determinístico e Modelos Canônicos' },
                  { name: 'camoAutonomousPipeline.ts', role: 'Orquestrador de 8 Estágios de Descoberta FAA' },
                  { name: 'complianceObligationService.ts', role: 'Máquina de 13 Estados para Ciclo de Vida de Obrigações' },
                  { name: 'dueDateEngine.ts', role: 'Motor Multidimensional de Prazos (FH, FC, Cal, Threshold)' },
                  { name: 'evidenceVerificationService.ts', role: 'Cadeia de Custódia Probatória e Validação Criptográfica' },
                  { name: 'fleetAirworthinessControlEngine.ts', role: 'Controle de Aeronavegabilidade Contínua da Frota' },
                  { name: 'aircraftDeliveryAssessmentEngine.ts', role: 'Sandbox de Pré-Entrega e Laudo de Delivery' },
                  { name: 'aircraftConfigurationEngine.ts', role: 'Histórico de Instalação de P/N, S/N e Rotáveis' },
                  { name: 'regulatoryIntelligenceEngine.ts', role: 'Screening Multi-Autoridade Guiado por Frota/Modelo' },
                  { name: 'camoRegulatoryRegisterService.ts', role: 'CAMO Register, Triagem PENDING_ANALYSIS e Fila de Análise' },
                  { name: 'officialDocumentAcquisitionService.ts', role: 'Cofre Criptográfico com Blindagem Anti-SSRF (4 Camadas)' },
                  { name: 'faptService.ts', role: 'Emissão e Chancela Digital de Laudos FAPT' },
                  { name: 'knowledgeBaseService.ts', role: 'Repositório Permanente de Fatos Técnicos (Knowledge Facts)' },
                  { name: 'helpCenterService.ts', role: 'Central de Ajuda, Glossário, FAQs e Guided Workflows' }
                ].map((mod, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-lg border border-white/10 space-y-1">
                    <span className="text-indigo-400 font-bold block">{mod.name}</span>
                    <span className="text-slate-400 text-[11px] font-sans">{mod.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Endpoints Table Sample */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Catálogo de Endpoints REST Principais (Mais de 70 Rotas Operacionais)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Método</th>
                      <th className="p-2.5">Rota</th>
                      <th className="p-2.5">Subsistema / Finalidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/40 text-slate-300 text-[11px]">
                    <tr>
                      <td className="p-2.5 text-emerald-400 font-bold">GET</td>
                      <td className="p-2.5 text-white">/api/regulatory-intelligence/screen-fleet</td>
                      <td className="p-2.5 text-slate-400">Screening multi-autoridade guiado por frota com deltas</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-indigo-400 font-bold">POST</td>
                      <td className="p-2.5 text-white">/api/camo-register/import-batch</td>
                      <td className="p-2.5 text-slate-400">Importação idempotente como PENDING_ANALYSIS (sem IA automática)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-400 font-bold">GET</td>
                      <td className="p-2.5 text-white">/api/camo-register/analysis-queue</td>
                      <td className="p-2.5 text-slate-400">Fila de Análise técnica detalhada para triagem pelo engenheiro CAMO</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-indigo-400 font-bold">POST</td>
                      <td className="p-2.5 text-white">/api/camo-register/analyze/:id</td>
                      <td className="p-2.5 text-slate-400">Aciona análise técnica sob demanda pelo analista CAMO</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-400 font-bold">GET</td>
                      <td className="p-2.5 text-white">/api/system/capabilities</td>
                      <td className="p-2.5 text-slate-400">Retorna o Capability Registry canônico (CAP-001 a CAP-024)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-400 font-bold">GET</td>
                      <td className="p-2.5 text-white">/api/system/audit</td>
                      <td className="p-2.5 text-slate-400">Retorna a auditoria completa do estado real do sistema</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-400 font-bold">GET</td>
                      <td className="p-2.5 text-white">/api/architecture-dossier</td>
                      <td className="p-2.5 text-slate-400">Retorna o conteúdo integral do Dossiê de Arquitetura (.MD)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-emerald-400 font-bold">GET</td>
                      <td className="p-2.5 text-white">/api/generate-architecture-pdf</td>
                      <td className="p-2.5 text-slate-400">Gera o Dossiê de Arquitetura em PDF vetorial A4 oficial</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SEGURANÇA ADVERSARIAL & INVARIANTES */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  Arquitetura de Segurança, Defesa Anti-SSRF & Testes Adversariais
                </h2>
              </div>
              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30 font-bold">
                14/14 Testes Adversariais Green
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>BLINDAGEM ANTI-SSRF (4 CAMADAS)</span>
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Validação estrita de protocolos (apenas <code>https://</code>), whitelist restrita de domínios oficiais (<code>govinfo.gov</code>, <code>federalregister.gov</code>, <code>drs.faa.gov</code>), bloqueio de loopback (<code>127.0.0.1</code>), faixas privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) e metadados de nuvem (<code>169.254.169.254</code>).
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ASSINATURA MÁGICA DE PDF (%PDF-)</span>
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Inspeção obrigatória dos primeiros 5 bytes do fluxo binário garantindo o cabeçalho <code>%PDF-</code>. Rejeita sumariamente ataques de poliglota, scripts HTML maliciosos ou binários executáveis mascarados com extensão .pdf.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ISOLAMENTO MULTI-AERONAVE & MULTI-TENANT</span>
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Avaliações e evidências são estritamente vinculadas ao <code>aircraftId</code> e <code>operatorId</code> correspondentes. Modificações em uma aeronave não possuem efeito colateral em nenhuma outra aeronave da frota ou de outros operadores.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>TAMPER-EVIDENT COM CRIPTOGRAFIA SHA-256</span>
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Toda evidência documental possui hash criptográfico SHA-256 verificado. Modificações no arquivo ou invalidação de evidência transicionam o requisito imediatamente para <code>EVIDENCE_REJECTED</code> ou <code>PENDING_VERIFICATION</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: LEITOR DE GOVERNANÇA VIVA & DOCUMENTOS CANÔNICOS (.MD) */}
      {activeTab === 'live_dossier' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Document Switcher Bar */}
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Cadeia Documental de Governança Viva (Release 9.5.2)
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Sincronização Código ↔ Docs Ativa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {governanceDocs.map(doc => {
                const isSelected = selectedDoc === doc.id;
                return (
                  <button
                    key={doc.id}
                    id={`btn-select-doc-${doc.id}`}
                    onClick={() => setSelectedDoc(doc.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950/60 border-white/5 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono truncate">{doc.name}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>}
                    </div>
                    <code className="text-[10px] text-indigo-300 block truncate">{doc.file}</code>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight font-sans">
                      {doc.role}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                    {governanceDocs.find(d => d.id === selectedDoc)?.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Arquivo físico: <code>{governanceDocs.find(d => d.id === selectedDoc)?.file}</code> • Endpoint: <code>{governanceDocs.find(d => d.id === selectedDoc)?.endpoint}</code>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  id="btn-download-selected-doc"
                  href={`/api/download-governance-doc/${selectedDoc}`}
                  download={governanceDocs.find(d => d.id === selectedDoc)?.file}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
                  title="Baixar este arquivo Markdown"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Baixar .MD</span>
                </a>
                <button
                  onClick={() => loadDocumentContent(selectedDoc)}
                  disabled={loadingDossier}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1"
                >
                  <span>{loadingDossier ? 'Atualizando...' : 'Recarregar'}</span>
                </button>
                <button
                  onClick={copyDossier}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Search in Dossier */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={`Pesquisar termo em ${governanceDocs.find(d => d.id === selectedDoc)?.file}...`}
                value={dossierSearch}
                onChange={(e) => setDossierSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Dossier Content Body */}
            {loadingDossier ? (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">
                Carregando especificação documental viva...
              </div>
            ) : (
              <div className="bg-slate-950/90 border border-white/10 rounded-xl p-6 max-h-[650px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                {dossierText || 'Nenhum conteúdo retornado para o documento selecionado.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Floating Export Bar */}
      <div className="p-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 rounded-xl border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white font-mono uppercase">
            Dossiê de Arquitetura Pronto para Apresentação Executiva & Auditorias
          </h4>
          <p className="text-xs text-slate-300 font-sans">
            Gere o PDF formatado em padrão executivo/aerospacial (Release 9.5.2) ou faça o download da especificação técnica completa em Markdown.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href="/api/generate-architecture-pdf"
            download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition border border-indigo-400/40"
          >
            <Download className="w-4 h-4" />
            <span>Baixar PDF Oficial</span>
          </a>
          {onOpenDossier && (
            <button
              onClick={onOpenDossier}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>Modal Executivo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
