import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  RotateCw,
  X,
  ShieldCheck,
  FileCheck2,
  Database,
  Layers,
  Cpu,
  Plane,
  History,
  Copy,
  Check
} from 'lucide-react';
import { AnalysisCompletenessResult, AnalysisStepEvaluation } from '../types';

interface AnalysisCompletenessModalProps {
  recordId: string | null;
  adNumber?: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function AnalysisCompletenessModal({
  recordId,
  adNumber,
  isOpen,
  onClose,
  onRefresh
}: AnalysisCompletenessModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [completeness, setCompleteness] = useState<AnalysisCompletenessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchCompleteness = async () => {
    if (!recordId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intel/register/${encodeURIComponent(recordId)}/completeness`);
      const data = await res.json();
      if (res.ok && data.completeness) {
        setCompleteness(data.completeness);
      } else {
        setError(data.error || 'Falha ao carregar auditoria de completude da análise');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && recordId) {
      fetchCompleteness();
    } else {
      setCompleteness(null);
      setError(null);
    }
  }, [isOpen, recordId]);

  const handleRetry = async () => {
    if (!recordId) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/intel/register/${encodeURIComponent(recordId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'CAMO Technical Chief Engineer' })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCompleteness();
        if (onRefresh) onRefresh();
      } else {
        setError(data.error || 'Falha ao reanalisar registro');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com API de reanálise');
    } finally {
      setRetrying(false);
    }
  };

  const handleCopyReport = () => {
    if (!completeness) return;
    navigator.clipboard.writeText(JSON.stringify(completeness, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const getStepIcon = (key: string) => {
    switch (key) {
      case 'IDENTIFICATION':
        return <FileCheck2 className="w-4 h-4 text-blue-400" />;
      case 'DOCUMENT_RETRIEVAL':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'EXTRACTION_INTELLIGENCE':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'APPLICABILITY_STRUCTURING':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'MANDATED_ACTIONS':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'KNOWLEDGE_COMPILATION':
        return <Database className="w-4 h-4 text-cyan-400" />;
      case 'FLEET_EVALUATION':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'AUDIT_LINKAGE':
        return <History className="w-4 h-4 text-rose-400" />;
      default:
        return <FileCheck2 className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderStepStatusBadge = (status: AnalysisStepEvaluation['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            CONCLUÍDA
          </span>
        );
      case 'FAILED':
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            FALHA
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            REVISÃO REQUERIDA
          </span>
        );
      case 'INCOMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <AlertTriangle className="w-3 h-3" />
            INCOMPLETA
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3" />
            PENDENTE
          </span>
        );
    }
  };

  const renderOverallStatusBadge = () => {
    if (!completeness) return null;
    switch (completeness.effectiveStatus) {
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
            ANALISADA (100% Determinística)
          </span>
        );
      case 'ANALYSIS_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-4 h-4" />
            FALHA NA ANÁLISE TÉCNICA
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4" />
            REVISÃO DE ENGENHARIA OBRIGATÓRIA
          </span>
        );
      case 'ANALYSIS_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
            <RotateCw className="w-4 h-4 animate-spin" />
            ANÁLISE EM PROCESSAMENTO
          </span>
        );
      case 'PENDING_ANALYSIS':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-4 h-4" />
            PENDENTE DE ANÁLISE TÉCNICA
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Auditoria de Completude & Integridade Técnica
                </h2>
                {adNumber && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                    {adNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Validação determinística das 8 etapas obrigatórias segundo o regulamento aeronáutico RBAC 121 / EASA Part-M.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm font-medium">Executando auditoria técnica de completude...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Erro ao obter dados de integridade:</strong>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          ) : completeness ? (
            <>
              {/* Overall Status Banner */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Status Efetivo de Governança
                  </span>
                  <div>{renderOverallStatusBadge()}</div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Etapas Concluídas
                  </span>
                  <div className="font-mono text-sm font-bold text-white">
                    <span className={completeness.completedStepsCount === completeness.totalMandatorySteps ? 'text-emerald-400' : 'text-amber-400'}>
                      {completeness.completedStepsCount}
                    </span>{' '}
                    / {completeness.totalMandatorySteps}
                  </div>
                </div>
              </div>

              {/* Technical Summary */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                completeness.isComplete
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : completeness.effectiveStatus === 'REVIEW_REQUIRED'
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  {completeness.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  )}
                  <div>
                    <strong className="block font-semibold mb-0.5">Diagnóstico Técnico:</strong>
                    <span>{completeness.summary}</span>
                  </div>
                </div>
              </div>

              {/* Strict Gatekeeper Notice */}
              {!completeness.canTransitionToAnalyzed && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-300/90 flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white">Trava de Segurança CAMO Ativa:</strong> O status <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">ANALYZED</span> está terminantemente bloqueado pelo backend até que todas as 8 etapas obrigatórias atinjam resultado satisfatório.
                  </div>
                </div>
              )}

              {/* 8 Mandatory Steps Checklist */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Avaliação Detalhada das 8 Etapas Obrigatórias</span>
                  <span className="text-[10px] text-slate-500 font-mono lowercase">
                    avaliado em: {new Date(completeness.evaluatedAt).toLocaleTimeString('pt-BR')}
                  </span>
                </h3>

                <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                  {completeness.steps.map((step, idx) => (
                    <div key={step.stepKey} className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-800/20 transition">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5">
                          {getStepIcon(step.stepKey)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {idx + 1}. {step.stepName}
                            </span>
                            {step.isMandatory && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase font-mono">
                                Obrigatória
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-normal">
                            {step.message}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        {renderStepStatusBadge(step.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyReport}
            disabled={!completeness}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Diagnóstico JSON'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              Fechar
            </button>

            {completeness && (!completeness.isComplete || completeness.effectiveStatus !== 'ANALYZED') && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Reanalisando...' : 'Reanalisar / Tentar Novamente'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
