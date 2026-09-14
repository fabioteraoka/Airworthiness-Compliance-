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
  X,
  Workflow,
  CheckCircle,
  FileText
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface ArchitectureDossierModalProps {
  onClose: () => void;
  state?: DatabaseState | null;
}

export default function ArchitectureDossierModal({ onClose, state }: ArchitectureDossierModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'ingestion' | 'phases' | 'domain' | 'security' | 'full'>('overview');
  const [copied, setCopied] = useState(false);
  const [dossierMarkdown, setDossierMarkdown] = useState<string>('');
  const [loadingMarkdown, setLoadingMarkdown] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'full' && !dossierMarkdown) {
      loadDossierText();
    }
  }, [activeTab]);

  const loadDossierText = () => {
    setLoadingMarkdown(true);
    fetch('/api/architecture-dossier')
      .then(res => res.json())
      .then(data => {
        setDossierMarkdown(data.content || '');
        setLoadingMarkdown(false);
      })
      .catch(err => {
        console.error('Erro ao carregar dossiê:', err);
        setLoadingMarkdown(false);
      });
  };

  const copyToClipboard = () => {
    if (dossierMarkdown) {
      navigator.clipboard.writeText(dossierMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    fetch('/api/architecture-dossier')
      .then(res => res.json())
      .then(data => {
        navigator.clipboard.writeText(data.content || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="architecture-dossier-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Modal Container */}
      <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Top Header & Action Bar */}
        <div className="bg-slate-900/90 border-b border-white/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-500/40 text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase font-mono">
                  Dossiê Arquitetural Oficial
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">Release 9.5.2 Auditada</span>
                <span className="text-xs text-indigo-300 font-mono hidden md:inline">| 124/124 Pass</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Arquitetura do Sistema & Engenharia CAMO Viva
              </h2>
            </div>
          </div>

          {/* Actions & Print/PDF Button */}
          <div className="flex items-center space-x-2">
            <a
              id="modal-btn-pdf"
              href="/api/generate-architecture-pdf"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
              title="Baixar Dossiê Arquitetural Oficial em PDF (Documento Executivo)"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition border border-indigo-400/40"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Baixar PDF</span>
            </a>

            <button
              onClick={handlePrint}
              title="Imprimir documento via navegador"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <a
              href="/api/download-architecture-dossier"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.md"
              title="Baixar Especificação Técnica (.md)"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">.MD</span>
            </a>

            <button
              onClick={copyToClipboard}
              title="Copiar Especificação em Texto"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition border border-transparent hover:border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-900/50 border-b border-white/10 px-6 flex items-center space-x-1 overflow-x-auto shrink-0 text-xs font-mono">
          {[
            { id: 'overview', label: '1. Visão Executiva & 3 Pilares' },
            { id: 'ingestion', label: '2. Os 3 Fluxos de Ingestão' },
            { id: 'phases', label: '3. Fases Implementadas (1 a 9.6)' },
            { id: 'domain', label: '4. Modelo de Domínio & Entidades' },
            { id: 'security', label: '5. Segurança, SSRF & Invariantes' },
            { id: 'full', label: '6. Dossiê Integral (.MD Completo)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 border-b-2 font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto grow space-y-6 text-slate-200 printable-dossier-content">
          
          {/* TAB 1: VISÃO EXECUTIVA & 3 PILARES */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 space-y-4">
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono uppercase font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Plataforma de Engenharia Aeronáutica CAMO</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Airworthiness Compliance Intelligence (Release 9.5.2)
                </h1>
                <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
                  Sistema avançado de inteligência regulatória e aeronavegabilidade continuada, projetado especificamente para operadores sob os regulamentos <strong>FAA 14 CFR Part 39 / EASA Part-M / ANAC RBAC 121 & RBAC 39</strong>.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">OPERADOR</span>
                    <span className="text-white font-bold">{state?.operator.name || 'BLUE-SKY LOGISTICS'}</span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">CERTIFICADO CAMO</span>
                    <span className="text-indigo-300 font-bold">{state?.operator.camoCertificate || 'CAMO-PT.042'}</span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">FROTA ATIVA</span>
                    <span className="text-emerald-400 font-bold">{state?.aircraft.length || 0} Aeronaves</span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">DIRETRIZES REGISTRADAS</span>
                    <span className="text-purple-400 font-bold">{state?.requirements.length || 0} Requisitos</span>
                  </div>
                </div>
              </div>

              {/* Princípio Zero da Aviação — 3 Pilares */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>O Princípio Zero da Segurança Aeronáutica (Tripartição de Responsabilidade)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pilar 1 */}
                  <div className="bg-slate-900/80 p-5 rounded-xl border border-indigo-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white font-mono">1. IA / LLM (Gemini 3.7 Flash)</h4>
                    <div className="text-xs text-indigo-300 font-semibold uppercase font-mono">Extração & Estruturação</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Lê PDFs aeronáuticos não estruturados (FAA/EASA/ANAC). Extrai modelos, faixas de MSN, part numbers (P/N), intervalos de inspeção e ações mandatórias em esquema tipado.
                    </p>
                    <div className="p-2.5 bg-slate-950 rounded border border-rose-500/30 text-[11px] text-rose-300 font-mono">
                      <strong>Regra de Ouro:</strong> A IA <u>nunca</u> declara uma aeronave como "Compliant" ou "Not Applicable" por conta própria.
                    </div>
                  </div>

                  {/* Pilar 2 */}
                  <div className="bg-slate-900/80 p-5 rounded-xl border border-indigo-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white font-mono">2. Motor de Regras Determinístico V2</h4>
                    <div className="text-xs text-indigo-300 font-semibold uppercase font-mono">Lógica Booleana & Matemática</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Executa checagens exatas contra a frota do operador. Cruza modelos canônicos, posições de motores, componentes instalados e modificações.
                    </p>
                    <div className="p-2.5 bg-slate-950 rounded border border-indigo-500/30 text-[11px] text-indigo-300 font-mono">
                      <strong>Regra de Ouro:</strong> Sob falta de dados, o sistema emite obrigatoriamente <code>REVIEW_REQUIRED</code>, jamais <code>NOT_APPLICABLE</code>.
                    </div>
                  </div>

                  {/* Pilar 3 */}
                  <div className="bg-slate-900/80 p-5 rounded-xl border border-purple-500/30 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white font-mono">3. Engenheiro CAMO Humano</h4>
                    <div className="text-xs text-purple-300 font-semibold uppercase font-mono">Autoridade Regulatória Exclusiva</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Responde a perguntas geradas pelo sistema com evidências físicas (Form 8130-3, caderneta), gerando <strong>Knowledge Facts</strong> permanentes e assinando os laudos FAPT.
                    </p>
                    <div className="p-2.5 bg-slate-950 rounded border border-purple-500/30 text-[11px] text-purple-300 font-mono">
                      <strong>Regra de Ouro:</strong> Rastreabilidade e chancela digital para atendimento estrito ao RBAC 121 / EASA Part-M.
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagrama Arquitetural Fase 9 */}
              <div className="bg-slate-900/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Diagrama Arquitetural Integrado — Release 9.5.2</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    REGULATORY INTELLIGENCE ARCHITECTURE
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
                  <img
                    src="/src/assets/images/camo_phase9_architecture_1789125961301.jpg"
                    alt="CAMO Phase 9 Architectural Diagram"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover max-h-[500px]"
                  />
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Fluxo canônico: Fontes Regulatórias (FAA/EASA/ANAC) → Lista de Candidatas → CAMO Register com PENDING_ANALYSIS → Fila de Análise CAMO → Configuração Real de Rotáveis → Matriz de Aplicabilidade → Controle de Aeronavegabilidade.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: OS 3 FLUXOS DE INGESTÃO */}
          {activeTab === 'ingestion' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white uppercase font-mono">
                  Os Três Fluxos de Entrada e Processamento de Diretrizes (ADs)
                </h3>
                
                <div className="p-4 bg-slate-900/80 rounded-xl border border-indigo-500/30 space-y-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 block">FLUXO 1: UPLOAD MANUAL AVULSO</span>
                  <p className="text-xs text-slate-300 font-sans">
                    Ingestão sob demanda para documentos pontuais, ordens locais ou boletins de fabricantes. O PDF é enviado, a IA Gemini 3.7 Flash extrai os parâmetros estruturados e o Rule Engine V2 emite o laudo FAPT preliminar.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-purple-500/30 space-y-2">
                  <span className="text-xs font-mono font-bold text-purple-400 block">FLUXO 2: PIPELINE AUTÔNOMO DA FAA (8 ESTÁGIOS)</span>
                  <p className="text-xs text-slate-300 font-sans">
                    Varredura periódica e incremental na Federal Register API. Realiza screening rápido de frota, aquisição com cofre anti-SSRF, inteligência documental e submissão ao gateway de aprovação humana.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-500/40 space-y-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 block">FLUXO 3: INTELIGÊNCIA & LACUNAS → CAMO REGISTER → FILA DE ANÁLISE</span>
                  <p className="text-xs text-slate-300 font-sans">
                    Origem na área Inteligência & Lacunas. O CAMO consulta as autoridades por frota/modelo, classifica os deltas (NEW, UPDATED, SUPERSEDED) e importa de forma idempotente para o CAMO Register como <strong>PENDING_ANALYSIS</strong>. Sem auto-disparo de IA na importação; a análise é disparada sob demanda na Fila de Análise pelo engenheiro CAMO.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FASES IMPLEMENTADAS */}
          {activeTab === 'phases' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-mono">
                    Linha do Tempo de Engenharia & Módulos Implementados (Fases 1 a 9.6)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Todas as fases operacionais com validação técnica e 128 testes 100% aprovados.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold font-mono text-xs">
                  124/124 Testes Green
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-sans">
                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 1: Fundação CAMO & 3 Pilares</span>
                  <p className="text-slate-300">Extração tipada via IA, motor booleano determinístico, ciclo de perguntas para dados ausentes e Knowledge Facts com evidências.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 2: Rule Engine V2 & FAPT</span>
                  <p className="text-slate-300">Resolução de modelos canônicos (B737_NG vs B737_MAX), rastreabilidade de modificações e emissão digital de laudos FAPT.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 3: Conectores & Scoping Filter</span>
                  <p className="text-slate-300">Conexão com a Federal Register API dos EUA e filtro de triagem rápida para descartar diretrizes fora de escopo.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 4: Cofre Criptográfico & SSRF</span>
                  <p className="text-slate-300">Aquisição segura de PDFs governamentais com defesa SSRF em 23 vetores, validação de redirect per-hop e hash SHA-256.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 5: Pipeline Autônomo FAA</span>
                  <p className="text-slate-300">Pipeline de 8 estágios atômicos para varredura, deduplicação idempotente e proveniência granular campo a campo.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 6: Ciclo 13 Estados & Due Date 3D</span>
                  <p className="text-slate-300">Máquina de 13 estados regulatórios, motor de vencimento multidimensional (CAL/FH/FC) e controle de aeronavegabilidade.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 7: Delivery Assessment & Sandbox</span>
                  <p className="text-slate-300">Avaliação pré-aquisição em sandbox isolado da frota ativa, validação de evidências de lessor e laudo de entrega.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 8: Central de Ajuda & Manual</span>
                  <p className="text-slate-300">Manual operacional completo, FAQs regulatórias e assistente passo a passo guiado para rotinas do analista CAMO.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-indigo-400 font-mono font-bold">Fase 9.1-9.5: Configuração Real & Register</span>
                  <p className="text-slate-300">Histórico de instalação de P/N e S/N, screening multi-autoridade, CAMO Register com PENDING_ANALYSIS e Inventário Unificado.</p>
                </div>

                <div className="p-4 bg-slate-900/70 rounded-xl border border-emerald-500/40 space-y-1.5">
                  <span className="text-emerald-400 font-mono font-bold">Fase 9.6: Governança Viva & Testes Adversariais</span>
                  <p className="text-slate-300">Release 9.5.2 homologada com 14 testes de segurança/invariantes, catálogo de 70+ endpoints e 24 capacidades oficiais.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOMÍNIO E ENTIDADES */}
          {activeTab === 'domain' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase font-mono">
                  Esquema de Entidades e Domínio Relacional Normalizado
                </h3>
                <p className="text-xs text-slate-400">
                  Modelo relacional completo persistido com garantia de isolamento e integridade referencial.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
                  <span className="text-indigo-400 font-bold block">1. ATIVOS DA FROTA</span>
                  <ul className="text-slate-300 space-y-1 text-[11px]">
                    <li>• Operator</li>
                    <li>• Aircraft</li>
                    <li>• Engine (Pos 1/2)</li>
                    <li>• Component (P/N, S/N)</li>
                    <li>• ComponentInstallation</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
                  <span className="text-indigo-400 font-bold block">2. REQUISITOS & REGRAS</span>
                  <ul className="text-slate-300 space-y-1 text-[11px]">
                    <li>• ComplianceRequirement</li>
                    <li>• ApplicabilityRule</li>
                    <li>• RequirementDetails</li>
                    <li>• SourceDocument (PDF)</li>
                    <li>• ComplianceObligation</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
                  <span className="text-purple-400 font-bold block">3. AVALIAÇÃO & MEMÓRIA</span>
                  <ul className="text-slate-300 space-y-1 text-[11px]">
                    <li>• ComplianceAssessment</li>
                    <li>• MatchedCriteria</li>
                    <li>• UserQuestion</li>
                    <li>• KnowledgeFact</li>
                    <li>• Evidence (Form 8130-3)</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
                  <span className="text-emerald-400 font-bold block">4. AUDITORIA & REGISTRO</span>
                  <ul className="text-slate-300 space-y-1 text-[11px]">
                    <li>• FAPTDocument (Laudo)</li>
                    <li>• OfficialDocumentRecord</li>
                    <li>• CamoRegulatoryEntry</li>
                    <li>• AuditLog (SHA-256)</li>
                    <li>• UserProfile (CAMO)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SEGURANÇA E SSRF */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase font-mono">
                  Arquitetura de Segurança, Defesa Anti-SSRF & Testes Adversariais
                </h3>
                <p className="text-xs text-slate-400">
                  Blindagem estrutural comprovada por 14 testes adversariais automatizados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-500/30 space-y-2">
                  <span className="text-emerald-400 font-mono font-bold block">Defesa Anti-SSRF em 4 Camadas</span>
                  <p className="text-slate-300">Whitelist governamental, bloqueio estrito de loopback (127.0.0.1), faixas RFC 1918 e metadados de nuvem (169.254.169.254) com revalidação per-hop.</p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-500/30 space-y-2">
                  <span className="text-emerald-400 font-mono font-bold block">Assinatura Mágica de PDF (%PDF-)</span>
                  <p className="text-slate-300">Inspeção direta dos bytes iniciais garantindo conformidade com o formato binário de PDF e rejeitando arquivos poliglota ou HTMLs camuflados.</p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-500/30 space-y-2">
                  <span className="text-emerald-400 font-mono font-bold block">Isolamento de Entidades e Sandboxes</span>
                  <p className="text-slate-300">Obrigações e dados de uma aeronave jamais poluem outra aeronave. Avaliações de Delivery operam em isolamento completo da frota ativa.</p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-500/30 space-y-2">
                  <span className="text-emerald-400 font-mono font-bold block">Integridade Criptográfica SHA-256</span>
                  <p className="text-slate-300">Cadeia de custódia com hashing criptográfico em toda evidência e documento, com detecção imediata de violação e trilha append-only.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOSSIÊ INTEGRAL (.MD COMPLETO) */}
          {activeTab === 'full' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-mono">
                    Especificação Técnica Integral (DOSSIE_ARQUITETURA_SISTEMA_CAMO.md)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Documento oficial em tempo real da Release 9.5.2.
                  </p>
                </div>
                <button
                  onClick={loadDossierText}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                >
                  Recarregar
                </button>
              </div>

              {loadingMarkdown ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Carregando especificação completa do dossiê...
                </div>
              ) : (
                <div className="bg-slate-950 p-5 rounded-xl border border-white/10 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text max-h-[550px] overflow-y-auto">
                  {dossierMarkdown || 'Carregando dossiê arquitetural oficial...'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/90 border-t border-white/10 px-6 py-3.5 flex items-center justify-between shrink-0 text-xs font-mono">
          <span className="text-slate-400 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Documento Oficial Release 9.5.2 — Homologado & Auditado</span>
          </span>
          <div className="flex items-center space-x-3">
            <a
              href="/api/generate-architecture-pdf"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Gerar PDF Oficial</span>
            </a>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
