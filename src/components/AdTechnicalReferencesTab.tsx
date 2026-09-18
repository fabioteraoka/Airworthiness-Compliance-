import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ExternalLink, 
  Sparkles, 
  RefreshCw, 
  PlusCircle, 
  ShieldCheck, 
  AlertTriangle, 
  BookOpen, 
  Check, 
  XCircle, 
  Cpu, 
  SlidersHorizontal 
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { 
  ComplianceRequirement, 
  AdSBDependency, 
  ServiceBulletinDocumentRecord, 
  EssentialSbAnalysis, 
  AdSbCrossValidationResult,
  AdAnalysisCompletenessAssessment
} from '../types';

interface AdTechnicalReferencesTabProps {
  adNumber: string;
  requirement: ComplianceRequirement;
  state: DatabaseState;
  onRefreshState: (newState: DatabaseState) => void;
}

export const AdTechnicalReferencesTab: React.FC<AdTechnicalReferencesTabProps> = ({
  adNumber,
  requirement,
  state,
  onRefreshState
}) => {
  const [dependencies, setDependencies] = useState<AdSBDependency[]>([]);
  const [assessment, setAssessment] = useState<AdAnalysisCompletenessAssessment | null>(null);
  const [selectedSb, setSelectedSb] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<EssentialSbAnalysis | null>(null);
  const [activeCrossValidation, setActiveCrossValidation] = useState<AdSbCrossValidationResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form state for uploading/registering SB document
  const [sbNumberInput, setSbNumberInput] = useState('');
  const [sbRevInput, setSbRevInput] = useState('Original');
  const [sbMfgInput, setSbMfgInput] = useState('Boeing');
  const [sbContentInput, setSbContentInput] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch dependencies
      const depRes = await fetch(`/api/ad-sb/dependencies/${encodeURIComponent(adNumber)}`);
      const depData = await depRes.json();
      if (depData.success) {
        setDependencies(depData.dependencies || []);
      }

      // 2. Fetch completeness assessment
      const assRes = await fetch(`/api/ad-sb/completeness/${encodeURIComponent(adNumber)}`);
      const assData = await assRes.json();
      if (assData.success && assData.completeness) {
        setAssessment(assData.completeness);
        if (assData.completeness.crossValidationResult) {
          setActiveCrossValidation(assData.completeness.crossValidationResult);
        }
      }
    } catch (err: any) {
      console.error('Error loading AD-SB references:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adNumber]);

  // Handle detect dependencies from AD text
  const handleDetectDependencies = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/ad-sb/dependencies/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adNumber,
          adText: requirement.sourceDocument?.rawExtractedText || requirement.rawExtraction?.rawText || requirement.applicabilityRule?.rawText || '',
          requirementId: requirement.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setDependencies(data.dependencies || []);
        setAssessment(data.completeness || null);
        setActionMessage(`Detectadas ${data.count} referências de Boletim de Serviço com sucesso.`);
      }
    } catch (err: any) {
      setActionMessage(`Falha na detecção: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle View / Open SB Analysis
  const handleViewAnalysis = async (sbNumber: string) => {
    setSelectedSb(sbNumber);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ad-sb/analysis/${encodeURIComponent(sbNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveAnalysis(data.analysis);
      } else {
        setActiveAnalysis(null);
      }

      // Also check cross validation
      const cv = (state.adSbCrossValidations || []).find(v => 
        v.adNumber.toLowerCase() === adNumber.toLowerCase() && 
        v.sbNumber.toUpperCase() === sbNumber.toUpperCase()
      );
      if (cv) {
        setActiveCrossValidation(cv);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Analyze SB
  const handleAnalyzeSb = async (sbNumber: string) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/ad-sb/analyze/${encodeURIComponent(sbNumber)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: 'Original' })
      });
      const data = await res.json();
      if (data.success) {
        setActiveAnalysis(data.analysis);
        setSelectedSb(sbNumber);
        
        // Auto trigger cross-validation
        const cvRes = await fetch('/api/ad-sb/cross-validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adNumber, sbNumber })
        });
        const cvData = await cvRes.json();
        if (cvData.success) {
          setActiveCrossValidation(cvData.crossValidation);
          setAssessment(cvData.completeness);
        }

        setActionMessage(`Análise técnica do SB ${sbNumber} e validação cruzada concluídas.`);
        await loadData();
      } else {
        setActionMessage(`Erro ao analisar SB: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Falha ao executar análise do SB: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Store new SB Document
  const handleStoreSb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbNumberInput || !sbContentInput) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/ad-sb/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentNumber: sbNumberInput,
          revision: sbRevInput,
          manufacturer: sbMfgInput,
          rawContent: sbContentInput,
          title: `Service Bulletin ${sbNumberInput} Rev. ${sbRevInput}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setSbNumberInput('');
        setSbContentInput('');
        setActionMessage(`SB ${data.document.documentNumber} armazenado no repositório com SHA-256 preservado.`);
        await loadData();
      }
    } catch (err: any) {
      setActionMessage(`Erro ao salvar documento SB: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const adStatus = assessment?.status || 'DEPENDENCY_PENDING';
  const fleetState = assessment?.fleetApplicabilityState || (dependencies.length > 0 ? 'PENDING_CONFIGURATION' : 'DETERMINED');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. TOP DUAL-STATUS KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: AD Technical Analysis Completeness */}
        <div className={`p-4 rounded-xl border ${
          adStatus === 'TECHNICAL_ANALYSIS_COMPLETE'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : adStatus === 'DEPENDENCY_PENDING'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
              1. Status da Análise Técnica da AD
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              adStatus === 'TECHNICAL_ANALYSIS_COMPLETE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : adStatus === 'DEPENDENCY_PENDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {adStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-2 text-xs font-sans leading-relaxed text-slate-200 font-medium">
            {assessment?.summary || (
              dependencies.length > 0
                ? 'A AD possui dependência mandatória de Boletins de Serviço. Análise e cruzamento de dados técnicos requeridos.'
                : 'AD sem dependência de SB ou análise própria suficiente.'
            )}
          </p>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span>Dependências: <strong className="text-white">{dependencies.length}</strong></span>
            <span>•</span>
            <span>Analisadas: <strong className="text-emerald-400">{assessment?.resolvedDependencies || 0}</strong></span>
            <span>•</span>
            <span>Pendentes: <strong className="text-amber-400">{assessment?.pendingDependencies?.length || 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Fleet Applicability State (Decoupled from AD Status) */}
        <div className={`p-4 rounded-xl border ${
          fleetState === 'DETERMINED'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : fleetState === 'PENDING_CONFIGURATION'
            ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
            : 'bg-slate-900 border-white/10 text-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
              2. Status de Aplicabilidade da Frota (Decoupled)
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              fleetState === 'DETERMINED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : fleetState === 'PENDING_CONFIGURATION'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {fleetState.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-2 text-xs font-sans leading-relaxed text-slate-200 font-medium">
            {fleetState === 'PENDING_CONFIGURATION'
              ? 'Aplicabilidade individual por aeronave pendente de conferência com a configuração física / MSN detalhada no SB.'
              : 'Aplicabilidade da frota consolidada e determinada pelo motor de regras.'}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-300 font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Princípio CAMO: Separação estrita entre análise normativa e aplicabilidade na frota.</span>
          </div>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className="p-3 bg-indigo-950/80 border border-indigo-500/50 rounded-xl flex items-center justify-between text-xs text-indigo-200 font-mono">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-indigo-400 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {/* 2. ACTIONS TOOLBAR */}
      <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Technical References & Service Bulletins ({dependencies.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDetectDependencies}
            disabled={isLoading}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 transition font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Escanear Referências da AD</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg transition font-mono shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Adicionar SB ao Repositório</span>
          </button>
        </div>
      </div>

      {/* 3. REFERENCED SERVICE BULLETINS LIST */}
      <div className="space-y-3">
        {dependencies.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-xl border border-white/5 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
            <p className="text-sm text-slate-300 font-medium">Nenhuma dependência técnica de Boletim de Serviço detectada nesta Diretriz.</p>
            <p className="text-xs text-slate-500 font-mono">O cumprimento pode ser realizado com base estritamente no texto regulatório da AD.</p>
            <button
              onClick={handleDetectDependencies}
              className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-lg font-mono inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Forçar Varredura Heurística</span>
            </button>
          </div>
        ) : (
          dependencies.map((dep) => {
            const isAnalyzed = dep.status === 'ANALYZED' || dep.detectionState === 'ANALYZED';
            const isLocated = dep.detectionState === 'LOCATED' || dep.status === 'ANALYSIS_PENDING';
            const isNotLocated = dep.detectionState === 'NOT_LOCATED' || dep.status === 'NOT_LOCATED' || dep.status === 'PENDING';
            const isSelected = selectedSb === dep.sbNumber;

            return (
              <div 
                key={dep.id}
                className={`p-4 rounded-xl border transition ${
                  isSelected 
                    ? 'bg-slate-900 border-indigo-500/70 shadow-lg shadow-indigo-950/40' 
                    : 'glass-panel border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {dep.sbManufacturer && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 font-bold uppercase">
                          {dep.sbManufacturer}
                        </span>
                      )}
                      <span className="font-mono text-sm font-bold text-white">
                        {dep.sbNumber}
                      </span>
                      {dep.sbRevision && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                          {dep.sbRevision.startsWith('Rev') ? dep.sbRevision : `Rev. ${dep.sbRevision}`}
                        </span>
                      )}
                      {dep.sbDate && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5">
                          {dep.sbDate}
                        </span>
                      )}
                      {dep.sourceSection && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                          {dep.sourceSection}
                        </span>
                      )}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        dep.relationshipType === 'APPLICABILITY_SOURCE'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                          : dep.relationshipType === 'TERMINATING_ACTION'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : dep.relationshipType === 'REQUIRED_BY_AD' || dep.relationshipType === 'COMPLIANCE_METHOD'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {dep.relationshipType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {dep.sourceText && (
                      <p className="text-xs text-slate-400 font-mono italic bg-black/20 p-2 rounded border border-white/5">
                        "{dep.sourceText}"
                      </p>
                    )}

                    {dep.notes && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        {dep.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-1.5 ${
                      isAnalyzed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isLocated
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {isAnalyzed ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>
                        {isAnalyzed 
                          ? 'DOCUMENTO ANALISADO' 
                          : isLocated 
                          ? 'DOCUMENTO LOCALIZADO' 
                          : 'DOCUMENTO PENDENTE NO REPOSITÓRIO'}
                      </span>
                    </span>

                    {isAnalyzed ? (
                      <button
                        onClick={() => handleViewAnalysis(dep.sbNumber)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 font-mono transition"
                      >
                        Ver Análise
                      </button>
                    ) : isLocated ? (
                      <button
                        onClick={() => handleAnalyzeSb(dep.sbNumber)}
                        disabled={isLoading}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg font-mono transition shadow"
                      >
                        Analisar SB
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSbNumberInput(dep.sbNumber);
                          if (dep.sbManufacturer) setSbMfgInput(dep.sbManufacturer);
                          if (dep.sbRevision) setSbRevInput(dep.sbRevision);
                          setShowUploadModal(true);
                        }}
                        className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/40 font-bold px-3 py-1.5 rounded-lg font-mono transition"
                      >
                        + Adicionar SB
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. ACTIVE SB ANALYSIS & CROSS-VALIDATION DETAILS */}
      {selectedSb && activeAnalysis && (
        <div className="glass-panel rounded-xl p-5 border border-indigo-500/30 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Análise Técnica Essencial: {activeAnalysis.sbNumber} Rev. {activeAnalysis.revision}
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Fabricante: <strong className="text-white">{activeAnalysis.manufacturer}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Box 1: Applicability / Effectivity */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-white/5 space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">
                1. Aplicabilidade / Efetividade do SB
              </span>
              <div className="text-white space-y-1">
                <p>Modelos: <span className="text-indigo-300">{activeAnalysis.applicability.aircraftModel.join(', ') || 'Todos'}</span></p>
                {activeAnalysis.applicability.msnRange && (
                  <p>MSN: <span className="text-amber-300">{activeAnalysis.applicability.msnRange.raw || `${activeAnalysis.applicability.msnRange.from} a ${activeAnalysis.applicability.msnRange.to}`}</span></p>
                )}
                {activeAnalysis.applicability.configurationCriteria.length > 0 && (
                  <p>Configuração: <span className="text-slate-300">{activeAnalysis.applicability.configurationCriteria.join('; ')}</span></p>
                )}
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  {activeAnalysis.applicability.effectivityText}
                </p>
              </div>
            </div>

            {/* Box 2: Required Action */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-white/5 space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">
                2. Ação Técnica Mandatória do SB
              </span>
              <div className="text-white space-y-1">
                <p>{activeAnalysis.requiredAction.actionSummary}</p>
                {activeAnalysis.requiredAction.inspectionType && (
                  <p className="text-indigo-300">Tipo: {activeAnalysis.requiredAction.inspectionType}</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeAnalysis.requiredAction.modificationRequired && (
                    <span className="text-[9px] bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-300 font-bold">MOD REQUIRED</span>
                  )}
                  {activeAnalysis.requiredAction.replacementRequired && (
                    <span className="text-[9px] bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300 font-bold">REPLACEMENT</span>
                  )}
                  {activeAnalysis.requiredAction.terminatingAction && (
                    <span className="text-[9px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300 font-bold">TERMINATING ACTION</span>
                  )}
                </div>
              </div>
            </div>

            {/* Box 3: Compliance Thresholds */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-white/5 space-y-2">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">
                3. Limiares e Prazos do SB
              </span>
              <div className="text-white space-y-1">
                <p>Limiar Inicial: <span className="text-emerald-400">{activeAnalysis.complianceThreshold.threshold || 'Conforme AD'}</span></p>
                <p>Intervalo: <span className="text-indigo-300">{activeAnalysis.complianceThreshold.interval || 'N/A (One-time)'}</span></p>
                {activeAnalysis.complianceThreshold.calendarLimit && (
                  <p>Limite Calendárico: <span className="text-slate-300">{activeAnalysis.complianceThreshold.calendarLimit}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* 5. CROSS-VALIDATION MATRIX */}
          {activeCrossValidation && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Confronto Cruzado: AD ({activeCrossValidation.adNumber}) vs SB ({activeCrossValidation.sbNumber})</span>
                </h5>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  activeCrossValidation.overallStatus === 'CONSISTENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : activeCrossValidation.overallStatus === 'COMPLEMENTARY'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  STATUS: {activeCrossValidation.overallStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Dim 1: Applicability */}
                <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 space-y-1 text-xs font-mono">
                  <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block">Aplicabilidade</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Status:</span>
                    <span className={`text-[10px] font-bold ${activeCrossValidation.comparisons.applicability.status === 'CONSISTENT' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {activeCrossValidation.comparisons.applicability.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {activeCrossValidation.comparisons.applicability.details}
                  </p>
                </div>

                {/* Dim 2: Required Action */}
                <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 space-y-1 text-xs font-mono">
                  <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block">Ação Requerida</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Status:</span>
                    <span className={`text-[10px] font-bold ${activeCrossValidation.comparisons.requiredAction.status === 'CONSISTENT' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {activeCrossValidation.comparisons.requiredAction.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {activeCrossValidation.comparisons.requiredAction.details}
                  </p>
                </div>

                {/* Dim 3: Compliance Requirement */}
                <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 space-y-1 text-xs font-mono">
                  <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block">Limiares de Cumprimento</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Status:</span>
                    <span className={`text-[10px] font-bold ${activeCrossValidation.comparisons.complianceRequirement.status === 'CONSISTENT' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {activeCrossValidation.comparisons.complianceRequirement.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {activeCrossValidation.comparisons.complianceRequirement.details}
                  </p>
                </div>
              </div>

              {/* Consolidated CAMO Knowledge */}
              <div className="p-3 bg-indigo-950/30 rounded-lg border border-indigo-500/20 space-y-1 text-xs font-mono">
                <span className="text-[10px] uppercase font-sans font-bold text-indigo-300 block">
                  Conhecimento Técnico Consolidado pelo CAMO
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {activeCrossValidation.consolidatedTechnicalKnowledge.actionSummary}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: STORE NEW SERVICE BULLETIN DOCUMENT */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <span>Armazenar Documento de Boletim de Serviço (SB)</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStoreSb} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block uppercase font-bold mb-1">SB Number</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 737-53-1234"
                    value={sbNumberInput}
                    onChange={e => setSbNumberInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block uppercase font-bold mb-1">Revisão</label>
                  <input
                    type="text"
                    value={sbRevInput}
                    onChange={e => setSbRevInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block uppercase font-bold mb-1">Fabricante</label>
                  <input
                    type="text"
                    value={sbMfgInput}
                    onChange={e => setSbMfgInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block uppercase font-bold mb-1">
                  Conteúdo Técnico Textual do SB (Preservação com Hash SHA-256)
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Cole aqui o texto completo ou seções de Planning Information / Effectivity / Accomplishment Instructions do Boletim de Serviço..."
                  value={sbContentInput}
                  onChange={e => setSbContentInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                >
                  Armazenar e Gerar Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
