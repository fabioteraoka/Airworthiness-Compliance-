import { useState, useEffect } from 'react';
import { DatabaseState } from '../../server/dataStore';
import { 
  RegulatoryAdCandidate, 
  RegulatoryKnowledgeItem, 
  AircraftConfigurationAssessment,
  ParameterEvaluationItem,
  OperationalMissingItem,
  ProgressiveApplicabilityState,
  Aircraft
} from '../types';
import { 
  Search, 
  Sparkles, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ShieldAlert, 
  Plane, 
  Cpu, 
  Layers, 
  Check, 
  Plus, 
  X, 
  RefreshCw, 
  ExternalLink,
  BookOpen,
  Info,
  Clock,
  ArrowRight,
  Database,
  Lock,
  ChevronRight
} from 'lucide-react';

interface RegulatoryIntelligenceViewProps {
  state: DatabaseState | null;
  onRefreshState: (state: DatabaseState) => void;
  onSelectAd?: (id: string) => void;
  onSelectView?: (view: string) => void;
}

export default function RegulatoryIntelligenceView({
  state,
  onRefreshState,
  onSelectAd,
  onSelectView
}: RegulatoryIntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<'candidates' | 'assessment' | 'knowledge'>('candidates');

  // Candidate Search State
  const [selectedFamily, setSelectedFamily] = useState<string>('A320');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedAuthority, setSelectedAuthority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [candidates, setCandidates] = useState<RegulatoryAdCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
  const [analyzingCandidateId, setAnalyzingCandidateId] = useState<string | null>(null);

  // Configuration Assessment State
  const [selectedAircraftMode, setSelectedAircraftMode] = useState<'fleet' | 'candidate'>('fleet');
  const [selectedFleetAircraftId, setSelectedFleetAircraftId] = useState<string>('');
  const [candidateAircraftForm, setCandidateAircraftForm] = useState({
    manufacturer: 'Airbus',
    family: 'A320',
    model: 'A320-214',
    msn: '5490',
    registration: 'PR-CAND',
    engineModel: 'CFM56-5B4/P',
    engine1Sn: '697412',
    engine2Sn: '', // Intentionally blank to demonstrate missing data identification!
    componentPn: '762300-1',
    componentSn: '', // Intentionally blank
    softwareVersion: '' // Intentionally blank
  });
  const [currentAssessment, setCurrentAssessment] = useState<AircraftConfigurationAssessment | null>(null);
  const [isAssessing, setIsAssessing] = useState<boolean>(false);

  // In-place Operational Resolution Modal
  const [resolvingItem, setResolvingItem] = useState<OperationalMissingItem | null>(null);
  const [resolutionValue, setResolutionValue] = useState<string>('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState<boolean>(false);

  // Candidate Details Drawer
  const [viewingCandidate, setViewingCandidate] = useState<RegulatoryAdCandidate | null>(null);

  // Load initial candidates & assessments
  const fetchCandidates = async (family: string, auth: string, query?: string) => {
    setIsLoadingCandidates(true);
    try {
      const url = `/api/intel/candidates?family=${encodeURIComponent(family)}&authority=${auth}&query=${encodeURIComponent(query || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        if (data.state) onRefreshState(data.state);
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    fetchCandidates(selectedFamily, selectedAuthority, searchQuery);
  }, [selectedFamily, selectedAuthority]);

  // Set default fleet aircraft if available
  useEffect(() => {
    if (state?.aircraft && state.aircraft.length > 0 && !selectedFleetAircraftId) {
      setSelectedFleetAircraftId(state.aircraft[0].id);
    }
  }, [state?.aircraft]);

  // Run initial assessment if aircraft selected
  useEffect(() => {
    if (selectedFleetAircraftId && state?.aircraft) {
      handleRunAssessment();
    }
  }, [selectedFleetAircraftId]);

  const handleRunAssessment = async () => {
    setIsAssessing(true);
    try {
      let body: any = {};
      if (selectedAircraftMode === 'fleet') {
        body = { aircraftId: selectedFleetAircraftId, targetFamily: selectedFamily };
      } else {
        body = {
          candidateAircraft: {
            manufacturer: candidateAircraftForm.manufacturer,
            family: candidateAircraftForm.family,
            model: candidateAircraftForm.model,
            msn: candidateAircraftForm.msn,
            registration: candidateAircraftForm.registration,
            engines: [
              { model: candidateAircraftForm.engineModel, serialNumber: candidateAircraftForm.engine1Sn, position: 'Pos 1' },
              { model: candidateAircraftForm.engineModel, serialNumber: candidateAircraftForm.engine2Sn, position: 'Pos 2' }
            ],
            components: [
              { partNumber: candidateAircraftForm.componentPn, serialNumber: candidateAircraftForm.componentSn, status: 'INSTALLED' }
            ],
            software: candidateAircraftForm.softwareVersion ? [
              { softwarePartNumber: '3945128215', softwareVersion: candidateAircraftForm.softwareVersion }
            ] : []
          },
          targetFamily: candidateAircraftForm.family
        };
      }

      const res = await fetch('/api/intel/assess-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentAssessment(data.assessment);
        if (data.state) onRefreshState(data.state);
      }
    } catch (err) {
      console.error('Assessment failed:', err);
    } finally {
      setIsAssessing(false);
    }
  };

  const handleAnalyzeCandidate = async (candidateId: string) => {
    setAnalyzingCandidateId(candidateId);
    try {
      const res = await fetch('/api/intel/candidates/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, actor: state?.currentUser?.name || 'Chief CAMO Engineer' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) onRefreshState(data.state);
        // Refresh local candidate list
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, analysisStatus: 'ANALYZED' } : c));
        // Re-run assessment to reflect new knowledge facts
        await handleRunAssessment();
      }
    } catch (err) {
      console.error('Failed to analyze candidate:', err);
    } finally {
      setAnalyzingCandidateId(null);
    }
  };

  const handleResolveMissing = async () => {
    if (!resolvingItem || !currentAssessment || !resolutionValue.trim()) return;
    setIsSubmittingResolution(true);
    try {
      const res = await fetch('/api/intel/resolve-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: currentAssessment.id,
          parameterKey: resolvingItem.parameterKey,
          resolvedValue: resolutionValue.trim(),
          actor: state?.currentUser?.name || 'Chief CAMO Engineer'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentAssessment(data.assessment);
        if (data.state) onRefreshState(data.state);
        setResolvingItem(null);
        setResolutionValue('');
      }
    } catch (err) {
      console.error('Failed to resolve missing data:', err);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const knowledgeItems = state?.regulatoryKnowledgeBase || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Operational Philosophy Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BrainCircuit className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Inteligência Regulatória & Avaliação de Aeronaves</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                  Fase 9 — Etapa 4
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Descoberta por família/modelo, base de conhecimento reutilizável e avaliação individual de conformidade física e técnica.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'candidates'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Candidatas Regulatórias
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'assessment'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>2. Avaliação de Configuração</span>
            {currentAssessment && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                currentAssessment.completionPercentage === 100 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
              }`}>
                {currentAssessment.completionPercentage}%
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'knowledge'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3. Base de Conhecimento</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
              {knowledgeItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* Core Architectural Rule Guardrail Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950/80 border border-indigo-500/20 text-xs text-slate-300 space-y-2">
        <div className="flex items-center space-x-2 text-indigo-300 font-semibold tracking-wide uppercase text-[11px]">
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>Princípio Arquitetural de Não-Contaminação (Regra CAMO Homologada)</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          <strong className="text-white">O conhecimento regulatório pode ser reutilizado</strong> por toda a família/modelo (regras de aplicabilidade, limites, ações mandatórias). Contudo, <strong className="text-white">a aplicabilidade, a obrigação, a evidência, o cumprimento e a condição de aeronavegabilidade pertencem estritamente à entidade individual</strong> (aeronave, motor ou componente) e nunca são herdados cegamente entre aeronaves.
        </p>
      </div>

      {/* TAB 1: REGULATORY CANDIDATES LIST */}
      {activeTab === 'candidates' && (
        <div className="space-y-5">
          {/* Filter Toolbar */}
          <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Family Selector */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                  Família da Aeronave
                </label>
                <select
                  value={selectedFamily}
                  onChange={(e) => setSelectedFamily(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="A320">Airbus A320 Family (A318 / A319 / A320 / A321)</option>
                  <option value="737">Boeing 737 Family (NG & MAX: 737-700/800/8/9)</option>
                  <option value="E-Jets">Embraer E-Jets Family (E170 / E175 / E190 / E195)</option>
                  <option value="ATR">ATR 42 / 72 Series</option>
                </select>
              </div>

              {/* Authority Filter */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                  Autoridade Emissora
                </label>
                <select
                  value={selectedAuthority}
                  onChange={(e) => setSelectedAuthority(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="ALL">Todas (FAA + EASA + ANAC)</option>
                  <option value="FAA">FAA (Federal Aviation Administration)</option>
                  <option value="EASA">EASA (European Union Aviation Safety)</option>
                  <option value="ANAC">ANAC (Agência Nacional de Aviação Civil)</option>
                </select>
              </div>

              {/* Search Query */}
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                  Filtro por Palavra-Chave / P/N / Sistema
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchCandidates(selectedFamily, selectedAuthority, searchQuery)}
                    placeholder="Ex: CFM56, actuator, ELAC, pushrod, P/N 762300..."
                    className="w-full bg-slate-800 border border-white/10 rounded-lg pl-9 pr-24 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    onClick={() => fetchCandidates(selectedFamily, selectedAuthority, searchQuery)}
                    className="absolute right-1.5 top-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded transition"
                  >
                    Filtrar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5 font-mono">
              <span>Candidatas Encontradas: <strong className="text-white">{candidates.length}</strong></span>
              <span className="text-[11px] text-slate-400">
                Fontes: Federal Register API (FAA), EASA Portal, ANAC SISAC
              </span>
            </div>
          </div>

          {/* Candidates Grid / List */}
          {isLoadingCandidates ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center space-y-3 bg-slate-900/40 rounded-xl border border-white/10">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm">Consultando repositórios regulatórios para a família {selectedFamily}...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-white/10">
              <p className="text-sm font-semibold text-white">Nenhuma diretriz candidata encontrada para este filtro.</p>
              <p className="text-xs text-slate-400 mt-1">Tente remover os termos de busca ou selecionar outra autoridade.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {candidates.map((cand) => {
                const isAnalyzed = cand.analysisStatus === 'ANALYZED';
                const isAnalyzing = analyzingCandidateId === cand.id;

                return (
                  <div
                    key={cand.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isAnalyzed 
                        ? 'bg-slate-900/70 border-emerald-500/20 hover:border-emerald-500/40' 
                        : 'bg-slate-900/50 border-white/10 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            cand.authority === 'FAA' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                            cand.authority === 'EASA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {cand.authority}
                          </span>
                          <span className="text-sm font-bold text-white font-mono">
                            {cand.adNumber}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/10">
                            Família: {cand.family}
                          </span>
                          {cand.operationalPriority === 'CRITICAL_URGENT' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                              URGENTE / EMERGENCY
                            </span>
                          )}
                          {isAnalyzed ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ANALISADA & NA BASE DE CONHECIMENTO</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/20 font-semibold">
                              CANDIDATA PENDENTE DE ANÁLISE
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-semibold text-slate-200">
                          {cand.title}
                        </h3>

                        <p className="text-[11px] text-slate-400 line-clamp-2 italic font-mono bg-slate-950/40 p-2 rounded border border-white/5">
                          "{cand.rawApplicabilityText}"
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-mono pt-1">
                          <span>Publicação: <strong className="text-slate-300">{cand.issueDate}</strong></span>
                          <span>Efetivação: <strong className="text-slate-300">{cand.effectiveDate}</strong></span>
                          <span>Modelos Afetados: <strong className="text-indigo-300">{cand.modelScope.join(', ')}</strong></span>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
                        {isAnalyzed ? (
                          <button
                            onClick={() => {
                              if (cand.analyzedRequirementId && onSelectAd) {
                                onSelectAd(cand.analyzedRequirementId);
                              } else {
                                setActiveTab('knowledge');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Ver na Base de Conhecimento</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyzeCandidate(cand.id)}
                            disabled={isAnalyzing}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Extraindo Parâmetros...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Analisar & Extrair Dados Requeridos</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setViewingCandidate(cand)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-white/10 flex items-center gap-1 transition"
                        >
                          <Info className="w-3 h-3" />
                          <span>Detalhes da Publicação</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INDIVIDUAL AIRCRAFT CONFIGURATION ASSESSMENT */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          {/* Target Aircraft Selection Card */}
          <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Plane className="w-4 h-4 text-indigo-400" />
                  <span>Seleção da Aeronave Alvo para Aferição</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Avalie uma aeronave da frota existente OU uma aeronave candidata em pré-compra / delivery.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => {
                    setSelectedAircraftMode('fleet');
                    setTimeout(() => handleRunAssessment(), 50);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    selectedAircraftMode === 'fleet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Aeronave da Frota Ativa
                </button>
                <button
                  onClick={() => {
                    setSelectedAircraftMode('candidate');
                    setTimeout(() => handleRunAssessment(), 50);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    selectedAircraftMode === 'candidate' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Candidata / Pré-Compra / Delivery
                </button>
              </div>
            </div>

            {/* Aircraft Selection Forms */}
            {selectedAircraftMode === 'fleet' ? (
              <div className="flex flex-col sm:flex-row items-end gap-3 pt-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                    Aeronave da Frota Cadastrada
                  </label>
                  <select
                    value={selectedFleetAircraftId}
                    onChange={(e) => setSelectedFleetAircraftId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(state?.aircraft || []).map((ac) => (
                      <option key={ac.id} value={ac.id}>
                        {ac.registration} • {ac.model} (MSN {ac.msn}) — Operador: {state?.operator.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRunAssessment}
                  disabled={isAssessing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAssessing ? 'animate-spin' : ''}`} />
                  <span>Reavaliar Configuração</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                      Família / Fabricante
                    </label>
                    <input
                      type="text"
                      value={`${candidateAircraftForm.manufacturer} (${candidateAircraftForm.family})`}
                      disabled
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                      Modelo Específico (Variant)
                    </label>
                    <input
                      type="text"
                      value={candidateAircraftForm.model}
                      onChange={(e) => setCandidateAircraftForm(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                      MSN (Serial Number)
                    </label>
                    <input
                      type="text"
                      value={candidateAircraftForm.msn}
                      onChange={(e) => setCandidateAircraftForm(prev => ({ ...prev, msn: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                      Matrícula Provisória
                    </label>
                    <input
                      type="text"
                      value={candidateAircraftForm.registration}
                      onChange={(e) => setCandidateAircraftForm(prev => ({ ...prev, registration: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                      Modelo dos Motores
                    </label>
                    <input
                      type="text"
                      value={candidateAircraftForm.engineModel}
                      onChange={(e) => setCandidateAircraftForm(prev => ({ ...prev, engineModel: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                      S/N Motor Pos 1
                    </label>
                    <input
                      type="text"
                      value={candidateAircraftForm.engine1Sn}
                      onChange={(e) => setCandidateAircraftForm(prev => ({ ...prev, engine1Sn: e.target.value }))}
                      placeholder="Ex: 697412"
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-rose-400 tracking-wider mb-1 block">
                      S/N Motor Pos 2 (Lacuna Intencional)
                    </label>
                    <input
                      type="text"
                      value={candidateAircraftForm.engine2Sn}
                      onChange={(e) => setCandidateAircraftForm(prev => ({ ...prev, engine2Sn: e.target.value }))}
                      placeholder="[Vazio para aferição de lacuna]"
                      className="w-full bg-slate-800 border border-rose-500/30 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleRunAssessment}
                    disabled={isAssessing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAssessing ? 'animate-spin' : ''}`} />
                    <span>Executar Aferição de Configuração</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Assessment Summary Metrics */}
          {currentAssessment && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Completeness Score */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Completude da Configuração
                </span>
                <div className="flex items-baseline gap-2 my-2">
                  <span className={`text-3xl font-black font-mono ${
                    currentAssessment.completionPercentage === 100 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {currentAssessment.completionPercentage}%
                  </span>
                  <span className="text-xs text-slate-400">
                    ({currentAssessment.satisfiedParametersCount} de {currentAssessment.totalParametersRequired} parâmetros)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      currentAssessment.completionPercentage === 100 ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${currentAssessment.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Missing Parameters */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Lacunas de Configuração (Missing)
                </span>
                <div className="my-2">
                  <span className={`text-3xl font-black font-mono ${
                    currentAssessment.missingParametersCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {currentAssessment.missingParametersCount}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {currentAssessment.missingParametersCount === 0 ? 'Nenhuma lacuna crítica pendente' : 'Impedem determinação definitiva'}
                </span>
              </div>

              {/* Progressive Applicability Breakdown */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/10 sm:col-span-2 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Desdobramento de Aplicabilidade Progressiva (5 Estados Estritos)
                </span>
                <div className="grid grid-cols-5 gap-1.5 my-2 text-center font-mono">
                  <div className="p-1.5 bg-indigo-950/40 border border-indigo-500/20 rounded">
                    <span className="text-base font-bold text-indigo-300 block">{currentAssessment.applicabilityBreakdown.potentiallyApplicable}</span>
                    <span className="text-[8px] text-slate-400 uppercase">Potencial</span>
                  </div>
                  <div className="p-1.5 bg-amber-950/40 border border-amber-500/20 rounded">
                    <span className="text-base font-bold text-amber-300 block">{currentAssessment.applicabilityBreakdown.insufficientData}</span>
                    <span className="text-[8px] text-slate-400 uppercase">Dados Insuf.</span>
                  </div>
                  <div className="p-1.5 bg-purple-950/40 border border-purple-500/20 rounded">
                    <span className="text-base font-bold text-purple-300 block">{currentAssessment.applicabilityBreakdown.reviewRequired}</span>
                    <span className="text-[8px] text-slate-400 uppercase">Revisão Req.</span>
                  </div>
                  <div className="p-1.5 bg-emerald-950/40 border border-emerald-500/20 rounded">
                    <span className="text-base font-bold text-emerald-300 block">{currentAssessment.applicabilityBreakdown.applicable}</span>
                    <span className="text-[8px] text-slate-400 uppercase">Aplicável</span>
                  </div>
                  <div className="p-1.5 bg-slate-800 border border-white/5 rounded">
                    <span className="text-base font-bold text-slate-400 block">{currentAssessment.applicabilityBreakdown.notApplicable}</span>
                    <span className="text-[8px] text-slate-500 uppercase">Não Aplicável</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Total de Diretrizes Avaliadas: {currentAssessment.applicabilityBreakdown.totalEvaluatedAds}</span>
                  <span className="text-amber-400 font-semibold text-[10px]">
                    *Dados Insuficientes ≠ Não Aplicável
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Operational Missing Items Checklist (Actionable by CAMO Engineer) */}
          {currentAssessment && currentAssessment.operationalMissingList.length > 0 && (
            <div className="p-5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Checklist Operacional de Dados Faltantes & Inconsistências</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                  {currentAssessment.operationalMissingList.filter(m => !m.resolved).length} Pendentes
                </span>
              </div>

              <div className="space-y-2.5">
                {currentAssessment.operationalMissingList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      item.resolved 
                        ? 'bg-slate-900/40 border-emerald-500/30' 
                        : 'bg-slate-900/80 border-rose-500/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase font-mono ${
                          item.category === 'AIRFRAME' ? 'bg-sky-500/20 text-sky-300' :
                          item.category === 'ENGINE' ? 'bg-amber-500/20 text-amber-300' :
                          item.category === 'COMPONENT' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.category}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {item.label}
                        </span>
                        {item.resolved && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            RESOLVIDO: {item.resolvedValue}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 font-mono">
                        Impacto Direto: Afeta <strong className="text-rose-300">{item.adImpactCount} ADs</strong> ({item.adReferences.join(', ')})
                      </p>

                      <p className="text-[10px] text-slate-400 italic">
                        Rastreabilidade: {item.traceabilityPath}
                      </p>
                    </div>

                    {!item.resolved && (
                      <button
                        onClick={() => {
                          setResolvingItem(item);
                          setResolutionValue('');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Informar Dado</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Parameters Evaluation Table */}
          {currentAssessment && (
            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Matriz de Avaliação Detalhada de Parâmetros de Configuração
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-slate-400 font-mono">
                      <th className="py-2 px-3">Parâmetro Requerido</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3">Status na Aeronave</th>
                      <th className="py-2 px-3">Valor Verificado</th>
                      <th className="py-2 px-3">Diretrizes Afetadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {currentAssessment.parameterEvaluations.map((param, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white">{param.label}</span>
                          <span className="block text-[9px] text-slate-400">{param.parameterKey}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {param.category}
                        </td>
                        <td className="py-2.5 px-3">
                          {param.evaluationStatus === 'AVAILABLE' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              <span>DISPONÍVEL</span>
                            </span>
                          ) : param.evaluationStatus === 'MISSING' ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              <X className="w-3 h-3" />
                              <span>FALTANTE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-purple-400 font-bold text-[10px] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>INCONSISTENTE</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {param.currentValue ? String(param.currentValue) : <span className="text-slate-400 italic">Pendente de inserção</span>}
                        </td>
                        <td className="py-2.5 px-3 text-indigo-300">
                          {param.requiredByAds.map(a => a.adNumber).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCUMULATED REGULATORY KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Base de Conhecimento Regulatório Consolidada</span>
              </h2>
              <p className="text-xs text-slate-400">
                Regras regulatórias, parâmetros extraídos e limites reutilizáveis por família/modelo.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
              {knowledgeItems.length} Itens de Conhecimento
            </span>
          </div>

          {knowledgeItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-white/10 space-y-2">
              <p className="text-sm font-semibold text-white">Nenhum item na base de conhecimento ainda.</p>
              <p className="text-xs text-slate-400">
                Vá até a aba <strong>1. Candidatas Regulatórias</strong> e clique em <strong>"Analisar & Extrair Dados Requeridos"</strong> em qualquer AD.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {knowledgeItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-900/70 border border-white/10 rounded-xl space-y-3 hover:border-indigo-500/30 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                        {item.authority}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {item.adNumber}
                      </span>
                      <span className="text-xs text-slate-400">
                        • Família: <strong className="text-slate-200">{item.family}</strong>
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Analisado em: {new Date(item.analyzedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-200">
                    {item.title}
                  </h4>

                  {/* Derived Configuration Requirements List */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Parâmetros de Configuração Exigidos para Aferição de Aeronave:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.requiredConfigurationData.map((p, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-200 font-mono"
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Threshold & Applicability Summary */}
                  <div className="p-2.5 bg-slate-950/40 rounded border border-white/5 text-[11px] font-mono text-slate-300 space-y-1">
                    <div>
                      <span className="text-slate-400">Threshold de Cumprimento: </span>
                      <span className="text-emerald-300 font-semibold">{item.complianceThresholdSummary}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Resumo de Aplicabilidade: </span>
                      <span className="text-slate-200">{item.applicabilityRuleSummary}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Operational Missing Parameter Resolution */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Resolver Lacuna de Configuração</span>
              </h3>
              <button
                onClick={() => setResolvingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-white/10 text-xs space-y-1 font-mono">
              <div className="text-slate-400">Parâmetro: <strong className="text-white">{resolvingItem.label}</strong></div>
              <div className="text-slate-400">Categoria: <strong className="text-indigo-300">{resolvingItem.category}</strong></div>
              <div className="text-slate-400">ADs Impactadas: <strong className="text-rose-300">{resolvingItem.adImpactCount}</strong> ({resolvingItem.adReferences.join(', ')})</div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">
                Valor Informado (Número de Série / P/N / Versão)
              </label>
              <input
                type="text"
                value={resolutionValue}
                onChange={(e) => setResolutionValue(e.target.value)}
                placeholder="Ex: 697413 (S/N Motor) ou 762300-1 ou v2.1"
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolveMissing}
                disabled={!resolutionValue.trim() || isSubmittingResolution}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {isSubmittingResolution ? 'Salvando...' : 'Confirmar & Reavaliar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Candidate Details Drawer */}
      {viewingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                  {viewingCandidate.authority}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {viewingCandidate.adNumber}
                </h3>
              </div>
              <button
                onClick={() => setViewingCandidate(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Título Oficial</span>
                <p className="text-slate-200 font-semibold">{viewingCandidate.title}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Texto de Aplicabilidade (Original)</span>
                <p className="p-3 bg-slate-950 rounded-lg border border-white/10 font-mono text-[11px] text-slate-300 leading-relaxed">
                  {viewingCandidate.rawApplicabilityText}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded border border-white/5">
                <div>Fabricante: <strong className="text-slate-200">{viewingCandidate.manufacturer}</strong></div>
                <div>Família: <strong className="text-slate-200">{viewingCandidate.family}</strong></div>
                <div>Data de Publicação: <strong className="text-slate-200">{viewingCandidate.issueDate}</strong></div>
                <div>Data Efetiva: <strong className="text-slate-200">{viewingCandidate.effectiveDate}</strong></div>
                {viewingCandidate.docketNumber && (
                  <div className="col-span-2">Docket: <strong className="text-slate-200">{viewingCandidate.docketNumber}</strong></div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              {viewingCandidate.sourceUrl ? (
                <a
                  href={viewingCandidate.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 font-mono"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Publicação no Portal Oficial ({viewingCandidate.authority})</span>
                </a>
              ) : <span />}

              <button
                onClick={() => setViewingCandidate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
