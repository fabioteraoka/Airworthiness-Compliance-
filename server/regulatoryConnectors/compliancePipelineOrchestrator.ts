import { 
  CompliancePipelineExecution, 
  PipelineStageKey, 
  PipelineStageExecutionDetail, 
  PipelineExecutionStatus, 
  PipelineExecutionOptions, 
  BatchPipelineExecutionSummary,
  RegulatoryDiscoveryRecord,
  RegulatorySourceRecord,
  ComplianceRequirement,
  IssuingAuthority,
  AuditTrailEntry,
  FAPTDocument,
  UserProfile
} from '../../src/types';
import { camoDb } from '../dataStore';
import { regulatorySourceRegistry } from './sourceRegistry';
import { RegulatoryDiscoveryEngine } from './regulatoryDiscoveryEngine';
import { FleetScreeningEngine } from './fleetScreeningEngine';
import { OfficialDocumentAcquisitionService, officialDocumentAcquisitionService } from './officialDocumentAcquisitionService';
import { extractAdWithGemini } from '../geminiService';
import { evaluateComplianceRequirement, buildDynamicApplicabilityCriteria } from '../ruleEngine';
import { evaluateRequirementWithCamoV2 } from '../complianceOrchestrator';
import { complianceObligationService } from '../camoEngine/complianceObligationService';
import fs from 'fs';
import path from 'path';

export class CompliancePipelineOrchestrator {
  public readonly ORCHESTRATOR_VERSION = '5.3.1';
  public readonly RULE_ENGINE_VERSION = '2.1.0';
  public readonly EXTRACTOR_VERSION = '3.7.1';
  public readonly SCHEMA_VERSION = '1.0.0';
  public readonly CONFIG_HASH = 'sha256:camo-config-v531';

  private discoveryEngine: RegulatoryDiscoveryEngine;
  private screeningEngine: FleetScreeningEngine;
  private acquisitionService: OfficialDocumentAcquisitionService;

  constructor(
    customDiscoveryEngine?: RegulatoryDiscoveryEngine,
    customScreeningEngine?: FleetScreeningEngine,
    customAcquisitionService?: OfficialDocumentAcquisitionService
  ) {
    this.discoveryEngine = customDiscoveryEngine || new RegulatoryDiscoveryEngine();
    this.screeningEngine = customScreeningEngine || new FleetScreeningEngine();
    this.acquisitionService = customAcquisitionService || officialDocumentAcquisitionService;
  }

  /**
   * Recovers any executions stuck in 'RUNNING' status (e.g. after container crash or restart)
   */
  public recoverStuckExecutions(maxRunningMinutes: number = 5): number {
    const state = camoDb.getState();
    const now = Date.now();
    let recoveredCount = 0;

    camoDb.update(draft => {
      for (const exec of draft.pipelineExecutions || []) {
        if (exec.status === 'RUNNING') {
          const startedMs = new Date(exec.startedAt).getTime();
          if (now - startedMs > maxRunningMinutes * 60 * 1000) {
            exec.status = 'FAILED';
            exec.lastError = `Execution interrupted or timed out after ${maxRunningMinutes} minutes. Safe to retry.`;
            exec.completedAt = new Date().toISOString();
            exec.durationMs = now - startedMs;
            if (exec.currentStage && exec.stages[exec.currentStage]) {
              exec.stages[exec.currentStage].status = 'FAILED';
              exec.stages[exec.currentStage].error = 'Process interrupted during execution.';
              exec.stages[exec.currentStage].completedAt = new Date().toISOString();
            }
            exec.auditTrail.push(`[${new Date().toISOString()}] Execution recovered from stuck RUNNING state to FAILED.`);
            recoveredCount++;
          }
        }
      }
    });

    return recoveredCount;
  }

  /**
   * Initializes blank stages object for a new pipeline execution
   */
  private createInitialStages(): Record<PipelineStageKey, PipelineStageExecutionDetail> {
    return {
      DISCOVERY: {
        stageKey: 'DISCOVERY',
        stageName: 'Regulatory Discovery Verification',
        stageNumber: 1,
        status: 'PENDING'
      },
      FLEET_SCREENING: {
        stageKey: 'FLEET_SCREENING',
        stageName: 'Automated Fleet Regulatory Screening (v5.2.1)',
        stageNumber: 2,
        status: 'PENDING'
      },
      OFFICIAL_ACQUISITION: {
        stageKey: 'OFFICIAL_ACQUISITION',
        stageName: 'Cryptographic Document Acquisition & SSRF Defense (v4.1)',
        stageNumber: 3,
        status: 'PENDING'
      },
      DOCUMENT_INTELLIGENCE: {
        stageKey: 'DOCUMENT_INTELLIGENCE',
        stageName: 'AI Document Intelligence & Entity Extraction (Gemini 3.7 / Zero-Fabrication Fallback)',
        stageNumber: 4,
        status: 'PENDING'
      },
      REQUIREMENT_STRUCTURING: {
        stageKey: 'REQUIREMENT_STRUCTURING',
        stageName: 'Structured Compliance Requirement & Provenance Matrix',
        stageNumber: 5,
        status: 'PENDING'
      },
      CAMO_RULE_ENGINE: {
        stageKey: 'CAMO_RULE_ENGINE',
        stageName: 'Deterministic CAMO Rule Engine V2 Evaluation',
        stageNumber: 6,
        status: 'PENDING'
      },
      FLEET_ASSESSMENT_CONSOLIDATION: {
        stageKey: 'FLEET_ASSESSMENT_CONSOLIDATION',
        stageName: 'Fleet Assessment Consolidation & FAPT Generation',
        stageNumber: 7,
        status: 'PENDING'
      },
      HUMAN_REVIEW_GATEWAY: {
        stageKey: 'HUMAN_REVIEW_GATEWAY',
        stageName: 'CAMO Human Engineering Review Gateway',
        stageNumber: 8,
        status: 'PENDING'
      }
    };
  }

