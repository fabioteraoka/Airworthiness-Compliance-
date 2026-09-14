import { useState, useMemo } from 'react';
import { 
  Plane, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Info, 
  Layers, 
  ShieldCheck, 
  Eye, 
  FileText,
  SlidersHorizontal,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ComplianceRequirement, Aircraft, ComplianceAssessment, ComplianceObligation } from '../types';
import FleetAdInventoryView from './FleetAdInventoryView';

interface FleetAdSearchViewProps {
  state: DatabaseState;
  onSelectAd: (id: string) => void;
  onSelectView: (view: string) => void;
  onRefreshState?: (newState: DatabaseState) => void;
}

export type ScopeSelectionType = 'ALL_FLEET' | 'FAMILY_GROUP' | 'INDIVIDUAL';
export type ComplianceStatusFilter = 'ALL' | 'APPLICABLE' | 'NOT_APPLICABLE' | 'COMPLIED' | 'PENDING' | 'REVIEW_REQUIRED';

// Helper to determine aircraft family cleanly
export const getAircraftFamily = (ac: Aircraft): string => {
  if (ac.series) return ac.series;
  if (ac.model.includes('737-8') && !ac.model.includes('800')) return 'B737-MAX';
  if (ac.model.includes('737')) return 'B737-NG';
  if (ac.model.includes('A320')) return 'A320';
  return ac.model;
};

// Helper to extract ATA chapter safely
export const getReqAta = (req: ComplianceRequirement): string | undefined => {
  return (req as any).ataChapter || ((req.applicabilityRule as any)?.rawRuleText?.match(/ATA\s*(\d+)/i)?.[0]);
};

