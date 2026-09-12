import { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  ArrowLeft, 
  RotateCw, 
  BrainCircuit, 
  UserCheck, 
  Printer, 
  History, 
  ChevronRight, 
  Layers, 
  FileCheck2,
  Calendar,
  Clock,
  Sparkles,
  Paperclip,
  Check,
  Send,
  Download,
  AlertTriangle,
  Trash2,
  Activity,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ComplianceRequirement, UserQuestion } from '../types';
import FullTechnicalReportModal from './FullTechnicalReportModal';
import DeleteAdConfirmationModal from './DeleteAdConfirmationModal';
import ExtractionDiagnosticsModal from './ExtractionDiagnosticsModal';

interface AdDetailViewProps {
  requirementId: string;
  state: DatabaseState;
  onBack: () => void;
  onRefreshState: (newState: DatabaseState) => void;
}

export default function AdDetailView({ requirementId, state, onBack, onRefreshState }: AdDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'document' | 'questions' | 'fapt' | 'evidence' | 'audit'>('matrix');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRetryingExtraction, setIsRetryingExtraction] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showFullReportModal, setShowFullReportModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  // Question answering form state
  const [selectedQuestion, setSelectedQuestion] = useState<UserQuestion | null>(null);
  const [answerChoice, setAnswerChoice] = useState<'YES' | 'NO' | 'UNKNOWN'>('YES');
  const [componentSerial, setComponentSerial] = useState('456789');
  const [componentPosition, setComponentPosition] = useState('Elevator Tab Control Rod');
  const [documentRef, setDocumentRef] = useState('Form 8130-3 ARC / Tech Log Pg. 402');
  const [evidenceNotes, setEvidenceNotes] = useState('Verified via physical logbook inspection and MRO records.');

  const requirement = state.requirements.find(r => r.id === requirementId);
  const assessments = state.assessments.filter(a => a.complianceRequirementId === requirementId);
  const questions = state.questions.filter(q => q.complianceRequirementId === requirementId);
  const pendingQuestions = questions.filter(q => q.status === 'PENDING');
  const fapt = state.fapts.find(f => f.complianceRequirementId === requirementId);
  const auditLogs = state.auditTrail.filter(a => a.entityId === requirementId || assessments.some(ass => ass.id === a.entityId));

  if (!requirement) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-400">Compliance Requirement not found.</p>
        <button onClick={onBack} className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-xs font-mono">
          Return to list
        </button>
      </div>
    );
  }

  const handleRetryExtraction = async () => {
    setIsRetryingExtraction(true);
    setRetryFeedback(null);
    try {
      const res = await fetch(`/api/requirements/${requirement.id}/retry-extraction`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to re-extract directive');
      }
      const data = await res.json();
      if (data.state) {
        onRefreshState(data.state);
      }
      setRetryFeedback('Extraction retry successfully completed.');
    } catch (err: any) {
      console.error('Retry extraction error:', err);
      setRetryFeedback(`Retry failed: ${err.message}`);
    } finally {
      setIsRetryingExtraction(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch(`/api/requirements/${requirement.id}/recalculate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
      }
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAnswerSubmit = async (q: UserQuestion) => {
    setIsAnswering(true);
    try {
      const isInstalled = answerChoice === 'YES';
      const payload = {
        answer: answerChoice === 'YES' 
          ? `YES - Installed on ${q.targetEntity.label} (S/N ${componentSerial})`
          : answerChoice === 'NO'
          ? `NO - Verified NOT installed on ${q.targetEntity.label}`
          : 'UNKNOWN - Further physical NDT verification required',
        answerData: {
          installed: isInstalled,
          partNumber: q.partNumberInQuestion,
          serialNumber: isInstalled ? componentSerial : undefined,
          position: componentPosition,
          aircraftId: q.targetEntity.id,
          evidenceNotes,
          documentRef
        },
        evidenceDescription: evidenceNotes,
        documentReference: documentRef
      };

      const res = await fetch(`/api/questions/${q.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setSelectedQuestion(null);
        setActiveTab('matrix');
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleApproveAssessment = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: 'CAMO Chief Engineer Airworthiness Authorization' })
      });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
      }
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const handleSignFapt = async () => {
    if (!fapt) return;
    try {
      const res = await fetch(`/api/fapt/${fapt.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', comments: 'Formally approved per CAMO RBAC 121 / EASA Part-M regulations.' })
      });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
      }
    } catch (err) {
      console.error('Sign FAPT error:', err);
    }
  };

  const hasReviewRequired = assessments.some(a => a.result === 'REVIEW_REQUIRED');
  const applicableCount = assessments.filter(a => a.result === 'APPLICABLE').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg glass-panel hover:bg-white/10 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono">
                {requirement.issuingAuthority} AD
              </span>
              <h1 className="text-xl font-black text-white font-mono">
                {requirement.sourceNumber}
              </h1>
              {requirement.emergencyAd && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                  Emergency AD
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl truncate">
              {requirement.title}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDiagnosticsModal(true)}
            className="flex items-center space-x-2 text-xs bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 font-bold px-3.5 py-2 rounded-lg shadow transition uppercase tracking-wider font-mono"
            title="View 9-Stage Extraction Pipeline Diagnostics"
          >
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Diagnostics</span>
          </button>

          <button
            onClick={handleRetryExtraction}
            disabled={isRetryingExtraction}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-lg shadow transition uppercase tracking-wider font-mono disabled:opacity-50"
            title="Re-extract Airworthiness Directive from original document"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-300 ${isRetryingExtraction ? 'animate-spin' : ''}`} />
            <span>{isRetryingExtraction ? 'Extracting...' : 'Retry Extraction'}</span>
          </button>

          <button
            onClick={() => setShowFullReportModal(true)}
            className="flex items-center space-x-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:shadow-emerald-600/30 transition uppercase tracking-wider font-mono border border-emerald-400/40"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Exportar Análise Completa</span>
          </button>

          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center space-x-1.5 text-xs glass-panel hover:bg-white/10 text-slate-200 border border-white/10 px-3 py-2 rounded-lg shadow-sm transition disabled:opacity-50 font-mono"
          >
            <RotateCw className={`w-3.5 h-3.5 text-indigo-400 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>Re-evaluate Rule Engine</span>
          </button>

          {fapt && (
            <button
              onClick={() => setActiveTab('fapt')}
              className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-lg shadow transition uppercase tracking-wider font-mono"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Review FAPT</span>
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            title="Delete Airworthiness Directive and cascade dependent analysis records"
            className="flex items-center space-x-1.5 text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-500/40 hover:border-rose-500/80 px-3 py-2 rounded-lg shadow-sm transition font-mono uppercase tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete AD</span>
          </button>
        </div>
      </div>

      {/* Retry Feedback Alert */}
      {retryFeedback && (
        <div className="p-3 bg-indigo-950/80 border border-indigo-500/50 rounded-xl flex items-center justify-between text-xs text-indigo-200 font-mono animate-fadeIn">
          <span>{retryFeedback}</span>
          <button onClick={() => setRetryFeedback(null)} className="text-indigo-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Extraction Diagnostics Warning/Failure Banner if applicable */}
      {(requirement.documentProcessingStatus === 'EXTRACTION_FAILED' || requirement.documentProcessingStatus === 'EXTRACTION_REVIEW_REQUIRED') && (
        <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 animate-fadeIn">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/40 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block">
                Extraction Pipeline Status: {requirement.documentProcessingStatus}
              </span>
              <span className="text-slate-300">
                {requirement.extractionError || (
                  requirement.missingFields && requirement.missingFields.length > 0
                    ? `CAMO verification required for mandatory fields: ${requirement.missingFields.join(', ')}`
                    : 'Some mandatory technical parameters require CAMO review.'
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowDiagnosticsModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs font-mono transition"
            >
              View 9-Stage Diagnostics
            </button>
            <button
              onClick={handleRetryExtraction}
              disabled={isRetryingExtraction}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono transition"
            >
              Retry Extraction
            </button>
          </div>
        </div>
      )}

      {/* Overview Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 glass-panel rounded-xl p-4 text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold tracking-wider">Effective Date</span>
          <span className="text-slate-200 font-bold">{requirement.effectiveDate}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold tracking-wider">Affected Models</span>
          <span className="text-slate-200 font-bold">
            {requirement.applicabilityRule?.aircraftModels?.join(', ') || 'Fleet General'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold tracking-wider">Target Part Numbers</span>
          <span className="text-indigo-300 font-bold">
            {requirement.applicabilityRule?.componentPartNumbers?.length 
              ? requirement.applicabilityRule.componentPartNumbers.join(', ') 
              : 'Airframe / Engine Level'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold tracking-wider">Fleet Assessment</span>
          {hasReviewRequired ? (
            <span className="text-indigo-300 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span>REVIEW REQUIRED ({pendingQuestions.length} Qs)</span>
            </span>
          ) : applicableCount > 0 ? (
            <span className="text-amber-400 font-bold">{applicableCount} APPLICABLE AIRCRAFT</span>
          ) : (
            <span className="text-emerald-400 font-bold">NOT APPLICABLE TO FLEET</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'matrix'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Fleet Applicability Matrix ({assessments.length})</span>
        </button>

        {questions.length > 0 && (
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
              activeTab === 'questions'
                ? 'border-indigo-400 text-indigo-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>
              Engineer Questions
              {pendingQuestions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-bold animate-pulse">
                  {pendingQuestions.length}
                </span>
              )}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('document')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'document'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Extracted Technical Data & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('fapt')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'fapt'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>AD Review Sheet (FAPT)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: FLEET APPLICABILITY MATRIX & REASONING */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Fleet Asset Compliance Evaluation</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Evaluated by Rule Engine v1.0. Lack of data triggers REVIEW REQUIRED; positive matches trigger APPLICABLE.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {assessments.map((ass) => {
                const isApplicable = ass.result === 'APPLICABLE';
                const isReviewRequired = ass.result === 'REVIEW_REQUIRED';
                const isNotApplicable = ass.result === 'NOT_APPLICABLE';

                return (
                  <div
                    key={ass.id}
                    className={`p-5 rounded-xl border transition space-y-4 ${
                      isApplicable 
                        ? 'bg-amber-950/20 border-amber-500/30' 
                        : isReviewRequired
                        ? 'bg-indigo-950/20 border-indigo-500/40'
                        : 'bg-slate-950/60 border-white/10'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-base font-bold text-white font-mono">
                          {ass.entityRegistration || ass.entityLabel}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          MSN {ass.entityMsn} • {ass.entityModel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. APPLICABILITY STATUS BADGE */}
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold mr-1">Applicability:</span>
                          {(ass.applicabilityStatus === 'APPLICABLE' || (!ass.applicabilityStatus && isApplicable)) && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-amber-500 text-slate-950 border border-amber-400/50 flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>APPLICABLE</span>
                            </span>
                          )}
                          {(ass.applicabilityStatus === 'REVIEW_REQUIRED' || (!ass.applicabilityStatus && isReviewRequired)) && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-indigo-600 text-white border border-indigo-400/40 flex items-center space-x-1 animate-pulse">
                              <HelpCircle className="w-3 h-3" />
                              <span>REVIEW REQ.</span>
                            </span>
                          )}
                          {(ass.applicabilityStatus === 'NOT_APPLICABLE' || (!ass.applicabilityStatus && isNotApplicable)) && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                              <span>NOT APPLICABLE</span>
                            </span>
                          )}
                        </div>

                        {/* 2. COMPLIANCE STATUS BADGE */}
                        <div className="flex items-center space-x-1 pl-2 border-l border-white/10">
                          <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold mr-1">Compliance:</span>
                          {ass.complianceStatus === 'COMPLIED' && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-emerald-600 text-white border border-emerald-400/50 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>COMPLIED</span>
                            </span>
                          )}
                          {(ass.complianceStatus === 'OPEN' || (!ass.complianceStatus && isApplicable)) && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-amber-600 text-white border border-amber-400/50 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>OPEN / PENDING</span>
                            </span>
                          )}
                          {(ass.complianceStatus === 'REVIEW_REQUIRED' || (!ass.complianceStatus && isReviewRequired)) && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-indigo-500/80 text-white border border-indigo-400/50 flex items-center space-x-1">
                              <HelpCircle className="w-3 h-3" />
                              <span>VERIFICATION REQ.</span>
                            </span>
                          )}
                          {(ass.complianceStatus === 'NOT_REQUIRED' || (!ass.complianceStatus && isNotApplicable)) && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700">
                              NOT REQUIRED
                            </span>
                          )}
                          {ass.complianceStatus === 'OVERDUE' && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono bg-rose-600 text-white border border-rose-400/50 flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>OVERDUE</span>
                            </span>
                          )}
                        </div>

                        {ass.status === 'APPROVED' ? (
                          <span className="text-[11px] text-emerald-400 flex items-center space-x-1 font-mono ml-2">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Approved by {ass.approvedBy}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApproveAssessment(ass.id)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 transition font-mono ml-2"
                          >
                            CAMO Sign-off
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Criteria Match Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1 border-t border-white/5">
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Aircraft Model Match</span>
                        <span className={ass.matchedCriteria?.aircraftModelMatch?.matched ? 'text-emerald-400' : 'text-slate-400'}>
                          {ass.matchedCriteria?.aircraftModelMatch?.detail || (ass.reasoning?.[0] || 'Model applicability verified')}
                        </span>
                      </div>

                      {ass.matchedCriteria?.componentMatch && (
                        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                          <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Component P/N & S/N Match</span>
                          <span className={
                            ass.matchedCriteria.componentMatch.status === 'CONFIRMED'
                              ? 'text-amber-400 font-bold'
                              : ass.matchedCriteria.componentMatch.status === 'MISSING_DATA'
                              ? 'text-indigo-300'
                              : 'text-slate-400'
                          }>
                            {ass.matchedCriteria.componentMatch.detail}
                          </span>
                        </div>
                      )}

                      {ass.matchedCriteria?.engineMatch && (
                        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                          <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Engine Effectivity</span>
                          <span className={ass.matchedCriteria.engineMatch.matched ? 'text-amber-400' : 'text-slate-400'}>
                            {ass.matchedCriteria.engineMatch.detail}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bullet-by-bullet Technical Reasoning */}
                    <div className="space-y-1.5 bg-slate-950/40 p-3.5 rounded-lg border border-white/5">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Objective CAMO Technical Reasoning:</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {(ass.reasoning && ass.reasoning.length > 0 ? ass.reasoning : [(ass as any).reason || 'Applicability evaluated by CAMO rule engine.']).map((r, idx) => (
                          <li key={idx} className="leading-relaxed">{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Prompt to answer questions if Review Required */}
                    {isReviewRequired && (
                      <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-lg flex items-center justify-between">
                        <div className="text-xs text-indigo-200">
                          <span className="font-bold uppercase tracking-wider">Action Required:</span> Fleet database is missing installation records for this component. Provide confirmation and evidence to resolve.
                        </div>
                        <button
                          onClick={() => {
                            const relatedQ = questions.find(q => q.complianceAssessmentId === ass.id && q.status === 'PENDING');
                            if (relatedQ) {
                              setSelectedQuestion(relatedQ);
                              setActiveTab('questions');
                            }
                          }}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition shrink-0 ml-3 shadow font-mono uppercase tracking-wider"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTIONS & HUMAN INPUT */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>Engineer Clarifications & Missing Fleet Configuration</span>
              </h3>
              <p className="text-xs text-slate-400">
                Rule Engine safely flags missing components as REVIEW REQUIRED. Answer once, and the system records the verified fact in the Knowledge Base for all future ADs.
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((q) => {
                const isPending = q.status === 'PENDING';

                return (
                  <div
                    key={q.id}
                    className={`p-5 rounded-xl border space-y-4 ${
                      isPending ? 'bg-indigo-950/20 border-indigo-500/40' : 'bg-slate-950/60 border-white/10'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Target Aircraft: {q.targetEntity.label}
                        </span>
                        <h4 className="text-sm font-bold text-white">{q.question}</h4>
                        <p className="text-xs text-slate-400">{q.reason}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono shrink-0 ${
                        isPending ? 'bg-indigo-600 text-white border border-indigo-400/40' : 'bg-emerald-500 text-white border border-emerald-400/40'
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    {isPending ? (
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-white/10 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-200">
                            Is P/N {q.partNumberInQuestion} installed on {q.targetEntity.label}?
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setAnswerChoice('YES')}
                              className={`p-3 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-2 font-mono ${
                                answerChoice === 'YES'
                                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                                  : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Check className="w-4 h-4 text-indigo-400" />
                              <span>YES - Installed</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAnswerChoice('NO')}
                              className={`p-3 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-2 font-mono ${
                                answerChoice === 'NO'
                                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                                  : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>NO - Verified Not Installed</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAnswerChoice('UNKNOWN')}
                              className={`p-3 rounded-lg border text-xs font-bold transition flex items-center justify-center space-x-2 font-mono ${
                                answerChoice === 'UNKNOWN'
                                  ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                                  : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <HelpCircle className="w-4 h-4 text-amber-400" />
                              <span>UNKNOWN (Physical Check)</span>
                            </button>
                          </div>
                        </div>

                        {answerChoice === 'YES' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Component Serial Number (S/N):</label>
                              <input
                                type="text"
                                value={componentSerial}
                                onChange={(e) => setComponentSerial(e.target.value)}
                                placeholder="e.g. 456789"
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Installation Position:</label>
                              <input
                                type="text"
                                value={componentPosition}
                                onChange={(e) => setComponentPosition(e.target.value)}
                                placeholder="e.g. Elevator Tab Control Rod / Fuel Bay"
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">Technical Document Reference:</label>
                            <input
                              type="text"
                              value={documentRef}
                              onChange={(e) => setDocumentRef(e.target.value)}
                              placeholder="e.g. ARC Form 8130-3 #456789 / Tech Log Pg. 402"
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">CAMO Evidence Notes:</label>
                            <input
                              type="text"
                              value={evidenceNotes}
                              onChange={(e) => setEvidenceNotes(e.target.value)}
                              placeholder="e.g. Verified by Chief Engineer in C-Check records"
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleAnswerSubmit(q)}
                            disabled={isAnswering}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow transition font-mono uppercase tracking-wider"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Confirm Install, Record Fact & Recalculate</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950/60 rounded-lg text-xs space-y-1 border border-white/5">
                        <div className="flex items-center justify-between text-slate-300 font-semibold">
                          <span>Recorded Answer: {q.answer}</span>
                          <span className="font-mono text-[10px] text-slate-400">{q.answerDate?.split('T')[0]}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">Answered by: {q.answeredBy}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXTRACTED TECHNICAL DATA & RULES */}
      {activeTab === 'document' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Col: Extracted Applicability Rule & Dynamic Criteria */}
          <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Dynamic Applicability Criteria</span>
              </h3>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
                Dynamic Rule Model v2
              </span>
            </div>

            {/* Dynamic Criteria Grid */}
            {requirement.applicabilityCriteria ? (
              <div className="space-y-2">
                {[
                  { key: 'aircraftModel', label: 'Aircraft Model', crit: requirement.applicabilityCriteria.aircraftModel, display: requirement.applicabilityCriteria.aircraftModel?.values?.join(', ') },
                  { key: 'aircraftMSN', label: 'Aircraft MSN / Serial', crit: requirement.applicabilityCriteria.aircraftMSN, display: requirement.applicabilityCriteria.aircraftMSN?.description || requirement.applicabilityCriteria.aircraftMSN?.list?.join(', ') },
                  { key: 'engineModel', label: 'Engine Model', crit: requirement.applicabilityCriteria.engineModel, display: requirement.applicabilityCriteria.engineModel?.values?.join(', ') },
                  { key: 'engineSerialNumber', label: 'Engine Serial (ESN)', crit: requirement.applicabilityCriteria.engineSerialNumber, display: requirement.applicabilityCriteria.engineSerialNumber?.description || requirement.applicabilityCriteria.engineSerialNumber?.list?.join(', ') },
                  { key: 'componentPartNumber', label: 'Part Number (P/N)', crit: requirement.applicabilityCriteria.componentPartNumber, display: requirement.applicabilityCriteria.componentPartNumber?.values?.join(', ') },
                  { key: 'componentSerialNumber', label: 'Component Serial (S/N)', crit: requirement.applicabilityCriteria.componentSerialNumber, display: requirement.applicabilityCriteria.componentSerialNumber?.description || requirement.applicabilityCriteria.componentSerialNumber?.list?.join(', ') },
                  { key: 'modificationStatus', label: 'Configuration / Mod / STC', crit: requirement.applicabilityCriteria.modificationStatus, display: requirement.applicabilityCriteria.modificationStatus?.conditions?.join(', ') },
                  { key: 'softwareConfiguration', label: 'Software Configuration', crit: requirement.applicabilityCriteria.softwareConfiguration, display: requirement.applicabilityCriteria.softwareConfiguration?.values?.join(', ') || requirement.applicabilityCriteria.softwareConfiguration?.conditions?.join(', ') },
                ].map(({ key, label, crit, display }) => (
                  <div key={key} className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 text-[10px] uppercase font-sans font-bold block">{label}</span>
                      <span className="text-slate-200">
                        {display || (crit?.status === 'NOT_REQUIRED' ? 'Not Required for this AD' : '—')}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                      crit?.status === 'REQUIRED'
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                        : crit?.status === 'NOT_REQUIRED'
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : crit?.status === 'NOT_EXTRACTED'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                    }`}>
                      {crit?.status || 'NOT_REQUIRED'}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-3 text-xs pt-2 border-t border-white/10">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Aircraft Models:</span>
                <p className="font-mono text-white">
                  {requirement.applicabilityRule?.aircraftModels?.join(', ') || 'All Models'}
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Affected Part Numbers (P/N):</span>
                <p className="font-mono text-indigo-300 font-bold">
                  {requirement.applicabilityRule?.componentPartNumbers?.length 
                    ? requirement.applicabilityRule.componentPartNumbers.join(', ') 
                    : 'N/A (Airframe Level)'}
                </p>
              </div>

              {requirement.applicabilityRule?.componentSerialRanges && (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Serial Number Range (S/N):</span>
                  <p className="font-mono text-amber-300">
                    {requirement.applicabilityRule.componentSerialRanges.description || 
                     `${requirement.applicabilityRule.componentSerialRanges.from} - ${requirement.applicabilityRule.componentSerialRanges.to}`}
                  </p>
                </div>
              )}

              {requirement.applicabilityRule?.affectedConfiguration && (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Configuration / STC:</span>
                  <p className="text-slate-300">{requirement.applicabilityRule.affectedConfiguration}</p>
                </div>
              )}

              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Raw Directives Text:</span>
                <p className="text-slate-400 font-mono text-[11px] leading-relaxed">
                  {requirement.applicabilityRule?.rawText || 'Standard effectivity text'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Col: Compliance Times & Requirements */}
          <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Compliance Actions & Intervals</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Initial Threshold:</span>
                <p className="text-white font-medium">{requirement.requirementDetails?.initialThreshold}</p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Repetitive Interval:</span>
                <p className="text-indigo-300 font-medium">{requirement.requirementDetails?.repetitiveInterval}</p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Required Inspection Method:</span>
                <p className="text-slate-300">{requirement.requirementDetails?.requiredInspection}</p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Terminating Action:</span>
                <p className="text-emerald-300">{requirement.requirementDetails?.terminatingAction || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Required Parts:</span>
                <p className="font-mono text-slate-300">
                  {requirement.requirementDetails?.requiredParts?.join(', ') || 'Standard hardware'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AD REVIEW SHEET (FAPT) */}
      {activeTab === 'fapt' && fapt && (
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-6 shadow-xl space-y-6 max-w-4xl mx-auto text-slate-200">
            {/* Header Form */}
            <div className="border-b-2 border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  CAMO Technical Services • Engineering Compliance Record
                </div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">
                  AIRWORTHINESS DIRECTIVE REVIEW SHEET (FAPT)
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Document No: {fapt.documentNumber} • {fapt.revision}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs border border-white/10 font-mono"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print FAPT</span>
                </button>
                {fapt.status !== 'APPROVED' && (
                  <button
                    onClick={handleSignFapt}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow font-mono uppercase tracking-wider"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Authorize & Sign FAPT</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: AD Identification */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1">
                1. AD Identification & Authority
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-white/5">
                <div>
                  <span className="text-slate-400 block text-[10px]">AD Number:</span>
                  <span className="text-white font-bold">{fapt.adNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Authority:</span>
                  <span className="text-white">{fapt.authority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Issue Date:</span>
                  <span className="text-white">{fapt.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Effective Date:</span>
                  <span className="text-white">{fapt.effectiveDate}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 pt-1">
                <strong>Subject:</strong> {fapt.title}
              </p>
            </div>

            {/* Section 2: Fleet Applicability Matrix */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1">
                2. Fleet Applicability Matrix & CAMO Assessment
              </h4>
              <table className="w-full text-left text-xs border-collapse font-mono bg-slate-950/60 rounded-lg overflow-hidden border border-white/10">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold text-[11px] bg-white/5">
                    <th className="p-2.5">Aircraft / Reg</th>
                    <th className="p-2.5">MSN</th>
                    <th className="p-2.5">Model</th>
                    <th className="p-2.5">Result</th>
                    <th className="p-2.5">CAMO Evaluation Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fapt.applicabilityMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-2.5 font-bold text-white">{row.aircraftRegistration}</td>
                      <td className="p-2.5 text-slate-400">{row.msn}</td>
                      <td className="p-2.5 text-slate-300">{row.model}</td>
                      <td className="p-2.5 font-bold">
                        <span className={
                          row.result === 'APPLICABLE' ? 'text-amber-400' :
                          row.result === 'REVIEW_REQUIRED' ? 'text-indigo-300' : 'text-emerald-400'
                        }>
                          {row.result}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 text-[11px] max-w-xs">{row.reasoningSummary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3: Compliance Requirement Plan */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1">
                3. Compliance Action Plan & Technical Requirements
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-lg border border-white/5">
                <div>
                  <strong className="text-slate-400 text-[11px] block">Initial Threshold:</strong>
                  <p className="text-slate-200">{fapt.initialThreshold}</p>
                </div>
                <div>
                  <strong className="text-slate-400 text-[11px] block">Repetitive Interval:</strong>
                  <p className="text-slate-200">{fapt.repetitiveInterval}</p>
                </div>
                <div className="sm:col-span-2">
                  <strong className="text-slate-400 text-[11px] block">Required Inspection:</strong>
                  <p className="text-slate-200">{fapt.requiredInspection}</p>
                </div>
                <div className="sm:col-span-2">
                  <strong className="text-slate-400 text-[11px] block">Terminating Action:</strong>
                  <p className="text-slate-200">{fapt.terminatingAction || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Section 4: Signatures & Digital Authorizations */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. CAMO Engineering Authorizations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono bg-slate-950/60 p-4 rounded-lg border border-white/5">
                <div>
                  <span className="text-slate-400 text-[10px] block">Prepared By:</span>
                  <span className="font-bold text-white">{fapt.preparedBy}</span>
                  <span className="text-[10px] text-slate-400 block">{fapt.preparedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Reviewed By:</span>
                  <span className="font-bold text-white">{fapt.reviewedBy || 'Pending Review'}</span>
                  <span className="text-[10px] text-slate-400 block">{fapt.reviewedDate || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Chief CAMO Approval:</span>
                  <span className="font-bold text-emerald-400">{fapt.approvedBy || 'Pending Approval'}</span>
                  <span className="text-[10px] text-slate-400 block">{fapt.approvalDate || '—'}</span>
                  {fapt.signatureHash && (
                    <span className="text-[9px] text-indigo-400 block mt-1">{fapt.signatureHash}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Audit Trail & Historical Decision Logs</span>
            </h3>
            <p className="text-xs text-slate-400">
              Immutable chronological record of AI extractions, rule evaluations, engineer answers, and CAMO approvals.
            </p>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-slate-950/60 rounded-lg border border-white/5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 font-mono">[{log.action}]</span>
                  <span className="text-[11px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-300">{log.details}</p>
                <div className="text-[10px] text-slate-400 flex justify-between pt-1 font-mono">
                  <span>Actor: {log.user} ({log.role})</span>
                  <span>Entity: {log.entityType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete AD Confirmation Modal */}
      {showDeleteModal && (
        <DeleteAdConfirmationModal
          requirement={requirement}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async (msg) => {
            setShowDeleteModal(false);
            try {
              const res = await fetch('/api/state');
              if (res.ok) {
                const freshState = await res.json();
                onRefreshState(freshState);
              }
            } catch (err) {
              console.error('Error refreshing state:', err);
            }
            onBack();
          }}
        />
      )}

      {/* Extraction Diagnostics Modal */}
      {showDiagnosticsModal && (
        <ExtractionDiagnosticsModal
          requirement={requirement}
          onClose={() => setShowDiagnosticsModal(false)}
          onRetryExtraction={async (reqId) => {
            await handleRetryExtraction();
          }}
        />
      )}

      {/* Full Technical Report Print / Export Modal */}
      {showFullReportModal && (
        <FullTechnicalReportModal
          requirementId={requirement.id}
          state={state}
          onClose={() => setShowFullReportModal(false)}
        />
      )}
    </div>
  );
}
