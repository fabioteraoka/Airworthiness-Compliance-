import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RotateCcw, 
  ExternalLink, 
  Plane, 
  FileText, 
  BrainCircuit, 
  ShieldCheck, 
  Activity, 
  ArrowRight,
  Database,
  Cpu,
  Layers,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { CompliancePipelineExecution, PipelineStageKey, StageExecutionStatus } from '../types';

interface PipelineExecutionModalProps {
  execution: CompliancePipelineExecution | null;
  onClose: () => void;
  onRetry: (executionId: string, options?: { forceFreshDownload?: boolean; forceFullRun?: boolean }) => Promise<void>;
  onSelectAd?: (id: string) => void;
  isRetrying?: boolean;
}

export default function PipelineExecutionModal({
  execution,
  onClose,
  onRetry,
  onSelectAd,
  isRetrying = false
}: PipelineExecutionModalProps) {
  const [selectedStage, setSelectedStage] = useState<PipelineStageKey>('HUMAN_REVIEW_GATEWAY');

  if (!execution) return null;

  const stageOrder: PipelineStageKey[] = [
    'DISCOVERY',
    'FLEET_SCREENING',
    'OFFICIAL_ACQUISITION',
    'DOCUMENT_INTELLIGENCE',
    'REQUIREMENT_STRUCTURING',
    'CAMO_RULE_ENGINE',
    'FLEET_ASSESSMENT_CONSOLIDATION',
    'HUMAN_REVIEW_GATEWAY'
  ];

  const getStageIcon = (key: PipelineStageKey) => {
    switch (key) {
      case 'DISCOVERY': return <Activity className="w-4 h-4" />;
      case 'FLEET_SCREENING': return <Plane className="w-4 h-4" />;
      case 'OFFICIAL_ACQUISITION': return <Database className="w-4 h-4" />;
      case 'DOCUMENT_INTELLIGENCE': return <BrainCircuit className="w-4 h-4" />;
      case 'REQUIREMENT_STRUCTURING': return <Layers className="w-4 h-4" />;
      case 'CAMO_RULE_ENGINE': return <Cpu className="w-4 h-4" />;
      case 'FLEET_ASSESSMENT_CONSOLIDATION': return <FileCheck2 className="w-4 h-4" />;
      case 'HUMAN_REVIEW_GATEWAY': return <ShieldCheck className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: StageExecutionStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            SUCCESS
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            WARNING
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-mono font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            FAILED
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-white/10 rounded text-[10px] font-mono">
            SKIPPED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-mono font-bold animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3 animate-spin text-indigo-400" />
            RUNNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-900 text-slate-500 border border-white/5 rounded text-[10px] font-mono">
            PENDING
          </span>
        );
    }
  };

  const activeStageDetail = execution.stages[selectedStage] || execution.stages.HUMAN_REVIEW_GATEWAY;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                Phase 5.3 — End-to-End Pipeline Execution
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                execution.status === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : execution.status === 'COMPLETED_NO_MATCH'
                  ? 'bg-slate-800 text-slate-300 border border-white/20'
                  : execution.status === 'REVIEW_REQUIRED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : execution.status === 'RUNNING'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {execution.status}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span>{execution.adNumber || `FR Doc. ${execution.documentNumber}`}</span>
              <span className="text-xs text-slate-400 font-normal">({execution.authority} 14 CFR Part 39)</span>
            </h2>
            <p className="text-xs text-slate-400 line-clamp-1">
              {execution.title || 'Regulatory Airworthiness Directive'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRetry(execution.id, { forceFreshDownload: true, forceFullRun: true })}
              disabled={isRetrying || execution.status === 'RUNNING'}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shadow"
              title="Re-run entire pipeline with fresh download"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Retry Pipeline</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Execution Summary Bar */}
        <div className="bg-slate-950/80 px-5 py-3 border-b border-white/5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Triggered By</span>
            <span className="text-slate-200 font-bold">{execution.triggeredBy}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Started At</span>
            <span className="text-slate-200">{new Date(execution.startedAt).toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Duration</span>
            <span className="text-slate-200">{execution.durationMs ? `${(execution.durationMs / 1000).toFixed(2)}s` : 'In Progress...'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Fleet Applicability</span>
            <span className="text-slate-200">
              {execution.applicableCount !== undefined ? (
                <span>
                  <strong className="text-emerald-400">{execution.applicableCount} App</strong> / {' '}
                  <strong className="text-slate-400">{execution.notApplicableCount} N/A</strong> / {' '}
                  <strong className="text-amber-400">{execution.reviewRequiredCount} Rev</strong>
                </span>
              ) : (
                <span className="text-slate-500">N/A</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Human Review</span>
            <span className={execution.humanReviewRequired ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {execution.humanReviewRequired ? 'REQUIRED' : 'NO REVIEW NEEDED'}
            </span>
          </div>
        </div>

        {/* Content Body: Left = Stage Stepper, Right = Stage Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Stage Stepper List (5 cols) */}
          <div className="md:col-span-5 p-4 border-r border-white/10 overflow-y-auto space-y-2 bg-slate-950/30">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block px-1">
              8 Discrete Pipeline Stages
            </span>

            {stageOrder.map((stageKey, idx) => {
              const stage = execution.stages[stageKey];
              const isSelected = selectedStage === stageKey;

              return (
                <div
                  key={stageKey}
                  onClick={() => setSelectedStage(stageKey)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-md'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 border border-white/10">
                        {idx + 1}
                      </span>
                      <div className="text-slate-200">
                        {getStageIcon(stageKey)}
                      </div>
                      <span className="font-bold text-xs text-white font-mono truncate">
                        {stage?.stageName || stageKey}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(stage?.status || 'PENDING')}
                    </div>
                  </div>

                  {stage?.message && (
                    <p className="text-[11px] text-slate-400 font-mono mt-2 line-clamp-1 pl-7">
                      {stage.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stage Inspector Detail (7 cols) */}
          <div className="md:col-span-7 p-5 overflow-y-auto space-y-4 bg-slate-900/40">
            
            {/* Active Stage Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    Stage {stageOrder.indexOf(selectedStage) + 1} of 8
                  </span>
                  {getStatusBadge(activeStageDetail?.status || 'PENDING')}
                </div>
                <h3 className="text-base font-bold text-white font-mono mt-1 flex items-center gap-2">
                  {getStageIcon(selectedStage)}
                  <span>{activeStageDetail?.stageName}</span>
                </h3>
              </div>

              {activeStageDetail?.durationMs !== undefined && (
                <div className="text-right font-mono text-xs text-slate-400">
                  <span className="text-[10px] text-slate-500 block uppercase">Duration</span>
                  <span className="text-slate-200 font-bold">{activeStageDetail.durationMs}ms</span>
                </div>
              )}
            </div>

            {/* Stage Message */}
            {activeStageDetail?.message && (
              <div className={`p-3 rounded-xl border text-xs font-mono leading-relaxed ${
                activeStageDetail.status === 'SUCCESS'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : activeStageDetail.status === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  : activeStageDetail.status === 'FAILED'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-slate-950 border-white/10 text-slate-300'
              }`}>
                {activeStageDetail.message}
              </div>
            )}

            {/* Stage Specific Views */}
            {selectedStage === 'HUMAN_REVIEW_GATEWAY' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    CAMO Safety Invariant & Review Gateway Decision
                  </span>

                  {execution.humanReviewRequired ? (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-300 font-mono">
                        ⚠️ The pipeline identified technical ambiguities or open questions requiring human CAMO engineer sign-off:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300 font-mono">
                        {execution.humanReviewReasons.map((reason, rIdx) => (
                          <li key={rIdx} className="text-amber-200">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-300 font-mono">
                      ✓ Zero ambiguity detected across all fleet units. All models, serials, and maintenance records deterministically evaluated.
                    </p>
                  )}
                </div>

                {/* Direct Action Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {execution.complianceRequirementId && onSelectAd && (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectAd(execution.complianceRequirementId!);
                      }}
                      className="p-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-left transition flex items-center justify-between text-xs font-mono group"
                    >
                      <div>
                        <span className="font-bold text-white block">Open Structured AD</span>
                        <span className="text-[10px] text-indigo-300">Inspect technical actions & rules</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>
                  )}

                  {execution.faptId && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-left text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">FAPT Technical Report</span>
                        <span className="text-[10px] text-slate-400">ID: {execution.faptId}</span>
                      </div>
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stage Details JSON or Key-Value */}
            {activeStageDetail?.details && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Stage Output Parameters
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-48">
                  {JSON.stringify(activeStageDetail.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Audit Trail Log Stream */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Execution Audit Trail
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[10px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-white/5">
                {execution.auditTrail.map((log, lIdx) => (
                  <div key={lIdx} className="leading-relaxed text-slate-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs font-mono">
          <div className="text-slate-500">
            Execution ID: <span className="text-slate-300">{execution.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
