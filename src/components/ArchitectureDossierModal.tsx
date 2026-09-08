import { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  X, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  UserCheck, 
  GitMerge, 
  Database, 
  Lock, 
  Boxes, 
  Globe2, 
  Search, 
  Key, 
  FileCheck2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Activity,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Server,
  Share2
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface ArchitectureDossierModalProps {
  state: DatabaseState | null;
  onClose: () => void;
}

export default function ArchitectureDossierModal({ state, onClose }: ArchitectureDossierModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'domain' | 'security' | 'roadmap' | 'full'>('overview');
  const [activePhase, setActivePhase] = useState<string>('all');

  const copyToClipboard = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
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
                <span className="text-xs text-slate-400 font-mono">Release 5.1A Auditada</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Arquitetura do Sistema & Engenharia CAMO
              </h2>
            </div>
          </div>

          {/* Actions & Print/PDF Button */}
          <div className="flex items-center space-x-2">
            <a
              href="/api/generate-architecture-pdf"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
              title="Baixar Dossiê Arquitetural Oficial em PDF (Documento Executivo)"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition border border-indigo-400/40"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Baixar PDF Oficial</span>
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
            { id: 'phases', label: '2. Fases Implementadas (1 a 5.1A)' },
            { id: 'domain', label: '3. Modelo de Domínio & Entidades' },
            { id: 'security', label: '4. Segurança, SSRF & Criptografia' },
            { id: 'roadmap', label: '5. Roadmap Tecnológico' },
            { id: 'full', label: '6. Visualização Completa (Dossiê Integral)' }
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
                  Airworthiness Compliance Intelligence
                </h1>
                <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
                  Sistema avançado de inteligência regulatória e aeronavegabilidade continuada, projetado especificamente para operadores sob os regulamentos <strong>FAA 14 CFR Part 39 / EASA Part-M / ANAC RBAC 121</strong>.
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
                    <span className="text-slate-400 text-[10px] block">DIRETRIZES AVALIADAS</span>
                    <span className="text-purple-400 font-bold">{state?.requirements.length || 0} ADs / SBs</span>
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
                    <h4 className="text-base font-bold text-white font-mono">2. Motor de Regras Determinístico</h4>
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

              {/* Fluxo de Dados End-to-End */}
              <div className="bg-slate-900/50 p-5 rounded-xl border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <GitMerge className="w-4 h-4 text-emerald-400" />
                  <span>Fluxo Integrado de Ingestão e Ciclo de Perguntas (5 Passos)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-white/10 space-y-1.5">
                    <span className="text-indigo-400 font-bold block">PASSO 1</span>
                    <h5 className="font-bold text-white">Descoberta / Upload</h5>
                    <p className="text-slate-400 text-[11px] font-sans">Varredura automática na Federal Register ou upload manual de PDF de AD/SB.</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-white/10 space-y-1.5">
                    <span className="text-indigo-400 font-bold block">PASSO 2</span>
                    <h5 className="font-bold text-white">Extração por IA</h5>
                    <p className="text-slate-400 text-[11px] font-sans">Gemini 3.7 Flash estrutura modelos, P/Ns, S/Ns, intervalos e instruções técnicas.</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-indigo-500/40 space-y-1.5">
                    <span className="text-indigo-300 font-bold block">PASSO 3</span>
                    <h5 className="font-bold text-white">Rule Engine V2</h5>
                    <p className="text-slate-400 text-[11px] font-sans">Executa avaliação na frota + Knowledge Base. Emite status por aeronave.</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-amber-500/40 space-y-1.5">
                    <span className="text-amber-400 font-bold block">PASSO 4</span>
                    <h5 className="font-bold text-white">Pergunta Técnica</h5>
                    <p className="text-slate-400 text-[11px] font-sans">Se faltam dados de P/N ou mod, formula questionamento formal ao engenheiro.</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-emerald-500/40 space-y-1.5">
                    <span className="text-emerald-400 font-bold block">PASSO 5</span>
                    <h5 className="font-bold text-white">Fato + FAPT</h5>
                    <p className="text-slate-400 text-[11px] font-sans">Armazena Knowledge Fact permanente, recalcula a frota e assina laudo FAPT.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FASES IMPLEMENTADAS */}
          {activeTab === 'phases' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-mono">
                    Linha do Tempo de Engenharia & Módulos Implementados
                  </h3>
                  <p className="text-xs text-slate-400">
                    Todas as fases concluídas com validação técnica e suítes de testes 100% aprovadas.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                    6 Fases Concluídas
                  </span>
                </div>
              </div>

              {/* Phase Cards */}
              <div className="space-y-4">
                
                {/* FASE 1 */}
                <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                        FASE 1
                      </span>
                      <h4 className="text-base font-bold text-white font-mono">
                        Fundação CAMO, Arquitetura de 3 Pilares & Memória Técnica
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluído & Auditado</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Estabeleceu a fundação de segurança da plataforma: extração de PDFs aeronáuticos via Gemini 3.7 Flash, motor determinístico booleano, ciclo de perguntas para dados ausentes e repositório permanente de <strong>Knowledge Facts</strong> com anexação de evidências documentais (cadernetas de manutenção, Form 8130-3, EASA Form 1).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Extração tipada de diretrizes de aeronavegabilidade
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Resolução de ambiguidades via questionamento CAMO
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Memória técnica permanente (Knowledge Facts)
                    </div>
                  </div>
                </div>

                {/* FASE 2 */}
                <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                        FASE 2
                      </span>
                      <h4 className="text-base font-bold text-white font-mono">
                        Motor de Regras V2, Modelos Canônicos & Geração de FAPT
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluído & Auditado</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Desacoplamento do motor de regras, resolução de modelos canônicos por família (ex: diferenciação estrita entre 737 Classic, 737 NG e 737 MAX), rastreamento de softwares embarcados e modificações, e geração automatizada de <strong>Folhas de Análise e Parecer Técnico (FAPT)</strong> com matriz de aplicabilidade completa da frota e assinatura digital.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Resolução Canônica (B737_NG vs B737_MAX)
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Rastreamento de Softwares e Modificações
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Emissão e Assinatura Digital de Laudos FAPT
                    </div>
                  </div>
                </div>

                {/* FASE 3 */}
                <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                        FASE 3
                      </span>
                      <h4 className="text-base font-bold text-white font-mono">
                        Conectores Regulatórios Oficiais & Triagem Preliminar de Frota
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluído & Auditado</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Integração com a API da Federal Register do Governo dos EUA para busca de diretrizes da FAA. Implementação do <strong>Fleet Regulatory Screening Engine</strong> para triagem instantânea de impacto na frota por escopo canônico e reconciliador multi-fonte entre registros governamentais e o banco interno.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Consulta em tempo real na Federal Register API
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Triagem preliminar de frota (Scoping Filter)
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Reconciliação multi-fonte de diretrizes
                    </div>
                  </div>
                </div>

                {/* FASE 4 */}
                <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                        FASE 4
                      </span>
                      <h4 className="text-base font-bold text-white font-mono">
                        Cofre Criptográfico de Aquisição Oficial & Defesa SSRF
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluído & Auditado</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Aquisição automatizada de PDFs originais a partir de repositórios governamentais oficiais (`govinfo.gov`, `federalregister.gov`, `drs.faa.gov`), com proteção em múltiplas camadas contra SSRF (bloqueio de IPs privados, metadados de nuvem e validação per-hop de redirects HTTP 301/302/307/308). Cofre com deduplicação e integridade por hash SHA-256 em modos dual (Modo 1: Cofre / Modo 2: Document Intelligence).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Defesa SSRF em 23 vetores de ataque
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Armazenamento com hash criptográfico SHA-256
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Modo Dual: Validação Criptográfica + IA
                    </div>
                  </div>
                </div>

                {/* FASE 5.1 & 5.1A */}
                <div className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                        FASE 5.1 & 5.1A
                      </span>
                      <h4 className="text-base font-bold text-white font-mono">
                        Motor de Descoberta Contínua & Rastreabilidade de Proveniência
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>10/10 Testes Aprovados</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Varredura contínua e incremental de publicações da FAA sob 14 CFR Part 39, deduplicação idempotente de varredura (ciclo `NEW` -&gt; `ALREADY_KNOWN` sem duplicatas), rastreabilidade granular de proveniência campo a campo (`SOURCE_METADATA` 100% de confiança vs `DERIVED_METADATA` com regra explícita `DOCKET_IDS_EXPLICIT_IDENTIFIER` a 98%), e <strong>política estrita anti-inferência</strong> para eliminar qualquer fabricação especulativa de números de AD.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Varredura contínua FAA 14 CFR Part 39
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Deduplicação determinística em ciclo isolado
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-white/5 text-slate-300">
                      ✓ Rastreamento de proveniência campo a campo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODELO DE DOMÍNIO & ENTIDADES */}
          {activeTab === 'domain' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase font-mono">
                  Esquema Relacional & Entidades do Domínio Aeronáutico
                </h3>
                <p className="text-xs text-slate-400">
                  Estrutura de dados desacoplada e normalizada para conformidade contínua com RBAC 121 e EASA Part-M.
                </p>
              </div>

              {/* Entity Schema Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                {/* Fleet Assets */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase text-[11px] border-b border-white/10 pb-2">
                    <Boxes className="w-4 h-4" />
                    <span>1. Ativos da Frota</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li>• <strong>Operator</strong> (Certificado CAMO)</li>
                    <li>• <strong>Aircraft</strong> (MSN, Reg, Horas, Ciclos)</li>
                    <li>• <strong>Engine</strong> (ESN, Posição 1/2, Horas)</li>
                    <li>• <strong>Component</strong> (P/N, S/N, Tag 8130-3)</li>
                    <li>• <strong>ComponentInstallation</strong> (Vínculo)</li>
                  </ul>
                </div>

                {/* Requirements */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase text-[11px] border-b border-white/10 pb-2">
                    <FileText className="w-4 h-4" />
                    <span>2. Requisitos & Regras</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li>• <strong>ComplianceRequirement</strong> (AD/SB)</li>
                    <li>• <strong>ApplicabilityRule</strong> (Critérios)</li>
                    <li>• <strong>RequirementDetails</strong> (Prazos/Limites)</li>
                    <li>• <strong>ComplianceAction</strong> (Inspeção/Mod)</li>
                    <li>• <strong>SourceDocument</strong> (PDF/Dados)</li>
                  </ul>
                </div>

                {/* Assessment & Memory */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center space-x-2 text-purple-400 font-bold uppercase text-[11px] border-b border-white/10 pb-2">
                    <Database className="w-4 h-4" />
                    <span>3. Avaliação & Memória</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li>• <strong>ComplianceAssessment</strong> (Status)</li>
                    <li>• <strong>MatchedCriteria</strong> (Evidência lógica)</li>
                    <li>• <strong>UserQuestion</strong> (Item faltante)</li>
                    <li>• <strong>KnowledgeFact</strong> (Fato permanente)</li>
                    <li>• <strong>Evidence</strong> (Doc de suporte)</li>
                  </ul>
                </div>

                {/* Regulatory & Audit */}
                <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase text-[11px] border-b border-white/10 pb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>4. Governança & Auditoria</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300 text-[11px]">
                    <li>• <strong>FAPTDocument</strong> (Laudo formal)</li>
                    <li>• <strong>OfficialDocumentRecord</strong> (Cofre)</li>
                    <li>• <strong>DiscoveryScan</strong> (Varredura FR)</li>
                    <li>• <strong>AuditTrailLog</strong> (Trilha imutável)</li>
                    <li>• <strong>UserProfile</strong> (Papel do engenheiro)</li>
                  </ul>
                </div>
              </div>

              {/* State Machine Statuses */}
              <div className="bg-slate-900/50 p-5 rounded-xl border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Máquina de Estados de Aplicabilidade e Conformidade (Rule Engine)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg space-y-1">
                    <span className="text-amber-400 font-bold">APPLICABLE</span>
                    <p className="text-slate-300 text-[11px] font-sans">A aeronave/motor/componente atende aos critérios da AD e requer ação mandatória de cumprimento.</p>
                  </div>
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg space-y-1">
                    <span className="text-emerald-400 font-bold">NOT_APPLICABLE</span>
                    <p className="text-slate-300 text-[11px] font-sans">Comprovadamente fora de escopo por modelo, MSN ou modificação terminativa confirmada com evidência.</p>
                  </div>
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/40 rounded-lg space-y-1">
                    <span className="text-indigo-300 font-bold">REVIEW_REQUIRED</span>
                    <p className="text-slate-300 text-[11px] font-sans">Bloqueio de segurança: modelo afetado mas P/N ou modificação desconhecida no banco digital.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEGURANÇA & SSRF */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase font-mono">
                  Arquitetura de Segurança, Defesa Anti-SSRF & Integridade Criptográfica
                </h3>
                <p className="text-xs text-slate-400">
                  Blindagem estrutural para aquisição segura de documentos governamentais e proteção de infraestrutura.
                </p>
              </div>

              {/* Security Metrics & Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-[11px]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Whitelist de Domínios Oficiais</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    Apenas domínios governamentais explícitos são permitidos para download (ex: <code>govinfo.gov</code>, <code>federalregister.gov</code>, <code>drs.faa.gov</code>). Spoofs de subdomínio e prefixo são sumariamente rejeitados.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-[11px]">
                    <Lock className="w-4 h-4" />
                    <span>Bloqueio Anti-SSRF em 23 Vetores</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    Bloqueio completo de IPs de loopback (127.0.0.1, [::1]), faixas RFC 1918 (10.x, 172.16.x, 192.168.x), metadados de nuvem (169.254.169.254) e notações evasivas (octal, hex, dword).
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-[11px]">
                    <Key className="w-4 h-4" />
                    <span>Cofre SHA-256 com Deduplicação</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    Cada documento oficial baixado é verificado criptograficamente por seu hash SHA-256, impedindo adulteração de conteúdo e garantindo armazenamento idempotente sem redundância.
                  </p>
                </div>
              </div>

              {/* SSRF & Redirect Revalidation Diagram */}
              <div className="bg-slate-900/50 p-5 rounded-xl border border-white/10 space-y-3 font-mono text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider">
                  Mecanismo de Validação Per-Hop de Redirecionamentos HTTP (301, 302, 307, 308)
                </h4>
                <div className="p-4 bg-slate-950 rounded-lg border border-white/10 space-y-2 text-slate-300">
                  <div className="flex items-center space-x-2 text-indigo-300 font-bold">
                    <span>1. URL Inicial Solicitada</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-400">Validação na Whitelist & Anti-SSRF</span>
                  </div>
                  <div className="flex items-center space-x-2 text-indigo-300 font-bold">
                    <span>2. Resposta com Redirecionamento (ex: 301/302)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-400">Captura do Header Location</span>
                  </div>
                  <div className="flex items-center space-x-2 text-indigo-300 font-bold">
                    <span>3. Destino do Redirecionamento</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-400">Revalidação Imediata Per-Hop contra SSRF/IPs Privados</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans pt-2 border-t border-white/10">
                    Se um servidor externo tentar redirecionar para <code>127.0.0.1</code> ou <code>169.254.169.254</code> (metadados de nuvem), a conexão é abortada no salto de redirecionamento antes de qualquer envio de requisição interna.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ROADMAP TECNOLÓGICO */}
          {activeTab === 'roadmap' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white uppercase font-mono">
                  Roadmap Tecnológico & Expansões Futuras (Fase 6+)
                </h3>
                <p className="text-xs text-slate-400">
                  Arquitetura extensível concebida para cobrir 100% dos requisitos de engenharia de manutenção e aeronavegabilidade continuada.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Expansion 1 */}
                <div className="bg-slate-900/80 p-5 rounded-xl border border-white/10 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                    FASE 6
                  </span>
                  <h4 className="text-base font-bold text-white font-mono">Conectores EASA & ANAC</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Integração com o portal oficial da Agência Europeia de Segurança da Aviação (EASA — <em>Safety Publications Tool</em>) e com os sistemas de Diretrizes de Aeronavegabilidade da ANAC (Brasil).
                  </p>
                </div>

                {/* Expansion 2 */}
                <div className="bg-slate-900/80 p-5 rounded-xl border border-white/10 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    FASE 7
                  </span>
                  <h4 className="text-base font-bold text-white font-mono">Service Bulletins & Ordens de Engenharia</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Gestão integrada de boletins opcionais e de alerta de fabricantes (Boeing, Airbus, Embraer, CFM) e conversão em Ordens de Engenharia (EOs) para execução nas oficinas de manutenção (MRO).
                  </p>
                </div>

                {/* Expansion 3 */}
                <div className="bg-slate-900/80 p-5 rounded-xl border border-white/10 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    FASE 8
                  </span>
                  <h4 className="text-base font-bold text-white font-mono">Programa de Manutenção (AMP) & LLPs</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Controle contínuo de tarefas periódicas por Horas de Voo (FH), Ciclos (FC) e Limites Calendáricos (CAL), além de rastreamento preditivo de peças com vida limite (Life-Limited Parts).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: VISUALIZAÇÃO COMPLETA (PRINT PREVIEW) */}
          {activeTab === 'full' && (
            <div className="space-y-8 animate-fadeIn bg-slate-950 p-6 rounded-xl border border-white/10 text-xs font-mono leading-relaxed">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase">Dossiê Técnico de Arquitetura Integral</h2>
                  <p className="text-slate-400 text-xs font-sans">Visualização para impressão e auditoria técnica externa.</p>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir em PDF</span>
                </button>
              </div>

              {/* Full Markdown Render Styled */}
              <div className="space-y-6 text-slate-300 font-sans text-xs">
                <div className="p-4 bg-slate-900 rounded-lg border border-indigo-500/30 space-y-2">
                  <h3 className="text-sm font-bold text-white font-mono uppercase">1. IDENTIFICAÇÃO DO SISTEMA</h3>
                  <p>• <strong>Nome:</strong> Airworthiness Compliance Intelligence (Projeto CAMO)</p>
                  <p>• <strong>Arquitetura:</strong> Full-Stack Desacoplada (Node.js/Express + React/TypeScript + Gemini 3.7 Flash + Rule Engine V2)</p>
                  <p>• <strong>Padrão Regulatório:</strong> FAA 14 CFR Part 39 / EASA Part-M / ANAC RBAC 121 & RBAC 39</p>
                  <p>• <strong>Estado Atual:</strong> Release 5.1A — Descoberta Contínua, Proveniência Granular e Cofre Criptográfico 100% Auditados</p>
                </div>

                <div className="p-4 bg-slate-900 rounded-lg border border-white/10 space-y-2">
                  <h3 className="text-sm font-bold text-white font-mono uppercase">2. OS 3 PILARES DE SEGURANÇA</h3>
                  <p>1. <strong>Inteligência Artificial:</strong> Extração estruturada de documentos não estruturados.</p>
                  <p>2. <strong>Rule Engine Determinístico:</strong> Execução de regras booleanas contra dados da frota. Falta de dados gera `REVIEW_REQUIRED`.</p>
                  <p>3. <strong>Engenharia CAMO:</strong> Resolução de dados faltantes via evidências físicas e assinatura digital de laudos FAPT.</p>
                </div>

                <div className="p-4 bg-slate-900 rounded-lg border border-white/10 space-y-2">
                  <h3 className="text-sm font-bold text-white font-mono uppercase">3. MATRIZ DE FASES IMPLEMENTADAS</h3>
                  <table className="w-full text-left border-collapse font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="py-2">Fase</th>
                        <th className="py-2">Nome do Módulo</th>
                        <th className="py-2">Garantia Técnica</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="py-2 text-indigo-400 font-bold">Fase 1</td>
                        <td className="py-2">Fundação & 3 Pilares</td>
                        <td className="py-2">Extração por IA + Motor Booleano + Memória Técnica</td>
                        <td className="py-2 text-emerald-400 font-bold">AUDITADO</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-indigo-400 font-bold">Fase 2</td>
                        <td className="py-2">Rule Engine V2 & FAPT</td>
                        <td className="py-2">Modelos Canônicos + Softwares + Assinatura Digital</td>
                        <td className="py-2 text-emerald-400 font-bold">AUDITADO</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-indigo-400 font-bold">Fase 3</td>
                        <td className="py-2">Conectores Regulatórios</td>
                        <td className="py-2">Federal Register API + Scoping Filter de Frota</td>
                        <td className="py-2 text-emerald-400 font-bold">AUDITADO</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-indigo-400 font-bold">Fase 4</td>
                        <td className="py-2">Cofre Criptográfico & SSRF</td>
                        <td className="py-2">Defesa SSRF 23 Vetores + Hash SHA-256 + Modo Dual</td>
                        <td className="py-2 text-emerald-400 font-bold">AUDITADO</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-indigo-400 font-bold">Fase 5.1A</td>
                        <td className="py-2">Descoberta Contínua & Proveniência</td>
                        <td className="py-2">Varredura Part 39 + Deduplicação + Anti-Inferência</td>
                        <td className="py-2 text-emerald-400 font-bold">AUDITADO</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-900 rounded-lg border border-white/10 space-y-2">
                  <h3 className="text-sm font-bold text-white font-mono uppercase">4. MATRIZ DE SEGURANÇA E CONFORMIDADE</h3>
                  <p>• <strong>Defesa SSRF:</strong> Bloqueio estrito de redes 127.0.0.1, 10.x, 172.x, 192.168.x e metadados de nuvem 169.254.169.254.</p>
                  <p>• <strong>Integridade de Arquivos:</strong> Verificação por hash criptográfico SHA-256 antes da persistência no cofre.</p>
                  <p>• <strong>Proveniência de Dados:</strong> Segregação de <code>SOURCE_METADATA</code> (100%) e <code>DERIVED_METADATA</code> (98%) com regra explícita.</p>
                  <p>• <strong>Trilha de Auditoria:</strong> Rastreabilidade imutável de todas as ações de usuários e avaliações de regras com timestamps ISO 8601 UTC.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/90 border-t border-white/10 px-6 py-3.5 flex items-center justify-between shrink-0 text-xs font-mono">
          <span className="text-slate-400 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Documento Pronto para Apresentação & Divulgação Institucional</span>
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Gerar PDF</span>
            </button>
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
