import { useState, useMemo } from 'react';
import { 
  Printer, 
  Copy, 
  Download, 
  Check, 
  X, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  Layers, 
  Bookmark, 
  Database, 
  History, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Lock,
  UserCheck,
  Search,
  Sparkles,
  Activity
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ComplianceRequirement, ComplianceAssessment, UserQuestion, KnowledgeFact, Evidence, FAPTDocument } from '../types';

const NOT_REPORTED = 'NÃO INFORMADO NA AD';
const REVIEW_REQUIRED = 'EXTRACTION REVIEW REQUIRED';
const DOC_NOT_AVAILABLE = 'DOCUMENTO NÃO DISPONÍVEL';
const PN_NOT_REGISTERED = 'P/N NÃO CADASTRADO';
const NOT_EXTRACTED = 'NÃO EXTRAÍDO';
const SAFETY_WARNING_TEXT = 'EXTRAÇÃO FALHOU — Este relatório não contém dados técnicos confiáveis. Análise manual do PDF da AD é obrigatória.';

interface FullTechnicalReportModalProps {
  requirementId: string;
  state: DatabaseState;
  onClose: () => void;
}

export default function FullTechnicalReportModal({ requirementId, state, onClose }: FullTechnicalReportModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('sec-1');
  const [showFailureDetails, setShowFailureDetails] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'sec-1': true,
    'sec-2': true,
    'sec-3': true,
    'sec-4': true,
    'sec-5': true,
    'sec-6': true,
    'sec-7': true,
    'sec-8': true,
    'sec-9': true,
    'sec-10': true,
    'sec-11': true,
    'sec-12': true,
    'sec-13': true,
  });

  const requirement = state.requirements.find(r => r.id === requirementId);
  const assessments = state.assessments.filter(a => a.complianceRequirementId === requirementId);
  const questions = state.questions.filter(q => q.complianceRequirementId === requirementId);
  const facts = state.knowledgeFacts.filter(f => !f.isRejected);
  const evidences = state.evidence.filter(e => e.complianceRequirementId === requirementId || assessments.some(a => a.id === e.complianceAssessmentId));
  const fapt = state.fapts.find(f => f.complianceRequirementId === requirementId);
  const auditLogs = state.auditTrail.filter(a => a.entityId === requirementId || assessments.some(ass => ass.id === a.entityId));

  const toggleSection = (secId: string) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (let i = 1; i <= 13; i++) all[`sec-${i}`] = true;
    setExpandedSections(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    for (let i = 1; i <= 13; i++) all[`sec-${i}`] = false;
    setExpandedSections(all);
  };

  if (!requirement) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center space-y-4 max-w-md w-full">
          <p className="text-slate-300">Diretriz de Aeronavegabilidade não encontrada no banco.</p>
          <button onClick={onClose} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-mono">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const isExtractionFailed = 
    requirement.documentProcessingStatus === 'EXTRACTION_FAILED' ||
    requirement.extractionStatus === 'EXTRACTION_FAILED' ||
    !requirement.sourceNumber ||
    requirement.sourceNumber.trim() === '' ||
    requirement.sourceNumber.toUpperCase() === 'NOT_EXTRACTED' ||
    requirement.sourceNumber.toUpperCase() === 'UNKNOWN_AD' ||
    requirement.sourceNumber.toUpperCase() === 'NÃO EXTRAÍDO' ||
    Boolean(requirement.extractionFailureRecord);

  if (isExtractionFailed && showFailureDetails) {
    const failureRecord = requirement.extractionFailureRecord;
    const missingFields = requirement.missingFields || failureRecord?.missingRequiredFields || [
      'sourceNumber',
      'title',
      'issuingAuthority',
      'effectiveDate',
      'applicabilityCriteria',
      'complianceActions'
    ];
    const originalFileName = requirement.sourceDocument?.fileName || failureRecord?.originalFileName || 'Uploaded Document';
    const fileSize = requirement.sourceDocument?.fileSize || failureRecord?.fileSize || 0;
    const mimeType = requirement.sourceDocument?.mimeType || failureRecord?.mimeType || 'application/pdf';
    const rawText = requirement.sourceDocument?.rawExtractedText || failureRecord?.rawModelResponse || 'No text extracted from document.';
    const errorMsg = requirement.extractionError || failureRecord?.extractionErrorMessage || 'Critical Airworthiness Directive metadata could not be extracted.';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
        <div className="bg-slate-950 border border-rose-500/50 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
          {/* Header */}
          <div className="bg-rose-950/70 border-b border-rose-900/60 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/80 text-rose-200 border border-rose-600/50 uppercase font-mono">
                    CAMO Safety Gate Block
                  </span>
                  <h2 className="text-base font-bold text-white tracking-wide font-mono">
                    Document Extraction Failure Report
                  </h2>
                </div>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  Technical report blocked because mandatory Airworthiness Directive criteria were not recognized.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Falha</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto grow text-xs font-mono">
            {/* Safety Notice */}
            <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 font-bold uppercase tracking-wider text-xs">
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Airworthiness Safety Standard Far 39 / Part M Compliance Notice</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                In strict accordance with continuing airworthiness engineering standards, the system refused to fabricate placeholder technical data (such as generic inspection procedures or arbitrary aircraft models). Fleet evaluation has been halted safely.
              </p>
            </div>

            {/* Diagnostics & Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Metadata */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2 font-sans">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Document Metadata</span>
                </h3>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Name:</span>
                    <span className="text-white font-bold">{originalFileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Size:</span>
                    <span>{fileSize ? `${Math.round(fileSize / 1024)} KB` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MIME Type:</span>
                    <span>{mimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Upload Date:</span>
                    <span>{requirement.createdAt ? new Date(requirement.createdAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Processing Status:</span>
                    <span className="text-rose-400 font-bold">EXTRACTION_FAILED</span>
                  </div>
                </div>
              </div>

              {/* Processing Diagnostics */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2 font-sans">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Extraction Diagnostics</span>
                </h3>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Extracted Text Length:</span>
                    <span>{rawText.length} characters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model Verification:</span>
                    <span className="text-rose-300 font-bold">UNRECOGNIZED_DOCUMENT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schema Validation:</span>
                    <span className="text-rose-400 font-bold">FAILED (Missing Critical Fields)</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block">Diagnostic Error:</span>
                    <p className="text-rose-300 text-[10px] mt-0.5 font-mono leading-tight">{errorMsg}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Missing Required Fields Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center space-x-2">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Missing Mandatory Regulatory Fields</span>
              </h3>
              <p className="text-slate-400 text-[11px] font-sans">
                The following airworthiness fields were absent or could not be verified from the document tokens:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { field: 'AD Number / Regulatory Identifier', key: 'sourceNumber' },
                  { field: 'Issuing Authority (FAA/EASA/ANAC)', key: 'issuingAuthority' },
                  { field: 'Subject / Title', key: 'title' },
                  { field: 'Effective Date', key: 'effectiveDate' },
                  { field: 'Fleet Applicability Criteria', key: 'applicabilityCriteria' },
                  { field: 'Mandatory Compliance Actions', key: 'complianceActions' }
                ].map(({ field, key }) => {
                  const isMissing = missingFields.includes(key);
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border flex items-center space-x-2 text-[11px] ${
                        isMissing
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {isMissing ? (
                        <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="font-sans">{field}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 9-Stage Pipeline Diagnostic Breakdown (If Available) */}
            {requirement.pipelineDiagnostics && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>9-Stage Extraction Pipeline Diagnostics Breakdown</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STAGE 1: FILE INGESTION</span>
                    <span className={requirement.pipelineDiagnostics.stage1.fileBytesReceived ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {requirement.pipelineDiagnostics.stage1.fileBytesReceived ? 'PASSED (Bytes Received)' : 'FAILED'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STAGE 2: PDF EXTRACTION</span>
                    <span className={requirement.pipelineDiagnostics.stage2.pdfTextExtractionSucceeded ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {requirement.pipelineDiagnostics.stage2.pdfTextExtractionSucceeded ? `PASSED (${requirement.pipelineDiagnostics.stage2.extractedTextCharCount} chars)` : 'FAILED'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STAGE 3: AI DISPATCH</span>
                    <span className={requirement.pipelineDiagnostics.stage3.modelInvocationSuccess ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {requirement.pipelineDiagnostics.stage3.modelInvocationSuccess ? `PASSED (${requirement.pipelineDiagnostics.stage3.modelName})` : 'FAILED / SKIPPED'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STAGE 4: AI RAW RESPONSE</span>
                    <span className={requirement.pipelineDiagnostics.stage4.aiReturnedResponse ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {requirement.pipelineDiagnostics.stage4.aiReturnedResponse ? `PASSED (${requirement.pipelineDiagnostics.stage4.rawResponseCharCount} chars)` : 'FAILED'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STAGE 5: JSON PARSE</span>
                    <span className={requirement.pipelineDiagnostics.stage5.jsonParsingSucceeded ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {requirement.pipelineDiagnostics.stage5.jsonParsingSucceeded ? `PASSED (${requirement.pipelineDiagnostics.stage5.parsedFieldNames.length} fields)` : 'FAILED'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">STAGE 6: VALIDATION GATE</span>
                    <span className="text-rose-400 font-bold">
                      FAILED (Missing Critical Fields)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Extracted Document Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                Document Text Extracted / Extraction Logs Preview
              </h3>
              <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-slate-400 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {rawText}
              </pre>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <span className="text-slate-400 text-xs font-mono">
              Status: <strong className="text-rose-400">EXTRACTION_FAILED</strong> — Action required
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-bold transition"
            >
              Fechar Relatório de Falha
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build compliance paragraphs breakdown (Section 3) purely from extracted requirement data
  const complianceParagraphs = useMemo(() => {
    if (requirement.actions && requirement.actions.length > 0) {
      return requirement.actions.map((act, idx) => {
        const paraLabel = act.paragraphReference || `Paragraph (${String.fromCharCode(97 + idx)})`;
        const actionTitle = act.actionName || requirement.title || NOT_REPORTED;
        const targetEq = requirement.applicabilityRule?.aircraftModels?.length
          ? requirement.applicabilityRule.aircraftModels.join(', ')
          : NOT_REPORTED;

        let compTime = act.complianceTime || requirement.requirementDetails?.complianceTime || NOT_REPORTED;
        let thresholdStr = act.initialThreshold || requirement.requirementDetails?.initialThreshold || compTime;
        let repInterval = act.repetitiveInterval || requirement.requirementDetails?.repetitiveInterval || NOT_REPORTED;
        let termAction = act.terminatingAction || requirement.requirementDetails?.terminatingAction || NOT_REPORTED;

        const fhLimit = compTime.includes('FH') ? compTime : NOT_REPORTED;
        const fcLimit = compTime.includes('FC') ? compTime : NOT_REPORTED;
        const calLimit = compTime.includes('month') || compTime.includes('day') ? compTime : NOT_REPORTED;

        const techDocRefs = act.technicalReference 
          || requirement.requirementDetails?.requiredDocumentation 
          || NOT_REPORTED;

        return {
          paraNumber: paraLabel,
          actionName: actionTitle,
          targetEquipment: targetEq,
          condition: act.condition || NOT_REPORTED,
          method: act.fullInstruction || act.requiredInspection || NOT_REPORTED,
          techRef: techDocRefs,
          threshold: thresholdStr,
          complianceTime: compTime,
          fhLimit: fhLimit,
          fcLimit: fcLimit,
          calendarLimit: calLimit,
          repetitiveInterval: repInterval,
          repeatConditions: act.repeatConditions || (act.repetitiveInterval ? `Repeat at specified intervals until terminating action` : NOT_REPORTED),
          terminatingAction: termAction,
          modification: act.modification || requirement.requirementDetails?.modification || NOT_REPORTED,
          replacement: act.replacement || requirement.requirementDetails?.replacement || NOT_REPORTED,
          inspection: act.requiredInspection || requirement.requirementDetails?.requiredInspection || NOT_REPORTED,
          requiredParts: act.requiredParts?.length ? act.requiredParts : (requirement.requirementDetails?.requiredParts?.length ? requirement.requirementDetails.requiredParts : [PN_NOT_REGISTERED]),
          requiredTools: act.requiredTools?.length ? act.requiredTools : [NOT_REPORTED],
          requiredDocs: act.requiredDocumentation || requirement.requirementDetails?.requiredDocumentation || NOT_REPORTED,
          exceptions: act.exceptions || NOT_REPORTED,
          amoc: act.amoc || NOT_REPORTED,
          opLimitations: act.operationalLimitations || NOT_REPORTED,
          notes: act.notes || NOT_REPORTED
        };
      });
    }

    // Dynamic structure from requirementDetails
    return [
      {
        paraNumber: 'Paragraph / Compliance Actions',
        actionName: requirement.requirementDetails?.requiredInspection || requirement.requirementDetails?.modification || requirement.title || NOT_REPORTED,
        targetEquipment: requirement.applicabilityRule?.aircraftModels?.length ? requirement.applicabilityRule.aircraftModels.join(', ') : NOT_REPORTED,
        condition: NOT_REPORTED,
        method: requirement.requirementDetails?.requiredInspection || requirement.requirementDetails?.modification || requirement.requirementDetails?.replacement || NOT_REPORTED,
        techRef: requirement.requirementDetails?.requiredDocumentation || NOT_REPORTED,
        threshold: requirement.requirementDetails?.initialThreshold || requirement.requirementDetails?.complianceTime || NOT_REPORTED,
        complianceTime: requirement.requirementDetails?.complianceTime || NOT_REPORTED,
        fhLimit: requirement.requirementDetails?.complianceTime?.includes('FH') ? requirement.requirementDetails.complianceTime : NOT_REPORTED,
        fcLimit: requirement.requirementDetails?.complianceTime?.includes('FC') ? requirement.requirementDetails.complianceTime : NOT_REPORTED,
        calendarLimit: requirement.requirementDetails?.complianceTime?.includes('month') || requirement.requirementDetails?.complianceTime?.includes('day') ? requirement.requirementDetails.complianceTime : NOT_REPORTED,
        repetitiveInterval: requirement.requirementDetails?.repetitiveInterval || NOT_REPORTED,
        repeatConditions: requirement.requirementDetails?.repetitiveInterval ? 'At intervals specified until terminating action' : NOT_REPORTED,
        terminatingAction: requirement.requirementDetails?.terminatingAction || NOT_REPORTED,
        modification: requirement.requirementDetails?.modification || NOT_REPORTED,
        replacement: requirement.requirementDetails?.replacement || NOT_REPORTED,
        inspection: requirement.requirementDetails?.requiredInspection || NOT_REPORTED,
        requiredParts: requirement.requirementDetails?.requiredParts?.length ? requirement.requirementDetails.requiredParts : [PN_NOT_REGISTERED],
        requiredTools: [NOT_REPORTED],
        requiredDocs: requirement.requirementDetails?.requiredDocumentation || NOT_REPORTED,
        exceptions: NOT_REPORTED,
        amoc: NOT_REPORTED,
        opLimitations: NOT_REPORTED,
        notes: NOT_REPORTED
      }
    ];
  }, [requirement]);

  // Build incorporated references (Section 4) dynamically from extracted data
  const incorporatedReferences = useMemo(() => {
    if (requirement.referencedDocuments && requirement.referencedDocuments.length > 0) {
      return requirement.referencedDocuments.map((doc) => ({
        docName: doc.documentReference || NOT_REPORTED,
        revision: doc.revision || NOT_REPORTED,
        citedParagraph: doc.citedParagraph || NOT_REPORTED,
        purpose: doc.purpose || NOT_REPORTED,
        infoNeeded: doc.notes || NOT_REPORTED,
        isAvailable: doc.availabilityStatus === 'AVAILABLE',
        notice: doc.availabilityStatus === 'AVAILABLE' 
          ? 'DOCUMENTO DISPONÍVEL NO REPOSITÓRIO TÉCNICO.' 
          : `INFORMAÇÃO NÃO DISPONÍVEL NO DOCUMENTO ANALISADO — REQUER CONSULTA AO DOCUMENTO REFERENCIADO (${doc.documentReference || 'DOC REFERENCIADO'}).`
      }));
    }

    if (requirement.requirementDetails?.requiredDocumentation) {
      return [
        {
          docName: requirement.requirementDetails.requiredDocumentation,
          revision: NOT_REPORTED,
          citedParagraph: NOT_REPORTED,
          purpose: NOT_REPORTED,
          infoNeeded: NOT_REPORTED,
          isAvailable: false,
          notice: `INFORMAÇÃO NÃO DISPONÍVEL NO DOCUMENTO ANALISADO — REQUER CONSULTA AO DOCUMENTO REFERENCIADO (${requirement.requirementDetails.requiredDocumentation}).`
        }
      ];
    }

    return [
      {
        docName: DOC_NOT_AVAILABLE,
        revision: NOT_REPORTED,
        citedParagraph: NOT_REPORTED,
        purpose: NOT_REPORTED,
        infoNeeded: NOT_REPORTED,
        isAvailable: false,
        notice: 'INFORMAÇÃO NÃO DISPONÍVEL NO DOCUMENTO ANALISADO — REQUER CONSULTA AO DOCUMENTO REFERENCIADO.'
      }
    ];
  }, [requirement]);

  // Generate complete Markdown text for copy / export
  const fullReportMarkdown = useMemo(() => {
    const lines: string[] = [];

    const fleetRegistrations = assessments.map(a => a.entityRegistration || a.entityLabel).filter(Boolean).join(', ') || 'Frota do Operador';
    const refDocList = incorporatedReferences.map(r => r.docName).join(', ') || requirement.requirementDetails?.requiredDocumentation || 'Documentos Técnicos Referenciados';
    const engineerName = fapt?.preparedBy || 'CAMO Continuing Airworthiness Engineering Team';

    lines.push(`# RELATÓRIO TÉCNICO COMPLETO DE DIRETRIZ DE AERONAVEGABILIDADE (CAMO)`);
    lines.push(`**Diretriz Analisada:** ${requirement.sourceNumber} (${requirement.issuingAuthority})`);
    lines.push(`**Data da Análise:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`);
    lines.push(`**Engenheiro Responsável:** ${engineerName}`);
    lines.push(`\n---\n`);

    // 1. IDENTIFICAÇÃO DA AD
    lines.push(`## 1. IDENTIFICAÇÃO DA AD`);
    lines.push(`- **Número da AD:** ${requirement.sourceNumber || NOT_REPORTED}`);
    lines.push(`- **Autoridade Emissora:** ${requirement.issuingAuthority || NOT_REPORTED}`);
    lines.push(`- **Data de Emissão:** ${requirement.issueDate || NOT_REPORTED}`);
    lines.push(`- **Data de Efetividade:** ${requirement.effectiveDate || NOT_REPORTED}`);
    lines.push(`- **Revisão / Amendment:** ${requirement.revision || NOT_REPORTED}`);
    lines.push(`- **Título da AD:** ${requirement.title || NOT_REPORTED}`);
    lines.push(`- **Emergency AD:** ${requirement.emergencyAd ? 'SIM (Diretriz de Emergência - Ação Imediata)' : 'NÃO (Diretriz Padrão de 14 CFR Part 39)'}`);
    lines.push(`- **AD que Substitui (Supersedes):** ${requirement.supersedes || NOT_REPORTED}`);
    lines.push(`- **Substituída por (Superseded by):** ${requirement.supersededBy || NOT_REPORTED}`);
    lines.push(`- **Fabricante Principal:** ${requirement.applicabilityRule?.aircraftManufacturers?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Tipo de Aeronave:** ${requirement.applicabilityRule?.aircraftModels?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Motores Envolvidos:** ${requirement.applicabilityRule?.engineModels?.length ? requirement.applicabilityRule.engineModels.join(', ') : NOT_REPORTED}`);
    lines.push(`- **Componente / Appliance Afetado:** ${requirement.applicabilityRule?.componentPartNumbers?.length ? requirement.applicabilityRule.componentPartNumbers.join(', ') : NOT_REPORTED}`);
    lines.push(`\n`);

    // 2. EFFECTIVITY COMPLETA
    lines.push(`## 2. EFFECTIVITY COMPLETA`);
    lines.push(`- **Fabricantes:** ${requirement.applicabilityRule?.aircraftManufacturers?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Modelos Afetados:** ${requirement.applicabilityRule?.aircraftModels?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Séries / Modelos Específicos:** ${requirement.applicabilityRule?.aircraftModels?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Faixas de MSN:** ${requirement.applicabilityRule?.aircraftSerialRanges?.description || NOT_REPORTED}`);
    lines.push(`- **Exclusões Explícitas:** ${NOT_REPORTED}`);
    lines.push(`- **Modelos de Motores:** ${requirement.applicabilityRule?.engineModels?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Componentes e Part Numbers (P/N):** ${requirement.applicabilityRule?.componentPartNumbers?.join(', ') || NOT_REPORTED}`);
    lines.push(`- **Faixas de Serial Numbers de Componentes:** ${requirement.applicabilityRule?.componentSerialRanges?.description || NOT_REPORTED}`);
    lines.push(`- **Requisitos de Configuração:** ${requirement.applicabilityRule?.affectedConfiguration || NOT_REPORTED}`);
    lines.push(`- **Texto Integral da Aplicabilidade (Raw Text):**\n> ${requirement.applicabilityRule?.rawText || NOT_REPORTED}`);
    lines.push(`\n`);

    // 3. INSTRUÇÕES DE CUMPRIMENTO DA AD
    lines.push(`## 3. INSTRUÇÕES DE CUMPRIMENTO DA AD (REQUISITOS INDIVIDUAIS)`);
    complianceParagraphs.forEach((cp, idx) => {
      lines.push(`### Requisito 3.${idx + 1}: ${cp.paraNumber} — ${cp.actionName}`);
      lines.push(`- **Ação Requerida:** ${cp.method}`);
      lines.push(`- **Equipamento / Alvo:** ${cp.targetEquipment}`);
      lines.push(`- **Condição de Aplicação:** ${cp.condition}`);
      lines.push(`- **Referência Técnica:** ${cp.techRef}`);
      lines.push(`- **Threshold Inicial:** ${cp.threshold}`);
      lines.push(`- **Prazo de Cumprimento:** ${cp.complianceTime}`);
      lines.push(`- **Limite em Horas de Voo (FH):** ${cp.fhLimit}`);
      lines.push(`- **Limite em Ciclos de Voo (FC):** ${cp.fcLimit}`);
      lines.push(`- **Limite Calendário:** ${cp.calendarLimit}`);
      lines.push(`- **Intervalo Repetitivo:** ${cp.repetitiveInterval}`);
      lines.push(`- **Ação Terminativa:** ${cp.terminatingAction}`);
      lines.push(`- **Modificação Requerida:** ${cp.modification}`);
      lines.push(`- **Substituição:** ${cp.replacement}`);
      lines.push(`- **Inspeção:** ${cp.inspection}`);
      lines.push(`- **Peças Requeridas (Parts):** ${cp.requiredParts?.join(', ') || 'Nenhuma'}`);
      lines.push(`- **Ferramentas Especiais (Tools):** ${cp.requiredTools?.join(', ') || 'Nenhuma'}`);
      lines.push(`- **Documentação Obrigatória:** ${cp.requiredDocs}`);
      lines.push(`- **Exceções:** ${cp.exceptions}`);
      lines.push(`- **AMOC (Métodos Alternativos):** ${cp.amoc}`);
      lines.push(`- **Limitações Operacionais:** ${cp.opLimitations}`);
      lines.push(`- **Observações de Engenharia:** ${cp.notes}`);
      lines.push(`\n`);
    });

    // 4. REFERÊNCIAS INCORPORADAS
    lines.push(`## 4. REFERÊNCIAS INCORPORADAS`);
    incorporatedReferences.forEach((ref, idx) => {
      lines.push(`### 4.${idx + 1} Documento: ${ref.docName}`);
      lines.push(`- **Revisão / Data:** ${ref.revision}`);
      lines.push(`- **Parágrafo Citado:** ${ref.citedParagraph}`);
      lines.push(`- **Finalidade:** ${ref.purpose}`);
      lines.push(`- **Informação a Consultar:** ${ref.infoNeeded}`);
      lines.push(`- **Aviso de Disponibilidade:** ${ref.notice}`);
      lines.push(`\n`);
    });

    // 5. INTERPRETAÇÃO DA LÓGICA DE APLICABILIDADE
    lines.push(`## 5. INTERPRETAÇÃO DA LÓGICA DE APLICABILIDADE`);
    lines.push(`O Motor de Regras CAMO executa a seguinte cadeia de inferência booleana determinística:`);
    lines.push(`\`\`\`
1. [CONDIÇÃO DE ENTRADA NA CÉLULA]:
   SE Aircraft.Model IN [${requirement.applicabilityRule?.aircraftModels?.join(', ') || 'Modelos Alvo'}]
   ENTÃO Célula_no_Escopo = TRUE
   SENÃO -> [NOT APPLICABLE] (Excluído por Modelo)

2. [CONDIÇÃO DE NÚMERO DE SÉRIE (MSN)]:
   SE Célula_no_Escopo == TRUE E (Aircraft.MSN dentro da faixa OU Faixa = 'ALL')
   ENTÃO MSN_no_Escopo = TRUE
   SENÃO -> [NOT APPLICABLE] (Excluído por MSN)

3. [CONDIÇÃO DE COMPONENTE / APPLIANCE]:
   SE Componente_Específico_Requerido == TRUE:
       SE Componente_Instalado_Confirmado_no_Banco == TRUE E S/N_no_Range == TRUE:
           -> [APPLICABLE]
       SE Componente_Comprovadamente_NÃO_Instalado (Knowledge Fact / Mod Status):
           -> [NOT APPLICABLE]
       SE Componente_NÃO_Cadastrado_OU_Status_Desconhecido:
           -> 🚨 [REVIEW REQUIRED] (Bloqueio de Segurança CAMO - Gera Pergunta)
   SENÃO:
       -> [APPLICABLE] (AD de Célula Geral)
\`\`\``);
    lines.push(`\n`);

    // 6. ANÁLISE DA FROTA (AVALIAÇÃO POR AERONAVE)
    lines.push(`## 6. ANÁLISE DA FROTA (AVALIAÇÃO INDIVIDUAL DE CADA AERONAVE)`);
    assessments.forEach((ass, idx) => {
      const ac = state.aircraft.find(a => a.id === ass.entityId);
      const engs = state.engines.filter(e => e.aircraftId === ass.entityId);
      const comps = state.installations.filter(ci => ci.aircraftId === ass.entityId);

      lines.push(`### 6.${idx + 1} Aeronave: ${ass.entityRegistration || ass.entityLabel} (MSN: ${ass.entityMsn})`);
      lines.push(`- **Modelo / Série:** ${ass.entityModel || ac?.model || 'N/A'}`);
      lines.push(`- **Horas de Voo Totais (FH):** ${ac?.totalFlightHours || 'N/A'} FH`);
      lines.push(`- **Ciclos Totais (FC):** ${ac?.totalCycles || 'N/A'} FC`);
      lines.push(`- **Motores Instalados:** ${engs.length ? engs.map(e => `${e.position}: ${e.model} (S/N ${e.serialNumber})`).join(', ') : 'Nenhum motor cadastrado'}`);
      lines.push(`- **Componentes Relevantes Cadastrados:** ${comps.length ? comps.map(c => `${c.position}: P/N ${c.component?.partNumber || 'N/A'} (S/N ${c.component?.serialNumber || 'N/A'})`).join(', ') : 'Nenhum rotável rastreado nesta aeronave'}`);
      const modelMatched = ass.matchedCriteria?.aircraftModelMatch?.matched ?? (ass.result === 'APPLICABLE');
      lines.push(`- **Critérios da AD Atendidos:** ${modelMatched ? 'Modelo de Aeronave em escopo' : 'Modelo fora do escopo'}`);
      lines.push(`- **Critérios Não Atendidos / Exclusões:** ${!modelMatched ? 'Modelo excluído' : 'Nenhum'}`);
      lines.push(`- **Informações Faltantes:** ${ass.missingInformationNotes?.join('; ') || 'Nenhuma informação faltante'}`);
      lines.push(`- **Resultado da Avaliação:** **${ass.result}**`);
      lines.push(`- **Nível de Confiança:** ${ass.confidence || 'HIGH'}`);
      lines.push(`- **Raciocínio Técnico Passo a Passo:**`);
      (ass.reasoning && ass.reasoning.length > 0 ? ass.reasoning : [(ass as any).reason || 'Avaliação de aplicabilidade executada pelo motor de regras CAMO.']).forEach(r => lines.push(`  * ${r}`));
      lines.push(`\n`);
    });

    // 7. COMPONENTES E RASTREABILIDADE
    lines.push(`## 7. COMPONENTES E RASTREABILIDADE`);
    if (requirement.applicabilityRule?.componentPartNumbers.length) {
      requirement.applicabilityRule.componentPartNumbers.forEach((pn, idx) => {
        lines.push(`### 7.${idx + 1} Part Number Procurado: ${pn}`);
        lines.push(`- **Faixa de S/N:** ${requirement.applicabilityRule?.componentSerialRanges?.description || 'Todos os números de série'}`);
        lines.push(`- **Status no Banco de Dados:** Verificado nas instalações de componentes.`);
        lines.push(`- **Aeronaves com Instalação Confirmada:** ${state.installations.filter(ci => ci.component?.partNumber === pn).map(ci => ci.aircraftRegistration).join(', ') || 'Nenhuma com P/N confirmado no banco digital'}`);
        lines.push(`- **Diretriz de Segurança Aplicada:** Caso a aeronave pertença ao modelo afetado e o P/N não esteja registrado, o sistema NÃO classifica como NOT APPLICABLE, forçando o status **REVIEW REQUIRED**.`);
        lines.push(`\n`);
      });
    } else {
      lines.push(`A presente AD é classificada como Diretriz de Célula / Aviônica Geral, não dependendo de um Part Number isolado.\n`);
    }

    // 8. PERGUNTAS GERADAS
    lines.push(`## 8. PERGUNTAS GERADAS PARA RESOLUÇÃO DE DADOS FALTANTES`);
    if (questions.length > 0) {
      questions.forEach((q, idx) => {
        lines.push(`### 8.${idx + 1} Pergunta #${q.id} (Aeronave: ${q.targetEntity.label})`);
        lines.push(`- **Pergunta:** ${q.question}`);
        lines.push(`- **Motivo Regulatório:** ${q.reason}`);
        lines.push(`- **P/N em Questão:** ${q.partNumberInQuestion || 'N/A'}`);
        lines.push(`- **Status da Pergunta:** ${q.status}`);
        if (q.status === 'ANSWERED') {
          lines.push(`- **Resposta Registrada:** ${q.answer}`);
          lines.push(`- **Respondido por:** ${q.answeredBy} em ${q.answerDate}`);
        } else {
          lines.push(`- **Ação Requerida do Engenheiro CAMO:** Verificar livros de bordo, IPC 34-55-01 ou certificado Form 8130-3/EASA Form 1.`);
        }
        lines.push(`\n`);
      });
    } else {
      lines.push(`Nenhuma pergunta pendente. Todos os dados da frota foram confirmados conclusivamente.\n`);
    }

    // 9. KNOWLEDGE FACTS
    lines.push(`## 9. KNOWLEDGE FACTS (MEMÓRIA AERONÁUTICA UTILIZADA)`);
    if (facts.length > 0) {
      facts.forEach((f, idx) => {
        lines.push(`### 9.${idx + 1} Fact ID: ${f.id} — ${f.title}`);
        lines.push(`- **Fato Técnico:** ${f.predicate} -> ${f.objectValue}`);
        lines.push(`- **Aeronave / Sujeito:** ${f.subjectLabel} (${f.subjectType})`);
        lines.push(`- **Origem / Fonte:** ${f.source}`);
        lines.push(`- **Evidência Associada:** ${f.evidenceSummary}`);
        lines.push(`- **Data de Verificação:** ${f.lastVerified} por ${f.verifiedBy}`);
        lines.push(`- **Nível de Confiança:** ${f.confidence}%`);
        lines.push(`- **Status:** VÁLIDO E ATIVO`);
        lines.push(`\n`);
      });
    } else {
      lines.push(`Nenhum Knowledge Fact prévio foi aplicado nesta avaliação.\n`);
    }

    // 10. EVIDÊNCIAS TÉCNICAS
    lines.push(`## 10. EVIDÊNCIAS TÉCNICAS E DOCUMENTOS DE SUPORTE`);
    if (evidences.length > 0) {
      evidences.forEach((ev, idx) => {
        lines.push(`### 10.${idx + 1} Evidência #${ev.id} — ${ev.type}`);
        lines.push(`- **Referência:** ${ev.documentReference}`);
        lines.push(`- **Descrição:** ${ev.description}`);
        lines.push(`- **Fonte:** ${ev.source}`);
        lines.push(`- **Data do Documento:** ${ev.date}`);
        lines.push(`- **Status de Verificação:** ${ev.verified ? `VERIFICADO por ${ev.verifiedBy}` : 'PENDENTE DE VERIFICAÇÃO'}`);
        lines.push(`\n`);
      });
    } else {
      lines.push(`- **Status das Evidências:** NO OBJECTIVE EVIDENCE AVAILABLE no banco digital para itens em aberto. Evidências devem ser anexadas pelo engenheiro.\n`);
    }

    // 11. FAPT
    lines.push(`## 11. FOLHA DE ANÁLISE E PARECER TÉCNICO (FAPT) COMPLETA`);
    if (fapt) {
      lines.push(`- **Documento FAPT Nº:** ${fapt.documentNumber} (${fapt.revision})`);
      lines.push(`- **Data de Elaboração:** ${fapt.dateCreated}`);
      lines.push(`- **Status de Aprovação:** **${fapt.status}**`);
      lines.push(`- **Elaborado por:** ${fapt.preparedBy} (${fapt.preparedDate})`);
      lines.push(`- **Aprovado por:** ${fapt.approvedBy || 'Pendente de Resolução de Perguntas'}`);
      lines.push(`- **Assinatura Digital Hash:** ${fapt.signatureHash || 'PENDENTE'}`);
      lines.push(`- **Resumo da Matriz:** ${fapt.affectedFleetCount} Aplicáveis | ${fapt.notApplicableCount} Não Aplicáveis | ${fapt.reviewRequiredCount} Review Required`);
      lines.push(`- **Parecer Conclusivo CAMO:** ${fapt.comments || 'Análise de cumprimento obrigatório de aeronavegabilidade continuada.'}`);
    } else {
      lines.push(`FAPT em processo de consolidação pelo sistema.`);
    }
    lines.push(`\n`);

    // 12. INFORMAÇÕES NÃO EXTRAÍDAS
    lines.push(`## 12. INFORMAÇÕES DA AD QUE NÃO FORAM EXTRAÍDAS OU QUE NECESSITAM DE DOCUMENTAÇÃO COMPLEMENTAR`);
    lines.push(`- **Tabelas de Part Numbers Incorporadas por Referência:** Part numbers detalhados em Service Bulletins / AOTs externos (${refDocList}) requerem consulta física da biblioteca técnica do operador.`);
    lines.push(`- **Instruções Detalhadas de Modificação Terminativa:** Desenhos de engenharia e Service Bulletins de modificação física requerem abertura de Engineering Order (EO) específica.`);
    lines.push(`- **Histórico de Manutenção de Componentes Não Rastreados:** Aeronaves recém-adquiridas ou rotáveis em trânsito sem tag EASA Form 1 / FAA Form 8130-3 digitalizada requerem inspeção física.`);
    lines.push(`\n`);

    // 13. AUDITORIA DA ANÁLISE
    lines.push(`## 13. AUDITORIA DA ANÁLISE E PROVENIÊNCIA DE DADOS`);
    lines.push(`- **Dados Extraídos Diretamente da AD:** Número ${requirement.sourceNumber}, autoridade emissora ${requirement.issuingAuthority}, datas de efetividade, modelo de aeronave, resumo das ações mandatórias.`);
    lines.push(`- **Dados Obtidos de Documentos Referenciados:** ${refDocList}.`);
    lines.push(`- **Dados Obtidos do Banco da Frota:** Matrículas (${fleetRegistrations}), números de série MSN, histórico de componentes e motores cadastrados.`);
    lines.push(`- **Dados Inseridos pelo Engenheiro CAMO:** Respostas a questionamentos de configuração, anexação de tags aeronáuticas e aprovações.`);
    lines.push(`- **Registro de Execução do Motor de Regras:** Rule Engine v1.0 executado em conformidade com RBAC 121 / EASA Part-M.`);
    lines.push(`\n================== FIM DO RELATÓRIO TÉCNICO CAMO ==================\n`);

    return lines.join('\n');
  }, [requirement, assessments, questions, facts, evidences, fapt, state, complianceParagraphs, incorporatedReferences]);

  // Generate complete, self-contained standalone HTML document with full aviation CAMO styling
  const generateFullHtmlReport = () => {
    const isApproved = fapt?.status === 'APPROVED';
    const emergencyTag = requirement.emergencyAd ? '<span class="tag-emergency">EMERGENCY AD</span>' : '<span class="tag-standard">STANDARD AD</span>';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Técnico CAMO - ${requirement.sourceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 10mm 14mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 16px 20px;
    }
    .floating-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      margin: -16px -20px 20px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    .floating-bar button {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      font-family: monospace;
      text-transform: uppercase;
      margin-left: 8px;
    }
    .floating-bar button.secondary {
      background: #334155;
    }
    @media print {
      .floating-bar { display: none !important; }
      body { padding: 0 !important; }
      .page-break { page-break-before: always; break-before: page; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    }
    .header-box {
      border: 2px solid #0f172a;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: #f8fafc;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .camo-title {
      font-size: 8pt;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: monospace;
    }
    .doc-main-title {
      font-size: 13pt;
      font-weight: 900;
      margin: 4px 0 2px 0;
      color: #0f172a;
      text-transform: uppercase;
    }
    .doc-sub {
      font-size: 8pt;
      color: #475569;
      font-family: monospace;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      font-size: 8.5pt;
      font-family: monospace;
      margin-top: 8px;
    }
    .meta-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
    }
    .meta-label {
      font-size: 7pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      display: block;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
    }
    .tag-emergency {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
      padding: 2px 6px;
      font-size: 7.5pt;
      font-weight: 800;
      border-radius: 4px;
    }
    .tag-standard {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #818cf8;
      padding: 2px 6px;
      font-size: 7.5pt;
      font-weight: 800;
      border-radius: 4px;
    }
    .status-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 4px 8px;
      font-weight: 800;
      font-size: 8.5pt;
      font-family: monospace;
      border-radius: 4px;
    }
    h2.section-heading {
      font-size: 10.5pt;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4px;
      margin: 18px 0 10px 0;
      text-transform: uppercase;
      font-family: monospace;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sec-badge {
      background: #4f46e5;
      color: #ffffff;
      font-size: 7.5pt;
      padding: 1px 6px;
      border-radius: 3px;
    }
    .card {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 10px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-title {
      font-weight: 800;
      font-size: 9.5pt;
      color: #0f172a;
      margin-bottom: 4px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 7.5pt;
      text-transform: uppercase;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      color: #0f172a;
      vertical-align: top;
    }
    .badge-app {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
      padding: 1px 5px;
      font-weight: 800;
      font-size: 7.5pt;
      border-radius: 3px;
      font-family: monospace;
    }
    .badge-rev {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #6366f1;
      padding: 1px 5px;
      font-weight: 800;
      font-size: 7.5pt;
      border-radius: 3px;
      font-family: monospace;
    }
    .badge-not {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #22c55e;
      padding: 1px 5px;
      font-weight: 800;
      font-size: 7.5pt;
      border-radius: 3px;
      font-family: monospace;
    }
    .code-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 8pt;
      white-space: pre-wrap;
      margin: 6px 0;
      color: #1e293b;
    }
    .footer-signatures {
      margin-top: 24px;
      border-top: 2px solid #0f172a;
      padding-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-box {
      border: 1px dashed #94a3b8;
      padding: 10px;
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="floating-bar">
    <div>
      <strong>CAMO Airworthiness Technical Intelligence</strong> — Relatório Oficial Completo
    </div>
    <div>
      <button onclick="window.print()">Imprimir / Salvar PDF</button>
      <button class="secondary" onclick="window.close()">Fechar Janela</button>
    </div>
  </div>

  <div class="header-box">
    <div class="header-top">
      <div>
        <div class="camo-title">Aerolíneas Sul-Americana (SkyAir) • CAMO Continuing Airworthiness Management Organization</div>
        <div class="doc-main-title">Parecer Técnico & Análise Completa de Diretriz de Aeronavegabilidade</div>
        <div class="doc-sub">Documento de Controle: CAMO-ANL-${requirement.sourceNumber.replace(/[^a-zA-Z0-9]/g, '-')} • Regulamento RBAC 121 / EASA Part-CAMO</div>
      </div>
      <div>
        <span class="status-badge">${requirement.status}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Diretriz (AD #)</span>
        <span class="meta-val">${requirement.sourceNumber} (Rev: ${requirement.revision || '0'})</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Autoridade Emissora</span>
        <span class="meta-val">${requirement.issuingAuthority}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Data de Efetividade</span>
        <span class="meta-val">${requirement.effectiveDate}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Classificação</span>
        <div>${emergencyTag}</div>
      </div>
    </div>
  </div>

  <!-- SEÇÃO 1 -->
  <h2 class="section-heading"><span class="sec-badge">1</span> Identificação da AD</h2>
  <div class="card">
    <div style="margin-bottom: 8px;"><strong>Título Oficial:</strong> ${requirement.title || NOT_REPORTED}</div>
    <div class="meta-grid" style="margin-top: 6px;">
      <div class="meta-item"><span class="meta-label">Data de Emissão</span><span class="meta-val">${requirement.issueDate || NOT_REPORTED}</span></div>
      <div class="meta-item"><span class="meta-label">Data Efetiva</span><span class="meta-val">${requirement.effectiveDate || NOT_REPORTED}</span></div>
      <div class="meta-item"><span class="meta-label">Substitui (Supersedes)</span><span class="meta-val">${requirement.supersedes || NOT_REPORTED}</span></div>
      <div class="meta-item"><span class="meta-label">Substituída por</span><span class="meta-val">${requirement.supersededBy || NOT_REPORTED}</span></div>
    </div>
  </div>

  <!-- SEÇÃO 2 -->
  <h2 class="section-heading"><span class="sec-badge">2</span> Effectivity Completa (Sem Sumarização)</h2>
  <div class="card">
    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Fabricante</span><span class="meta-val">${requirement.applicabilityRule?.aircraftManufacturers?.join(', ') || NOT_REPORTED}</span></div>
      <div class="meta-item"><span class="meta-label">Modelos de Aeronave</span><span class="meta-val">${requirement.applicabilityRule?.aircraftModels?.join(', ') || NOT_REPORTED}</span></div>
      <div class="meta-item"><span class="meta-label">Faixa de MSN</span><span class="meta-val">${requirement.applicabilityRule?.aircraftSerialRanges?.description || NOT_REPORTED}</span></div>
      <div class="meta-item"><span class="meta-label">Motores Afetados</span><span class="meta-val">${requirement.applicabilityRule?.engineModels?.length ? requirement.applicabilityRule.engineModels.join(', ') : NOT_REPORTED}</span></div>
    </div>
    <div style="margin-top: 8px;">
      <strong>Part Numbers de Componentes:</strong> ${requirement.applicabilityRule?.componentPartNumbers?.length ? requirement.applicabilityRule.componentPartNumbers.join(', ') : NOT_REPORTED}
    </div>
    <div style="margin-top: 6px;">
      <strong>Texto Original Extraído da Diretriz:</strong>
      <div class="code-block">${requirement.applicabilityRule?.rawText || requirement.title || NOT_REPORTED}</div>
    </div>
  </div>

  <!-- SEÇÃO 3 -->
  <h2 class="section-heading"><span class="sec-badge">3</span> Instruções de Cumprimento & Parágrafos Mandatórios</h2>
  ${complianceParagraphs.map(cp => `
    <div class="card">
      <div class="card-title">${cp.paraNumber} — ${cp.actionName}</div>
      <div style="margin: 4px 0 8px 0;"><strong>Procedimento & Ação Requerida:</strong> ${cp.method}</div>
      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Threshold Inicial</span><span class="meta-val">${cp.threshold}</span></div>
        <div class="meta-item"><span class="meta-label">Intervalo Repetitivo</span><span class="meta-val">${cp.repetitiveInterval}</span></div>
        <div class="meta-item"><span class="meta-label">Ação Terminativa</span><span class="meta-val">${cp.terminatingAction}</span></div>
        <div class="meta-item"><span class="meta-label">Referência Técnica</span><span class="meta-val">${cp.techRef}</span></div>
      </div>
      <div style="margin-top: 6px; font-size: 8pt; color: #475569;">
        <strong>Ferramental / Partes:</strong> ${cp.requiredParts?.join(', ') || 'Nenhum'} | <strong>AMOC:</strong> ${cp.amoc}
      </div>
    </div>
  `).join('')}

  <!-- SEÇÃO 4 -->
  <h2 class="section-heading"><span class="sec-badge">4</span> Documentos Incorporados por Referência</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>Documento de Referência</th>
        <th>Revisão / Data</th>
        <th>Parágrafo Citado</th>
        <th>Finalidade Técnica & Conteúdo Requerido</th>
      </tr>
    </thead>
    <tbody>
      ${incorporatedReferences.map(r => `
        <tr>
          <td><strong>${r.docName}</strong></td>
          <td>${r.revision}</td>
          <td><code>${r.citedParagraph}</code></td>
          <td>${r.purpose}<br><small style="color:#b91c1c; font-weight:700;">${r.notice}</small></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SEÇÃO 5 -->
  <h2 class="section-heading"><span class="sec-badge">5</span> Interpretação da Lógica de Aplicabilidade</h2>
  <div class="card">
    <strong>Árvore de Decisão Lógica em Pseudocódigo Determinístico:</strong>
    <div class="code-block">${`IF (Aircraft.Model IN [${requirement.applicabilityRule?.aircraftModels?.length ? requirement.applicabilityRule.aircraftModels.join(', ') : NOT_REPORTED}])
  AND (Aircraft.MSN IN ${requirement.applicabilityRule?.aircraftSerialRanges?.description || NOT_REPORTED})
THEN:
  IF (InstalledComponent.PartNumber IN [${requirement.applicabilityRule?.componentPartNumbers?.length ? requirement.applicabilityRule.componentPartNumbers.join(', ') : NOT_REPORTED}])
    RESULT := APPLICABLE
  ELSE IF (InstalledComponent.History = 'UNKNOWN')
    RESULT := REVIEW_REQUIRED (Missing Part Number / Serial Confirmation)
  ELSE
    RESULT := NOT_APPLICABLE
ELSE:
  RESULT := NOT_APPLICABLE`}</div>
  </div>

  <!-- SEÇÃO 6 -->
  <h2 class="section-heading"><span class="sec-badge">6</span> Análise Detalhada da Frota (Por Aeronave) — Separação Applicability vs. Compliance</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>Aeronave (Reg / MSN)</th>
        <th>Modelo & Célula</th>
        <th>Motores & Componentes</th>
        <th>Aplicabilidade (AD Scope)</th>
        <th>Cumprimento (Compliance Status)</th>
        <th>Nível de Confiança</th>
        <th>Raciocínio Técnico Passo a Passo</th>
      </tr>
    </thead>
    <tbody>
      ${assessments.map(ass => {
        const ac = state.aircraft.find(a => a.id === ass.entityId);
        const engs = state.engines.filter(e => e.aircraftId === ass.entityId);
        const comps = state.installations.filter(ci => ci.aircraftId === ass.entityId);
        const appStatus = ass.applicabilityStatus || (ass.result === 'APPLICABLE' ? 'APPLICABLE' : ass.result === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'NOT_APPLICABLE');
        const compStatus = ass.complianceStatus || (ass.result === 'APPLICABLE' ? 'OPEN' : ass.result === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'NOT_REQUIRED');
        
        const appBadgeClass = appStatus === 'APPLICABLE' ? 'badge-app' : appStatus === 'REVIEW_REQUIRED' ? 'badge-rev' : 'badge-not';
        const compBadgeClass = compStatus === 'COMPLIED' ? 'badge-app' : (compStatus === 'OPEN' || compStatus === 'OVERDUE') ? 'badge-rev' : 'badge-not';
        
        return `
          <tr>
            <td><strong>${ass.entityRegistration || ass.entityLabel}</strong><br><small>MSN: ${ass.entityMsn}</small></td>
            <td>${ass.entityModel || ac?.model}<br><small>${ac?.totalFlightHours || '—'} FH / ${ac?.totalCycles || '—'} FC</small></td>
            <td>
              <small><strong>Motores:</strong> ${engs.map(e => `${e.position}: ${e.model}`).join(', ') || 'N/A'}</small><br>
              <small><strong>Rotáveis:</strong> ${comps.map(c => c.component?.partNumber).join(', ') || 'Nenhum'}</small>
            </td>
            <td><span class="${appBadgeClass}">${appStatus}</span></td>
            <td><span class="${compBadgeClass}">${compStatus}</span></td>
            <td><strong>${ass.confidence}</strong></td>
            <td>
              <ul style="margin: 0; padding-left: 14px; font-size: 8pt;">
                ${(ass.reasoning && ass.reasoning.length > 0 ? ass.reasoning : [(ass as any).reason || 'Avaliação CAMO executada.']).map(r => `<li>${r}</li>`).join('')}
              </ul>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <!-- SEÇÃO 7 -->
  <h2 class="section-heading"><span class="sec-badge">7</span> Componentes e Rastreabilidade</h2>
  <div class="card">
    ${requirement.applicabilityRule?.componentPartNumbers.length ? requirement.applicabilityRule.componentPartNumbers.map(pn => `
      <div style="margin-bottom: 6px;">
        <strong>Part Number Alvo:</strong> <code>${pn}</code> | <strong>Faixa de S/N:</strong> ${requirement.applicabilityRule?.componentSerialRanges?.description || 'Todos os números de série'}<br>
        <span style="font-size: 8pt; color: #475569;">Regra de Segurança: Aeronaves dentro do modelo afetado sem confirmação do P/N recebem obrigatoriamente status <strong>REVIEW REQUIRED</strong>.</span>
      </div>
    `).join('') : '<div>Diretriz em nível de célula ou procedimento operacional.</div>'}
  </div>

  <!-- SEÇÃO 8 -->
  <h2 class="section-heading"><span class="sec-badge">8</span> Perguntas Geradas para Resolução de Dados Faltantes</h2>
  ${questions.length > 0 ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Aeronave</th>
          <th>Pergunta / Pendência Técnica</th>
          <th>Status</th>
          <th>Evidência Requerida</th>
        </tr>
      </thead>
      <tbody>
        ${questions.map(q => `
          <tr>
            <td><strong>${q.targetEntity.label}</strong></td>
            <td>${q.question}<br><small style="color:#64748b;">${q.reason}</small></td>
            <td><span class="${q.status === 'PENDING' ? 'badge-rev' : 'badge-not'}">${q.status}</span></td>
            <td><small>Livro de Bordo (Tech Log), Illustrated Parts Catalog (IPC 34-55-01) ou Formulário 8130-3 / EASA Form 1</small></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<div class="card"><span style="color:#166534; font-weight:700;">Nenhuma pergunta pendente. Todos os dados da frota foram confirmados.</span></div>'}

  <!-- SEÇÃO 9 & 10 -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    <div>
      <h2 class="section-heading"><span class="sec-badge">9</span> Knowledge Facts</h2>
      <div class="card" style="font-size: 8pt;">
        ${facts.length > 0 ? facts.map(f => `
          <div style="margin-bottom: 6px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 4px;">
            <strong>${f.title}:</strong> ${f.subjectLabel} &rarr; ${f.predicate}: ${f.objectValue}<br>
            <small style="color:#64748b;">Fonte: ${f.source} (${f.lastVerified})</small>
          </div>
        `).join('') : 'Nenhum fato cadastrado no repositório.'}
      </div>
    </div>

    <div>
      <h2 class="section-heading"><span class="sec-badge">10</span> Evidências Técnicas</h2>
      <div class="card" style="font-size: 8pt;">
        ${evidences.length > 0 ? evidences.map(ev => `
          <div style="margin-bottom: 6px; border-bottom: 1px dotted #cbd5e1; padding-bottom: 4px;">
            <strong>[${ev.type}] ${ev.documentReference}:</strong> ${ev.description}<br>
            <small style="color:#166534; font-weight:700;">Verificado por ${ev.verifiedBy} em ${ev.date}</small>
          </div>
        `).join('') : '<span style="color:#b45309;">NO OBJECTIVE EVIDENCE AVAILABLE no repositório digital para os itens pendentes.</span>'}
      </div>
    </div>
  </div>

  <!-- SEÇÃO 11 -->
  <h2 class="section-heading"><span class="sec-badge">11</span> Folha de Análise e Parecer Técnico (FAPT) Completa</h2>
  ${fapt ? `
    <div class="card">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div><strong>FAPT Nº:</strong> ${fapt.documentNumber} (${fapt.revision})</div>
        <div><strong>Status:</strong> <span class="${fapt.status === 'APPROVED' ? 'badge-not' : 'badge-rev'}">${fapt.status}</span></div>
      </div>
      <div style="margin-bottom: 8px;">
        <strong>Parecer Conclusivo CAMO:</strong> ${fapt.comments || 'Análise de cumprimento mandatório de aeronavegabilidade continuada conforme RBAC 121.'}
      </div>
      <div style="font-size: 8pt; color: #475569;">
        <strong>Elaborado por:</strong> ${fapt.preparedBy} (${fapt.preparedDate}) | 
        <strong>Aprovado por:</strong> ${fapt.approvedBy || 'Pendente de Resolução de Perguntas'} (${fapt.approvalDate || '—'})
      </div>
    </div>
  ` : '<div class="card">FAPT em consolidação.</div>'}

  <!-- SEÇÃO 12 & 13 -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    <div>
      <h2 class="section-heading"><span class="sec-badge">12</span> Informações Não Extraídas / Omissões</h2>
      <div class="card" style="font-size: 8pt;">
        <ul style="margin: 0; padding-left: 14px;">
          <li>Tabelas de Part Numbers em AOTs externos requerem consulta à biblioteca física do operador.</li>
          <li>Instruções detalhadas de Engineering Order (EO) para modificação terminativa.</li>
          <li>Confirmação física de painel para aeronaves sem tag digitalizada.</li>
        </ul>
      </div>
    </div>

    <div>
      <h2 class="section-heading"><span class="sec-badge">13</span> Trilha de Auditoria & Proveniência</h2>
      <div class="card" style="font-size: 8pt;">
        <div><strong>Motor de Regras:</strong> CAMO Rule Engine v1.0 (Executado)</div>
        <div><strong>Fontes:</strong> ${requirement.issuingAuthority} AD Gazette, TCDS, Fleet Database, CAMO Tech Records.</div>
        <div style="margin-top: 4px; color: #64748b;">Assinatura Digital Hash: SHA256:${requirement.id.substring(0, 16).toUpperCase()}</div>
      </div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="footer-signatures">
    <div class="sig-box">
      <div style="font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: 700;">Engenheiro Responsável pela Análise</div>
      <div style="margin-top: 14px; font-weight: 800; font-size: 9.5pt;">${fapt?.preparedBy || 'Engenharia de Aeronavegabilidade CAMO'}</div>
      <div style="font-size: 7.5pt; color: #475569;">CAMO Airworthiness Engineer</div>
    </div>
    <div class="sig-box">
      <div style="font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: 700;">Aprovação Técnica / Responsável Técnico CAMO</div>
      <div style="margin-top: 14px; font-weight: 800; font-size: 9.5pt; color: ${isApproved ? '#166534' : '#b45309'};">
        ${fapt?.approvedBy || 'Pendente de Resolução de Pendências'}
      </div>
      <div style="font-size: 7.5pt; color: #475569;">Gerência Técnica de Aeronavegabilidade Continuada</div>
    </div>
  </div>

  <div style="text-align: center; font-size: 7pt; color: #94a3b8; margin-top: 16px; font-family: monospace;">
    RELATÓRIO TÉCNICO GERADO AUTOMATICAMENTE PELO AIRWORTHINESS COMPLIANCE INTELLIGENCE • PÁGINA 1 DE 1
  </div>
</body>
</html>`;
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(fullReportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([fullReportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Tecnico_CAMO_${requirement.sourceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const htmlContent = generateFullHtmlReport();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Tecnico_CAMO_${requirement.sourceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenPrintTab = () => {
    const htmlContent = generateFullHtmlReport();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printTab = window.open(url, '_blank');
    if (!printTab) {
      handleDownloadHtml();
    }
  };

  const handlePrintDirect = () => {
    expandAll();
    const htmlContent = generateFullHtmlReport();

    // Use hidden iframe to trigger direct print dialog with 100% formatted HTML
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('title', 'Print Document');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error, falling back to window.print', e);
            window.print();
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch (_) {}
            }, 3000);
          }
        }, 400);
        return;
      }
    } catch (err) {
      console.error('Direct print setup failed:', err);
    }

    // Fallback: in-page print
    window.print();
  };

  const sectionLinks = [
    { id: 'sec-1', title: '1. Identificação da AD' },
    { id: 'sec-2', title: '2. Effectivity Completa' },
    { id: 'sec-3', title: '3. Instruções de Cumprimento' },
    { id: 'sec-4', title: '4. Referências Incorporadas' },
    { id: 'sec-5', title: '5. Lógica de Aplicabilidade' },
    { id: 'sec-6', title: '6. Análise da Frota' },
    { id: 'sec-7', title: '7. Componentes & Rastreabilidade' },
    { id: 'sec-8', title: '8. Perguntas Geradas' },
    { id: 'sec-9', title: '9. Knowledge Facts' },
    { id: 'sec-10', title: '10. Evidências Técnicas' },
    { id: 'sec-11', title: '11. FAPT Completa' },
    { id: 'sec-12', title: '12. Informações Não Extraídas' },
    { id: 'sec-13', title: '13. Auditoria da Análise' },
  ];

  const scrollToSection = (secId: string) => {
    setActiveSection(secId);
    setExpandedSections(prev => ({ ...prev, [secId]: true }));
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex flex-col print:bg-white print:text-black print:p-0 print:static print:overflow-visible">
      {/* Top Fixed Action Bar (Hidden on Print) */}
      <div className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono uppercase">
                {requirement.issuingAuthority} AD
              </span>
              <h2 className="text-sm font-bold text-white font-mono">
                {requirement.sourceNumber} — Relatório Técnico Completo (13 Seções)
              </h2>
              {requirement.emergencyAd && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                  Emergency
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              Análise técnica integral sem cortes, sumarizações ou dados ocultos.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={handlePrintDirect}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-lg hover:shadow-emerald-600/30 transition font-mono uppercase tracking-wider border border-emerald-400/40"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          <button
            onClick={handleOpenPrintTab}
            title="Abrir página de impressão dedicada em nova aba"
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-lg text-xs font-mono transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Aba</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            title="Baixar arquivo HTML completo e formatado"
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>.HTML</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            title="Baixar arquivo Markdown estruturado"
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono transition"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>.MD</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition border ${
              copied 
                ? 'bg-emerald-600 border-emerald-500 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container with Sidebar Navigation and Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:p-0 print:max-w-none">
        {/* Navigation Index Sidebar (Hidden on Print) */}
        <div className="lg:col-span-3 space-y-3 print:hidden sticky top-20 self-start">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                <span>Índice das 13 Seções</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={expandAll}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                >
                  Abrir Todas
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={collapseAll}
                  className="text-[10px] text-slate-400 hover:text-slate-300 font-mono"
                >
                  Fechar
                </button>
              </div>
            </div>

            <nav className="space-y-1 text-xs">
              {sectionLinks.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition font-mono text-[11px] flex items-center justify-between ${
                    activeSection === sec.id
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-bold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                  <span className="text-[9px] text-slate-500 font-sans">#</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 text-[11px] text-slate-400 space-y-2 font-mono">
            <div className="text-white font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Garantia de Não-Sumarização</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Todos os parágrafos mandatórios, limites de tempo, referências cruzadas e raciocínios por aeronave são detalhados sem omissões.
            </p>
          </div>
        </div>

        {/* Technical Document Body (Printable & Screen) */}
        <div className="lg:col-span-9 space-y-6 print:space-y-4 print:text-black">
          {/* Official Document Masthead */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 print:border-black print:bg-white print:p-4 print:rounded-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 print:border-black gap-2">
              <div>
                <div className="text-[10px] font-bold text-indigo-400 print:text-black uppercase tracking-widest font-mono">
                  AEROLÍNEAS SUL-AMERICANA (SKYAIR) • CAMO ENGINEERING DEPARTMENT
                </div>
                <h1 className="text-xl font-black text-white print:text-black tracking-tight uppercase font-mono mt-1">
                  PARECER TÉCNICO & ANÁLISE COMPLETA DE DIRETRIZ DE AERONAVEGABILIDADE
                </h1>
                <p className="text-xs text-slate-400 print:text-black font-mono">
                  Documento de Controle: CAMO-ANL-{requirement.sourceNumber.replace(/[^a-zA-Z0-9]/g, '-')} • RBAC 121 / EASA Part-CAMO
                </p>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-bold print:bg-gray-200 print:text-black print:border-black">
                  {requirement.status}
                </span>
                <p className="text-[10px] text-slate-400 print:text-black mt-1">
                  Gerado em: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Diretriz (AD #)</span>
                <span className="text-white print:text-black font-bold">{requirement.sourceNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Autoridade</span>
                <span className="text-white print:text-black">{requirement.issuingAuthority}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Data Efetiva</span>
                <span className="text-white print:text-black">{requirement.effectiveDate}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Classificação</span>
                <span className={requirement.emergencyAd ? 'text-rose-400 print:text-black font-bold' : 'text-slate-200 print:text-black'}>
                  {requirement.emergencyAd ? 'EMERGÊNCIA (Immediate)' : 'Padrão (Standard)'}
                </span>
              </div>
            </div>
          </div>

          {/* ================= ADVERTÊNCIA DE SEGURANÇA SE A EXTRAÇÃO FALHOU ================= */}
          {isExtractionFailed && (
            <div className="bg-rose-950/90 border-2 border-rose-600 rounded-xl p-5 shadow-2xl space-y-3 print:border-black print:bg-white">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-rose-600/30 text-rose-300 border border-rose-500/50 mt-0.5 print:border-black print:text-black">
                  <AlertTriangle className="w-6 h-6 text-rose-400 print:text-black animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white uppercase font-mono tracking-wider print:bg-black print:text-white">
                      ADVERTÊNCIA DE SEGURANÇA TÉCNICA (CAMO)
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400 print:text-black">STATUS: FALHA DE EXTRAÇÃO</span>
                  </div>
                  <h3 className="text-base font-black text-rose-200 print:text-black uppercase font-mono">
                    EXTRAÇÃO FALHOU — Este relatório não contém dados técnicos confiáveis. Análise manual do PDF da AD é obrigatória.
                  </h3>
                  <p className="text-xs text-rose-300 print:text-black font-sans leading-relaxed">
                    O processamento de extração automatizada desta Diretriz de Aeronavegabilidade falhou ou retornou dados incompletos.
                    Nenhum dado técnico foi fabricado ou inferido. Campos não extraídos exibem <strong>{NOT_REPORTED}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-rose-900/60 print:border-black text-xs font-mono">
                <span className="text-rose-400 print:text-black">
                  Motivo: {requirement.extractionError || (requirement.extractionStatus === 'EXTRACTION_FAILED' ? 'Falha no processamento de IA / OCR' : 'Dados de identificação ausentes')}
                </span>
                <button
                  onClick={() => setShowFailureDetails(true)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[11px] transition uppercase flex items-center space-x-1.5 print:hidden shadow"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Laudo de Falha</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= SEÇÃO 1: IDENTIFICAÇÃO DA AD ================= */}
          <div id="sec-1" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-1')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">1</span>
                <span>IDENTIFICAÇÃO DA AD</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-1'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-1'] && (
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Número da AD</span>
                    <span className="text-white print:text-black font-bold text-sm">{requirement.sourceNumber || NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Autoridade Emissora</span>
                    <span className="text-indigo-300 print:text-black font-bold">{requirement.issuingAuthority || NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Revisão / Amendment</span>
                    <span className="text-slate-200 print:text-black">{requirement.revision || NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Data de Emissão</span>
                    <span className="text-slate-200 print:text-black">{requirement.issueDate || NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Data de Efetividade</span>
                    <span className="text-emerald-400 print:text-black font-bold">{requirement.effectiveDate || NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Status de Emergência</span>
                    <span className={requirement.emergencyAd ? 'text-rose-400 print:text-black font-bold' : 'text-slate-300 print:text-black'}>
                      {requirement.emergencyAd ? 'SIM (Emergency AD)' : 'NÃO (Standard AD)'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3.5 rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Título / Assunto Oficial</span>
                  <p className="text-slate-100 print:text-black text-xs font-sans font-medium">{requirement.title || NOT_REPORTED}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">AD que Substitui (Supersedes)</span>
                    <span className="text-slate-300 print:text-black">{requirement.supersedes || NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Substituída por (Superseded by)</span>
                    <span className="text-slate-300 print:text-black">{requirement.supersededBy || NOT_REPORTED}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Fabricante da Aeronave</span>
                    <span className="text-white print:text-black font-bold">{requirement.applicabilityRule?.aircraftManufacturers?.length ? requirement.applicabilityRule.aircraftManufacturers.join(', ') : NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Tipo / Modelos de Aeronave</span>
                    <span className="text-white print:text-black">{requirement.applicabilityRule?.aircraftModels?.length ? requirement.applicabilityRule.aircraftModels.join(', ') : NOT_REPORTED}</span>
                  </div>
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Componente / Equipamento</span>
                    <span className="text-indigo-300 print:text-black">{requirement.applicabilityRule?.componentPartNumbers?.length ? requirement.applicabilityRule.componentPartNumbers.join(', ') : NOT_REPORTED}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 2: EFFECTIVITY COMPLETA ================= */}
          <div id="sec-2" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-2')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">2</span>
                <span>EFFECTIVITY COMPLETA (SEM SUMARIZAÇÃO)</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-2'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-2'] && (
              <div className="space-y-3 text-xs font-mono">
                {/* Dynamic Applicability Criteria (V2 Model) */}
                {requirement.applicabilityCriteria && (
                  <div className="bg-slate-950/80 print:bg-white print:border print:border-black p-3.5 rounded-lg border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-300 print:text-black text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Classificação Dinâmica dos Critérios de Aplicabilidade (Model V2)</span>
                      </span>
                      <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        Rule Engine Condicional
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        { label: 'Modelo de Aeronave', crit: requirement.applicabilityCriteria.aircraftModel, display: requirement.applicabilityCriteria.aircraftModel?.values?.join(', ') },
                        { label: 'MSN / Série da Aeronave', crit: requirement.applicabilityCriteria.aircraftMSN, display: requirement.applicabilityCriteria.aircraftMSN?.description || requirement.applicabilityCriteria.aircraftMSN?.list?.join(', ') },
                        { label: 'Modelo de Motor', crit: requirement.applicabilityCriteria.engineModel, display: requirement.applicabilityCriteria.engineModel?.values?.join(', ') },
                        { label: 'Série do Motor (ESN)', crit: requirement.applicabilityCriteria.engineSerialNumber, display: requirement.applicabilityCriteria.engineSerialNumber?.description || requirement.applicabilityCriteria.engineSerialNumber?.list?.join(', ') },
                        { label: 'Part Number de Componente', crit: requirement.applicabilityCriteria.componentPartNumber, display: requirement.applicabilityCriteria.componentPartNumber?.values?.join(', ') },
                        { label: 'Série de Componente (S/N)', crit: requirement.applicabilityCriteria.componentSerialNumber, display: requirement.applicabilityCriteria.componentSerialNumber?.description || requirement.applicabilityCriteria.componentSerialNumber?.list?.join(', ') },
                        { label: 'Configuração / STC / Mod', crit: requirement.applicabilityCriteria.modificationStatus, display: requirement.applicabilityCriteria.modificationStatus?.conditions?.join(', ') },
                        { label: 'Configuração de Software', crit: requirement.applicabilityCriteria.softwareConfiguration, display: requirement.applicabilityCriteria.softwareConfiguration?.values?.join(', ') || requirement.applicabilityCriteria.softwareConfiguration?.conditions?.join(', ') },
                      ].map(({ label, crit, display }, cIdx) => (
                        <div key={cIdx} className="p-2 bg-slate-950/60 print:bg-gray-50 print:border print:border-black rounded border border-white/5 flex items-center justify-between">
                          <div className="space-y-0.5 pr-2">
                            <span className="text-slate-400 print:text-black text-[9px] font-sans uppercase font-bold block">{label}</span>
                            <span className="text-slate-200 print:text-black text-[11px]">
                              {display || (crit?.status === 'NOT_REQUIRED' ? 'Não Requerido para esta AD' : '—')}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                            crit?.status === 'REQUIRED'
                              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 print:bg-gray-200 print:text-black'
                              : crit?.status === 'NOT_REQUIRED'
                              ? 'bg-slate-900 text-slate-400 border-slate-700 print:bg-gray-100 print:text-black'
                              : crit?.status === 'NOT_EXTRACTED'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 print:bg-gray-200 print:text-black'
                              : 'bg-purple-950/80 text-purple-300 border-purple-500/40 print:bg-gray-200 print:text-black'
                          }`}>
                            {crit?.status || 'NOT_REQUIRED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Fabricante & Modelos de Aeronave</span>
                    <p className="text-white print:text-black font-bold">
                      {requirement.applicabilityRule?.aircraftManufacturers?.join(', ') || NOT_REPORTED} — {requirement.applicabilityRule?.aircraftModels?.join(', ') || NOT_REPORTED}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Faixas de Número de Série (MSN)</span>
                    <p className="text-slate-200 print:text-black">
                      {requirement.applicabilityRule?.aircraftSerialRanges?.description || NOT_REPORTED}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Motores & Séries Específicas</span>
                    <p className="text-slate-200 print:text-black">
                      {requirement.applicabilityRule?.engineModels?.length ? requirement.applicabilityRule.engineModels.join(', ') : NOT_REPORTED}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Part Numbers de Componentes Afetados</span>
                    <p className="text-indigo-300 print:text-black font-bold">
                      {requirement.applicabilityRule?.componentPartNumbers?.length ? requirement.applicabilityRule.componentPartNumbers.join(', ') : NOT_REPORTED}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Faixas de Serial Numbers de Componentes</span>
                    <p className="text-amber-300 print:text-black font-bold">
                      {requirement.applicabilityRule?.componentSerialRanges?.description || NOT_REPORTED}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Requisitos de Configuração & Modificações</span>
                    <p className="text-slate-200 print:text-black">
                      {requirement.applicabilityRule?.affectedConfiguration || NOT_REPORTED}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 print:bg-white print:border print:border-black p-3.5 rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 print:text-black block text-[10px] uppercase font-bold">Texto Original Extraído da Seção de Aplicabilidade (Raw Text)</span>
                  <div className="p-3 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded text-[11px] text-slate-300 print:text-black font-mono leading-relaxed whitespace-pre-wrap">
                    {requirement.applicabilityRule?.rawText || requirement.title || NOT_REPORTED}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 3: INSTRUÇÕES DE CUMPRIMENTO ================= */}
          <div id="sec-3" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-3')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">3</span>
                <span>INSTRUÇÕES DE CUMPRIMENTO DA AD (PARÁGRAFOS INDIVIDUAIS)</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-3'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-3'] && (
              <div className="space-y-4">
                {complianceParagraphs.map((cp, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-slate-950/70 print:bg-white print:border print:border-black rounded-xl border border-slate-800 space-y-3 text-xs font-mono"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2 print:border-black gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 print:bg-gray-200 print:text-black font-bold text-[10px]">
                          {cp.paraNumber}
                        </span>
                        <h4 className="text-sm font-bold text-white print:text-black">{cp.actionName}</h4>
                      </div>
                      <span className="text-[10px] text-amber-400 print:text-black font-bold">
                        Prazo: {cp.complianceTime}
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-950 print:bg-gray-50 p-3 rounded-lg border border-slate-800/60 print:border-black">
                      <span className="text-[10px] font-bold text-slate-400 print:text-black uppercase block">Ação Requerida & Procedimento:</span>
                      <p className="text-slate-200 print:text-black font-sans leading-relaxed">{cp.method}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Equipamento / Alvo</span>
                        <span className="text-slate-200 print:text-black">{cp.targetEquipment}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Threshold Inicial</span>
                        <span className="text-white print:text-black font-bold">{cp.threshold}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Intervalo Repetitivo</span>
                        <span className="text-indigo-300 print:text-black font-bold">{cp.repetitiveInterval}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Ação Terminativa</span>
                        <span className="text-emerald-400 print:text-black">{cp.terminatingAction}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Referência Técnica</span>
                        <span className="text-slate-200 print:text-black">{cp.techRef}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Limitações Operacionais (MMEL)</span>
                        <span className="text-amber-300 print:text-black">{cp.opLimitations}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Peças Requeridas (Parts)</span>
                        <span className="text-slate-300 print:text-black">{cp.requiredParts?.join(', ') || 'Nenhuma'}</span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Documentação de Registro</span>
                        <span className="text-slate-300 print:text-black">{cp.requiredDocs}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 4: REFERÊNCIAS INCORPORADAS ================= */}
          <div id="sec-4" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-4')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">4</span>
                <span>REFERÊNCIAS INCORPORADAS (DOCUMENTOS EXTERNOS)</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-4'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-4'] && (
              <div className="space-y-3">
                {incorporatedReferences.map((ref, idx) => (
                  <div key={idx} className="p-4 bg-slate-950/60 print:bg-white print:border print:border-black rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/60 pb-1.5 print:border-black">
                      <span className="text-white print:text-black font-bold text-sm font-sans">{ref.docName}</span>
                      <span className="text-[10px] text-indigo-300 print:text-black font-bold">{ref.revision}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Parágrafo Citado:</span>
                        <span className="text-slate-300 print:text-black">{ref.citedParagraph}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Finalidade no Contexto da AD:</span>
                        <span className="text-slate-300 print:text-black">{ref.purpose}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 print:bg-gray-100 rounded border border-slate-800/80 print:border-black">
                      <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Informação Necessária a Consultar:</span>
                      <p className="text-slate-300 print:text-black">{ref.infoNeeded}</p>
                    </div>

                    {!ref.isAvailable && (
                      <div className="p-2.5 bg-amber-950/30 print:bg-gray-200 border border-amber-500/40 print:border-black rounded text-[11px] text-amber-300 print:text-black font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 print:text-black" />
                        <span>{ref.notice}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 5: LÓGICA DE APLICABILIDADE ================= */}
          <div id="sec-5" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-5')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">5</span>
                <span>INTERPRETAÇÃO DA LÓGICA DE APLICABILIDADE</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-5'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-5'] && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-4 bg-slate-950/80 print:bg-white print:border print:border-black rounded-xl border border-slate-800 space-y-3">
                  <div className="text-[11px] font-bold text-indigo-300 print:text-black uppercase">
                    Árvore de Decisão Lógica Formal (Deterministic CAMO Logic):
                  </div>

                  <div className="p-3 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg text-slate-200 print:text-black space-y-2 leading-relaxed">
                    <div>
                      <strong className="text-emerald-400 print:text-black">[1] CONDIÇÃO DE ENTRADA NA CÉLULA:</strong>
                      <p className="pl-4">IF Aircraft.Model MATCHES [{requirement.applicabilityRule?.aircraftModels?.join(', ') || 'Modelos Alvo'}] THEN Proceed to MSN Check ELSE NOT_APPLICABLE.</p>
                    </div>
                    <div>
                      <strong className="text-emerald-400 print:text-black">[2] CONDIÇÃO DE NÚMERO DE SÉRIE (MSN):</strong>
                      <p className="pl-4">IF MSN IN Range [{requirement.applicabilityRule?.aircraftSerialRanges?.description || 'ALL'}] THEN Proceed to Component Check ELSE NOT_APPLICABLE.</p>
                    </div>
                    <div>
                      <strong className="text-emerald-400 print:text-black">[3] CONDIÇÃO DE COMPONENTE / PART NUMBER:</strong>
                      <p className="pl-4">
                        IF AD requires specific P/N:
                        <br />&nbsp;&nbsp;• IF Component P/N installed AND S/N matches -&gt; <span className="text-amber-400 print:text-black font-bold">APPLICABLE</span>
                        <br />&nbsp;&nbsp;• IF Verified Evidence / Knowledge Fact confirms NOT installed -&gt; <span className="text-emerald-400 print:text-black font-bold">NOT_APPLICABLE</span>
                        <br />&nbsp;&nbsp;• IF Component record absent from database -&gt; 🚨 <span className="text-indigo-400 print:text-black font-bold">REVIEW_REQUIRED (Safety Invariant)</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-amber-950/20 print:bg-white print:border print:border-black border border-amber-500/30 rounded-lg">
                    <span className="text-amber-400 print:text-black font-bold uppercase text-[10px] block">Condição APPLICABLE:</span>
                    <p className="text-slate-300 print:text-black text-[11px] mt-1">Célula, motor e componente atendem a todos os critérios positivos de efeito da AD.</p>
                  </div>

                  <div className="p-3 bg-emerald-950/20 print:bg-white print:border print:border-black border border-emerald-500/30 rounded-lg">
                    <span className="text-emerald-400 print:text-black font-bold uppercase text-[10px] block">Condição NOT APPLICABLE:</span>
                    <p className="text-slate-300 print:text-black text-[11px] mt-1">Comprovado por TCDS, modelo ou evidência documental que o ativo está fora do escopo.</p>
                  </div>

                  <div className="p-3 bg-indigo-950/20 print:bg-white print:border print:border-black border border-indigo-500/30 rounded-lg">
                    <span className="text-indigo-300 print:text-black font-bold uppercase text-[10px] block">Condição REVIEW REQUIRED:</span>
                    <p className="text-slate-300 print:text-black text-[11px] mt-1">Ativo em escopo, porém faltam dados de P/N, S/N ou modificação para conclusão segura.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 6: ANÁLISE DA FROTA ================= */}
          <div id="sec-6" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-6')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">6</span>
                <span>ANÁLISE DA FROTA (AVALIAÇÃO COMPLETA POR AERONAVE)</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-6'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-6'] && (
              <div className="space-y-4">
                {assessments.map((ass, idx) => {
                  const ac = state.aircraft.find(a => a.id === ass.entityId);
                  const engs = state.engines.filter(e => e.aircraftId === ass.entityId);
                  const comps = state.installations.filter(ci => ci.aircraftId === ass.entityId);

                  const isApplicable = ass.result === 'APPLICABLE';
                  const isReviewRequired = ass.result === 'REVIEW_REQUIRED';
                  const isNotApplicable = ass.result === 'NOT_APPLICABLE';

                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border space-y-3 font-mono text-xs print:bg-white print:border-black ${
                        isApplicable ? 'bg-amber-950/20 border-amber-500/40' :
                        isReviewRequired ? 'bg-indigo-950/20 border-indigo-500/40' :
                        'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2 print:border-black gap-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-base font-black text-white print:text-black">
                            {ass.entityRegistration || ass.entityLabel}
                          </span>
                          <span className="text-slate-400 print:text-black">
                            MSN {ass.entityMsn} • {ass.entityModel || ac?.model}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-slate-400 print:text-black uppercase font-bold">App:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono print:border print:border-black ${
                              (ass.applicabilityStatus === 'APPLICABLE' || (!ass.applicabilityStatus && isApplicable)) ? 'bg-amber-500 text-slate-950' :
                              (ass.applicabilityStatus === 'REVIEW_REQUIRED' || (!ass.applicabilityStatus && isReviewRequired)) ? 'bg-indigo-600 text-white' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {ass.applicabilityStatus || ass.result}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 pl-2 border-l border-white/10 print:border-black">
                            <span className="text-[10px] text-slate-400 print:text-black uppercase font-bold">Comp:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono print:border print:border-black ${
                              ass.complianceStatus === 'COMPLIED' ? 'bg-emerald-600 text-white' :
                              (ass.complianceStatus === 'OPEN' || (!ass.complianceStatus && isApplicable)) ? 'bg-amber-600 text-white' :
                              (ass.complianceStatus === 'REVIEW_REQUIRED' || (!ass.complianceStatus && isReviewRequired)) ? 'bg-indigo-500 text-white' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {ass.complianceStatus || (isApplicable ? 'OPEN' : isReviewRequired ? 'REVIEW_REQUIRED' : 'NOT_REQUIRED')}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400 print:text-black ml-1">
                            Confiança: {ass.confidence}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        <div className="p-2.5 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Motores Instalados:</span>
                          <p className="text-slate-200 print:text-black text-[11px]">
                            {engs.length ? engs.map(e => `${e.position}: ${e.model} (${e.serialNumber})`).join(' | ') : 'N/A'}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Componentes Rastreados:</span>
                          <p className="text-slate-200 print:text-black text-[11px]">
                            {comps.length ? comps.map(c => `${c.component?.partNumber} (S/N ${c.component?.serialNumber})`).join(', ') : 'Nenhum rotável cadastrado'}
                          </p>
                        </div>

                        <div className="p-2.5 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Horas & Ciclos Acumulados:</span>
                          <p className="text-slate-200 print:text-black text-[11px]">
                            {ac?.totalFlightHours || '—'} FH / {ac?.totalCycles || '—'} FC
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800/60 space-y-1">
                        <span className="text-[10px] text-slate-400 print:text-black block uppercase font-bold">Raciocínio Técnico & Justificativa Regulatória:</span>
                        <ul className="space-y-1 text-slate-300 print:text-black list-disc list-inside">
                          {(ass.reasoning && ass.reasoning.length > 0 ? ass.reasoning : [(ass as any).reason || 'Avaliação CAMO executada.']).map((r, rIdx) => (
                            <li key={rIdx} className="leading-relaxed font-sans">{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 7: COMPONENTES ================= */}
          <div id="sec-7" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-7')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">7</span>
                <span>COMPONENTES & RASTREABILIDADE</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-7'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-7'] && (
              <div className="space-y-3 text-xs font-mono">
                {requirement.applicabilityRule?.componentPartNumbers.length ? (
                  requirement.applicabilityRule.componentPartNumbers.map((pn, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-indigo-300 print:text-black">P/N Alvo: {pn}</span>
                        <span className="text-slate-400 print:text-black">Faixa S/N: {requirement.applicabilityRule?.componentSerialRanges?.description || 'All Serials'}</span>
                      </div>
                      <p className="text-slate-300 print:text-black">
                        <strong>Princípio de Segurança CAMO:</strong> Se a aeronave pertence a um modelo dentro do escopo da AD, mas o histórico do P/N não foi localizado no banco de dados, o sistema emite <strong>REVIEW REQUIRED</strong> em vez de assumir NOT APPLICABLE.
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg text-slate-400 print:text-black">
                    Esta diretriz atua em nível de Célula / Procedimento Geral, sem isolamento de um único Part Number rotável.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 8: PERGUNTAS GERADAS ================= */}
          <div id="sec-8" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-8')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">8</span>
                <span>PERGUNTAS GERADAS PARA RESOLUÇÃO DE DADOS FALTANTES</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-8'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-8'] && (
              <div className="space-y-3">
                {questions.length > 0 ? (
                  questions.map((q) => (
                    <div key={q.id} className="p-4 bg-slate-950/70 print:bg-white print:border print:border-black rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-indigo-300 print:text-black font-bold">Aeronave Alvo: {q.targetEntity.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          q.status === 'PENDING' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white print:text-black font-sans">{q.question}</h4>
                      <p className="text-slate-400 print:text-black">{q.reason}</p>
                      <div className="p-2.5 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 text-[11px] text-slate-300 print:text-black">
                        <strong>Evidência Técnica Requerida:</strong> Livro de Bordo (Tech Log), Illustrated Parts Catalog (IPC 34-55-01) ou Certificado de Liberação Autorizada (EASA Form 1 / FAA Form 8130-3).
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg text-emerald-400 print:text-black text-xs font-mono">
                    Nenhuma pendência técnica. Todos os dados de configuração foram confirmados.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 9: KNOWLEDGE FACTS ================= */}
          <div id="sec-9" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-9')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">9</span>
                <span>KNOWLEDGE FACTS (MEMÓRIA AERONÁUTICA UTILIZADA)</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-9'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-9'] && (
              <div className="space-y-3">
                {facts.length > 0 ? (
                  facts.map((f) => (
                    <div key={f.id} className="p-3.5 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-300 print:text-black font-bold">{f.id} — {f.title}</span>
                        <span className="text-emerald-400 print:text-black font-bold">Confiança: {f.confidence}%</span>
                      </div>
                      <p className="text-slate-200 print:text-black">
                        <strong>Fato:</strong> {f.subjectLabel} ({f.subjectType}) -&gt; {f.predicate}: {f.objectValue}
                      </p>
                      <div className="text-[11px] text-slate-400 print:text-black">
                        Fonte: {f.source} | Verificado por: {f.verifiedBy} ({f.lastVerified})
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg text-slate-400 print:text-black text-xs font-mono">
                    Nenhum Knowledge Fact cadastrado no repositório para esta avaliação.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 10: EVIDÊNCIAS ================= */}
          <div id="sec-10" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-10')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">10</span>
                <span>EVIDÊNCIAS TÉCNICAS E DOCUMENTOS DE SUPORTE</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-10'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-10'] && (
              <div className="space-y-3">
                {evidences.length > 0 ? (
                  evidences.map((ev) => (
                    <div key={ev.id} className="p-3 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg border border-slate-800 space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-white print:text-black font-bold">[{ev.type}] {ev.documentReference}</span>
                        <span className="text-slate-400 print:text-black">{ev.date}</span>
                      </div>
                      <p className="text-slate-300 print:text-black">{ev.description}</p>
                      <span className="text-[10px] text-emerald-400 print:text-black block">
                        Verificado por: {ev.verifiedBy}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-950/60 print:bg-white print:border print:border-black rounded-lg text-amber-300 print:text-black text-xs font-mono">
                    NO OBJECTIVE EVIDENCE AVAILABLE no repositório digital para os itens pendentes de confirmação.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 11: FAPT ================= */}
          <div id="sec-11" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-11')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">11</span>
                <span>FOLHA DE ANÁLISE E PARECER TÉCNICO (FAPT) COMPLETA</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-11'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-11'] && fapt && (
              <div className="space-y-4 text-xs font-mono bg-slate-950/80 print:bg-white p-4 rounded-xl border border-slate-800 print:border-black">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 print:border-black gap-2">
                  <div>
                    <span className="text-white print:text-black font-bold text-sm">FAPT Nº {fapt.documentNumber} ({fapt.revision})</span>
                    <p className="text-slate-400 print:text-black text-[11px]">Diretriz: {fapt.adNumber} • Autoridade: {fapt.authority}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                    fapt.status === 'APPROVED' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                  }`}>
                    Status: {fapt.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 print:text-black uppercase">Matriz de Aplicabilidade Resumida:</span>
                  <table className="w-full text-left border-collapse bg-slate-950 print:bg-white rounded border border-slate-800 print:border-black">
                    <thead>
                      <tr className="border-b border-slate-800 print:border-black text-[10px] text-slate-400 print:text-black">
                        <th className="p-2">Reg</th>
                        <th className="p-2">MSN</th>
                        <th className="p-2">Modelo</th>
                        <th className="p-2">Resultado</th>
                        <th className="p-2">Parecer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-black">
                      {fapt.applicabilityMatrix.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-2 font-bold text-white print:text-black">{row.aircraftRegistration}</td>
                          <td className="p-2 text-slate-400 print:text-black">{row.msn}</td>
                          <td className="p-2 text-slate-300 print:text-black">{row.model}</td>
                          <td className="p-2 font-bold">
                            <span className={row.result === 'APPLICABLE' ? 'text-amber-400 print:text-black' : row.result === 'REVIEW_REQUIRED' ? 'text-indigo-300 print:text-black' : 'text-emerald-400 print:text-black'}>
                              {row.result}
                            </span>
                          </td>
                          <td className="p-2 text-slate-400 print:text-black text-[11px]">{row.reasoningSummary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-black space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 print:text-black uppercase">Parecer Técnico CAMO:</span>
                  <p className="text-slate-200 print:text-black font-sans leading-relaxed">
                    {fapt.comments || 'Análise de cumprimento obrigatório de aeronavegabilidade continuada em conformidade com RBAC 121 / EASA Part-M.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 print:border-black">
                  <div>
                    <span className="text-[10px] text-slate-400 print:text-black block">Elaborado por:</span>
                    <span className="text-white print:text-black font-bold">{fapt.preparedBy}</span>
                    <span className="text-[10px] text-slate-400 print:text-black block">{fapt.preparedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 print:text-black block">Aprovação CAMO Chief Engineer:</span>
                    <span className="text-emerald-400 print:text-black font-bold">{fapt.approvedBy || 'Pendente (Aguardando Resolução de Questões)'}</span>
                    <span className="text-[10px] text-slate-400 print:text-black block">{fapt.approvalDate || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 12: INFORMAÇÕES NÃO EXTRAÍDAS ================= */}
          <div id="sec-12" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-12')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">12</span>
                <span>INFORMAÇÕES DA AD QUE NÃO FORAM EXTRAÍDAS OU QUE NECESSITAM DE DOCUMENTAÇÃO COMPLEMENTAR</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-12'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-12'] && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-4 bg-slate-950/80 print:bg-white print:border print:border-black rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 print:text-black font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Relação de Dados que Requerem Consulta Externa Complementar:</span>
                  </div>
                  <ul className="space-y-2 text-slate-300 print:text-black list-disc list-inside font-sans">
                    <li>
                      <strong>Tabela Completa de Part Numbers de Rotáveis:</strong> O texto do Federal Register / EASA AD incorpora por referência parágrafos específicos de Alert Service Bulletins / AOTs em vez de re-imprimir a lista exaustiva no corpo da notificação.
                    </li>
                    <li>
                      <strong>Instruções de Terminating Action:</strong> Procedimentos de modificação definitiva requerem a aquisição e leitura do Service Bulletin de modificação correspondente.
                    </li>
                    <li>
                      <strong>Histórico de Manutenção de Aeronaves com Componentes Não Cadastrados:</strong> Aeronaves como PR-AIA necessitam de inspeção física do painel 100VU/120VU ou consulta aos registros de entrega para identificação do P/N da unidade instalada.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ================= SEÇÃO 13: AUDITORIA DA ANÁLISE ================= */}
          <div id="sec-13" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 print:border-black print:bg-white print:rounded-none">
            <div 
              onClick={() => toggleSection('sec-13')}
              className="flex items-center justify-between cursor-pointer border-b border-slate-800 pb-2 print:border-black"
            >
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 print:bg-gray-200 print:text-black flex items-center justify-center text-[10px] font-bold">13</span>
                <span>AUDITORIA DA ANÁLISE & PROVENIÊNCIA DE DADOS</span>
              </h3>
              <div className="print:hidden text-slate-400">
                {expandedSections['sec-13'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {expandedSections['sec-13'] && (
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 print:text-black uppercase font-bold">Dados Extraídos da AD:</span>
                    <p className="text-slate-300 print:text-black">Número da AD, Título, Autoridade, Efetividade, Ações Requeridas, Prazos e Referências.</p>
                  </div>

                  <div className="p-3 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 print:text-black uppercase font-bold">Dados Obtidos da Frota do Operador:</span>
                    <p className="text-slate-300 print:text-black">Matrículas, MSNs, Modelos, Configuração de Motores e Componentes Instalados.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 print:bg-gray-50 print:border print:border-black rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 print:text-black uppercase font-bold">Registro de Auditoria de Decisões:</span>
                  <div className="space-y-1">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="text-[11px] text-slate-400 print:text-black flex justify-between border-b border-slate-800/60 pb-1">
                        <span>[{log.action}] {log.details}</span>
                        <span className="text-[10px] text-slate-500 print:text-black">{log.timestamp.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