  /**
   * Executes the full end-to-end regulatory compliance pipeline for a single discovery record
   */
  public async executeDiscoveryPipeline(
    discoveryOrId: string | RegulatoryDiscoveryRecord,
    options: PipelineExecutionOptions = {}
  ): Promise<CompliancePipelineExecution> {
    const startTime = Date.now();
    const state = camoDb.getState();

    // 1. Resolve Discovery Record
    let discovery: RegulatoryDiscoveryRecord | undefined;
    if (typeof discoveryOrId === 'string') {
      discovery = state.discoveryRecords.find(d => d.id === discoveryOrId || d.documentNumber === discoveryOrId);
    } else {
      discovery = discoveryOrId;
    }

    if (!discovery) {
      throw new Error(`Discovery record not found: '${discoveryOrId}'`);
    }

    // 2. Check Idempotency: Is there already an ongoing RUNNING execution with same hash/document?
    const existingExecutions = state.pipelineExecutions || [];
    const runningExecution = existingExecutions.find(
      e => e.discoveryRecordId === discovery!.id && e.status === 'RUNNING'
    );
    if (runningExecution) {
      return runningExecution;
    }

    // 3. Initialize Pipeline Execution Entity with Phase 5.3.1 Hardened Metadata
    const executionId = `pipe-exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const execution: CompliancePipelineExecution = {
      id: executionId,
      discoveryRecordId: discovery.id,
      documentNumber: discovery.documentNumber,
      adNumber: discovery.adNumber,
      title: discovery.title,
      authority: (discovery.authority as IssuingAuthority) || 'FAA',
      status: 'RUNNING',
      currentStage: 'DISCOVERY',
      startedAt: new Date().toISOString(),
      triggeredBy: options.triggeredBy || 'MANUAL_TRIGGER',
      
      // Phase 5.3.1 Explicit Version Stamping & Decision Metadata
      pipelineVersion: this.ORCHESTRATOR_VERSION,
      ruleEngineVersion: this.RULE_ENGINE_VERSION,
      screeningEngineVersion: this.screeningEngine.ENGINE_VERSION,
      acquisitionEngineVersion: this.acquisitionService.SERVICE_VERSION,
      extractorVersion: this.EXTRACTOR_VERSION,
      modelId: 'models/gemini-2.5-flash',
      promptVersion: this.EXTRACTOR_VERSION,
      schemaVersion: this.SCHEMA_VERSION,
      configHash: this.CONFIG_HASH,
      isFallbackExtraction: false,
      
      stages: this.createInitialStages(),
      humanReviewRequired: false,
      humanReviewReasons: [],
      retryCount: 0,
      maxRetries: options.maxRetries ?? 2,
      auditTrail: [
        `[${new Date().toISOString()}] Pipeline execution initiated (ID: ${executionId}) for document ${discovery.documentNumber} (${discovery.adNumber || 'Pending AD Number'}). Engine v${this.ORCHESTRATOR_VERSION}. Trigger: ${options.triggeredBy || 'MANUAL_TRIGGER'}.`
      ]
    };

    // Save initial state to DB
    this.persistExecution(execution);

    try {
      // ----------------------------------------------------------------------
      // STAGE 1: DISCOVERY VERIFICATION
      // ----------------------------------------------------------------------
      execution.currentStage = 'DISCOVERY';
      const stage1Start = Date.now();
      execution.stages.DISCOVERY.status = 'RUNNING';
      execution.stages.DISCOVERY.startedAt = new Date().toISOString();

      if (!discovery.documentNumber || (!discovery.pdfUrl && !discovery.htmlUrl)) {
        throw new Error(`Discovery record ${discovery.id} lacks documentNumber or source URLs.`);
      }

      execution.stages.DISCOVERY.status = 'SUCCESS';
      execution.stages.DISCOVERY.completedAt = new Date().toISOString();
      execution.stages.DISCOVERY.durationMs = Date.now() - stage1Start;
      execution.stages.DISCOVERY.message = `Verified regulatory publication metadata for ${discovery.authority} doc #${discovery.documentNumber}.`;
      execution.stages.DISCOVERY.details = {
        documentNumber: discovery.documentNumber,
        adNumber: discovery.adNumber,
        authority: discovery.authority,
        make: discovery.make,
        models: discovery.models,
        pdfUrl: discovery.pdfUrl
      };
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 1 (DISCOVERY) SUCCESS: Validated source metadata.`);
      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 2: FLEET SCREENING (Phase 5.2)
      // ----------------------------------------------------------------------
      execution.currentStage = 'FLEET_SCREENING';
      const stage2Start = Date.now();
      execution.stages.FLEET_SCREENING.status = 'RUNNING';
      execution.stages.FLEET_SCREENING.startedAt = new Date().toISOString();

      const fleetInventory = {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations
      };

      const screeningSummary = this.screeningEngine.screenDiscoveryRecordAgainstFleet(discovery, fleetInventory);
      execution.screeningSummary = screeningSummary;

      // Persist screening assessments in DB
      camoDb.update(draft => {
        if (!Array.isArray(draft.screeningAssessments)) {
          draft.screeningAssessments = [];
        }
        for (const ass of screeningSummary.assessments) {
          const existingIdx = draft.screeningAssessments.findIndex(
            a => a.discoveryRecordId === ass.discoveryRecordId && a.aircraftId === ass.aircraftId
          );
          if (existingIdx >= 0) {
            draft.screeningAssessments[existingIdx] = ass;
          } else {
            draft.screeningAssessments.push(ass);
          }
        }
      });

      execution.stages.FLEET_SCREENING.status = 'SUCCESS';
      execution.stages.FLEET_SCREENING.completedAt = new Date().toISOString();
      execution.stages.FLEET_SCREENING.durationMs = Date.now() - stage2Start;
      execution.stages.FLEET_SCREENING.message = `Screened against ${screeningSummary.totalScreened} aircraft: ${screeningSummary.potentialMatches} Potential Match(es), ${screeningSummary.noMatches} No Match, ${screeningSummary.insufficientMetadata} Insufficient Metadata.`;
      execution.stages.FLEET_SCREENING.details = {
        potentialMatches: screeningSummary.potentialMatches,
        noMatches: screeningSummary.noMatches,
        insufficientMetadata: screeningSummary.insufficientMetadata,
        engineVersion: screeningSummary.engineVersion
      };
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 2 (FLEET_SCREENING) SUCCESS: ${screeningSummary.potentialMatches} Potential Matches, ${screeningSummary.noMatches} No Matches.`);

