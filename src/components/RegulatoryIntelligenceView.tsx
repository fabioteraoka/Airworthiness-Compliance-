import { useState, useEffect, useMemo } from 'react';
import { DatabaseState } from '../../server/dataStore';
import { 
  RegulatoryAdCandidate, 
  DiscoveredRegulatoryAd,
  FleetRegulatoryIntakeResult,
  AircraftConfigurationAssessment,
  ParameterEvaluationItem,
  OperationalMissingItem,
  ProgressiveApplicabilityState,
  IssuingAuthority,
  RegulatoryDiscoveryDiagnostic
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
  ChevronRight,
  ChevronLeft,
  Terminal,
  Copy,
  Globe,
  FileCheck2,
  Download,
  Filter
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
  const [activeTab, setActiveTab] = useState<'discovery' | 'assessment' | 'diagnostics'>('discovery');

  // =========================================================================
  // 1. DISCOVERY & INTAKE STATE (Phase 9 — Etapa 5.2 Flow)
  // =========================================================================
  const [manufacturer, setManufacturer] = useState<string>('Boeing');
  const [family, setFamily] = useState<string>('737');
  const [model, setModel] = useState<string>('737-800');
  const [engine, setEngine] = useState<string>('CFM56-7B');
  const [authority, setAuthority] = useState<IssuingAuthority | 'ALL'>('ALL');
  const [searchContext, setSearchContext] = useState<string>('Boeing 737-800');

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<FleetRegulatoryIntakeResult | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState<boolean>(false);
  
  // Feedback Banner for Import
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    importedCount?: number;
    pendingCount?: number;
  } | null>(null);

  // Pagination for Discovery Table
  const [discoveryPage, setDiscoveryPage] = useState<number>(1);
  const [discoveryPageSize, setDiscoveryPageSize] = useState<number>(25);

  // Quick Fleet Presets
  const FLEET_PRESETS = [
    { label: 'Boeing 737-800 (NG)', manufacturer: 'Boeing', family: '737', model: '737-800', engine: 'CFM56-7B', query: 'Boeing 737-800' },
    { label: 'Airbus A320ceo', manufacturer: 'Airbus', family: 'A320', model: 'A320-200', engine: 'CFM56-5B4', query: 'Airbus A320' },
    { label: 'Airbus A320neo', manufacturer: 'Airbus', family: 'A320', model: 'A320-271N', engine: 'PW1100G', query: 'Airbus A320neo' },
    { label: 'Embraer E195-E2', manufacturer: 'Embraer', family: 'E-Jets', model: 'ERJ 190-400', engine: 'PW1900G', query: 'Embraer E195' },
    { label: 'ATR 72-600', manufacturer: 'ATR', family: 'ATR', model: 'ATR 72-212A', engine: 'PW127M', query: 'ATR 72' }
  ];

  const handleApplyPreset = (preset: typeof FLEET_PRESETS[0]) => {
    setManufacturer(preset.manufacturer);
    setFamily(preset.family);
    setModel(preset.model);
    setEngine(preset.engine);
    setSearchContext(preset.query);
  };

  // Execute Search Across Authorities
  const handleSearchAuthorities = async () => {
    setIsSearching(true);
    setImportFeedback(null);
    setSelectedCandidateIds(new Set());
    setDiscoveryPage(1);

    try {
      const res = await fetch('/api/intel/fleet-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer,
          family,
          model,
          engine,
          authority,
          query: searchContext || `${manufacturer} ${model}`,
          autoPaginate: true,
          perPage: 100,
          maxPages: 100
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResult({
          candidates: data.candidates || [],
          totalCount: data.totalCount || 0,
          newCount: data.newCount || 0,
          unchangedCount: data.unchangedCount || 0,
          updatedCount: data.updatedCount || 0,
          supersededCount: data.supersededCount || 0,
          revokedCount: data.revokedCount || 0,
          reviewRequiredCount: data.reviewRequiredCount || 0,
          importedCount: data.importedCount || 0,
          notImportedCount: data.notImportedCount || 0,
          sourcesConsulted: data.sourcesConsulted || ['FAA', 'EASA', 'ANAC'],
          diagnostic: data.diagnostic
        });

        if (data.state) {
          onRefreshState(data.state);
        }
      } else {
        const err = await res.json();
        setImportFeedback({
          type: 'error',
          message: `Falha ao buscar nas autoridades: ${err.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        message: `Erro na comunicação com a API: ${err.message}`
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Run initial search for Boeing 737-800 on mount if no results
  useEffect(() => {
    if (!searchResult) {
      handleSearchAuthorities();
    }
  }, []);

  // Selection handlers
  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!searchResult?.candidates) return;
    const allIds = searchResult.candidates.map(c => c.id);
    setSelectedCandidateIds(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedCandidateIds(new Set());
  };

  // Execute Import (All or Selected) to CAMO Register
  const handleImportToCamo = async (importAll: boolean) => {
    if (!searchResult?.candidates || searchResult.candidates.length === 0) return;

    const candidatesToImport = importAll 
      ? searchResult.candidates 
      : searchResult.candidates.filter(c => selectedCandidateIds.has(c.id));

    if (candidatesToImport.length === 0) {
      setImportFeedback({
        type: 'info',
        message: 'Nenhuma diretriz selecionada para importação.'
      });
      return;
    }

    setIsImporting(true);
    setImportFeedback(null);

    try {
      const res = await fetch('/api/intel/register/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: candidatesToImport,
          searchParams: {
            manufacturer,
            family,
            model,
            engine,
            authority
          },
          actor: state?.currentUser?.name || 'Chief CAMO Engineer'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onRefreshState(data.state);
        }

        const count = data.newCount || candidatesToImport.length;
        setImportFeedback({
          type: 'success',
          message: `✓ ${count} Diretrizes importadas com sucesso para o CAMO Regulatory Register como PENDING_ANALYSIS (0 analisadas automaticamente).`,
          importedCount: count,
          pendingCount: count
        });

        // Re-run search to update CAMO status badges
        await handleSearchAuthorities();
      } else {
        const err = await res.json();
        setImportFeedback({
          type: 'error',
          message: `Falha ao importar diretrizes: ${err.error || 'Erro no servidor'}`
        });
      }
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        message: `Erro na importação: ${err.message}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered and Paginated Discovery Candidates
  const allCandidates = searchResult?.candidates || [];
  const totalDiscoveryItems = allCandidates.length;
  const totalDiscoveryPages = Math.ceil(totalDiscoveryItems / discoveryPageSize) || 1;
  const paginatedCandidates = useMemo(() => {
    if (discoveryPageSize >= 99999) return allCandidates;
    const start = (discoveryPage - 1) * discoveryPageSize;
    return allCandidates.slice(start, start + discoveryPageSize);
  }, [allCandidates, discoveryPage, discoveryPageSize]);

  // Check if a candidate is in CAMO register
  const registerMap = useMemo(() => {
    const map = new Map<string, { id: string; status: string }>();
    (state?.camoRegulatoryRegister || []).forEach(r => {
      map.set(r.adNumber, { id: r.id, status: r.analysisStatus });
      if (r.canonicalAdId) map.set(r.canonicalAdId, { id: r.id, status: r.analysisStatus });
    });
    return map;
  }, [state?.camoRegulatoryRegister]);

  // Authority badge helper
  const renderAuthorityBadge = (auth: string) => {
    const a = (auth || 'FAA').toUpperCase();
    if (a.includes('FAA')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">FAA</span>;
    }
    if (a.includes('EASA')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">EASA</span>;
    }
    if (a.includes('ANAC')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ANAC</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">{a}</span>;
  };

  // =========================================================================
  // 2. CONFIGURATION ASSESSMENT STATE (Stage 4)
  // =========================================================================
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
    engine2Sn: '', // Intentionally blank to demonstrate missing data identification
    componentPn: '762300-1',
    componentSn: '', // Intentionally blank
    softwareVersion: '' // Intentionally blank
  });
  const [currentAssessment, setCurrentAssessment] = useState<AircraftConfigurationAssessment | null>(null);
  const [isAssessing, setIsAssessing] = useState<boolean>(false);
  const [resolvingItem, setResolvingItem] = useState<OperationalMissingItem | null>(null);
  const [resolutionValue, setResolutionValue] = useState<string>('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState<boolean>(false);

  // Set default fleet aircraft if available
  useEffect(() => {
    if (state?.aircraft && state.aircraft.length > 0 && !selectedFleetAircraftId) {
      setSelectedFleetAircraftId(state.aircraft[0].id);
    }
  }, [state?.aircraft]);

  const handleRunAssessment = async () => {
    setIsAssessing(true);
    try {
      let body: any = {};
      if (selectedAircraftMode === 'fleet') {
        body = { aircraftId: selectedFleetAircraftId, targetFamily: family };
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

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Inteligência & Lacunas</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-mono">
                  Descoberta Regulatória
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Ponto de origem para busca de Diretrizes de Aeronavegabilidade nas autoridades (FAA, EASA, ANAC) e importação para o CAMO.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'discovery'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>1. Descoberta de ADs</span>
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'assessment'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>2. Avaliação de Lacunas</span>
            {currentAssessment && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/30 text-emerald-300">
                {currentAssessment.completionPercentage}%
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'diagnostics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>3. Diagnóstico de Fontes</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DESCOBERTA DE ADS & BUSCA NAS AUTORIDADES (PRIMARY VIEW)           */}
      {/* ========================================================================= */}
      {activeTab === 'discovery' && (
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1">Frotas Rápidas:</span>
            {FLEET_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  handleApplyPreset(p);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  model === p.model 
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Inputs Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Fabricante */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Fabricante
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Ex: Boeing, Airbus"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Família */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Família
                </label>
                <input
                  type="text"
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  placeholder="Ex: 737, A320"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: 737-800, A320-200"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Motor */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Motor (Opcional)
                </label>
                <input
                  type="text"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  placeholder="Ex: CFM56-7B, LEAP"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Autoridade */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Autoridade
                </label>
                <select
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">Todas (FAA + EASA + ANAC)</option>
                  <option value="FAA">FAA (EUA)</option>
                  <option value="EASA">EASA (Europa)</option>
                  <option value="ANAC">ANAC (Brasil)</option>
                </select>
              </div>
            </div>

            {/* Context Query & Primary Search Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchContext}
                  onChange={(e) => setSearchContext(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAuthorities()}
                  placeholder="Contexto adicional ou palavras-chave (Ex: Boeing 737-800 wing spar inspection)..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <button
                onClick={handleSearchAuthorities}
                disabled={isSearching}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 shrink-0"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Consultando Autoridades...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>BUSCAR ADs NAS AUTORIDADES</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Banner (Import / Error / Success) */}
          {importFeedback && (
            <div className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm border shadow-lg ${
              importFeedback.type === 'success' 
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200' 
                : importFeedback.type === 'error'
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                : 'bg-blue-950/70 border-blue-500/50 text-blue-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {importFeedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {importFeedback.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
                {importFeedback.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
                <span className="font-medium">{importFeedback.message}</span>
              </div>

              {importFeedback.type === 'success' && onSelectView && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectView('analysis-phase')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Ir para Fase de Análise</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search Results Container */}
          {searchResult && (
            <div className="space-y-4">
              {/* Header Card: RESULTADO DA INTELIGÊNCIA REGULATÓRIA */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                      Resultado da Inteligência Regulatória
                    </span>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      Frota: {manufacturer} {model} {family ? `(${family})` : ''}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>Fontes consultadas: <strong>{searchResult.sourcesConsulted.join(', ')}</strong></span>
                      </span>
                      <span>•</span>
                      <span>Total encontradas: <strong className="text-white">{searchResult.totalCount}</strong></span>
                      <span>•</span>
                      <span>Não importadas: <strong className="text-amber-300">{searchResult.notImportedCount ?? 0}</strong></span>
                      <span>•</span>
                      <span>Já no CAMO: <strong className="text-emerald-300">{searchResult.importedCount ?? 0}</strong></span>
                    </div>
                  </div>

                  {/* Prominent Action Buttons: IMPORTAR TODAS / IMPORTAR SELECIONADAS */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Select / Deselect All */}
                    <button
                      onClick={selectedCandidateIds.size === searchResult.candidates.length ? handleClearSelection : handleSelectAll}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                    >
                      {selectedCandidateIds.size === searchResult.candidates.length ? 'Desmarcar Todas' : '☑ Selecionar Todas'}
                    </button>

                    {/* Import Selected */}
                    {selectedCandidateIds.size > 0 && (
                      <button
                        onClick={() => handleImportToCamo(false)}
                        disabled={isImporting}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        <span>Importar {selectedCandidateIds.size} Selecionadas</span>
                      </button>
                    )}

                    {/* IMPORTAR TODAS PARA O CAMO (Highlighted primary action) */}
                    <button
                      onClick={() => handleImportToCamo(true)}
                      disabled={isImporting || searchResult.candidates.length === 0}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Importando para o CAMO...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>📥 IMPORTAR TODAS ({searchResult.candidates.length}) PARA O CAMO</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Discovered ADs Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Diretrizes Encontradas</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {totalDiscoveryItems} registros
                    </span>
                  </div>

                  {/* Page Size */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Exibir:</span>
                    <select
                      value={discoveryPageSize}
                      onChange={(e) => {
                        setDiscoveryPageSize(Number(e.target.value));
                        setDiscoveryPage(1);
                      }}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                      <option value={99999}>Todas ({totalDiscoveryItems})</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.size > 0 && selectedCandidateIds.size === searchResult.candidates.length}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectAll();
                              else handleClearSelection();
                            }}
                            className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4">Diretriz (AD)</th>
                        <th className="py-3 px-3">Autoridade</th>
                        <th className="py-3 px-4">Título Oficial & Escopo</th>
                        <th className="py-3 px-3">Modelo</th>
                        <th className="py-3 px-3">ATA</th>
                        <th className="py-3 px-3">Data</th>
                        <th className="py-3 px-4 text-right">Situação CAMO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {paginatedCandidates.map(cand => {
                        const isSelected = selectedCandidateIds.has(cand.id);
                        const camoRecord = registerMap.get(cand.adNumber) || (cand.canonicalAdId ? registerMap.get(cand.canonicalAdId) : undefined);
                        const isInCamo = !!camoRecord || cand.inRegister;
                        const camoStatus = camoRecord?.status || (isInCamo ? 'PENDING_ANALYSIS' : null);

                        return (
                          <tr
                            key={cand.id}
                            className={`hover:bg-slate-800/40 transition ${
                              isSelected ? 'bg-blue-950/20' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleCandidate(cand.id)}
                                className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            {/* AD Number */}
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-white text-sm">
                                {cand.adNumber}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {cand.canonicalAdId || cand.id}
                              </div>
                            </td>

                            {/* Authority */}
                            <td className="py-3 px-3">
                              {renderAuthorityBadge(cand.authority)}
                            </td>

                            {/* Title */}
                            <td className="py-3 px-4 max-w-md">
                              <p className="text-slate-200 font-medium line-clamp-2" title={cand.title}>
                                {cand.title}
                              </p>
                              {cand.rawApplicabilityText && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {cand.rawApplicabilityText}
                                </p>
                              )}
                            </td>

                            {/* Aircraft Model */}
                            <td className="py-3 px-3 text-slate-300 font-medium whitespace-nowrap">
                              {cand.modelScope && cand.modelScope.length > 0 
                                ? cand.modelScope.slice(0, 2).join(', ') 
                                : model}
                            </td>

                            {/* ATA */}
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {cand.ataChapter ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                                  {cand.ataChapter}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                              {cand.effectiveDate || cand.issueDate || '—'}
                            </td>

                            {/* Situação CAMO */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isInCamo ? (
                                <div className="inline-flex items-center gap-1.5">
                                  {camoStatus === 'ANALYZED' ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      NO CAMO: ANALISADA
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                      NO CAMO: PENDENTE
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                    NÃO IMPORTADA
                                  </span>
                                  <button
                                    onClick={() => {
                                      setSelectedCandidateIds(new Set([cand.id]));
                                      handleImportToCamo(false);
                                    }}
                                    disabled={isImporting}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded text-[11px] font-semibold transition"
                                  >
                                    Importar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {totalDiscoveryItems > 0 && discoveryPageSize < 99999 && (
                  <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
                    <div>
                      Mostrando <span className="font-semibold text-white">{Math.min(totalDiscoveryItems, (discoveryPage - 1) * discoveryPageSize + 1)}</span> a{' '}
                      <span className="font-semibold text-white">{Math.min(totalDiscoveryItems, discoveryPage * discoveryPageSize)}</span> de{' '}
                      <span className="font-semibold text-white">{totalDiscoveryItems}</span> diretrizes
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDiscoveryPage(p => Math.max(1, p - 1))}
                        disabled={discoveryPage === 1}
                        className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="px-3 py-1 text-xs font-mono font-medium text-slate-300">
                        Página {discoveryPage} de {totalDiscoveryPages}
                      </div>

                      <button
                        onClick={() => setDiscoveryPage(p => Math.min(totalDiscoveryPages, p + 1))}
                        disabled={discoveryPage === totalDiscoveryPages}
                        className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONFIGURATION ASSESSMENT & MISSING DATA (STAGE 4)                  */}
      {/* ========================================================================= */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Avaliação de Lacunas de Configuração</h3>
                <p className="text-xs text-slate-400">
                  Avalia se a aeronave possui todos os parâmetros requeridos (MSN, motores, Part Numbers) pelas Diretrizes do CAMO.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunAssessment}
                  disabled={isAssessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAssessing ? 'animate-spin' : ''}`} />
                  <span>Executar Avaliação</span>
                </button>
              </div>
            </div>

            {/* Aircraft Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Aeronave da Frota</label>
                <select
                  value={selectedFleetAircraftId}
                  onChange={(e) => setSelectedFleetAircraftId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 focus:outline-none"
                >
                  {(state?.aircraft || []).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.registration} — {a.model} (MSN {a.msn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status da Configuração</label>
                <div className="p-2 bg-slate-800 rounded-lg text-xs text-slate-300 font-mono">
                  {currentAssessment ? `${currentAssessment.completionPercentage}% Completo` : 'Não avaliado'}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lacunas Identificadas</label>
                <div className="p-2 bg-slate-800 rounded-lg text-xs text-amber-400 font-mono">
                  {currentAssessment?.missingItems?.length || 0} parâmetro(s) pendente(s)
                </div>
              </div>
            </div>
          </div>

          {/* Missing Items List & In-place Resolver */}
          {currentAssessment && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h4 className="text-sm font-bold text-white">Parâmetros de Configuração Requeridos</h4>
              
              {currentAssessment.missingItems && currentAssessment.missingItems.length > 0 ? (
                <div className="space-y-2">
                  {currentAssessment.missingItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-white">{item.parameterLabel || item.parameterKey}</span>
                        <p className="text-slate-400 text-[11px] mt-0.5">{item.impactDescription}</p>
                      </div>

                      <button
                        onClick={() => {
                          setResolvingItem(item);
                          setResolutionValue('');
                        }}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-xs font-semibold transition"
                      >
                        Informar Dado
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
                  ✓ Todos os dados de configuração da aeronave estão completos para as diretrizes avaliadas.
                </div>
              )}
            </div>
          )}

          {/* In-Place Resolver Modal */}
          {resolvingItem && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white">Informar Parâmetro de Configuração</h4>
                  <button onClick={() => setResolvingItem(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Parâmetro: <strong>{resolvingItem.parameterLabel || resolvingItem.parameterKey}</strong></label>
                    <input
                      type="text"
                      value={resolutionValue}
                      onChange={(e) => setResolutionValue(e.target.value)}
                      placeholder="Insira o valor homologado (ex: número de série, P/N)..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setResolvingItem(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResolveMissing}
                    disabled={isSubmittingResolution || !resolutionValue.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs transition disabled:opacity-50"
                  >
                    Salvar & Reavaliar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIAGNÓSTICO DE FONTES & CONECTORES (STAGE 4.1)                     */}
      {/* ========================================================================= */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-white">Diagnóstico das Conexões Oficiais</h3>
            <p className="text-xs text-slate-400">
              Relatório em tempo real de latência, status de conectores e telemetria de requisições às autoridades.
            </p>

          {searchResult?.diagnostic ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['FAA', 'EASA', 'ANAC'] as const).map((source) => {
                  const item = searchResult.diagnostic.authorities[source];
                  return (
                    <div key={source} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>{source}</span>
                        <span className="text-slate-400">{item.finalCandidates} filtradas</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.rawRetrieved} recebidas · {item.pagesScanned || 0} páginas
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{item.notes}</p>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                O total da FAA é o inventário retornado pela API antes do filtro da frota. EASA e ANAC permanecem limitadas aos repositórios curados configurados até que conectores de inventário ao vivo sejam habilitados.
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify(searchResult.diagnostic, null, 2)}</pre>
              </div>
            </>
          ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800">
                Execute uma busca na aba 1 para gerar o diagnóstico em tempo real das APIs da FAA, EASA e ANAC.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