export default function FleetAdSearchView({ 
  state, 
  onSelectAd, 
  onSelectView, 
  onRefreshState 
}: FleetAdSearchViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<'inventory' | 'physical-matrix'>('inventory');
  const [scopeType, setScopeType] = useState<ScopeSelectionType>('ALL_FLEET');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [ataFilter, setAtaFilter] = useState<string>('ALL');
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);

  const aircraftList = state.aircraft || [];
  const requirements = state.requirements || [];
  const assessments: ComplianceAssessment[] = (state.assessments as any[]) || [];
  const obligations: ComplianceObligation[] = (state.obligations as any[]) || [];

  // Extract unique aircraft families / models
  const aircraftFamilies = useMemo(() => {
    const families = new Set<string>();
    aircraftList.forEach(ac => {
      families.add(getAircraftFamily(ac));
    });
    return Array.from(families).sort();
  }, [aircraftList]);

  // Extract unique ATA chapters from requirements
  const ataChapters = useMemo(() => {
    const atas = new Set<string>();
    requirements.forEach(req => {
      const ata = getReqAta(req);
      if (ata) atas.add(ata);
    });
    return Array.from(atas).sort();
  }, [requirements]);

  // Determine active aircraft subset based on scope selection
  const targetAircraft = useMemo(() => {
    if (scopeType === 'ALL_FLEET') {
      return aircraftList;
    }
    if (scopeType === 'FAMILY_GROUP') {
      if (selectedFamily === 'ALL') return aircraftList;
      return aircraftList.filter(ac => 
        getAircraftFamily(ac) === selectedFamily || 
        ac.model.toLowerCase().includes(selectedFamily.toLowerCase())
      );
    }
    if (scopeType === 'INDIVIDUAL') {
      if (selectedAircraftId === 'ALL') return aircraftList;
      return aircraftList.filter(ac => ac.id === selectedAircraftId);
    }
    return aircraftList;
  }, [scopeType, selectedFamily, selectedAircraftId, aircraftList]);

  // Compute evaluation rows for each AD across target aircraft
  const evaluatedRows = useMemo(() => {
    const rows = requirements.map(req => {
      // Find assessments for target aircraft
      const targetAssessments = assessments.filter(
        a => a.complianceRequirementId === req.id && targetAircraft.some(ac => ac.id === a.entityId)
      );

      // Find obligations for target aircraft
      const targetObligations = obligations.filter(
        o => o.complianceRequirementId === req.id && targetAircraft.some(ac => ac.id === o.aircraftId)
      );

      // Evaluate aggregated status for the selected scope
      const hasApplicable = targetAssessments.some(a => a.result === 'APPLICABLE');
      const hasReviewRequired = targetAssessments.some(a => a.result === 'REVIEW_REQUIRED');
      const allNotApplicable = targetAssessments.length > 0 && targetAssessments.every(a => a.result === 'NOT_APPLICABLE');
      
      const isComplied = targetObligations.length > 0 && targetObligations.every(o => o.status === 'COMPLIED');
      const hasPending = targetObligations.some(o => o.status === 'OPEN' || o.status === 'OVERDUE' || o.status === 'DUE_SOON');

      let computedStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'COMPLIED' | 'PENDING' | 'REVIEW_REQUIRED' | 'EVALUATION_PENDING' = 'EVALUATION_PENDING';
      if (isComplied) {
        computedStatus = 'COMPLIED';
      } else if (hasPending) {
        computedStatus = 'PENDING';
      } else if (hasReviewRequired) {
        computedStatus = 'REVIEW_REQUIRED';
      } else if (hasApplicable) {
        computedStatus = 'APPLICABLE';
      } else if (allNotApplicable) {
        computedStatus = 'NOT_APPLICABLE';
      }

      // Aircraft breakdown details
      const aircraftBreakdown = targetAircraft.map(ac => {
        const assessment = assessments.find(a => a.complianceRequirementId === req.id && a.entityId === ac.id);
        const obl = obligations.find(o => o.complianceRequirementId === req.id && o.aircraftId === ac.id);
        return {
          aircraft: ac,
          assessment,
          obligation: obl,
          result: assessment?.result || 'PENDING',
          rationale: assessment?.reasoning?.join('; ') || (assessment?.result === 'APPLICABLE' ? 'Critérios de modelo/MSN atendidos' : 'Sem avaliação gravada'),
          obligationStatus: obl?.status
        };
      });

      return {
        requirement: req,
        computedStatus,
        targetAssessments,
        targetObligations,
        aircraftBreakdown
      };
    });

    // Filter by text search
    return rows.filter(row => {
      const req = row.requirement;
      const term = searchTerm.trim().toLowerCase();
      const reqAta = getReqAta(req);
      if (term) {
        const matchNumber = req.sourceNumber.toLowerCase().includes(term);
        const matchTitle = req.title.toLowerCase().includes(term);
        const matchAta = reqAta ? reqAta.toLowerCase().includes(term) : false;
        const matchAuthority = req.issuingAuthority.toLowerCase().includes(term);
        const matchModel = req.applicabilityRule?.aircraftModels?.some(m => m.toLowerCase().includes(term));
        const matchPn = req.applicabilityRule?.componentPartNumbers?.some(p => p.toLowerCase().includes(term));
        if (!matchNumber && !matchTitle && !matchAta && !matchAuthority && !matchModel && !matchPn) {
          return false;
        }
      }

      // Filter by ATA Chapter
      if (ataFilter !== 'ALL' && reqAta !== ataFilter) {
        return false;
      }

      // Filter by Compliance Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'APPLICABLE' && row.computedStatus !== 'APPLICABLE' && row.computedStatus !== 'PENDING' && row.computedStatus !== 'COMPLIED') {
          return false;
        }
        if (statusFilter === 'NOT_APPLICABLE' && row.computedStatus !== 'NOT_APPLICABLE') {
          return false;
        }
        if (statusFilter === 'COMPLIED' && row.computedStatus !== 'COMPLIED') {
          return false;
        }
        if (statusFilter === 'PENDING' && row.computedStatus !== 'PENDING') {
          return false;
        }
        if (statusFilter === 'REVIEW_REQUIRED' && row.computedStatus !== 'REVIEW_REQUIRED') {
          return false;
        }
      }

      return true;
    });
  }, [requirements, assessments, obligations, targetAircraft, searchTerm, ataFilter, statusFilter]);

  // Statistics for selected scope
  const stats = useMemo(() => {
    let applicable = 0;
    let notApplicable = 0;
    let complied = 0;
    let pending = 0;
    let reviewRequired = 0;

    evaluatedRows.forEach(r => {
      if (r.computedStatus === 'COMPLIED') complied++;
      else if (r.computedStatus === 'PENDING') pending++;
      else if (r.computedStatus === 'REVIEW_REQUIRED') reviewRequired++;
      else if (r.computedStatus === 'APPLICABLE') applicable++;
      else if (r.computedStatus === 'NOT_APPLICABLE') notApplicable++;
    });

    return {
      total: evaluatedRows.length,
      applicable,
      notApplicable,
      complied,
      pending,
      reviewRequired
    };
  }, [evaluatedRows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-200">
      {/* View Switcher: Inventário de ADs da Frota vs Matriz de Cumprimento Físico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
              activeMainTab === 'inventory'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Inventário de ADs da Frota</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              FASE 9.5.1
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('physical-matrix')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
              activeMainTab === 'physical-matrix'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Matriz de Cumprimento Físico (Aeronaves)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              FASE 9.3
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectView('camo-register')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CAMO Register</span>
          </button>
          <button
            onClick={() => onSelectView('obligations')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Prazos & Limites</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTÁRIO DE ADs DA FROTA (DESCOBERTA & INTAKE) */}
      {activeMainTab === 'inventory' && (
        <FleetAdInventoryView
          state={state}
          onSelectAd={onSelectAd}
          onSelectView={onSelectView}
          onRefreshState={onRefreshState}
        />
      )}

      {/* TAB 2: MATRIZ DE CUMPRIMENTO FÍSICO (AERONAVES) */}
      {activeMainTab === 'physical-matrix' && (
        <div className="space-y-6">
          {/* Top Title & Mission Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Matriz de Cumprimento Físico por Frota
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Fase 9 — Etapa 3
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Avaliação detalhada de requisitos de aeronavegabilidade aplicados a cada prefixo físico registrado na base.
                  </p>
                </div>
              </div>
            </div>
          </div>

      {/* Scope Selector Control Panel */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              Escopo de Avaliação
            </span>
            <p className="text-xs text-slate-400">
              Defina se a busca deve consultar toda a frota registrada, uma família de aeronaves ou um prefixo específico.
            </p>
          </div>

          {/* Scope Segmented Buttons */}
          <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setScopeType('ALL_FLEET')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scopeType === 'ALL_FLEET'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Toda a Frota ({aircraftList.length})
            </button>
            <button
              onClick={() => setScopeType('FAMILY_GROUP')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scopeType === 'FAMILY_GROUP'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Grupo / Família
            </button>
            <button
              onClick={() => setScopeType('INDIVIDUAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scopeType === 'INDIVIDUAL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Aeronave Individual
            </button>
          </div>
        </div>

        {/* Dynamic sub-filters for Scope */}
        {scopeType === 'FAMILY_GROUP' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
            <span className="text-xs text-slate-400 font-medium">Selecione a Família:</span>
            <button
              onClick={() => setSelectedFamily('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                selectedFamily === 'ALL'
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({aircraftList.length} aeronaves)
            </button>
            {aircraftFamilies.map(fam => {
              const count = aircraftList.filter(a => getAircraftFamily(a) === fam || a.model.includes(fam)).length;
              return (
                <button
                  key={fam}
                  onClick={() => setSelectedFamily(fam)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    selectedFamily === fam
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fam} ({count})
                </button>
              );
            })}
          </div>
        )}

        {scopeType === 'INDIVIDUAL' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
            <span className="text-xs text-slate-400 font-medium">Selecione a Aeronave:</span>
            <select
              value={selectedAircraftId}
              onChange={(e) => setSelectedAircraftId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">Selecione uma aeronave...</option>
              {aircraftList.map(ac => (
                <option key={ac.id} value={ac.id}>
                  {ac.registration} — {ac.model} (MSN {ac.msn})
                </option>
              ))}
            </select>

            {selectedAircraftId !== 'ALL' && (
              <div className="text-xs text-slate-400 flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                {(() => {
                  const sel = aircraftList.find(a => a.id === selectedAircraftId);
                  if (!sel) return null;
                  return (
                    <>
                      <span>Horas: <strong className="text-white">{sel.totalFlightHours || 0} FH</strong></span>
                      <span>•</span>
                      <span>Ciclos: <strong className="text-white">{sel.totalCycles || 0} FC</strong></span>
                      <span>•</span>
                      <span>Fabricação: <strong className="text-white">{sel.manufactureDate || 'N/A'}</strong></span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metric Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-800/80 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
              : 'bg-slate-900/40 border-white/10 hover:bg-slate-800/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total de ADs</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">no escopo ativo</div>
        </div>

        <div 
          onClick={() => setStatusFilter('APPLICABLE')}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === 'APPLICABLE'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
              : 'bg-slate-900/40 border-white/10 hover:bg-slate-800/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Aplicáveis</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{stats.applicable}</div>
          <div className="text-[10px] text-amber-500/70 mt-0.5">afetam o escopo</div>
        </div>

        <div 
          onClick={() => setStatusFilter('COMPLIED')}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === 'COMPLIED'
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
              : 'bg-slate-900/40 border-white/10 hover:bg-slate-800/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Cumpridas</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.complied}</div>
          <div className="text-[10px] text-emerald-500/70 mt-0.5">com evidência válida</div>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === 'PENDING'
              ? 'bg-blue-950/30 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
              : 'bg-slate-900/40 border-white/10 hover:bg-slate-800/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Pendentes</div>
          <div className="text-2xl font-bold text-blue-300 mt-1">{stats.pending}</div>
          <div className="text-[10px] text-blue-500/70 mt-0.5">em aberto / controle</div>
        </div>

        <div 
          onClick={() => setStatusFilter('NOT_APPLICABLE')}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === 'NOT_APPLICABLE'
              ? 'bg-slate-800/80 border-slate-500/50 shadow-md ring-1 ring-slate-500/30'
              : 'bg-slate-900/40 border-white/10 hover:bg-slate-800/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Não Aplicáveis</div>
          <div className="text-2xl font-bold text-slate-300 mt-1">{stats.notApplicable}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">fora da efetividade</div>
        </div>

        <div 
          onClick={() => setStatusFilter('REVIEW_REQUIRED')}
          className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
            statusFilter === 'REVIEW_REQUIRED'
              ? 'bg-rose-950/30 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
              : 'bg-slate-900/40 border-white/10 hover:bg-slate-800/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Review Required</div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{stats.reviewRequired}</div>
          <div className="text-[10px] text-rose-500/70 mt-0.5">revisão humana necessária</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número de AD, título, ATA chapter, modelo afetado ou P/N de componente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 text-slate-200 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ComplianceStatusFilter)}
              className="bg-transparent text-slate-300 font-medium focus:outline-none"
            >
              <option value="ALL">Status: Todos</option>
              <option value="APPLICABLE">Aplicáveis</option>
              <option value="NOT_APPLICABLE">Não Aplicáveis</option>
              <option value="COMPLIED">Cumpridas</option>
              <option value="PENDING">Pendentes</option>
              <option value="REVIEW_REQUIRED">Revisão Necessária</option>
            </select>
          </div>

          {/* ATA Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">ATA:</span>
            <select
              value={ataFilter}
              onChange={(e) => setAtaFilter(e.target.value)}
              className="bg-transparent text-slate-300 font-medium focus:outline-none"
            >
              <option value="ALL">Todos os Capítulos</option>
              {ataChapters.map(ata => (
                <option key={ata} value={ata}>ATA {ata}</option>
              ))}
            </select>
          </div>

          {(searchTerm || statusFilter !== 'ALL' || ataFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setAtaFilter('ALL');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <span>Resultados da Busca</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-semibold border border-slate-700">
              {evaluatedRows.length} ADs encontradas
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Escopo ativo: {targetAircraft.length} aeronave(s) considerada(s)
          </span>
        </div>

        {evaluatedRows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-3 bg-slate-800/40 rounded-full w-fit mx-auto border border-slate-700/60 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-300">Nenhuma diretriz localizada para os filtros selecionados</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tente alterar os termos de busca, o filtro de status ou expandir o escopo para toda a frota.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {evaluatedRows.map(({ requirement: req, computedStatus, aircraftBreakdown }) => {
              const isExpanded = expandedAdId === req.id;

              return (
                <div key={req.id} className="transition-colors hover:bg-white/[0.02]">
                  {/* Row Summary Header */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">
                          {req.sourceNumber}
                        </span>

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {req.issuingAuthority}
                        </span>

                        {req.ataChapter && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/40">
                            ATA {req.ataChapter}
                          </span>
                        )}

                        {/* Status Badge */}
                        {computedStatus === 'COMPLIED' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Cumprida
                          </span>
                        )}
                        {computedStatus === 'PENDING' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pendente / Aberta
                          </span>
                        )}
                        {computedStatus === 'APPLICABLE' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Aplicável
                          </span>
                        )}
                        {computedStatus === 'NOT_APPLICABLE' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Não Aplicável
                          </span>
                        )}
                        {computedStatus === 'REVIEW_REQUIRED' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            Revisão Técnica Necessária
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 line-clamp-1">
                        {req.title}
                      </div>

                      {/* Applicability criteria summary */}
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {req.applicabilityRule?.aircraftModels && req.applicabilityRule.aircraftModels.length > 0 && (
                          <span>
                            Modelos: <strong className="text-slate-300">{req.applicabilityRule.aircraftModels.join(', ')}</strong>
                          </span>
                        )}
                        {req.effectiveDate && (
                          <span>
                            Efetividade: <strong className="text-slate-300">{req.effectiveDate}</strong>
                          </span>
                        )}
                        {req.applicabilityRule?.componentPartNumbers && req.applicabilityRule.componentPartNumbers.length > 0 && (
                          <span>
                            P/Ns: <strong className="text-slate-300">{req.applicabilityRule.componentPartNumbers.join(', ')}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions and Toggle */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => onSelectAd(req.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                        title="Ver Detalhes Completos da AD"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        Detalhes da AD
                      </button>

                      <button
                        onClick={() => setExpandedAdId(isExpanded ? null : req.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                          isExpanded
                            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span>Frota ({aircraftBreakdown.length})</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown per Aircraft in the Scope */}
                  {isExpanded && (
                    <div className="bg-slate-950/60 p-4 border-t border-white/5 space-y-3">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Plane className="w-3.5 h-3.5 text-indigo-400" />
                        Status Individual por Aeronave do Escopo
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {aircraftBreakdown.map(({ aircraft: ac, result, rationale, obligationStatus }) => {
                          const isApp = result === 'APPLICABLE';
                          const isNotApp = result === 'NOT_APPLICABLE';
                          const isReview = result === 'REVIEW_REQUIRED';

                          return (
                            <div 
                              key={ac.id} 
                              className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <strong className="text-xs font-bold text-white tracking-wide">
                                    {ac.registration}
                                  </strong>
                                  <span className="text-[11px] text-slate-400">
                                    {ac.model} (MSN {ac.msn})
                                  </span>
                                </div>

                                {/* Status Tag */}
                                <div>
                                  {obligationStatus === 'COMPLIED' && (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                                      CUMPRIDA
                                    </span>
                                  )}
                                  {obligationStatus === 'OPEN' && (
                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                                      ABERTA
                                    </span>
                                  )}
                                  {obligationStatus === 'OVERDUE' && (
                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                                      ATRASADA
                                    </span>
                                  )}
                                  {!obligationStatus && isApp && (
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                                      APLICÁVEL
                                    </span>
                                  )}
                                  {!obligationStatus && isNotApp && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                      NÃO APLICÁVEL
                                    </span>
                                  )}
                                  {!obligationStatus && isReview && (
                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                                      REVISÃO EXIGIDA
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Rationale description */}
                              <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{rationale}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