      // ----------------------------------------------------------------------
      // SHORT-CIRCUIT SAFETY CHECK: NO_MATCH DISMISSAL
      // ----------------------------------------------------------------------
      if (screeningSummary.potentialMatches === 0 && screeningSummary.insufficientMetadata === 0 && !options.forceFullRun) {
        // Safe bypass: Document does not apply to any model or serial in the fleet
        execution.status = 'COMPLETED_NO_MATCH';
        execution.completedAt = new Date().toISOString();
        execution.durationMs = Date.now() - startTime;

        // Mark remaining stages as SKIPPED
        const remainingStages: PipelineStageKey[] = [
          'OFFICIAL_ACQUISITION',
          'DOCUMENT_INTELLIGENCE',
          'REQUIREMENT_STRUCTURING',
          'CAMO_RULE_ENGINE',
          'FLEET_ASSESSMENT_CONSOLIDATION',
          'HUMAN_REVIEW_GATEWAY'
        ];

        for (const stg of remainingStages) {
          execution.stages[stg].status = 'SKIPPED';
          execution.stages[stg].message = 'Skipped: Deterministic Fleet Screening proved 0 potential matches across all fleet units.';
        }

        execution.auditTrail.push(`[${new Date().toISOString()}] Pipeline completed early (COMPLETED_NO_MATCH): No fleet aircraft affected by this regulatory publication. Zero risk verified.`);
        
        camoDb.logAudit({
          user: state.currentUser.name,
          role: state.currentUser.role,
          action: 'FLEET_SCREENING',
          entityType: 'CompliancePipelineExecution',
          entityId: execution.id,
          details: `Pipeline execution ${execution.id} completed as COMPLETED_NO_MATCH for doc #${discovery.documentNumber}. All ${screeningSummary.totalScreened} fleet aircraft are non-matching.`
        });

        this.persistExecution(execution);
        return execution;
      }

      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 3: OFFICIAL DOCUMENT ACQUISITION (Phase 4.1)
      // ----------------------------------------------------------------------
      execution.currentStage = 'OFFICIAL_ACQUISITION';
      const stage3Start = Date.now();
      execution.stages.OFFICIAL_ACQUISITION.status = 'RUNNING';
      execution.stages.OFFICIAL_ACQUISITION.startedAt = new Date().toISOString();

      const sourceRecord: RegulatorySourceRecord = {
        source: 'FEDERAL_REGISTER',
        authority: (discovery.authority as IssuingAuthority) || 'FAA',
        documentNumber: discovery.documentNumber,
        adNumber: discovery.adNumber || undefined,
        title: discovery.title || `FAA Airworthiness Directive ${discovery.documentNumber}`,
        action: discovery.action || 'Airworthiness Directive',
        publicationDate: discovery.publicationDate || new Date().toISOString().split('T')[0],
        effectiveDate: discovery.effectiveDate || discovery.publicationDate || undefined,
        htmlUrl: discovery.htmlUrl || `https://www.federalregister.gov/documents/${discovery.documentNumber}`,
        pdfUrl: discovery.pdfUrl || undefined,
        abstract: discovery.abstract,
        retrievedAt: new Date().toISOString()
      };

      const acquisitionResult = await this.acquisitionService.acquireOfficialDocument(sourceRecord, {
        forceFreshDownload: options.forceFreshDownload
      });

      if (!acquisitionResult.success || !acquisitionResult.record) {
        throw new Error(`Official document acquisition failed: ${acquisitionResult.error || 'Unknown acquisition error'}`);
      }

      const acquiredDoc = acquisitionResult.record;
      execution.acquiredDocumentId = acquiredDoc.id;
      execution.acquiredDocumentHash = acquiredDoc.sha256;

