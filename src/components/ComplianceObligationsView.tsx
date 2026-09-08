import { useState } from 'react';
import { 
  Calculator, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  Activity, 
  ShieldAlert, 
  Hash, 
  Check, 
  Eye, 
  Layers, 
  Code,
  Zap,
  HelpCircle,
  FileCheck2,
  Lock
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { 
  ComplianceObligation, 
  DueDateCalculationResult, 
  ObligationStatus 
} from '../types';

interface ComplianceObligationsViewProps {
  state: DatabaseState | null;
  onRefreshState: (newState: DatabaseState) => void;
  onSelectAd?: (adId: string) => void;
}

export default function ComplianceObligationsView({
  state,
  onRefreshState,
  onSelectAd
}: ComplianceObligationsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [aircraftFilter, setAircraftFilter] = useState<string>('ALL');
  const [selectedObligation, setSelectedObligation] = useState<ComplianceObligation | null>(null);
  const [detailedCalculation, setDetailedCalculation] = useState<DueDateCalculationResult | null>(null);
  const [isLoadingCalculation, setIsLoadingCalculation] = useState(false);
  const [isEvaluatingFleet, setIsEvaluatingFleet] = useState(false);
  const [isSyncingFleet, setIsSyncingFleet] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Standalone Sandbox State
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxText, setSandboxText] = useState('Within 500 flight hours or 12 months after the effective date, whichever occurs first');
  const [sandboxParsed, setSandboxParsed] = useState<any>(null);
  const [sandboxEvaluating, setSandboxEvaluating] = useState(false);

  // Human Review Decision State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'APPROVE_COMPLIANCE' | 'REJECT' | 'REQUEST_MORE_EVIDENCE' | 'OVERRIDE_STATUS'>('APPROVE_COMPLIANCE');
  const [reviewNewStatus, setReviewNewStatus] = useState<ObligationStatus>('OPEN');
  const [reviewJustification, setReviewJustification] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const obligations = state?.complianceObligations || [];
  const aircraftList = state?.aircraft || [];

  // Metrics
  const totalCount = obligations.length;
  const overdueCount = obligations.filter(o => o.status === 'OVERDUE' || o.temporalCounters?.isOverdue).length;
  const dueSoonCount = obligations.filter(o => o.status === 'DUE_SOON' || o.temporalCounters?.isDueSoon).length;
  const reviewRequiredCount = obligations.filter(o => o.status === 'REVIEW_REQUIRED').length;
  const compliedCount = obligations.filter(o => o.status === 'COMPLIED').length;
  const openCount = obligations.filter(o => o.status === 'OPEN' || o.status === 'NEXT_CYCLE_OPEN').length;

  // Filtered list
  const filteredObligations = obligations.filter(o => {
    const targetId = o.targetEntityId || o.targetEntity?.entityId || o.targetEntity?.aircraftId;
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (aircraftFilter !== 'ALL' && targetId !== aircraftFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const docNum = o.documentNumber || o.adNumber || '';
      const targetLabel = o.targetEntityLabel || o.targetEntity?.aircraftRegistration || o.targetEntity?.entityId || '';
      const actionTitle = o.mandatedActionTitle || o.adTitle || o.actionDescription || '';
      const reasonings = Array.isArray(o.applicabilityReasoning) ? o.applicabilityReasoning.join(' ') : '';
      
      const matchDoc = docNum.toLowerCase().includes(q);
      const matchReg = targetLabel.toLowerCase().includes(q);
      const matchAction = actionTitle.toLowerCase().includes(q);
      const matchReason = reasonings.toLowerCase().includes(q);
      if (!matchDoc && !matchReg && !matchAction && !matchReason) return false;
    }
    return true;
  });

  // Evaluate All Fleet Obligations
  const handleEvaluateFleet = async () => {
    setIsEvaluatingFleet(true);
    try {
      const res = await fetch('/api/compliance-obligations/evaluate-fleet', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setSyncFeedback(`Avaliação de limites concluída: ${data.evaluation.transitionsExecuted} transições de ciclo executadas.`);
      }
    } catch (err) {
      console.error('Evaluate fleet error:', err);
    } finally {
      setIsEvaluatingFleet(false);
    }
  };

  // Sync Obligations from Fleet
  const handleSyncFleet = async () => {
    setIsSyncingFleet(true);
    try {
      const res = await fetch('/api/compliance-obligations/sync-from-fleet', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setSyncFeedback(`Sincronização com a frota concluída: ${data.synchronizedCount} obrigações processadas.`);
      }
    } catch (err) {
      console.error('Sync fleet error:', err);
    } finally {
      setIsSyncingFleet(false);
    }
  };

  // Fetch detailed calculation for selected obligation
  const handleInspectObligation = async (obl: ComplianceObligation) => {
    setSelectedObligation(obl);
    setIsLoadingCalculation(true);
    try {
      const res = await fetch(`/api/compliance-obligations/${obl.id}/calculate-due`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDetailedCalculation(data.calculation);
      }
    } catch (err) {
      console.error('Calculate due error:', err);
    } finally {
      setIsLoadingCalculation(false);
    }
  };

  // Parse natural language AD requirement in sandbox
  const handleParseAdText = async () => {
    if (!sandboxText.trim()) return;
    setSandboxEvaluating(true);
    try {
      const res = await fetch('/api/due-date-engine/parse-ad-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sandboxText })
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxParsed(data);
      }
    } catch (err) {
      console.error('Parse AD text error:', err);
    } finally {
      setSandboxEvaluating(false);
    }
  };

  // Submit human review decision
  const handleSubmitReview = async () => {
    if (!selectedObligation || !reviewJustification.trim()) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/compliance-obligations/${selectedObligation.id}/human-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          newStatus: reviewNewStatus,
          justification: reviewJustification
        })
      });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setSelectedObligation(data.obligation);
        setShowReviewModal(false);
        setReviewJustification('');
      }
    } catch (err) {
      console.error('Submit review error:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Status color helper
  const getStatusBadge = (status: ObligationStatus) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>OVERDUE</span>
          </span>
        );
      case 'DUE_SOON':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>DUE SOON</span>
          </span>
        );
      case 'OPEN':
      case 'NEXT_CYCLE_OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>{status === 'NEXT_CYCLE_OPEN' ? 'NEXT CYCLE' : 'OPEN'}</span>
          </span>
        );
      case 'COMPLIED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>COMPLIED</span>
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            <span>REVIEW REQUIRED</span>
          </span>
        );
      case 'NOT_YET_EFFECTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>NOT YET EFFECTIVE</span>
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>SUPERSEDED</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono">
              CAMO FASE 6.1 & 6.2
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-mono">
              Release 6.2.0 Operational
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Due Date & Threshold Engine</span>
            <Calculator className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Motor determinístico e auditável de cálculo de limites temporais de aeronavegabilidade (FH, FC, Dias de Calendário, 
            Data Efetiva, Ações Repetitivas e Ações Terminatórias) com operadores de composição regulatória.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowSandboxModal(true)}
            className="flex items-center space-x-1.5 text-xs bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 font-bold px-3.5 py-2 rounded-xl transition font-mono shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>AD Parser Sandbox</span>
          </button>

          <button
            onClick={handleSyncFleet}
            disabled={isSyncingFleet}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl transition font-mono disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncingFleet ? 'animate-spin' : ''}`} />
            <span>{isSyncingFleet ? 'Syncing...' : 'Sync Fleet'}</span>
          </button>

          <button
            onClick={handleEvaluateFleet}
            disabled={isEvaluatingFleet}
            className="flex items-center space-x-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition font-mono border border-indigo-400/40 disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${isEvaluatingFleet ? 'animate-spin' : ''}`} />
            <span>{isEvaluatingFleet ? 'Evaluating Limits...' : 'Recalculate All Limits'}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3.5 bg-indigo-950/80 border border-indigo-500/50 rounded-xl flex items-center justify-between text-xs text-indigo-200 font-mono animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Obligations</span>
          <span className="text-2xl font-black text-white font-mono mt-1 block">{totalCount}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Instâncias na frota</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-950/20">
          <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            <span>Overdue (Atraso)</span>
          </span>
          <span className="text-2xl font-black text-rose-300 font-mono mt-1 block">{overdueCount}</span>
          <span className="text-[10px] text-rose-400 mt-1 block">Impede aeronavegabilidade</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/20">
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Due Soon (Alerta)</span>
          </span>
          <span className="text-2xl font-black text-amber-300 font-mono mt-1 block">{dueSoonCount}</span>
          <span className="text-[10px] text-amber-400 mt-1 block">Janela operacional ativa</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Open / In Progress</span>
          <span className="text-2xl font-black text-indigo-300 font-mono mt-1 block">{openCount}</span>
          <span className="text-[10px] text-indigo-400 mt-1 block">Dentro do prazo regulatório</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-purple-500/30 bg-purple-950/20">
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            <span>Review Required</span>
          </span>
          <span className="text-2xl font-black text-purple-300 font-mono mt-1 block">{reviewRequiredCount}</span>
          <span className="text-[10px] text-purple-400 mt-1 block">Dados faltantes / Anomalias</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Complied</span>
          </span>
          <span className="text-2xl font-black text-emerald-300 font-mono mt-1 block">{compliedCount}</span>
          <span className="text-[10px] text-emerald-400 mt-1 block">Cumpridas com evidência</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar obrigação por número da AD, prefixo da aeronave, ação mandatória..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="ALL">All Status ({obligations.length})</option>
              <option value="OVERDUE">OVERDUE ({overdueCount})</option>
              <option value="DUE_SOON">DUE SOON ({dueSoonCount})</option>
              <option value="OPEN">OPEN ({openCount})</option>
              <option value="REVIEW_REQUIRED">REVIEW REQUIRED ({reviewRequiredCount})</option>
              <option value="COMPLIED">COMPLIED ({compliedCount})</option>
              <option value="NOT_YET_EFFECTIVE">NOT YET EFFECTIVE</option>
              <option value="SUPERSEDED">SUPERSEDED</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">Fleet:</span>
            <select
              value={aircraftFilter}
              onChange={(e) => setAircraftFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="ALL">All Aircraft</option>
              {aircraftList.map(a => (
                <option key={a.id} value={a.id}>{a.registration} ({a.model})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Obligations Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Regulatory AD</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Controlling Limit</th>
                <th className="p-3.5">Next Due Limit</th>
                <th className="p-3.5">Remaining Margin</th>
                <th className="p-3.5">Type / Operator</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredObligations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <HelpCircle className="w-8 h-8 text-slate-500" />
                      <span className="text-sm">Nenhuma obrigação encontrada para os filtros selecionados.</span>
                      <span className="text-xs text-slate-400">
                        Clique em &quot;Sync Fleet&quot; acima para sincronizar automaticamente as obrigações a partir dos requisitos regulatórios e da frota.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredObligations.map((obl) => {
                  const counters = obl.temporalCounters || ({} as any);
                  const isOverdue = obl.status === 'OVERDUE' || counters.isOverdue;
                  const isDueSoon = obl.status === 'DUE_SOON' || counters.isDueSoon;

                  return (
                    <tr 
                      key={obl.id} 
                      className={`hover:bg-white/5 transition cursor-pointer ${
                        selectedObligation?.id === obl.id ? 'bg-indigo-950/40 border-l-2 border-indigo-400' : ''
                      }`}
                      onClick={() => handleInspectObligation(obl)}
                    >
                      <td className="p-3.5 whitespace-nowrap">
                        {getStatusBadge(obl.status)}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>{obl.documentNumber || obl.adNumber}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs font-sans">
                          {obl.mandatedActionTitle || obl.adTitle || obl.actionDescription || 'Airworthiness Directive'}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold text-indigo-300">
                          {obl.targetEntityLabel || obl.targetEntity?.aircraftRegistration || obl.targetEntity?.entityId}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {obl.targetEntityType || obl.targetEntity?.entityType}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {counters.controllingLimit ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            counters.controllingLimit === 'CALENDAR_DAYS' ? 'bg-blue-950 text-blue-300 border-blue-700/50' :
                            counters.controllingLimit === 'FLIGHT_HOURS' ? 'bg-amber-950 text-amber-300 border-amber-700/50' :
                            counters.controllingLimit === 'FLIGHT_CYCLES' ? 'bg-purple-950 text-purple-300 border-purple-700/50' :
                            counters.controllingLimit === 'TERMINATED' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {counters.controllingLimit}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">N/A</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {counters.nextDueDate && (
                          <div className="text-slate-200">
                            <span className="text-[10px] text-slate-400 block font-sans">Data:</span>
                            <span className="font-bold">{counters.nextDueDate}</span>
                          </div>
                        )}
                        {counters.nextDueFH !== undefined && (
                          <div className="text-slate-200">
                            <span className="text-[10px] text-slate-400 block font-sans">Horas:</span>
                            <span className="font-bold">{counters.nextDueFH} FH</span>
                          </div>
                        )}
                        {counters.nextDueFC !== undefined && (
                          <div className="text-slate-200">
                            <span className="text-[10px] text-slate-400 block font-sans">Ciclos:</span>
                            <span className="font-bold">{counters.nextDueFC} FC</span>
                          </div>
                        )}
                        {!counters.nextDueDate && counters.nextDueFH === undefined && counters.nextDueFC === undefined && (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {counters.remainingDays !== undefined && (
                          <span className={`block font-bold ${
                            isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-slate-300'
                          }`}>
                            {counters.remainingDays >= 0 ? `${counters.remainingDays} dias` : `${Math.abs(counters.remainingDays)} dias atrasado`}
                          </span>
                        )}
                        {counters.remainingFH !== undefined && (
                          <span className={`block text-[11px] ${
                            counters.remainingFH < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {counters.remainingFH} FH margem
                          </span>
                        )}
                        {counters.remainingFC !== undefined && (
                          <span className={`block text-[11px] ${
                            counters.remainingFC < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {counters.remainingFC} FC margem
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-slate-300 block">
                          {obl.threshold?.thresholdType || 'MANDATORY'}
                        </span>
                        <span className="text-[10px] text-indigo-400 block">
                          {obl.interval?.isRepetitive ? 'REPETITIVE' : 'TERMINATING'}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectObligation(obl);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-[11px] font-bold"
                          title="Inspecionar limites e cálculo determinístico"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          <span>Audit</span>
                        </button>

                        {onSelectAd && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAd(obl.complianceRequirementId);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
                            title="Ver detalhes do requisito de AD original"
                          >
                            <span>AD</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Obligation Detailed Calculation Drawer / Modal */}
      {selectedObligation && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/40 bg-slate-900/90 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono">
                  OBLIGATION AUDIT INSPECTOR
                </span>
                {getStatusBadge(selectedObligation.status)}
              </div>
              <h2 className="text-lg font-black text-white font-mono mt-1">
                {selectedObligation.documentNumber} — {selectedObligation.targetEntityLabel}
              </h2>
              <p className="text-xs text-slate-400">
                Ação Mandatória: {selectedObligation.mandatedActionTitle || 'Ação mandatória regulatória padrão'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {selectedObligation.status === 'REVIEW_REQUIRED' && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 shadow"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Human Review Gateway</span>
                </button>
              )}

              <button
                onClick={() => setSelectedObligation(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
              >
                Close Inspector
              </button>
            </div>
          </div>

          {isLoadingCalculation ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">
              <Activity className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
              <span>Calculando limites determinísticos através do Due Date Engine...</span>
            </div>
          ) : detailedCalculation ? (
            <div className="space-y-6">
              {/* Controlling Limit Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/10 bg-slate-950/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                    Controlling Parameter (Governante)
                  </span>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xl font-black text-indigo-300 font-mono">
                      {detailedCalculation.controllingLimit}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900 text-indigo-200 border border-indigo-700/40">
                      {detailedCalculation.composition.operator}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 font-sans">
                    {detailedCalculation.controllingReason}
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-white/10 bg-slate-950/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                    Temporal Reference Event
                  </span>
                  <div className="mt-2 text-sm font-bold text-white font-mono">
                    {detailedCalculation.reference.event}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono space-y-0.5">
                    {detailedCalculation.reference.referenceDate && (
                      <div>Data Ref: <span className="text-slate-200">{detailedCalculation.reference.referenceDate}</span></div>
                    )}
                    {detailedCalculation.reference.referenceFH !== undefined && (
                      <div>Horas Ref: <span className="text-slate-200">{detailedCalculation.reference.referenceFH} FH</span></div>
                    )}
                    {detailedCalculation.reference.referenceFC !== undefined && (
                      <div>Ciclos Ref: <span className="text-slate-200">{detailedCalculation.reference.referenceFC} FC</span></div>
                    )}
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-white/10 bg-slate-950/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                    Audit Verification & Cryptography
                  </span>
                  <div className="mt-2 text-xs font-mono space-y-1">
                    <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                      <Hash className="w-3.5 h-3.5" />
                      <span>HASH: {detailedCalculation.audit.calculationHash}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Calculado em: {detailedCalculation.audit.calculatedAt}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Motor: {detailedCalculation.audit.engineVersion}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Parameter Comparative Matrix */}
              <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                <div className="p-3 bg-slate-950/60 border-b border-white/10 font-mono text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>LIMITES COMPARADOS (COMPOSITION ALTERNATIVES)</span>
                  <span className="text-[10px] text-indigo-400 uppercase">Regra: {detailedCalculation.composition.operator}</span>
                </div>
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-[10px] text-slate-400 uppercase">
                      <th className="p-3">Dimensão</th>
                      <th className="p-3">Limite Mandatório</th>
                      <th className="p-3">Margem Restante</th>
                      <th className="p-3">Condição</th>
                      <th className="p-3">Governante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {/* Calendar row */}
                    {detailedCalculation.calendarLimit && (
                      <tr className={detailedCalculation.controllingLimit === 'CALENDAR_DAYS' ? 'bg-indigo-950/30' : ''}>
                        <td className="p-3 font-bold text-slate-200">Calendário</td>
                        <td className="p-3 text-slate-300">
                          {detailedCalculation.calendarLimit.dueDate} ({detailedCalculation.calendarLimit.limitValue} {detailedCalculation.calendarLimit.unit})
                        </td>
                        <td className="p-3 font-bold">
                          <span className={detailedCalculation.calendarLimit.isOverdue ? 'text-rose-400' : 'text-slate-300'}>
                            {detailedCalculation.calendarLimit.remainingDays} dias
                          </span>
                        </td>
                        <td className="p-3">
                          {detailedCalculation.calendarLimit.isOverdue ? (
                            <span className="text-rose-400 font-bold">OVERDUE</span>
                          ) : detailedCalculation.calendarLimit.isDueSoon ? (
                            <span className="text-amber-400 font-bold">DUE SOON</span>
                          ) : (
                            <span className="text-emerald-400">OK</span>
                          )}
                        </td>
                        <td className="p-3">
                          {detailedCalculation.controllingLimit === 'CALENDAR_DAYS' ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">SIM</span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">NÃO</span>
                          )}
                        </td>
                      </tr>
                    )}

                    {/* Flight Hours row */}
                    {detailedCalculation.flightHoursLimit && (
                      <tr className={detailedCalculation.controllingLimit === 'FLIGHT_HOURS' ? 'bg-indigo-950/30' : ''}>
                        <td className="p-3 font-bold text-slate-200">Horas de Voo (FH)</td>
                        <td className="p-3 text-slate-300">
                          {detailedCalculation.flightHoursLimit.dueFH} FH
                        </td>
                        <td className="p-3 font-bold">
                          <span className={detailedCalculation.flightHoursLimit.isOverdue ? 'text-rose-400' : 'text-slate-300'}>
                            {detailedCalculation.flightHoursLimit.remainingFH} FH
                          </span>
                        </td>
                        <td className="p-3">
                          {detailedCalculation.flightHoursLimit.isOverdue ? (
                            <span className="text-rose-400 font-bold">OVERDUE</span>
                          ) : detailedCalculation.flightHoursLimit.isDueSoon ? (
                            <span className="text-amber-400 font-bold">DUE SOON</span>
                          ) : (
                            <span className="text-emerald-400">OK</span>
                          )}
                        </td>
                        <td className="p-3">
                          {detailedCalculation.controllingLimit === 'FLIGHT_HOURS' ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">SIM</span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">NÃO</span>
                          )}
                        </td>
                      </tr>
                    )}

                    {/* Flight Cycles row */}
                    {detailedCalculation.flightCyclesLimit && (
                      <tr className={detailedCalculation.controllingLimit === 'FLIGHT_CYCLES' ? 'bg-indigo-950/30' : ''}>
                        <td className="p-3 font-bold text-slate-200">Ciclos de Voo (FC)</td>
                        <td className="p-3 text-slate-300">
                          {detailedCalculation.flightCyclesLimit.dueFC} FC
                        </td>
                        <td className="p-3 font-bold">
                          <span className={detailedCalculation.flightCyclesLimit.isOverdue ? 'text-rose-400' : 'text-slate-300'}>
                            {detailedCalculation.flightCyclesLimit.remainingFC} FC
                          </span>
                        </td>
                        <td className="p-3">
                          {detailedCalculation.flightCyclesLimit.isOverdue ? (
                            <span className="text-rose-400 font-bold">OVERDUE</span>
                          ) : detailedCalculation.flightCyclesLimit.isDueSoon ? (
                            <span className="text-amber-400 font-bold">DUE SOON</span>
                          ) : (
                            <span className="text-emerald-400">OK</span>
                          )}
                        </td>
                        <td className="p-3">
                          {detailedCalculation.controllingLimit === 'FLIGHT_CYCLES' ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">SIM</span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">NÃO</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Invariant Fail-Safe Alert if triggered */}
              {detailedCalculation.reviewRequired && (
                <div className="p-4 rounded-xl border border-purple-500/50 bg-purple-950/40 text-purple-200 text-xs font-mono space-y-1">
                  <div className="font-bold text-white flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>ALERTA DE SEGURANÇA DETERMINÍSTICA / INVARIANTE REGULATÓRIA</span>
                  </div>
                  <p>{detailedCalculation.reviewReason || 'Inconsistência identificada pelo motor de cálculo.'}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* AD TEXT PARSER SANDBOX MODAL */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/20 p-6 space-y-4 bg-slate-900 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  AD Compliance Text Parser Sandbox
                </h3>
              </div>
              <button
                onClick={() => setShowSandboxModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              Digite uma cláusula mandatória de AD regulatória (FAA ou EASA) para testar a interpretação e decomposição 
              sintática em thresholds, intervals e operadores de composição do Due Date Engine.
            </p>

            <div className="space-y-2">
              <textarea
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                placeholder="Exemplo: Within 500 flight hours or 12 months after the effective date, whichever occurs first"
              />

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSandboxText('Within 500 flight hours or 12 months after the effective date, whichever occurs first')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-indigo-300 font-mono"
                  >
                    Ex 1: Whichever First
                  </button>
                  <button
                    onClick={() => setSandboxText('Before accumulating 5,000 flight hours, and repeat every 500 FH thereafter')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-indigo-300 font-mono"
                  >
                    Ex 2: Repetitive FH
                  </button>
                  <button
                    onClick={() => setSandboxText('Prior to further flight')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-indigo-300 font-mono"
                  >
                    Ex 3: Zero Flight
                  </button>
                </div>

                <button
                  onClick={handleParseAdText}
                  disabled={sandboxEvaluating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${sandboxEvaluating ? 'animate-spin' : ''}`} />
                  <span>Parse Text</span>
                </button>
              </div>
            </div>

            {sandboxParsed && (
              <div className="p-4 bg-slate-950 rounded-xl border border-white/10 space-y-3 font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold border-b border-white/10 pb-1">
                  Parsed Output
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Composition Operator:</span>
                    <span className="font-bold text-indigo-300">{sandboxParsed.threshold?.compositionOperator || 'NONE'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Reference Event:</span>
                    <span className="font-bold text-slate-200">{sandboxParsed.threshold?.referenceEvent || 'EFFECTIVE_DATE'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Threshold FH:</span>
                    <span className="font-bold text-amber-300">{sandboxParsed.threshold?.fhLimit?.value ? `${sandboxParsed.threshold.fhLimit.value} FH` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Threshold Calendar:</span>
                    <span className="font-bold text-blue-300">
                      {sandboxParsed.threshold?.calendarLimit?.value 
                        ? `${sandboxParsed.threshold.calendarLimit.value} ${sandboxParsed.threshold.calendarLimit.unit}` 
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Is Repetitive:</span>
                    <span className="font-bold text-purple-300">{sandboxParsed.interval?.isRepetitive ? 'SIM' : 'NÃO'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Repetitive Interval:</span>
                    <span className="font-bold text-purple-300">
                      {sandboxParsed.interval?.fhInterval?.value ? `${sandboxParsed.interval.fhInterval.value} FH` : 
                       sandboxParsed.interval?.calendarInterval?.value ? `${sandboxParsed.interval.calendarInterval.value} ${sandboxParsed.interval.calendarInterval.unit}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HUMAN REVIEW GATEWAY MODAL */}
      {showReviewModal && selectedObligation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-purple-500/50 p-6 space-y-4 bg-slate-900 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  Human Review Gateway
                </h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-500/30 text-xs font-mono">
              <span className="font-bold text-purple-300 block">Obrigação: {selectedObligation.documentNumber}</span>
              <span className="text-slate-300 block">Aeronave: {selectedObligation.targetEntityLabel}</span>
              <span className="text-slate-400 block mt-1">Status atual: REVIEW_REQUIRED</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Decisão do Engenheiro CAMO:
                </label>
                <select
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="APPROVE_COMPLIANCE">Aprovar Cumprimento (APPROVE_COMPLIANCE)</option>
                  <option value="REJECT">Rejeitar Evidência / Manter Atraso (REJECT)</option>
                  <option value="REQUEST_MORE_EVIDENCE">Solicitar Evidência Adicional (REQUEST_MORE_EVIDENCE)</option>
                  <option value="OVERRIDE_STATUS">Ajustar Status Manualmente (OVERRIDE_STATUS)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Novo Status Após Decisão:
                </label>
                <select
                  value={reviewNewStatus}
                  onChange={(e) => setReviewNewStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="COMPLIED">COMPLIED</option>
                  <option value="DUE_SOON">DUE_SOON</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Justificativa Técnica Mandatória:
                </label>
                <textarea
                  value={reviewJustification}
                  onChange={(e) => setReviewJustification(e.target.value)}
                  rows={3}
                  placeholder="Descreva a fundamentação regulatória e técnica para a decisão humana no gateway..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewJustification.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <FileCheck2 className={`w-3.5 h-3.5 ${isSubmittingReview ? 'animate-spin' : ''}`} />
                <span>Registrar Decisão no Audit Trail</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
