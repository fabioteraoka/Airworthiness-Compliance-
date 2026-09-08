import { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  FileText, 
  Cpu, 
  Code, 
  ShieldCheck, 
  Database, 
  Compass, 
  Flag, 
  Copy, 
  Check, 
  X, 
  Download, 
  Printer, 
  ChevronDown, 
  ChevronUp,
  FileCode,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ComplianceRequirement, ExtractionPipelineDiagnostics } from '../types';

interface ExtractionDiagnosticsModalProps {
  requirement: ComplianceRequirement;
  onClose: () => void;
  onRetryExtraction?: (reqId: string) => Promise<void>;
}

export default function ExtractionDiagnosticsModal({
  requirement,
  onClose,
  onRetryExtraction
}: ExtractionDiagnosticsModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [expandedRawResponse, setExpandedRawResponse] = useState(false);
  const [expandedRawText, setExpandedRawText] = useState(false);

  const diag: ExtractionPipelineDiagnostics | undefined = requirement.pipelineDiagnostics;

  const handleCopyJson = () => {
    if (!diag) return;
    navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!diag) return;
    const blob = new Blob([JSON.stringify(diag, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXTRACTION_DIAGNOSTICS_${requirement.sourceNumber || 'AD'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRetry = async () => {
    if (!onRetryExtraction) return;
    setIsRetrying(true);
    setRetryMessage(null);
    try {
      await onRetryExtraction(requirement.id);
      setRetryMessage('Re-extraction completed successfully.');
    } catch (err: any) {
      setRetryMessage(`Retry failed: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const overallResult = diag?.stage9.pipelineResult || 
    (requirement.documentProcessingStatus === 'EXTRACTION_FAILED' ? 'EXTRACTION_FAILED' : 
     requirement.documentProcessingStatus === 'EXTRACTION_REVIEW_REQUIRED' ? 'EXTRACTION_REVIEW_REQUIRED' : 'EXTRACTED');

  const getResultBadge = () => {
    switch (overallResult) {
      case 'EXTRACTED':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          label: 'EXTRACTED — PIPELINE SUCCESS'
        };
      case 'EXTRACTION_REVIEW_REQUIRED':
        return {
          bg: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: 'EXTRACTION_REVIEW_REQUIRED — ATTENTION NEEDED'
        };
      case 'EXTRACTION_FAILED':
      default:
        return {
          bg: 'bg-rose-950/70 border-rose-500/50 text-rose-300',
          icon: <XCircle className="w-4 h-4 text-rose-400" />,
          label: 'EXTRACTION_FAILED — CAMO GATE BLOCK'
        };
    }
  };

  const badge = getResultBadge();

  return (
    <div id="extraction-diagnostics-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div id="extraction-diagnostics-modal" className="bg-slate-950 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono uppercase flex items-center space-x-1.5 ${badge.bg}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {requirement.sourceNumber || requirement.sourceDocument?.fileName || 'AD Extraction'}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide mt-0.5 flex items-center space-x-2">
                <span>Airworthiness Directive Extraction Pipeline Diagnostics</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onRetryExtraction && (
              <button
                id="btn-diag-retry-extraction"
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-mono flex items-center space-x-1.5 transition shadow-sm"
                title="Reprocess original source document"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin text-indigo-200' : ''}`} />
                <span>{isRetrying ? 'Re-extracting...' : 'Retry Extraction'}</span>
              </button>
            )}

            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
              title="Copy diagnostics JSON payload"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
              title="Export complete diagnostics JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              id="btn-close-diagnostics-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Retry status alert */}
        {retryMessage && (
          <div className="bg-indigo-950/60 border-b border-indigo-800/60 px-6 py-2 text-xs font-mono text-indigo-300 flex items-center justify-between shrink-0">
            <span>{retryMessage}</span>
            <button onClick={() => setRetryMessage(null)} className="text-indigo-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body with 9 Stages */}
        <div className="p-6 space-y-6 overflow-y-auto grow text-xs font-mono">
          
          {/* Executive Summary Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">Source Document</span>
              <span className="text-white font-bold text-xs truncate block mt-0.5">
                {diag?.stage1.originalFileName || requirement.sourceDocument?.fileName || 'AD Document'}
              </span>
              <span className="text-[10px] text-slate-400">
                {diag?.stage1.fileSize ? `${Math.round(diag.stage1.fileSize / 1024)} KB` : 'N/A'} • {diag?.stage1.mimeType || 'PDF'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">Pipeline Stage Result</span>
              <span className={`font-bold text-xs mt-0.5 block ${
                overallResult === 'EXTRACTED' ? 'text-emerald-400' :
                overallResult === 'EXTRACTION_REVIEW_REQUIRED' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {overallResult}
              </span>
              <span className="text-[10px] text-slate-400">
                Failed Stage: {diag?.stage9.failureStage ? `Stage ${diag.stage9.failureStage}` : 'None'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">AI Model Used</span>
              <span className="text-indigo-300 font-bold text-xs mt-0.5 block">
                {diag?.stage3.modelName || 'gemini-3.6-flash'}
              </span>
              <span className="text-[10px] text-slate-400">
                Extracted Chars: {diag?.stage2.extractedTextCharCount || 0}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">Validation Rules</span>
              <span className="text-white font-bold text-xs mt-0.5 block">
                {diag?.stage6.validationRules?.filter(r => r.passed).length || 0} of {diag?.stage6.validationRules?.length || 6} Passed
              </span>
              <span className="text-[10px] text-slate-400">
                Missing Required: {diag?.stage5.requiredFieldsMissing?.length || 0}
              </span>
            </div>
          </div>

          {/* 9-Stage Pipeline Stepper */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 font-sans">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Full 9-Stage Pipeline Breakdown</span>
            </h3>

            {/* STAGE 1: FILE RECEIVED */}
            <div className={`border rounded-xl p-4 transition ${
              diag?.stage1.fileBytesReceived ? 'bg-slate-900/70 border-slate-800' : 'bg-rose-950/20 border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    diag?.stage1.fileBytesReceived ? 'bg-emerald-950 border-emerald-600/50 text-emerald-400' : 'bg-rose-950 border-rose-600/50 text-rose-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 1 — File Received
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Ingestion of upload payload and validation of raw byte stream.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  diag?.stage1.fileBytesReceived ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
                }`}>
                  {diag?.stage1.fileBytesReceived ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Original File Name:</span>
                  <span className="text-slate-200 font-bold break-all">{diag?.stage1.originalFileName || requirement.sourceDocument?.fileName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">MIME Type:</span>
                  <span className="text-slate-200">{diag?.stage1.mimeType || requirement.sourceDocument?.mimeType || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">File Size:</span>
                  <span className="text-slate-200">{diag?.stage1.fileSize ? `${Math.round(diag.stage1.fileSize / 1024)} KB (${diag.stage1.fileSize} bytes)` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Upload Timestamp:</span>
                  <span className="text-slate-200">{diag?.stage1.uploadTimestamp ? new Date(diag.stage1.uploadTimestamp).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* STAGE 2: SOURCE CONTENT EXTRACTION */}
            <div className={`border rounded-xl p-4 transition ${
              diag?.stage2.pdfTextExtractionSucceeded ? 'bg-slate-900/70 border-slate-800' : 'bg-rose-950/20 border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    diag?.stage2.pdfTextExtractionSucceeded ? 'bg-emerald-950 border-emerald-600/50 text-emerald-400' : 'bg-rose-950 border-rose-600/50 text-rose-400'
                  }`}>
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 2 — Source Content Extraction
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Raw character and structural token extraction from document bytes.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  diag?.stage2.pdfTextExtractionSucceeded ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
                }`}>
                  {diag?.stage2.pdfTextExtractionSucceeded ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] mb-3">
                <div>
                  <span className="text-slate-500 block">Extraction Status:</span>
                  <span className={diag?.stage2.pdfTextExtractionSucceeded ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {diag?.stage2.pdfTextExtractionSucceeded ? 'Extraction Succeeded' : 'Extraction Failed'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Character Count:</span>
                  <span className="text-slate-200">{diag?.stage2.extractedTextCharCount || 0} characters</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Page Count:</span>
                  <span className="text-slate-200">{diag?.stage2.extractedPageCount || 'N/A (Streaming stream)'}</span>
                </div>
              </div>

              {diag?.stage2.textExtractionError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-700/50 rounded-lg text-rose-300 text-[11px] mb-3">
                  <strong>Extraction Error:</strong> {diag.stage2.textExtractionError}
                </div>
              )}

              {/* First 500 characters preview */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">First 500 Characters of Source Text:</span>
                  <button
                    onClick={() => setExpandedRawText(!expandedRawText)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <span>{expandedRawText ? 'Collapse' : 'Expand Preview'}</span>
                    {expandedRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <pre className={`text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap ${expandedRawText ? 'max-h-96' : 'max-h-24'}`}>
                  {diag?.stage2.first500Chars || requirement.sourceDocument?.rawExtractedText?.slice(0, 500) || '[No raw text extracted]'}
                </pre>
              </div>
            </div>

            {/* STAGE 3: AI EXTRACTION REQUEST */}
            <div className={`border rounded-xl p-4 transition ${
              diag?.stage3.modelInvocationSuccess ? 'bg-slate-900/70 border-slate-800' : 'bg-rose-950/20 border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    diag?.stage3.modelInvocationSuccess ? 'bg-emerald-950 border-emerald-600/50 text-emerald-400' : 'bg-rose-950 border-rose-600/50 text-rose-400'
                  }`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 3 — AI Extraction Request
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Dispatch of aviation extraction payload to Gemini model.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  diag?.stage3.modelInvocationSuccess ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
                }`}>
                  {diag?.stage3.modelInvocationSuccess ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">AI Request Sent:</span>
                  <span className={diag?.stage3.aiRequestSent ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {diag?.stage3.aiRequestSent ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Model Name:</span>
                  <span className="text-indigo-300 font-bold">{diag?.stage3.modelName || 'gemini-3.6-flash'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payload Size:</span>
                  <span className="text-slate-200">{diag?.stage3.requestSize || 0} bytes</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Invocation Status:</span>
                  <span className={diag?.stage3.modelInvocationSuccess ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                    {diag?.stage3.modelInvocationSuccess ? 'SUCCESS' : (diag?.stage3.aiInvocationError || 'INVOCATION_FAILED')}
                  </span>
                </div>
              </div>
            </div>

            {/* STAGE 4: RAW AI MODEL RESPONSE */}
            <div className={`border rounded-xl p-4 transition ${
              diag?.stage4.aiReturnedResponse ? 'bg-slate-900/70 border-slate-800' : 'bg-rose-950/20 border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    diag?.stage4.aiReturnedResponse ? 'bg-emerald-950 border-emerald-600/50 text-emerald-400' : 'bg-rose-950 border-rose-600/50 text-rose-400'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 4 — Raw AI Model Response
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Validation of returned response body and technical keyword recognition.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  diag?.stage4.aiReturnedResponse ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
                }`}>
                  {diag?.stage4.aiReturnedResponse ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                  diag?.stage4.containsAdNumber ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300' : 'bg-rose-950/30 border-rose-600/40 text-rose-300'
                }`}>
                  {diag?.stage4.containsAdNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <div className="overflow-hidden">
                    <span className="text-[10px] block font-sans">AD Identifier</span>
                    <span className="text-[10px] font-bold truncate block">{diag?.stage4.adNumberSnippet || 'Missing'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                  diag?.stage4.containsIssuingAuthority ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300' : 'bg-rose-950/30 border-rose-600/40 text-rose-300'
                }`}>
                  {diag?.stage4.containsIssuingAuthority ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <div className="overflow-hidden">
                    <span className="text-[10px] block font-sans">Issuing Authority</span>
                    <span className="text-[10px] font-bold truncate block">{diag?.stage4.issuingAuthoritySnippet || 'Missing'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                  diag?.stage4.containsApplicability ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300' : 'bg-rose-950/30 border-rose-600/40 text-rose-300'
                }`}>
                  {diag?.stage4.containsApplicability ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <div className="overflow-hidden">
                    <span className="text-[10px] block font-sans">Effectivity Section</span>
                    <span className="text-[10px] font-bold truncate block">{diag?.stage4.applicabilitySnippet ? 'Recognized' : 'Missing'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                  diag?.stage4.containsComplianceActions ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300' : 'bg-rose-950/30 border-rose-600/40 text-rose-300'
                }`}>
                  {diag?.stage4.containsComplianceActions ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <div className="overflow-hidden">
                    <span className="text-[10px] block font-sans">Compliance Actions</span>
                    <span className="text-[10px] font-bold truncate block">{diag?.stage4.complianceActionsSnippet ? 'Recognized' : 'Missing'}</span>
                  </div>
                </div>
              </div>

              {/* First 1000 characters preview */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
                    Raw AI Response (First 1000 Chars):
                  </span>
                  <button
                    onClick={() => setExpandedRawResponse(!expandedRawResponse)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <span>{expandedRawResponse ? 'Collapse' : 'Expand Response'}</span>
                    {expandedRawResponse ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <pre className={`text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap ${expandedRawResponse ? 'max-h-96' : 'max-h-24'}`}>
                  {diag?.stage4.first1000Chars || '[No model response returned]'}
                </pre>
              </div>
            </div>

            {/* STAGE 5: JSON PARSING */}
            <div className={`border rounded-xl p-4 transition ${
              diag?.stage5.jsonParsingSucceeded ? 'bg-slate-900/70 border-slate-800' : 'bg-rose-950/20 border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    diag?.stage5.jsonParsingSucceeded ? 'bg-emerald-950 border-emerald-600/50 text-emerald-400' : 'bg-rose-950 border-rose-600/50 text-rose-400'
                  }`}>
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 5 — JSON Parsing & Schema Validation
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Structural syntax parsing into CAMO typed object model.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  diag?.stage5.jsonParsingSucceeded ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
                }`}>
                  {diag?.stage5.jsonParsingSucceeded ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Parsed Field Count:</span>
                  <span className="text-slate-200">{diag?.stage5.parsedFieldNames?.length || 0} fields ({diag?.stage5.parsedFieldNames?.join(', ') || 'None'})</span>
                </div>

                {diag?.stage5.exactJsonParsingError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-700/50 rounded-lg text-rose-300">
                    <strong>Parsing Error:</strong> {diag.stage5.exactJsonParsingError}
                  </div>
                )}

                {diag?.stage5.requiredFieldsMissing && diag.stage5.requiredFieldsMissing.length > 0 && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-700/50 rounded-lg text-amber-300">
                    <strong>Missing Required Schema Fields:</strong> {diag.stage5.requiredFieldsMissing.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* STAGE 6: AD FIELD & REGULATORY VALIDATION */}
            <div className="border border-slate-800 bg-slate-900/70 rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg border bg-indigo-950 border-indigo-600/50 text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 6 — AD Field & Regulatory Validation (Safety Gate)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Formal validation against FAR Part 39 / EASA Part-M continuing airworthiness rules.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  6 Mandatory Criteria
                </span>
              </div>

              {/* Validation Rules Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-sans">
                      <th className="py-2 px-2">Rule Name</th>
                      <th className="py-2 px-2">Field</th>
                      <th className="py-2 px-2">Expected Condition</th>
                      <th className="py-2 px-2">Actual Value</th>
                      <th className="py-2 px-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(diag?.stage6.validationRules || []).map((rule, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-2 text-white font-bold font-sans">{rule.ruleName}</td>
                        <td className="py-2 px-2 text-indigo-300">{rule.field}</td>
                        <td className="py-2 px-2 text-slate-400 text-[10px]">{rule.expected}</td>
                        <td className="py-2 px-2 text-slate-200 text-[10px] max-w-xs truncate">{rule.actual}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center space-x-1 ${
                            rule.passed 
                              ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300' 
                              : 'bg-rose-950/80 border-rose-600/50 text-rose-300'
                          }`}>
                            {rule.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>{rule.passed ? 'PASS' : 'FAIL'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STAGE 7: AD OBJECT PERSISTENCE */}
            <div className={`border rounded-xl p-4 transition ${
              diag?.stage7.adObjectSaved ? 'bg-slate-900/70 border-slate-800' : 'bg-rose-950/20 border-rose-800/60'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    diag?.stage7.adObjectSaved ? 'bg-emerald-950 border-emerald-600/50 text-emerald-400' : 'bg-rose-950 border-rose-600/50 text-rose-400'
                  }`}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 7 — AD Object Persistence
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Storage in CAMO database with immutable audit log registration.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  diag?.stage7.adObjectSaved ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
                }`}>
                  {diag?.stage7.adObjectSaved ? 'STORED' : 'FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Record ID:</span>
                  <span className="text-slate-200 font-bold">{diag?.stage7.savedRecordId || requirement.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">AD Number Stored:</span>
                  <span className="text-white font-bold">{diag?.stage7.adNumberStored || requirement.sourceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Actions Count:</span>
                  <span className="text-slate-200">{diag?.stage7.extractedRequirementsStoredCount ?? (requirement.actions?.length || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Persistence Time:</span>
                  <span className="text-slate-200">{diag?.stage7.persistenceTimestamp ? new Date(diag.stage7.persistenceTimestamp).toLocaleTimeString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* STAGE 8: RULE ENGINE INPUT */}
            <div className="border border-slate-800 bg-slate-900/70 rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg border bg-indigo-950 border-indigo-600/50 text-indigo-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 8 — CAMO Applicability Rule Engine Execution
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Deterministic matching against registered aircraft, engines, and installed parts.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-indigo-950 text-indigo-300 border-indigo-600/40">
                  RULE ENGINE TRIGGERED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] mb-3">
                <div>
                  <span className="text-slate-500 block">Aircraft Models Extracted:</span>
                  <span className="text-white font-bold">
                    {diag?.stage8.aircraftModelsExtracted?.length ? diag.stage8.aircraftModelsExtracted.join(', ') : 'None / All Series'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">MSN / Serial Ranges:</span>
                  <span className="text-slate-200">{diag?.stage8.msnRangesExtracted || 'All serial numbers'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fleet Entities Evaluated:</span>
                  <span className="text-slate-200">{diag?.stage8.fleetEntitiesEvaluatedCount || 0} Aircraft / Engines</span>
                </div>
              </div>

              {diag?.stage8.assessmentsProducedCount !== undefined && diag.stage8.assessmentsProducedCount > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                  <div className="bg-emerald-950/30 border border-emerald-600/30 rounded p-2 text-emerald-300 flex justify-between items-center">
                    <span>Applicable:</span>
                    <strong className="font-bold">{diag.stage8.applicableCount || 0}</strong>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded p-2 text-slate-300 flex justify-between items-center">
                    <span>Not Applicable:</span>
                    <strong className="font-bold">{diag.stage8.notApplicableCount || 0}</strong>
                  </div>
                  <div className="bg-amber-950/30 border border-amber-600/30 rounded p-2 text-amber-300 flex justify-between items-center">
                    <span>Review Required:</span>
                    <strong className="font-bold">{diag.stage8.reviewRequiredCount || 0}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* STAGE 9: FINAL RESULT */}
            <div className={`border rounded-xl p-4 ${
              overallResult === 'EXTRACTED' ? 'bg-emerald-950/20 border-emerald-600/50' :
              overallResult === 'EXTRACTION_REVIEW_REQUIRED' ? 'bg-amber-950/20 border-amber-600/50' : 'bg-rose-950/20 border-rose-600/50'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    overallResult === 'EXTRACTED' ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400' :
                    overallResult === 'EXTRACTION_REVIEW_REQUIRED' ? 'bg-amber-950 border-amber-500/50 text-amber-400' : 'bg-rose-950 border-rose-500/50 text-rose-400'
                  }`}>
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Stage 9 — Final Extraction Pipeline Result
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Definitive compliance status for the ingestion workflow.
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-[11px] font-bold border font-mono uppercase ${badge.bg}`}>
                  {overallResult}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Diagnosis Summary:</span>
                  <span className="text-white font-bold">
                    {diag?.stage9.diagnosticSummary || (
                      overallResult === 'EXTRACTED' 
                        ? 'All extraction and schema validation rules passed successfully.'
                        : 'Extraction requires review due to missing technical parameters.'
                    )}
                  </span>
                </div>

                {diag?.stage9.failureStage && (
                  <div className="p-3 bg-rose-950/40 border border-rose-700/60 rounded-lg text-rose-300 text-[11px] font-mono flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Pipeline Halted at Stage {diag.stage9.failureStage}:</strong>
                      <p className="text-slate-300 text-xs mt-0.5 font-sans">
                        Extraction failed during this specific stage. Review the raw diagnostic logs above or retry extraction with an updated source document.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>Airworthiness Safety Standard FAR 39 & Part-M Pipeline Audit</span>
          </div>

          <div className="flex items-center space-x-2">
            {onRetryExtraction && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Retrying...' : 'Retry Extraction'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