      execution.stages.OFFICIAL_ACQUISITION.status = 'SUCCESS';
      execution.stages.OFFICIAL_ACQUISITION.completedAt = new Date().toISOString();
      execution.stages.OFFICIAL_ACQUISITION.durationMs = Date.now() - stage3Start;
      execution.stages.OFFICIAL_ACQUISITION.message = `Acquired official PDF (${acquiredDoc.fileSizeBytes} bytes). SHA-256: ${acquiredDoc.sha256?.substring(0, 16)}... (SSRF-verified).`;
      execution.stages.OFFICIAL_ACQUISITION.details = {
        documentId: acquiredDoc.id,
        sha256: acquiredDoc.sha256,
        sourceUrl: acquiredDoc.finalUrl || acquiredDoc.originalUrl,
        isDuplicate: acquisitionResult.isDuplicate,
        validationStatus: acquiredDoc.validationStatus
      };
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 3 (OFFICIAL_ACQUISITION) SUCCESS: Document ${acquiredDoc.id} in cryptovault (Hash ${acquiredDoc.sha256?.substring(0, 12)}...).`);
      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 4: DOCUMENT INTELLIGENCE (Gemini 3.7 Flash)
      // ----------------------------------------------------------------------
      execution.currentStage = 'DOCUMENT_INTELLIGENCE';
      const stage4Start = Date.now();
      execution.stages.DOCUMENT_INTELLIGENCE.status = 'RUNNING';
      execution.stages.DOCUMENT_INTELLIGENCE.startedAt = new Date().toISOString();

      // Read PDF buffer from disk or fallback to text
      let pdfBase64: string | undefined;
      let rawText: string | undefined;

      if (acquiredDoc.storagePath && fs.existsSync(acquiredDoc.storagePath)) {
        try {
          const fileBuf = fs.readFileSync(acquiredDoc.storagePath);
          pdfBase64 = fileBuf.toString('base64');
        } catch (readErr) {
          console.warn('Could not read local PDF file for extraction, using fallback:', readErr);
        }
      }

      // Always supply full discovery metadata text context
      rawText = `${discovery.title}\n${discovery.abstract || ''}\nAD Number: ${discovery.adNumber || discovery.documentNumber}\nDocument Number: ${discovery.documentNumber}\nDocket: ${discovery.docketNumber || ''}\nMake: ${discovery.make || ''}\nModels: ${(discovery.models || []).join(', ')}`;

      const extracted = await extractAdWithGemini({
        pdfBase64,
        text: rawText,
        fileName: acquiredDoc.fileName || `${discovery.documentNumber}.pdf`
      });

      const isExtractionFailed = extracted.extractionStatus === 'EXTRACTION_FAILED';
      const isFallbackUsed = Boolean((extracted as any).isFallback || extracted.documentProcessingStatus === 'EXTRACTION_REVIEW_REQUIRED');
      const extractionWarning = isExtractionFailed || isFallbackUsed || extracted.extractionStatus === 'EXTRACTION_REVIEW_REQUIRED';
      
      execution.isFallbackExtraction = isFallbackUsed;
      if (isExtractionFailed) {
        execution.humanReviewReasons.push(`AI Extraction Review Required: ${extracted.extractionError || 'Partial technical data - flagged for engineering review'}`);
      } else if (isFallbackUsed) {
        execution.humanReviewReasons.push('Deterministic Fallback Parser used due to AI service unavailability. Engineering review required to verify extracted parameters.');
      } else if (extractionWarning) {
        execution.humanReviewReasons.push(`AI Extraction Review Flagged: ${extracted.missingFields?.join(', ') || 'Partial technical data'}`);
      }

      execution.stages.DOCUMENT_INTELLIGENCE.status = extractionWarning ? 'WARNING' : 'SUCCESS';
      execution.stages.DOCUMENT_INTELLIGENCE.completedAt = new Date().toISOString();
      execution.stages.DOCUMENT_INTELLIGENCE.durationMs = Date.now() - stage4Start;
      execution.stages.DOCUMENT_INTELLIGENCE.message = `Extracted ${(extracted.actions || []).length} action(s), ${(extracted.aircraftModels || []).length} model(s), ${(extracted.referencedDocuments || []).length} ref doc(s). Status: ${extracted.extractionStatus}${isFallbackUsed ? ' (Fallback)' : ''}`;
      execution.stages.DOCUMENT_INTELLIGENCE.details = {
        extractedAdNumber: extracted.sourceNumber || discovery.adNumber || `FAA AD ${discovery.documentNumber}`,
        modelsExtracted: extracted.aircraftModels || discovery.models || [],
        actionsCount: (extracted.actions || []).length,
        softwareReqsCount: (extracted.softwareRequirements || []).length,
        refDocsCount: (extracted.referencedDocuments || []).length,
        extractionStatus: extracted.extractionStatus,
        isFallback: isFallbackUsed
      };
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 4 (DOCUMENT_INTELLIGENCE) ${extractionWarning ? 'WARNING' : 'SUCCESS'}: Extracted technical requirements${isFallbackUsed ? ' [Deterministic Fallback]' : ''}.`);
      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 5: STRUCTURED COMPLIANCE REQUIREMENT & SUPERSEDENCE
      // ----------------------------------------------------------------------
      execution.currentStage = 'REQUIREMENT_STRUCTURING';
      const stage5Start = Date.now();
      execution.stages.REQUIREMENT_STRUCTURING.status = 'RUNNING';
      execution.stages.REQUIREMENT_STRUCTURING.startedAt = new Date().toISOString();

      // Check for Superseded ADs (Zero-loss regulatory tracking)
      const supersededList: string[] = [];
      if (extracted.supersedes) {
        supersededList.push(...(Array.isArray(extracted.supersedes) ? extracted.supersedes : [extracted.supersedes]));
      }
      // Regex check on title/abstract for supersedence
      const supersedesRegex = /supersedes\s+(?:AD\s+)?(\d{4}-\d{2}-\d{2}|\b[A-Z0-9\-/]+\b)/gi;
      let match: RegExpExecArray | null;
      const combinedText = `${discovery.title} ${discovery.abstract || ''}`;
      while ((match = supersedesRegex.exec(combinedText)) !== null) {
        if (match[1] && !supersededList.includes(match[1])) {
          supersededList.push(match[1].trim());
        }
      }

      if (supersededList.length > 0) {
        execution.supersedesAdNumbers = supersededList;
      }

      // Effective Date Determination
      const todayIso = new Date().toISOString().split('T')[0];
      const resolvedEffectiveDate = discovery.effectiveDate || extracted.effectiveDate || discovery.publicationDate || todayIso;
      const isFutureEffective = resolvedEffectiveDate > todayIso;
      execution.effectiveDateStatus = isFutureEffective ? 'FUTURE_EFFECTIVE' : 'CURRENT_EFFECTIVE';

      const requirementId = `cr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newRequirement: ComplianceRequirement = {
        id: requirementId,
        sourceType: 'AD',
        sourceNumber: extracted.sourceNumber || discovery.adNumber || `FAA AD ${discovery.documentNumber}`,
        revision: extracted.revision || 'Original',
        title: extracted.title || discovery.title || `Airworthiness Directive ${discovery.documentNumber}`,
        issuingAuthority: (extracted.issuingAuthority as IssuingAuthority) || (discovery.authority as IssuingAuthority) || 'FAA',
        issueDate: extracted.issueDate || discovery.publicationDate || new Date().toISOString().split('T')[0],
        effectiveDate: resolvedEffectiveDate,
        emergencyAd: false,
        status: 'DRAFT',
        createdBy: 'CAMO Automated Compliance Pipeline (Phase 5.3.1)',
        updatedBy: 'CAMO Automated Compliance Pipeline (Phase 5.3.1)',
        supersededBy: undefined,
        supersedes: supersededList.length > 0 ? supersededList.join(', ') : undefined,
        applicabilityRule: {
          id: `rule-${requirementId}`,
          complianceRequirementId: requirementId,
          aircraftManufacturers: extracted.aircraftManufacturers?.length ? extracted.aircraftManufacturers : (discovery.make ? [discovery.make] : []),
          aircraftModels: extracted.aircraftModels?.length ? extracted.aircraftModels : (discovery.models || []),
          aircraftSerialRanges: extracted.aircraftSerialRangesDescription ? {
            description: extracted.aircraftSerialRangesDescription,
            from: extracted.aircraftSerialRangesFrom || undefined,
            to: extracted.aircraftSerialRangesTo || undefined,
            list: extracted.aircraftSerialRangesList || []
          } : undefined,
          engineManufacturers: extracted.engineManufacturers || [],
          engineModels: extracted.engineModels || [],
          componentPartNumbers: extracted.componentPartNumbers || [],
          affectedConfiguration: extracted.affectedConfiguration || undefined,
          otherEffectivityCriteria: extracted.otherEffectivityCriteria || undefined,
          rawText: extracted.applicabilityRawSummary || discovery.abstract || ''
        },
        requirementDetails: {
          complianceTime: extracted.complianceTime || undefined,
          initialThreshold: extracted.initialThreshold || undefined,
          repetitiveInterval: extracted.repetitiveInterval || undefined,
          requiredInspection: extracted.requiredInspection || undefined,
          modification: extracted.modification || undefined,
          replacement: extracted.replacement || undefined,
          optionalMethod: extracted.optionalMethod || undefined,
          terminatingAction: extracted.terminatingAction || undefined,
          requiredParts: extracted.requiredParts || [],
          requiredDocumentation: extracted.requiredDocumentation || undefined
        },
        actions: (extracted.actions || []).map((a, idx) => ({
          id: `act-${requirementId}-${idx + 1}`,
          complianceRequirementId: requirementId,
          sequence: a.sequence || idx + 1,
          paragraphReference: a.paragraphReference || undefined,
          actionName: a.actionName,
          actionType: a.actionType,
          condition: a.condition || undefined,
          fullInstruction: a.fullInstruction,
          technicalReference: a.technicalReference || undefined,
          complianceTime: a.complianceTime || undefined,
          initialThreshold: a.initialThreshold || undefined,
          repetitiveInterval: a.repetitiveInterval || undefined,
          repeatConditions: a.repeatConditions || undefined,
          requiredInspection: a.requiredInspection || undefined,
          modification: a.modification || undefined,
          replacement: a.replacement || undefined,
          terminatingAction: a.terminatingAction || undefined,
          requiredParts: a.requiredParts || [],
          requiredTools: a.requiredTools || [],
          requiredDocumentation: a.requiredDocumentation || undefined,
          amoc: a.amoc || undefined,
          operationalLimitations: a.operationalLimitations || undefined,
          exceptions: a.exceptions || undefined,
          notes: a.notes || undefined,
          evidenceText: a.evidenceText || undefined
        })),
        referencedDocuments: (extracted.referencedDocuments || []).map((rd, idx) => ({
          id: `refdoc-${requirementId}-${idx + 1}`,
          complianceRequirementId: requirementId,
          documentReference: rd.documentReference,
          revision: rd.revision || undefined,
          relationshipToAD: rd.relationshipToAD,
          requiredForEvaluation: rd.requiredForEvaluation,
          availabilityStatus: rd.availabilityStatus,
          citedParagraph: rd.citedParagraph || undefined,
          purpose: rd.purpose || undefined,
          notes: rd.notes || undefined
        })),
        applicabilityCriteria: extracted.applicabilityCriteria,
        mandatedActions: extracted.mandatedActions,
        softwareRequirements: extracted.softwareRequirements,
        externalEffectivityReferences: extracted.externalEffectivityReferences,
        rawExtraction: extracted.rawExtraction,
        sourceDocument: {
          fileName: acquiredDoc.fileName,
          fileSize: acquiredDoc.fileSizeBytes,
          mimeType: acquiredDoc.mimeType,
          documentHash: acquiredDoc.sha256,
          rawExtractedText: rawText || ''
        },
        documentProcessingStatus: extracted.documentProcessingStatus || 'EXTRACTED',
        extractionStatus: extracted.extractionStatus || 'SUCCESS',
        provenanceMap: extracted.provenanceMap || {},
        pipelineDiagnostics: extracted.pipelineDiagnostics,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!newRequirement.applicabilityCriteria && newRequirement.applicabilityRule) {
        newRequirement.applicabilityCriteria = buildDynamicApplicabilityCriteria(newRequirement, newRequirement.applicabilityRule);
      }

      execution.complianceRequirementId = newRequirement.id;

      // Handle Supersedence linking in DB
      if (supersededList.length > 0) {
        camoDb.update(draft => {
          for (const oldReq of draft.requirements) {
            if (supersededList.includes(oldReq.sourceNumber) || supersededList.some(s => oldReq.sourceNumber.includes(s))) {
              oldReq.supersededBy = newRequirement.sourceNumber;
              oldReq.status = 'SUPERSEDED';
              oldReq.updatedAt = new Date().toISOString();
              // Mark associated obligations as SUPERSEDED
              complianceObligationService.markSuperseded(oldReq.id, newRequirement.sourceNumber, newRequirement.id, 'CompliancePipelineOrchestrator v6.1.0');
            }
          }
        });
        execution.humanReviewReasons.push(`AD supersedes prior directive(s) (${supersededList.join(', ')}). Engineering review required to confirm transition of open/repetitive obligations.`);
      }

      // Persist Requirement to DB
      camoDb.update(draft => {
        const existingIdx = draft.requirements.findIndex(r => r.sourceNumber === newRequirement.sourceNumber);
        if (existingIdx >= 0) {
          draft.requirements[existingIdx] = newRequirement;
        } else {
          draft.requirements.unshift(newRequirement);
        }
      });

      execution.stages.REQUIREMENT_STRUCTURING.status = 'SUCCESS';
      execution.stages.REQUIREMENT_STRUCTURING.completedAt = new Date().toISOString();
      execution.stages.REQUIREMENT_STRUCTURING.durationMs = Date.now() - stage5Start;
      execution.stages.REQUIREMENT_STRUCTURING.message = `Created structured ComplianceRequirement #${newRequirement.id} with full provenance.`;
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 5 (REQUIREMENT_STRUCTURING) SUCCESS: Created requirement ${newRequirement.id}.`);
      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 6: CAMO RULE ENGINE V2 EVALUATION
      // ----------------------------------------------------------------------
      execution.currentStage = 'CAMO_RULE_ENGINE';
      const stage6Start = Date.now();
      execution.stages.CAMO_RULE_ENGINE.status = 'RUNNING';
      execution.stages.CAMO_RULE_ENGINE.startedAt = new Date().toISOString();

      const evalResult = evaluateComplianceRequirement(newRequirement, {
        aircraft: state.aircraft,
        engines: state.engines,
        components: state.components,
        installations: state.installations,
        knowledgeFacts: state.knowledgeFacts,
        existingQuestions: state.questions
      });

      // Persist assessments & questions to DB
      camoDb.update(draft => {
        // Assessments
        for (const ass of evalResult.assessments) {
          const assIdx = draft.assessments.findIndex(a => a.id === ass.id);
          if (assIdx >= 0) {
            draft.assessments[assIdx] = ass;
          } else {
            draft.assessments.push(ass);
          }
        }
        // Questions
        for (const q of evalResult.generatedQuestions) {
          if (!draft.questions.some(existing => existing.id === q.id)) {
            draft.questions.push(q);
          }
        }
      });

      // Synchronize Compliance Obligations into Lifecycle Model (Phase 6.1)
      for (const ass of evalResult.assessments) {
        const ac = state.aircraft.find(a => a.id === ass.entityId);
        if (ac) {
          const mandatedActions = newRequirement.mandatedActions && newRequirement.mandatedActions.length > 0
            ? newRequirement.mandatedActions
            : [undefined];

          for (const act of mandatedActions) {
            complianceObligationService.createOrUpdateObligation({
              requirement: newRequirement,
              aircraft: ac,
              applicabilityStatus: ass.result === 'APPLICABLE' ? 'APPLICABLE' : (ass.result === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : 'REVIEW_REQUIRED'),
              applicabilityReasoning: ass.reasoning,
              applicabilityAssessmentId: ass.id,
              mandatedAction: act,
              actor: 'CompliancePipelineOrchestrator v6.1.0'
            });
          }
        }
      }

      const applicableCount = evalResult.assessments.filter(a => a.result === 'APPLICABLE').length;
      const notApplicableCount = evalResult.assessments.filter(a => a.result === 'NOT_APPLICABLE').length;
      const reviewRequiredCount = evalResult.assessments.filter(a => a.result === 'REVIEW_REQUIRED').length;
      const generatedQuestionsCount = evalResult.generatedQuestions.length;

      execution.assessmentsProducedCount = evalResult.assessments.length;
      execution.applicableCount = applicableCount;
      execution.notApplicableCount = notApplicableCount;
      execution.reviewRequiredCount = reviewRequiredCount;
      execution.generatedQuestionsCount = generatedQuestionsCount;

      execution.stages.CAMO_RULE_ENGINE.status = 'SUCCESS';
      execution.stages.CAMO_RULE_ENGINE.completedAt = new Date().toISOString();
      execution.stages.CAMO_RULE_ENGINE.durationMs = Date.now() - stage6Start;
      execution.stages.CAMO_RULE_ENGINE.message = `CAMO Rule Engine V2 evaluated ${evalResult.assessments.length} aircraft: ${applicableCount} Applicable, ${notApplicableCount} Not Applicable, ${reviewRequiredCount} Review Required.`;
      execution.stages.CAMO_RULE_ENGINE.details = {
        applicableCount,
        notApplicableCount,
        reviewRequiredCount,
        generatedQuestionsCount
      };
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 6 (CAMO_RULE_ENGINE) SUCCESS: ${applicableCount} APPLICABLE, ${reviewRequiredCount} REVIEW_REQUIRED.`);
      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 7: FLEET ASSESSMENT CONSOLIDATION & FAPT GENERATION
      // ----------------------------------------------------------------------
      execution.currentStage = 'FLEET_ASSESSMENT_CONSOLIDATION';
      const stage7Start = Date.now();
      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.status = 'RUNNING';
      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.startedAt = new Date().toISOString();

      const faptDoc: FAPTDocument = {
        id: `fapt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        complianceRequirementId: newRequirement.id,
        documentNumber: `FAPT-${newRequirement.sourceNumber.replace(/\s+/g, '-')}`,
        revision: 'Rev 0 (Preliminary Automated)',
        dateCreated: new Date().toISOString(),
        adNumber: newRequirement.sourceNumber,
        adRevision: newRequirement.revision || 'Original',
        authority: newRequirement.issuingAuthority,
        issueDate: newRequirement.issueDate || new Date().toISOString().split('T')[0],
        effectiveDate: newRequirement.effectiveDate || new Date().toISOString().split('T')[0],
        title: newRequirement.title,
        emergency: false,
        affectedFleetCount: applicableCount,
        notApplicableCount: notApplicableCount,
        reviewRequiredCount: reviewRequiredCount,
        applicabilityMatrix: evalResult.assessments.map(ass => {
          const compMatches = ass.matchedCriteria.componentMatch?.matched ? [ass.matchedCriteria.componentMatch.detail] : [];
          return {
            aircraftRegistration: ass.entityRegistration || 'N/A',
            msn: ass.entityMsn || '',
            model: ass.entityModel || '',
            installedEngine: state.engines.find(e => e.aircraftId === ass.entityId)?.model,
            affectedComponentsFound: compMatches,
            result: ass.result,
            reasoningSummary: ass.reasoning[0] || 'Evaluated by CAMO Rule Engine V2'
          };
        }),
        initialThreshold: newRequirement.requirementDetails?.initialThreshold || 'N/A',
        complianceTime: newRequirement.requirementDetails?.complianceTime || 'As specified in AD',
        repetitiveInterval: newRequirement.requirementDetails?.repetitiveInterval || 'N/A',
        requiredInspection: newRequirement.requirementDetails?.requiredInspection || 'N/A',
        modification: newRequirement.requirementDetails?.modification || 'N/A',
        replacement: newRequirement.requirementDetails?.replacement || 'N/A',
        terminatingAction: newRequirement.requirementDetails?.terminatingAction || 'N/A',
        requiredParts: newRequirement.requirementDetails?.requiredParts || [],
        requiredDocumentation: newRequirement.requirementDetails?.requiredDocumentation || 'Logbook entry and form 8130-3/EASA Form 1',
        evidenceReferences: [],
        knowledgeFactsApplied: [],
        preparedBy: 'CAMO Automated Compliance Orchestrator (Phase 5.3)',
        preparedDate: new Date().toISOString(),
        status: reviewRequiredCount > 0 ? 'REVIEWED' : 'DRAFT'
      };

      execution.faptId = faptDoc.id;

      // Persist FAPT to DB
      camoDb.update(draft => {
        const existingFaptIdx = draft.fapts.findIndex(f => f.complianceRequirementId === newRequirement.id);
        if (existingFaptIdx >= 0) {
          draft.fapts[existingFaptIdx] = faptDoc;
        } else {
          draft.fapts.unshift(faptDoc);
        }
      });

      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.status = 'SUCCESS';
      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.completedAt = new Date().toISOString();
      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.durationMs = Date.now() - stage7Start;
      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.message = `Generated preliminary FAPT document #${faptDoc.id} with complete fleet applicability matrix.`;
      execution.stages.FLEET_ASSESSMENT_CONSOLIDATION.details = {
        faptId: faptDoc.id,
        affectedFleetCount: applicableCount,
        notApplicableCount: notApplicableCount,
        reviewRequiredCount: reviewRequiredCount
      };
      execution.auditTrail.push(`[${new Date().toISOString()}] Stage 7 (FLEET_ASSESSMENT_CONSOLIDATION) SUCCESS: Created FAPT ${faptDoc.id}.`);
      this.persistExecution(execution);

      // ----------------------------------------------------------------------
      // STAGE 8: HUMAN REVIEW GATEWAY
      // ----------------------------------------------------------------------
      execution.currentStage = 'HUMAN_REVIEW_GATEWAY';
      const stage8Start = Date.now();
      execution.stages.HUMAN_REVIEW_GATEWAY.status = 'RUNNING';
      execution.stages.HUMAN_REVIEW_GATEWAY.startedAt = new Date().toISOString();

      // Determine if human review is required
      const reviewReasons: string[] = [...execution.humanReviewReasons];

      if (reviewRequiredCount > 0) {
        reviewReasons.push(`${reviewRequiredCount} aircraft assessment(s) generated REVIEW_REQUIRED status due to missing configuration facts or component records.`);
      }

      if (generatedQuestionsCount > 0) {
        reviewReasons.push(`${generatedQuestionsCount} pending technical question(s) require CAMO engineer input.`);
      }

      if (extracted.extractionStatus === 'EXTRACTION_REVIEW_REQUIRED' && !reviewReasons.some(r => r.includes('AI Document Intelligence'))) {
        reviewReasons.push('AI Document Intelligence flagged extraction warnings or missing non-fatal fields.');
      }

      if (screeningSummary.insufficientMetadata > 0 && !reviewReasons.some(r => r.includes('insufficient metadata'))) {
        reviewReasons.push('Initial screening contained insufficient metadata requiring verification.');
      }

      // Deduplicate reasons
      const uniqueReasons = Array.from(new Set(reviewReasons));

      if (uniqueReasons.length > 0) {
        execution.humanReviewRequired = true;
        execution.humanReviewReasons = uniqueReasons;
        execution.status = 'REVIEW_REQUIRED';
        execution.stages.HUMAN_REVIEW_GATEWAY.status = 'WARNING';
        execution.stages.HUMAN_REVIEW_GATEWAY.message = `Human CAMO Review Required (${uniqueReasons.length} triggers).`;
        execution.stages.HUMAN_REVIEW_GATEWAY.details = { reviewReasons: uniqueReasons };
      } else {
        execution.humanReviewRequired = false;
        execution.humanReviewReasons = [];
        execution.status = 'COMPLETED';
        execution.stages.HUMAN_REVIEW_GATEWAY.status = 'SUCCESS';
        execution.stages.HUMAN_REVIEW_GATEWAY.message = 'All fleet units deterministically evaluated without ambiguity. Ready for Chief CAMO Engineer digital sign-off.';
      }

      execution.stages.HUMAN_REVIEW_GATEWAY.completedAt = new Date().toISOString();
      execution.stages.HUMAN_REVIEW_GATEWAY.durationMs = Date.now() - stage8Start;
      execution.completedAt = new Date().toISOString();
      execution.durationMs = Date.now() - startTime;

      execution.auditTrail.push(`[${new Date().toISOString()}] Pipeline finished: Status=${execution.status}. HumanReview=${execution.humanReviewRequired ? 'YES' : 'NO'}. Total time: ${execution.durationMs}ms.`);

      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'RULE_EVALUATION',
        entityType: 'CompliancePipelineExecution',
        entityId: execution.id,
        details: `End-to-End Compliance Pipeline (v5.3.1) completed for AD ${newRequirement.sourceNumber} with status ${execution.status}. Duration: ${execution.durationMs}ms.`
      });

      this.persistExecution(execution);
      return execution;

    } catch (err: any) {
      console.error(`Pipeline Execution Error for ${discovery.documentNumber}:`, err);
      execution.status = 'FAILED';
      execution.lastError = err.message || 'Pipeline execution failure';
      execution.completedAt = new Date().toISOString();
      execution.durationMs = Date.now() - startTime;

      // Mark current stage as failed
      if (execution.currentStage && execution.stages[execution.currentStage]) {
        execution.stages[execution.currentStage].status = 'FAILED';
        execution.stages[execution.currentStage].error = err.message || 'Stage error';
        execution.stages[execution.currentStage].completedAt = new Date().toISOString();
      }

      execution.auditTrail.push(`[${new Date().toISOString()}] Pipeline FAILED at stage ${execution.currentStage}: ${err.message}`);
      
      camoDb.logAudit({
        user: state.currentUser.name,
        role: state.currentUser.role,
        action: 'RULE_EVALUATION',
        entityType: 'CompliancePipelineExecution',
        entityId: execution.id,
        details: `Pipeline execution ${execution.id} FAILED at stage ${execution.currentStage}: ${err.message}`
      });

      this.persistExecution(execution);
      return execution;
    }
  }

  /**
   * Runs batch pipeline execution for multiple discovery record IDs
   */
  public async executeBatchPipeline(
    discoveryIds: string[],
    options: PipelineExecutionOptions = {}
  ): Promise<BatchPipelineExecutionSummary> {
    const batchStartTime = Date.now();
    const batchId = `batch-pipe-${Date.now()}`;
    const state = camoDb.getState();

    let targetDiscoveries: RegulatoryDiscoveryRecord[] = [];
    if (discoveryIds.length > 0) {
      targetDiscoveries = state.discoveryRecords.filter(
        d => discoveryIds.includes(d.id) || discoveryIds.includes(d.documentNumber)
      );
    } else {
      targetDiscoveries = state.discoveryRecords;
    }

    const executionIds: string[] = [];
    let completedCount = 0;
    let completedNoMatchCount = 0;
    let reviewRequiredCount = 0;
    let failedCount = 0;

    for (const discovery of targetDiscoveries) {
      try {
        const result = await this.executeDiscoveryPipeline(discovery, {
          ...options,
          triggeredBy: options.triggeredBy || 'BATCH_RUNNER'
        });

        executionIds.push(result.id);
        if (result.status === 'COMPLETED') completedCount++;
        else if (result.status === 'COMPLETED_NO_MATCH') completedNoMatchCount++;
        else if (result.status === 'REVIEW_REQUIRED') reviewRequiredCount++;
        else if (result.status === 'FAILED') failedCount++;
      } catch (e) {
        failedCount++;
      }
    }

    const summary: BatchPipelineExecutionSummary = {
      batchId,
      startedAt: new Date(batchStartTime).toISOString(),
      completedAt: new Date().toISOString(),
      totalRequested: targetDiscoveries.length,
      completedCount,
      completedNoMatchCount,
      reviewRequiredCount,
      failedCount,
      executionIds,
      durationMs: Date.now() - batchStartTime
    };

    camoDb.logAudit({
      user: state.currentUser.name,
      role: state.currentUser.role,
      action: 'BATCH_PIPELINE',
      entityType: 'CompliancePipelineExecution',
      entityId: batchId,
      details: `Batch Pipeline Execution completed (${targetDiscoveries.length} records): ${completedCount} Completed, ${completedNoMatchCount} No Match, ${reviewRequiredCount} Review Required, ${failedCount} Failed.`
    });

    return summary;
  }

  /**
   * Scans Federal Register and automatically runs pipeline on new/matching discoveries
   */
  public async executeScanAndPipeline(
    scanOptions: {
      startDate?: string;
      endDate?: string;
      incremental?: boolean;
      maxPages?: number;
      autoExecuteOnlyMatches?: boolean;
    } = {}
  ): Promise<{
    scanSummary: any;
    pipelineSummary: BatchPipelineExecutionSummary;
    executions: CompliancePipelineExecution[];
  }> {
    // 1. Scan Federal Register
    const scanResult = await this.discoveryEngine.scanRegulatorySources({
      startDate: scanOptions.startDate,
      endDate: scanOptions.endDate,
      incremental: scanOptions.incremental,
      maxPages: scanOptions.maxPages
    });

    // 2. Identify discoveries to process
    const state = camoDb.getState();
    const newDiscoveries = scanResult.discoveries || [];
    
    // Batch execute pipeline
    const discoveryIds = newDiscoveries.map(d => d.id);
    const pipelineSummary = await this.executeBatchPipeline(discoveryIds, {
      triggeredBy: 'AUTOMATED_SCAN'
    });

    const executions = (state.pipelineExecutions || []).filter(e => pipelineSummary.executionIds.includes(e.id));

    return {
      scanSummary: scanResult.summary,
      pipelineSummary,
      executions
    };
  }

  /**
   * Retries a failed or review-required pipeline execution
   */
  public async retryExecution(
    executionId: string,
    options: PipelineExecutionOptions = {}
  ): Promise<CompliancePipelineExecution> {
    const state = camoDb.getState();
    const existing = state.pipelineExecutions?.find(e => e.id === executionId);

    if (!existing) {
      throw new Error(`Pipeline execution '${executionId}' not found for retry.`);
    }

    const discovery = state.discoveryRecords.find(d => d.id === existing.discoveryRecordId || d.documentNumber === existing.documentNumber);
    if (!discovery) {
      throw new Error(`Original discovery record for execution '${executionId}' not found.`);
    }

    // Increment retry count
    const retryCount = (existing.retryCount || 0) + 1;

    camoDb.logAudit({
      user: state.currentUser.name,
      role: state.currentUser.role,
      action: 'PIPELINE_RETRY',
      entityType: 'CompliancePipelineExecution',
      entityId: executionId,
      details: `Retrying pipeline execution #${executionId} for document ${discovery.documentNumber} (Attempt ${retryCount}).`
    });

    const result = await this.executeDiscoveryPipeline(discovery, {
      ...options,
      forceFreshDownload: options.forceFreshDownload ?? true,
      triggeredBy: 'RETRY'
    });

    result.retryCount = retryCount;
    this.persistExecution(result);
    return result;
  }

  /**
   * Helper to persist an execution in camoDb with deduplication
   */
  private persistExecution(execution: CompliancePipelineExecution) {
    camoDb.update(draft => {
      if (!Array.isArray(draft.pipelineExecutions)) {
        draft.pipelineExecutions = [];
      }
      const existingIdx = draft.pipelineExecutions.findIndex(e => e.id === execution.id);
      if (existingIdx >= 0) {
        draft.pipelineExecutions[existingIdx] = execution;
      } else {
        draft.pipelineExecutions.unshift(execution);
      }
    });
  }

  /**
   * Lists stored executions with optional filtering
   */
  public getExecutions(filters?: {
    status?: PipelineExecutionStatus;
    discoveryRecordId?: string;
    documentNumber?: string;
  }): CompliancePipelineExecution[] {
    const state = camoDb.getState();
    let list = state.pipelineExecutions || [];

    if (filters?.status) {
      list = list.filter(e => e.status === filters.status);
    }
    if (filters?.discoveryRecordId) {
      list = list.filter(e => e.discoveryRecordId === filters.discoveryRecordId);
    }
    if (filters?.documentNumber) {
      list = list.filter(e => e.documentNumber === filters.documentNumber || e.adNumber === filters.documentNumber);
    }

    return list;
  }

  /**
   * Gets single execution by ID
   */
  public getExecutionById(id: string): CompliancePipelineExecution | undefined {
    const state = camoDb.getState();
    return (state.pipelineExecutions || []).find(e => e.id === id);
  }
}

export const compliancePipelineOrchestrator = new CompliancePipelineOrchestrator();
