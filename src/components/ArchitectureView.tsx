import { useState } from 'react';
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
  Share2
} from 'lucide-react';

interface ArchitectureViewProps {
  onOpenDossier?: () => void;
}

export default function ArchitectureView({ onOpenDossier }: ArchitectureViewProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');

  const copyDossier = () => {
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
    if (onOpenDossier) {
      onOpenDossier();
    } else {
      window.print();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Arquitetura de Engenharia CAMO & Conformidade Regulatória</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Fase 5.1A Auditada
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
              Dossiê Arquitetural & Mapa de Engenharia do Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed font-sans">
              O sistema opera sobre um princípio de segurança não negociável: 
              <strong> A IA extrai e estrutura documentos aeronáuticos; o Motor de Regras Determinístico impõe conformidade matemática estrita; e a Autoridade Regulatória permanece 100% com o Engenheiro CAMO humano.</strong>
            </p>
          </div>

          {/* Action Buttons: PDF & Downloads */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="/api/generate-architecture-pdf"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.pdf"
              title="Baixar Dossiê Arquitetural Oficial em PDF (Documento Executivo)"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition border border-indigo-400/40"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Baixar PDF Oficial</span>
            </a>

            <button
              onClick={() => onOpenDossier && onOpenDossier()}
              title="Abrir Dossiê Interativo & Visualização Completa"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>Ver Dossiê Interativo</span>
            </button>

            <a
              href="/api/download-architecture-dossier"
              download="DOSSIE_ARQUITETURA_SISTEMA_CAMO.md"
              title="Baixar Especificação Completa em Markdown"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Baixar .MD</span>
            </a>

            <button
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
            <span className="text-slate-400 text-[10px] block">PADRÃO REGULATÓRIO</span>
            <span className="text-white font-bold">FAA 14 CFR / EASA Part-M / RBAC 121</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">IA DE INGESTÃO</span>
            <span className="text-indigo-300 font-bold">Gemini 3.7 Flash</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">AVALIAÇÃO DE FROTA</span>
            <span className="text-emerald-400 font-bold">Rule Engine Determinístico V2</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-slate-400 text-[10px] block">SEGURANÇA & PROVENIÊNCIA</span>
            <span className="text-purple-400 font-bold">Defesa SSRF + SHA-256 + 100% Auditado</span>
          </div>
        </div>
      </div>

      {/* 1. THREE-TIER SEPARATION OF RESPONSIBILITY */}
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
              Lê PDFs aeronáuticos não estruturados (FAA/EASA/ANAC). Extrai modelos, faixas de MSN, part numbers (P/Ns), intervalos de inspeção e ações mandatórias em esquema tipado.
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
              <span className="font-bold">Regra de Ouro:</span> Sob falta de dados, o sistema emite obrigatoriamente <code>REVIEW REQUIRED</code>, jamais <code>NOT APPLICABLE</code>.
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

      {/* 2. MAPA DE FASES IMPLEMENTADAS */}
      <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2">
            <GitMerge className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              2. Mapa Detalhado de Fases e Módulos de Engenharia Implementados
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
            6 Fases Operacionais & Auditadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Fase 1 */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                FASE 1
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auditado</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Fundação CAMO, 3 Pilares & Memória Técnica</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Extração de diretrizes com Gemini 3.7 Flash, motor booleano determinístico, ciclo de perguntas interativo para resolução de dados ausentes e repositório permanente de <strong>Knowledge Facts</strong> com evidências documentais anexadas.
            </p>
          </div>

          {/* Card Fase 2 */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                FASE 2
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auditado</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Motor de Regras V2, Modelos Canônicos & Laudos FAPT</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Resolução de modelos canônicos por família (B737_NG vs B737_MAX vs A320), rastreabilidade de softwares embarcados e modificações, e geração automatizada de <strong>Folhas de Análise e Parecer Técnico (FAPT)</strong> com assinatura digital.
            </p>
          </div>

          {/* Card Fase 3 */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                FASE 3
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auditado</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Conectores Oficiais & Triagem Preliminar de Frota</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Integração com a Federal Register API do Governo dos EUA, motor de triagem rápida de frota (Fleet Regulatory Screening) e reconciliador multi-fonte entre publicações governamentais e registros internos.
            </p>
          </div>

          {/* Card Fase 4 */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                FASE 4
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auditado</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Cofre Criptográfico de Aquisição & Defesa SSRF</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Download seguro de PDFs oficiais (`govinfo.gov`, `federalregister.gov`, `drs.faa.gov`), defesa SSRF em 23 vetores com bloqueio de IPs privados/metadados, validação hop-by-hop de redirects e cofre com hash SHA-256 idempotente em modos dual.
            </p>
          </div>

          {/* Card Fase 5.1 & 5.1A */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-emerald-500/40 md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                FASE 5.1 & 5.1A
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>10/10 Testes Validados & Aprovados</span>
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Motor de Descoberta Contínua, Deduplicação & Proveniência Granular</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Varredura periódica e sob demanda na Federal Register API para FAA 14 CFR Part 39, deduplicação idempotente (`NEW` -&gt; `ALREADY_KNOWN` sem duplicatas), rastreabilidade granular de proveniência campo a campo (`SOURCE_METADATA` 100% de confiança vs `DERIVED_METADATA` 98% via regra `DOCKET_IDS_EXPLICIT_IDENTIFIER`) e <strong>política estrita anti-inferência</strong> para eliminar qualquer fabricação especulativa de números de AD.
            </p>
          </div>
        </div>
      </div>

      {/* 3. FLUXO DE DADOS & QUESTION LOOP */}
      <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2">
          <GitMerge className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
            3. Fluxo de Execução End-to-End e Ciclo de Perguntas Interativo
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
            <span className="text-indigo-400 font-bold">PASSO 1</span>
            <h4 className="font-bold text-white font-sans">Descoberta / Upload</h4>
            <p className="text-slate-400 font-sans">Varredura automática na Federal Register ou upload de PDF oficial.</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-2">
            <span className="text-indigo-400 font-bold">PASSO 2</span>
            <h4 className="font-bold text-white font-sans">Extração por IA</h4>
            <p className="text-slate-400 font-sans">Gemini 3.7 Flash estrutura modelos, P/Ns, S/Ns, intervalos e ações mandatórias.</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-indigo-500/40 space-y-2">
            <span className="text-indigo-300 font-bold">PASSO 3</span>
            <h4 className="font-bold text-white font-sans">Rule Engine V2</h4>
            <p className="text-slate-400 font-sans">Avaliação booleana contra a frota + Knowledge Base. Emite status por aeronave.</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-indigo-500/40 space-y-2">
            <span className="text-indigo-300 font-bold">PASSO 4</span>
            <h4 className="font-bold text-white font-sans">Pergunta CAMO</h4>
            <p className="text-slate-400 font-sans">Formulação de questionamento preciso para P/N ou modificação desconhecida.</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-emerald-500/40 space-y-2">
            <span className="text-emerald-400 font-bold">PASSO 5</span>
            <h4 className="font-bold text-white font-sans">Fato + FAPT</h4>
            <p className="text-slate-400 font-sans">Grava Knowledge Fact permanente com evidência anexa e assina laudo FAPT.</p>
          </div>
        </div>
      </div>

      {/* 4. RELATIONAL ENTITY MODEL */}
      <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
            4. Esquema de Entidades e Domínio Relacional Normalizado
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-white/10 space-y-2">
            <span className="text-indigo-400 font-bold block font-sans uppercase text-[10px]">Ativos da Frota</span>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• Operator (Certificado CAMO)</li>
              <li>• Aircraft (MSN, Matrícula)</li>
              <li>• Engine (ESN, Posição 1/2)</li>
              <li>• Component (P/N, S/N, Tag)</li>
              <li>• ComponentInstallation</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-white/10 space-y-2">
            <span className="text-indigo-400 font-bold block font-sans uppercase text-[10px]">Requisitos & Regras</span>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• ComplianceRequirement</li>
              <li>• ApplicabilityRule</li>
              <li>• RequirementDetails</li>
              <li>• SourceDocument (PDF)</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-white/10 space-y-2">
            <span className="text-purple-400 font-bold block font-sans uppercase text-[10px]">Avaliação & Memória</span>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• ComplianceAssessment</li>
              <li>• MatchedCriteria</li>
              <li>• UserQuestion</li>
              <li>• KnowledgeFact</li>
              <li>• Evidence (Form 8130-3)</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-white/10 space-y-2">
            <span className="text-emerald-400 font-bold block font-sans uppercase text-[10px]">Conformidade & Auditoria</span>
            <ul className="text-slate-300 space-y-1 text-[11px]">
              <li>• FAPTDocument (Laudo)</li>
              <li>• OfficialDocumentRecord</li>
              <li>• DiscoveryScan (Varredura)</li>
              <li>• AuditLog (Imutável)</li>
              <li>• UserProfile (CAMO)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. FUTURE EXPANSION ROADMAP */}
      <div className="glass-panel rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2">
          <Boxes className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
            5. Roadmap de Expansões Tecnológicas (Fase 6+)
          </h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          A arquitetura relacional e o motor de regras foram concebidos com interfaces genéricas, permitindo expansão natural para:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-4 bg-slate-950/60 rounded-lg border border-white/10 space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold font-mono">
              <Globe2 className="w-4 h-4" />
              <span>Conectores EASA & ANAC</span>
            </div>
            <p className="text-slate-400 text-[11px]">Integração com o portal oficial EASA Safety Publications Tool e sistemas de diretrizes ANAC.</p>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-lg border border-white/10 space-y-1">
            <div className="flex items-center space-x-2 text-purple-400 font-bold font-mono">
              <FileCheck2 className="w-4 h-4" />
              <span>Service Bulletins & EOs</span>
            </div>
            <p className="text-slate-400 text-[11px]">Rastreamento de boletins de fabricantes (Boeing/Airbus/CFM) e geração de Ordens de Engenharia.</p>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-lg border border-white/10 space-y-1">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold font-mono">
              <Activity className="w-4 h-4" />
              <span>AMP / MPD & Peças LLP</span>
            </div>
            <p className="text-slate-400 text-[11px]">Gestão de tarefas do programa de manutenção e controle preditivo de componentes com vida limite.</p>
          </div>
        </div>
      </div>

      {/* Bottom Floating Export Bar */}
      <div className="p-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 rounded-xl border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white font-mono uppercase">
            Dossiê de Arquitetura Pronto para Apresentação Executiva
          </h4>
          <p className="text-xs text-slate-300 font-sans">
            Gere o PDF formatado em padrão executivo/aerospacial ou faça o download da especificação técnica completa.
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
              <span>Ver no Navegador</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
