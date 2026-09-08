import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Plane, 
  FileText, 
  BrainCircuit, 
  Layers, 
  Cpu, 
  FileCheck2, 
  ShieldCheck, 
  Activity, 
  ArrowRight,
  Database,
  Radio,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  CompliancePipelineExecution, 
  BatchPipelineExecutionSummary, 
  PipelineStageKey,
  RegulatoryDiscoveryRecord,
  RegulatoryScreeningAssessment
} from '../types';

interface PipelineMonitoringTabProps {
  executions: CompliancePipelineExecution[];
  discoveries: RegulatoryDiscoveryRecord[];
  screenings: RegulatoryScreeningAssessment[];
  isExecutingPipeline: boolean;
  isBatchRunning: boolean;
  isScanning: boolean;
  batchSummary: BatchPipelineExecutionSummary | null;
  onExecuteDiscovery: (discovery: RegulatoryDiscoveryRecord) => Promise<void>;
  onBatchRun: (onlyMatches: boolean) => Promise<void>;
  onScanAndRun: () => Promise<void>;
  onInspectExecution: (execution: CompliancePipelineExecution) => void;
  onRetryExecution: (executionId: string) => Promise<void>;
  onSelectAd?: (id: string) => void;
  onRefreshAll: () => void;
}

export default function PipelineMonitoringTab({
  executions,
  discoveries,
  screenings,
  isExecutingPipeline,
  isBatchRunning,
  isScanning,
  batchSummary,
  onExecuteDiscovery,
  onBatchRun,
  onScanAndRun,
  onInspectExecution,
  onRetryExecution,
  onSelectAd,
  onRefreshAll
}: PipelineMonitoringTabProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'COMPLETED_NO_MATCH' | 'REVIEW_REQUIRED' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const completedCount = executions.filter(e => e.status === 'COMPLETED').length;
  const noMatchCount = executions.filter(e => e.status === 'COMPLETED_NO_MATCH').length;
  const reviewRequiredCount = executions.filter(e => e.status === 'REVIEW_REQUIRED').length;
  const failedCount = executions.filter(e => e.status === 'FAILED').length;
  const runningCount = executions.filter(e => e.status === 'RUNNING').length;

  const filteredExecutions = executions.filter(e => {
    if (filterStatus !== 'ALL') {
      if (e.status !== filterStatus) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchAd = e.adNumber?.toLowerCase().includes(q);
      const matchDoc = e.documentNumber.toLowerCase().includes(q);
      const matchTitle = e.title?.toLowerCase().includes(q);
      return matchAd || matchDoc || matchTitle;
    }
    return true;
  });

  const potentialMatchDiscoveries = discoveries.filter(d => {
    const sc = screenings.filter(a => a.discoveryRecordId === d.id || a.discoveryRecordId === d.documentNumber);
    return sc.some(a => a.result === 'POTENTIAL_MATCH' || a.result === 'INSUFFICIENT_METADATA');
  });

  return (
    <div className="space-y-6">
      
      {/* Visual Pipeline Architecture Banner (Phase 5.3) */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-slate-950/70 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Phase 5.3 — Automated End-to-End Regulatory Compliance Pipeline</span>
            </div>
            <h2 className="text-xl font-bold text-white font-mono mt-1">
              Deterministic Autonomous Compliance Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Chains Discovery, Fleet Screening, GovInfo Acquisition, AI Document Intelligence, Structured Requirement Extraction, CAMO Rule Engine V2, and FAPT Consolidation into an atomic idempotent workflow with strict safety invariants.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onScanAndRun}
              disabled={isScanning || isBatchRunning}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-950/50 disabled:opacity-50"
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
              <span>Scan & Run Pipeline</span>
            </button>

            <button
              onClick={() => onBatchRun(true)}
              disabled={isBatchRunning || potentialMatchDiscoveries.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/30"
              title={`Run on ${potentialMatchDiscoveries.length} discovery records with potential fleet matches`}
            >
              {isBatchRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>Batch Pipeline ({potentialMatchDiscoveries.length} Matches)</span>
            </button>
          </div>
        </div>

        {/* 8-Stage Architecture Flow Diagram */}
        <div className="pt-3 border-t border-white/10">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-3">
            Autonomous Pipeline Flow Diagram (8 Continuous Stages)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { id: '1', name: 'Discovery', icon: Activity, desc: 'Federal Register' },
              { id: '2', name: 'Screening', icon: Plane, desc: 'Fleet Family Match' },
              { id: '3', name: 'Acquisition', icon: Database, desc: 'GovInfo & SHA-256' },
              { id: '4', name: 'Intelligence', icon: BrainCircuit, desc: 'Dual Regex + AI' },
              { id: '5', name: 'Structuring', icon: Layers, desc: 'Strict Schema' },
              { id: '6', name: 'Rule Engine', icon: Cpu, desc: 'CAMO V2 Invariants' },
              { id: '7', name: 'FAPT Sync', icon: FileCheck2, desc: 'Fleet Assessment' },
              { id: '8', name: 'Review Gate', icon: ShieldCheck, desc: 'Safety Isolation' },
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div 
                  key={st.id} 
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-center space-y-1 relative group hover:border-indigo-500/50 transition"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-bold flex items-center justify-center">
                      {st.id}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-xs font-bold text-white font-mono truncate">{st.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono line-clamp-1">{st.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Batch Summary Notification (if just executed) */}
      {batchSummary && (
        <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 font-mono text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Batch Pipeline Execution Summary</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Total Duration: {(batchSummary.durationMs / 1000).toFixed(2)}s
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-300 text-[11px] pt-1 border-t border-indigo-500/20">
            <div>Requested: <strong className="text-white">{batchSummary.totalRequested}</strong></div>
            <div>Applicable: <strong className="text-emerald-400">{batchSummary.completedCount}</strong></div>
            <div>No Match: <strong className="text-slate-400">{batchSummary.completedNoMatchCount}</strong></div>
            <div>Review Required: <strong className="text-amber-400">{batchSummary.reviewRequiredCount}</strong></div>
            <div>Failed: <strong className="text-rose-400">{batchSummary.failedCount}</strong></div>
          </div>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl glass-panel border border-white/10 text-xs font-mono space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Total Executions</span>
          <div className="text-2xl font-bold text-white">{executions.length}</div>
          <span className="text-[10px] text-indigo-400">All recorded runs</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-emerald-500/30 text-xs font-mono space-y-1">
          <span className="text-emerald-400 text-[10px] uppercase">Applicable / Completed</span>
          <div className="text-2xl font-bold text-emerald-300">{completedCount}</div>
          <span className="text-[10px] text-emerald-400/80">Rules & FAPT Synced</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-white/10 text-xs font-mono space-y-1">
          <span className="text-slate-400 text-[10px] uppercase">Completed (No Match)</span>
          <div className="text-2xl font-bold text-slate-300">{noMatchCount}</div>
          <span className="text-[10px] text-slate-500">Short-circuited safely</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-amber-500/30 text-xs font-mono space-y-1">
          <span className="text-amber-400 text-[10px] uppercase">Review Required</span>
          <div className="text-2xl font-bold text-amber-300">{reviewRequiredCount}</div>
          <span className="text-[10px] text-amber-400/80">Safety Isolation Gate</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-rose-500/30 text-xs font-mono space-y-1">
          <span className="text-rose-400 text-[10px] uppercase">Failed</span>
          <div className="text-2xl font-bold text-rose-300">{failedCount}</div>
          <span className="text-[10px] text-rose-400/80">Logged & Retryable</span>
        </div>
      </div>

      {/* Pipeline Executions Table */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white font-mono uppercase tracking-wider">
              Execution History & Audit Records
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
              {filteredExecutions.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search executions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-500 w-48 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-white/10 text-xs font-mono">
              {(['ALL', 'COMPLETED', 'COMPLETED_NO_MATCH', 'REVIEW_REQUIRED', 'FAILED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded text-[11px] transition ${
                    filterStatus === st
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'COMPLETED' ? 'Completed' : st === 'COMPLETED_NO_MATCH' ? 'No Match' : st === 'REVIEW_REQUIRED' ? 'Review' : 'Failed'}
                </button>
              ))}
            </div>

            <button
              onClick={onRefreshAll}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Refresh executions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table / List */}
        {filteredExecutions.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 font-mono text-xs space-y-2">
            <Cpu className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No pipeline executions found matching your filter criteria.</p>
            <p className="text-[11px] text-slate-500">
              Trigger a single discovery execution from the Discovery Monitor or run a batch scan above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExecutions.map((exec) => {
              return (
                <div
                  key={exec.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {exec.adNumber || `FR Doc. ${exec.documentNumber}`}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exec.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : exec.status === 'COMPLETED_NO_MATCH'
                          ? 'bg-slate-800 text-slate-300 border border-white/20'
                          : exec.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : exec.status === 'RUNNING'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {exec.status}
                      </span>

                      <span className="px-1.5 py-0.2 bg-slate-800 text-indigo-300 rounded text-[10px]">
                        {exec.authority}
                      </span>

                      {exec.durationMs !== undefined && (
                        <span className="text-slate-500 text-[10px]">
                          {(exec.durationMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-1">
                      {exec.title || 'Regulatory Airworthiness Directive'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-1">
                      <span>Trigger: <strong className="text-slate-300">{exec.triggeredBy}</strong></span>
                      <span>Time: <strong className="text-slate-300">{new Date(exec.startedAt).toLocaleTimeString()}</strong></span>
                      {exec.applicableCount !== undefined && (
                        <span>
                          Impact: <strong className="text-emerald-400">{exec.applicableCount} App</strong> / <strong className="text-slate-400">{exec.notApplicableCount} N/A</strong> / <strong className="text-amber-400">{exec.reviewRequiredCount} Rev</strong>
                        </span>
                      )}
                      {exec.humanReviewRequired && (
                        <span className="text-amber-400 font-bold">
                          ⚠️ Human Review Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onInspectExecution(exec)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Inspect 8 Stages</span>
                    </button>

                    {(exec.status === 'FAILED' || exec.status === 'REVIEW_REQUIRED') && (
                      <button
                        onClick={() => onRetryExecution(exec.id)}
                        className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition border border-white/10"
                        title="Retry Pipeline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {exec.complianceRequirementId && onSelectAd && (
                      <button
                        onClick={() => onSelectAd(exec.complianceRequirementId!)}
                        className="p-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded-lg transition border border-indigo-500/30"
                        title="Open Structured AD"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
