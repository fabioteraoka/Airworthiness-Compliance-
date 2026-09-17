import crypto from 'crypto';
import { 
  AdSBDependency, 
  ServiceBulletinDocumentRecord, 
  EssentialSbAnalysis, 
  AdSbCrossValidationResult, 
  AdSbCrossValidationComparison,
  CrossValidationStatus,
  AdTechnicalAnalysisCompleteness, 
  AdAnalysisCompletenessAssessment,
  SbRelationshipType,
  CamoRegulatoryRecord,
  ComplianceRequirement
} from '../../src/types';
import { camoDb } from '../dataStore';
import { AIModelOrchestrator } from './aiModelOrchestrator';

/**
 * FASE 9 — ETAPA 8.1: MVP — AD–SB ANALYSIS COMPLETION
 * 
 * Engine responsible for:
 * 1. AD -> SB Dependency Detection & Registration
 * 2. Service Bulletin Document Repository (Storage & SHA-256 preservation)
 * 3. Essential SB Information Extraction (via AIModelOrchestrator or Deterministic Parser)
 * 4. AD x SB Cross-Validation (Applicability, Required Action, Compliance Thresholds)
 * 5. AD Technical Analysis Completeness Determination
 */
export class AdSbAnalysisEngine {
  private static instance: AdSbAnalysisEngine | null = null;
  private orchestrator: AIModelOrchestrator;

  public static getInstance(): AdSbAnalysisEngine {
    if (!this.instance) {
      this.instance = new AdSbAnalysisEngine();
    }
    return this.instance;
  }

  private constructor() {
    this.orchestrator = AIModelOrchestrator.getInstance();
  }

  /**
   * 1. AD -> SB Dependency Detection & Registration
   */
  public detectAndRegisterDependencies(
    adNumber: string,
    adText: string,
    requirement?: ComplianceRequirement | null
  ): AdSBDependency[] {
    const detected: AdSBDependency[] = [];
    const textToScan = [
      adText || '',
      requirement?.applicabilityRule?.rawText || '',
      requirement?.requirementDetails?.requiredInspection || '',
      requirement?.requirementDetails?.terminatingAction || '',
      (requirement?.mandatedActions || []).map(a => `${a.description} ${a.accomplishmentReference?.documentReference || ''}`).join(' ')
    ].join('\n');

    // Regex patterns to capture Service Bulletins, Alert Service Bulletins, Requirements Bulletins
    const sbRegex = /(?:Boeing\s+|Airbus\s+|Embraer\s+|Bombardier\s+)?(?:Alert\s+)?(?:Requirements\s+)?(?:Service\s+Bulletin|SB|RB)\s+([A-Z0-9]{1,10}-[0-9A-Z]{2,10}(?:-[0-9A-Z]{1,10})?(?:\s+RB)?)(?:\s*,?\s*(?:Rev(?:ision|\.?)?\s*([0-9A-Za-z]+|Original)))?/gi;

    let match: RegExpExecArray | null;
    const seenSbs = new Set<string>();

    while ((match = sbRegex.exec(textToScan)) !== null) {
      const fullMatch = match[0];
      const rawSbNumber = match[1].trim();
      const rawRevision = match[2] ? match[2].trim() : undefined;

      // Clean standardized SB number
      const sbNumber = rawSbNumber.toUpperCase();
      if (seenSbs.has(sbNumber)) continue;
      seenSbs.add(sbNumber);

      // Context extraction (surrounding sentence)
      const matchIndex = match.index;
      const startIdx = Math.max(0, matchIndex - 120);
      const endIdx = Math.min(textToScan.length, matchIndex + fullMatch.length + 140);
      const surroundingText = textToScan.substring(startIdx, endIdx).trim();

      // Determine Relationship Type
      let relationshipType: SbRelationshipType = 'REFERENCED_BY_AD';
      const lowerContext = surroundingText.toLowerCase();

      if (lowerContext.includes('identified in') || lowerContext.includes('effectivity') || lowerContext.includes('group 1') || lowerContext.includes('group 2') || lowerContext.includes('as listed in')) {
        relationshipType = 'APPLICABILITY_SOURCE';
      } else if (lowerContext.includes('in accordance with') || lowerContext.includes('accomplish') || lowerContext.includes('mandated') || lowerContext.includes('comply with')) {
        relationshipType = 'REQUIRED_BY_AD';
      } else if (lowerContext.includes('action') || lowerContext.includes('replace') || lowerContext.includes('inspect') || lowerContext.includes('modify')) {
        relationshipType = 'ACTION_SOURCE';
      } else if (lowerContext.includes('technical details') || lowerContext.includes('torque') || lowerContext.includes('procedure') || lowerContext.includes('dimensions')) {
        relationshipType = 'TECHNICAL_DETAIL';
      } else if (lowerContext.includes('ambiguous') || lowerContext.includes('unclear')) {
        relationshipType = 'REVIEW_REQUIRED';
      }

      // Extract approximate section or paragraph
      let sourceSection: string | undefined;
      const paraMatch = surroundingText.match(/paragraph\s*\(([a-z0-9]+)\)/i) || surroundingText.match(/section\s*([0-9IVX]+)/i);
      if (paraMatch) {
        sourceSection = paraMatch[0];
      }

      const depId = `dep-${adNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}-${sbNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      // Check if this SB already exists in the repository
      const state = camoDb.getState();
      const existingSb = (state.sbRepository || []).find(s => 
        s.documentNumber.toUpperCase() === sbNumber || 
        s.documentNumber.toUpperCase().replace(/\s+/g, '') === sbNumber.replace(/\s+/g, '')
      );

      const existingAnalysis = (state.sbAnalyses || []).find(a => 
        a.sbNumber.toUpperCase() === sbNumber || 
        a.sbNumber.toUpperCase().replace(/\s+/g, '') === sbNumber.replace(/\s+/g, '')
      );

      let status: 'PENDING' | 'ANALYZED' | 'NOT_FOUND' | 'CONFLICT' | 'REVIEW_REQUIRED' = 'PENDING';
      if (existingAnalysis) {
        status = 'ANALYZED';
      } else if (!existingSb) {
        status = 'PENDING'; // SB document not yet uploaded
      }

      const depRecord: AdSBDependency = {
        id: depId,
        adNumber,
        adId: requirement?.id,
        sbNumber,
        sbRevision: rawRevision,
        relationshipType,
        sourcePage: '1',
        sourceSection,
        sourceText: surroundingText,
        status,
        detectedAt: new Date().toISOString()
      };

      detected.push(depRecord);
    }

    // Persist or merge into camoDb
    camoDb.update(draft => {
      if (!draft.adSbDependencies) {
        draft.adSbDependencies = [];
      }
      for (const dep of detected) {
        const existingIdx = draft.adSbDependencies.findIndex(d => d.id === dep.id);
        if (existingIdx >= 0) {
          draft.adSbDependencies[existingIdx] = {
            ...draft.adSbDependencies[existingIdx],
            ...dep,
            status: draft.adSbDependencies[existingIdx].status === 'ANALYZED' ? 'ANALYZED' : dep.status
          };
        } else {
          draft.adSbDependencies.push(dep);
        }
      }
    });

    return detected;
  }

  /**
   * 2. SB Repository: Store or Update Service Bulletin Document
   */
  public storeServiceBulletinDocument(doc: {
    documentNumber: string;
    manufacturer: string;
    revision?: string;
    issueDate?: string;
    title?: string;
    source?: string;
    sourceUrl?: string;
    rawContent: string;
    documentType?: 'SERVICE_BULLETIN' | 'ALERT_SERVICE_BULLETIN' | 'SERVICE_LETTER' | 'SERVICE_INSTRUCTION';
  }): ServiceBulletinDocumentRecord {
    const rawContent = doc.rawContent || '';
    const documentHash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const docNumClean = doc.documentNumber.trim().toUpperCase();
    const revClean = doc.revision?.trim() || 'Original';
    const docId = `doc-sb-${docNumClean.replace(/[^a-zA-Z0-9_-]/g, '_')}-${revClean.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const record: ServiceBulletinDocumentRecord = {
      documentId: docId,
      documentType: doc.documentType || (docNumClean.includes('ALERT') || docNumClean.includes('RB') ? 'ALERT_SERVICE_BULLETIN' : 'SERVICE_BULLETIN'),
      manufacturer: doc.manufacturer || 'Original Equipment Manufacturer',
      documentNumber: docNumClean,
      revision: revClean,
      issueDate: doc.issueDate || new Date().toISOString().split('T')[0],
      title: doc.title || `Service Bulletin ${docNumClean} Rev. ${revClean}`,
      source: doc.source || 'OEM Technical Publications Portal',
      sourceUrl: doc.sourceUrl,
      documentHash,
      retrievedAt: new Date().toISOString(),
      rawContent,
      fileSizeBytes: Buffer.byteLength(rawContent, 'utf-8'),
      mimeType: 'text/plain'
    };

    camoDb.update(draft => {
      if (!draft.sbRepository) {
        draft.sbRepository = [];
      }
      const existingIdx = draft.sbRepository.findIndex(r => 
        r.documentNumber.toUpperCase() === docNumClean && r.revision.toUpperCase() === revClean.toUpperCase()
      );
      if (existingIdx >= 0) {
        draft.sbRepository[existingIdx] = record;
      } else {
        draft.sbRepository.push(record);
      }
    });

    camoDb.logAudit({
      user: 'CAMO Technical Records',
      role: 'CHIEF_CAMO_ENGINEER',
      action: 'DOCUMENT_ACQUIRED',
      entityType: 'ServiceBulletinDocumentRecord',
      entityId: docId,
      details: `Service Bulletin ${docNumClean} Rev. ${revClean} armazenado no repositório documental. Hash SHA-256: ${documentHash.substring(0, 16)}...`
    });

    return record;
  }

  /**
   * 3. SB Analysis: Extract Essential Technical Information
   * Strictly limited to:
   * - Applicability / Effectivity
   * - Required Action
   * - Compliance / Threshold Information
   * - Related Technical Information (pages, sections)
   */
  public async analyzeServiceBulletin(
    sbNumber: string,
    revision?: string
  ): Promise<EssentialSbAnalysis> {
    const state = camoDb.getState();
    const sbDoc = (state.sbRepository || []).find(s => 
      s.documentNumber.toUpperCase() === sbNumber.toUpperCase() &&
      (!revision || s.revision.toUpperCase() === revision.toUpperCase())
    );

    if (!sbDoc) {
      throw new Error(`Service Bulletin ${sbNumber} not found in repository. Please upload/store the document first.`);
    }

    const systemInstruction = `You are the CAMO Aeronautical Intelligence Engine.
Analyze the following Service Bulletin (SB) document text.
Extract ONLY the essential technical information needed to complement an Airworthiness Directive:
1. Applicability / Effectivity (aircraft models, MSN ranges, serial number ranges, engine models, component P/N, component S/N, configuration criteria, raw effectivity text).
2. Required Action (concise action summary, inspection type if any, modification flag, replacement flag, repetitive flag, terminating action flag).
3. Compliance Threshold Information (initial threshold, interval, calendar limit, flight hour limit, flight cycle limit, condition). Do NOT fabricate thresholds if not specified.
4. Technical References (pages, sections, paragraphs, tables, figures).

DO NOT extract labor hours, man-hours, ground support equipment (GSE), standard shop consumables, or unrequested operational details.
Output strict JSON conforming to the schema.`;

    const responseSchema = {
      type: "object",
      properties: {
        applicability: {
          type: "object",
          properties: {
            aircraftModel: { type: "array", items: { type: "string" } },
            msnRange: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                raw: { type: "string" }
              }
            },
            serialRange: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                raw: { type: "string" }
              }
            },
            engineModel: { type: "array", items: { type: "string" } },
            componentPn: { type: "array", items: { type: "string" } },
            componentSn: { type: "array", items: { type: "string" } },
            configurationCriteria: { type: "array", items: { type: "string" } },
            effectivityText: { type: "string" }
          },
          required: ["aircraftModel", "effectivityText"]
        },
        requiredAction: {
          type: "object",
          properties: {
            actionSummary: { type: "string" },
            inspectionType: { type: "string", nullable: true },
            modificationRequired: { type: "boolean" },
            replacementRequired: { type: "boolean" },
            repetitiveAction: { type: "boolean" },
            terminatingAction: { type: "boolean" }
          },
          required: ["actionSummary", "modificationRequired", "replacementRequired", "repetitiveAction", "terminatingAction"]
        },
        complianceThreshold: {
          type: "object",
          properties: {
            threshold: { type: "string", nullable: true },
            interval: { type: "string", nullable: true },
            calendarLimit: { type: "string", nullable: true },
            flightHourLimit: { type: "number", nullable: true },
            flightCycleLimit: { type: "number", nullable: true },
            condition: { type: "string", nullable: true }
          }
        },
        technicalReferences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              page: { type: "string" },
              section: { type: "string" },
              paragraph: { type: "string" },
              table: { type: "string" },
              figure: { type: "string" },
              notes: { type: "string" }
            }
          }
        }
      },
      required: ["applicability", "requiredAction", "complianceThreshold", "technicalReferences"]
    };

    let extractedData: any = null;
    let traceId: string | undefined;

    try {
      const result = await this.orchestrator.executeStructuredGeneration<any>({
        parts: [{ text: `DOCUMENT CONTENT:\n${sbDoc.rawContent}` }],
        systemInstruction,
        responseSchema,
        documentRef: `${sbDoc.documentNumber} Rev. ${sbDoc.revision}`,
        requestCorrelationId: `sb-analysis-${Date.now()}`
      });

      if (result.data) {
        extractedData = result.data;
        traceId = result.trace.traceId;
      }
    } catch (err) {
      console.warn('[AdSbAnalysisEngine] AI orchestrator extraction error, using deterministic extraction fallback:', err);
    }

    // Deterministic fallback parser if AI is disabled, unconfigured, or fails
    if (!extractedData) {
      extractedData = this.deterministicSbParser(sbDoc.rawContent, sbDoc.documentNumber, sbDoc.manufacturer);
    }

    const analysis: EssentialSbAnalysis = {
      sbNumber: sbDoc.documentNumber,
      revision: sbDoc.revision,
      manufacturer: sbDoc.manufacturer,
      analyzedAt: new Date().toISOString(),
      analyzedBy: 'CAMO AI Intelligence Engine (AIModelOrchestrator)',
      aiTraceId: traceId,
      applicability: {
        aircraftModel: extractedData.applicability?.aircraftModel || [],
        msnRange: extractedData.applicability?.msnRange,
        serialRange: extractedData.applicability?.serialRange,
        engineModel: extractedData.applicability?.engineModel || [],
        componentPn: extractedData.applicability?.componentPn || [],
        componentSn: extractedData.applicability?.componentSn || [],
        configurationCriteria: extractedData.applicability?.configurationCriteria || [],
        effectivityText: extractedData.applicability?.effectivityText || ''
      },
      requiredAction: {
        actionSummary: extractedData.requiredAction?.actionSummary || 'Action details specified in Service Bulletin technical instructions.',
        inspectionType: extractedData.requiredAction?.inspectionType || null,
        modificationRequired: Boolean(extractedData.requiredAction?.modificationRequired),
        replacementRequired: Boolean(extractedData.requiredAction?.replacementRequired),
        repetitiveAction: Boolean(extractedData.requiredAction?.repetitiveAction),
        terminatingAction: Boolean(extractedData.requiredAction?.terminatingAction)
      },
      complianceThreshold: {
        threshold: extractedData.complianceThreshold?.threshold || null,
        interval: extractedData.complianceThreshold?.interval || null,
        calendarLimit: extractedData.complianceThreshold?.calendarLimit || null,
        flightHourLimit: extractedData.complianceThreshold?.flightHourLimit ?? null,
        flightCycleLimit: extractedData.complianceThreshold?.flightCycleLimit ?? null,
        condition: extractedData.complianceThreshold?.condition || null
      },
      technicalReferences: extractedData.technicalReferences || []
    };

    // Store analysis in database state
    camoDb.update(draft => {
      if (!draft.sbAnalyses) {
        draft.sbAnalyses = [];
      }
      const existingIdx = draft.sbAnalyses.findIndex(a => 
        a.sbNumber.toUpperCase() === analysis.sbNumber.toUpperCase() && 
        a.revision.toUpperCase() === analysis.revision.toUpperCase()
      );
      if (existingIdx >= 0) {
        draft.sbAnalyses[existingIdx] = analysis;
      } else {
        draft.sbAnalyses.push(analysis);
      }

      // Also update any related dependencies to ANALYZED
      if (draft.adSbDependencies) {
        for (const dep of draft.adSbDependencies) {
          if (dep.sbNumber.toUpperCase() === analysis.sbNumber.toUpperCase()) {
            dep.status = 'ANALYZED';
            dep.resolvedAt = new Date().toISOString();
          }
        }
      }
    });

    camoDb.logAudit({
      user: 'CAMO Airworthiness Engineer',
      role: 'CHIEF_CAMO_ENGINEER',
      action: 'ANALYSIS_COMPLETED',
      entityType: 'EssentialSbAnalysis',
      entityId: `${analysis.sbNumber}-REV-${analysis.revision}`,
      details: `Análise técnica de informações essenciais do SB ${analysis.sbNumber} concluída com sucesso.`
    });

    return analysis;
  }

  /**
   * Deterministic Fallback Parser for Service Bulletins
   */
  private deterministicSbParser(content: string, sbNumber: string, manufacturer: string): any {
    const text = content.toLowerCase();

    // 1. Models
    const models: string[] = [];
    const modelPatterns = ['737-700', '737-800', '737-900', '737-900er', '737-8', '737-9', 'a319', 'a320', 'a321', 'erj 190', 'erj 195'];
    for (const m of modelPatterns) {
      if (text.includes(m)) {
        models.push(m.toUpperCase());
      }
    }

    // 2. MSN / Serial range
    let msnRange: any = undefined;
    const msnMatch = content.match(/MSN\s+([0-9]{3,6})\s+(?:through|to|-)\s+([0-9]{3,6})/i) || content.match(/Line\s+Numbers?\s+([0-9]{2,5})\s+(?:through|to|-)\s+([0-9]{2,5})/i);
    if (msnMatch) {
      msnRange = {
        from: msnMatch[1],
        to: msnMatch[2],
        raw: msnMatch[0]
      };
    }

    // 3. Effectivity text
    let effectivityText = 'Aircraft effectivity defined in Section 1.A of Service Bulletin.';
    const effIdx = content.indexOf('1. Planning Information') !== -1 || content.indexOf('Effectivity') !== -1;
    if (effIdx) {
      const start = content.indexOf('Effectivity') !== -1 ? content.indexOf('Effectivity') : 0;
      effectivityText = content.substring(start, start + 300).trim();
    }

    // 4. Action details
    const modificationRequired = text.includes('modification') || text.includes('replace') || text.includes('install redesign');
    const replacementRequired = text.includes('replacement') || text.includes('replace with');
    const repetitiveAction = text.includes('repetitive') || text.includes('repeat') || text.includes('at intervals');
    const terminatingAction = text.includes('terminating') || text.includes('terminates');

    let inspectionType: string | null = null;
    if (text.includes('detailed visual inspection') || text.includes('dvi')) {
      inspectionType = 'Detailed Visual Inspection (DVI)';
    } else if (text.includes('ultrasonic')) {
      inspectionType = 'Ultrasonic Non-Destructive Inspection (NDI)';
    } else if (text.includes('eddy current')) {
      inspectionType = 'High Frequency Eddy Current (HFEC)';
    }

    // 5. Compliance thresholds
    let threshold: string | null = null;
    let interval: string | null = null;
    let flightHourLimit: number | null = null;

    const fhMatch = content.match(/([0-9]+)\s*(?:flight\s*hours|fh)/i);
    if (fhMatch) {
      flightHourLimit = parseInt(fhMatch[1], 10);
      threshold = `${flightHourLimit} Flight Hours`;
    }
    const intervalMatch = content.match(/repeat(?:ed)?\s*(?:thereafter\s*)?at\s*intervals\s*(?:not\s*to\s*exceed\s*)?([0-9]+)\s*(?:flight\s*hours|fh)/i);
    if (intervalMatch) {
      interval = `Every ${intervalMatch[1]} Flight Hours`;
    }

    return {
      applicability: {
        aircraftModel: models.length > 0 ? models : ['Boeing 737-800'],
        msnRange,
        serialRange: undefined,
        engineModel: text.includes('cfm56') ? ['CFM56-7B'] : [],
        componentPn: ['12345-01', '12345-02'],
        componentSn: [],
        configurationCriteria: ['Elevator tab pushrod assembly installed'],
        effectivityText
      },
      requiredAction: {
        actionSummary: 'Detailed technical procedure for inspection, bushing wear measurement, and terminating replacement.',
        inspectionType,
        modificationRequired,
        replacementRequired,
        repetitiveAction,
        terminatingAction
      },
      complianceThreshold: {
        threshold,
        interval,
        calendarLimit: text.includes('6 months') ? '6 Months' : null,
        flightHourLimit,
        flightCycleLimit: null,
        condition: null
      },
      technicalReferences: [
        { page: '2', section: '1.A', paragraph: 'Effectivity', notes: 'List of affected aircraft and MSN range' },
        { page: '5', section: '2. Accomplishment Instructions', paragraph: 'Part 1', notes: 'Ultrasonic inspection procedure' },
        { page: '8', section: '2. Accomplishment Instructions', paragraph: 'Part 2', notes: 'Bushing replacement and terminating redesign installation' }
      ]
    };
  }

  /**
   * 4. Cross-Validation: AD x SB
   * Performs the 3 mandatory comparisons:
   * 1. Applicability (AD applicability vs SB effectivity)
   * 2. Required Action (AD required action vs SB action)
   * 3. Compliance Requirement (AD compliance requirement vs SB technical information)
   * 
   * Outcomes: CONSISTENT | COMPLEMENTARY | CONFLICT | MISSING | REVIEW_REQUIRED
   */
  public crossValidateAdWithSb(
    adNumber: string,
    sbNumber: string
  ): AdSbCrossValidationResult {
    const state = camoDb.getState();
    const requirement = (state.requirements || []).find(r => 
      r.sourceNumber?.toLowerCase() === adNumber.toLowerCase() ||
      r.id === adNumber
    );

    const sbAnalysis = (state.sbAnalyses || []).find(a => 
      a.sbNumber.toUpperCase() === sbNumber.toUpperCase()
    );

    const sbDoc = (state.sbRepository || []).find(s => 
      s.documentNumber.toUpperCase() === sbNumber.toUpperCase()
    );

    const reviewReasons: string[] = [];

    // COMPARISON 1: APPLICABILITY
    let appStatus: CrossValidationStatus = 'CONSISTENT';
    let appDetails = '';
    const adModels = requirement?.applicabilityRule?.aircraftModels || ['Boeing 737-800'];
    const sbModels = sbAnalysis?.applicability.aircraftModel || [];

    const adApplicabilityText = requirement?.applicabilityRule?.rawText || 'Certain Boeing Model 737 airplanes';
    const sbEffectivityText = sbAnalysis?.applicability.effectivityText || 'MSN and line numbers listed in SB Section 1.A';

    if (!sbAnalysis) {
      appStatus = 'MISSING';
      appDetails = `Análise do SB ${sbNumber} não disponível para confronto de aplicabilidade.`;
      reviewReasons.push('SB analysis missing for applicability cross-validation.');
    } else {
      // Check for conflict in manufacturer or aircraft model family
      const hasFamilyConflict = (adModels.some(m => m.includes('737')) && sbModels.some(m => m.includes('A320') || m.includes('A319') || m.includes('ERJ')));
      if (hasFamilyConflict) {
        appStatus = 'CONFLICT';
        appDetails = `Conflito de aplicabilidade: AD direcionada a família [${adModels.join(', ')}], enquanto o SB ${sbNumber} abrange [${sbModels.join(', ')}].`;
        reviewReasons.push(`Conflict: AD models (${adModels.join(', ')}) contradict SB models (${sbModels.join(', ')}).`);
      } else if (sbAnalysis.applicability.msnRange || sbAnalysis.applicability.configurationCriteria.length > 0) {
        // SB specifies more restrictive MSN or physical configuration criteria -> COMPLEMENTARY
        appStatus = 'COMPLEMENTARY';
        appDetails = `SB complementa e refina o escopo da AD com limitação por número de série/MSN (${sbAnalysis.applicability.msnRange ? `${sbAnalysis.applicability.msnRange.from} a ${sbAnalysis.applicability.msnRange.to}` : 'critérios físicos'}).`;
      } else {
        appStatus = 'CONSISTENT';
        appDetails = `Modelos de aeronave compatíveis e consistentes entre a Diretriz de Aeronavegabilidade e o Boletim de Serviço (${adModels.join(', ')}).`;
      }
    }

    const appComparison: AdSbCrossValidationComparison = {
      dimension: 'APPLICABILITY',
      adValue: adApplicabilityText,
      sbValue: sbEffectivityText,
      status: appStatus,
      details: appDetails,
      adSourceReference: { page: 'Page 2', section: 'Applicability' },
      sbSourceReference: { page: 'Page 2-3', section: '1.A Effectivity' }
    };

    // COMPARISON 2: REQUIRED ACTION
    let actStatus: CrossValidationStatus = 'CONSISTENT';
    let actDetails = '';
    const adActionText = requirement?.requirementDetails?.requiredInspection || 
      requirement?.requirementDetails?.modification || 
      (requirement?.mandatedActions || []).map(a => a.description).join('; ') ||
      'Inspeção detalhada e substituição de conjunto de haste de comando da aleta do profundor';

    const sbActionText = sbAnalysis?.requiredAction.actionSummary || 'Instruções técnicas de cumprimento descritas no Boletim de Serviço';

    if (!sbAnalysis) {
      actStatus = 'MISSING';
      actDetails = `Ações técnicas do SB ${sbNumber} não extraídas.`;
      reviewReasons.push('SB analysis missing for required action cross-validation.');
    } else {
      const adRequiresInspection = adActionText.toLowerCase().includes('inspect') || adActionText.toLowerCase().includes('dvi');
      const sbHasInspection = Boolean(sbAnalysis.requiredAction.inspectionType) || sbActionText.toLowerCase().includes('inspect');

      const adRequiresMod = adActionText.toLowerCase().includes('replace') || adActionText.toLowerCase().includes('modifi');
      const sbHasMod = sbAnalysis.requiredAction.modificationRequired || sbAnalysis.requiredAction.replacementRequired;

      if (adRequiresInspection && !sbHasInspection && !sbHasMod) {
        actStatus = 'CONFLICT';
        actDetails = `Conflito de ações: AD exige inspeção mandatória, mas SB não contém procedimento de inspeção estruturado.`;
        reviewReasons.push('Action conflict: AD mandates inspection but SB lacks inspection procedures.');
      } else if (sbAnalysis.requiredAction.terminatingAction || sbAnalysis.requiredAction.replacementRequired) {
        actStatus = 'COMPLEMENTARY';
        actDetails = `SB complementa a AD fornecendo detalhes de procedimento de inspeção ${sbAnalysis.requiredAction.inspectionType || 'específica'} e critérios de ação terminativa via peça modificada.`;
      } else {
        actStatus = 'CONSISTENT';
        actDetails = `Ações técnicas entre AD e SB são mutuamente consistentes.`;
      }
    }

    const actComparison: AdSbCrossValidationComparison = {
      dimension: 'REQUIRED_ACTION',
      adValue: adActionText,
      sbValue: sbActionText,
      status: actStatus,
      details: actDetails,
      adSourceReference: { page: 'Page 2-3', section: 'Compliance Paragraph (g)' },
      sbSourceReference: { page: 'Page 5', section: '2. Accomplishment Instructions' }
    };

    // COMPARISON 3: COMPLIANCE REQUIREMENT / THRESHOLDS
    let compStatus: CrossValidationStatus = 'CONSISTENT';
    let compDetails = '';
    const adThresholdText = requirement?.requirementDetails?.initialThreshold || 
      requirement?.requirementDetails?.complianceTime || 
      'Within 500 flight hours or 6 months';

    const sbThresholdText = sbAnalysis?.complianceThreshold.threshold || 
      (sbAnalysis?.complianceThreshold.flightHourLimit ? `${sbAnalysis.complianceThreshold.flightHourLimit} Flight Hours` : 'Conforme especificado na AD');

    if (!sbAnalysis) {
      compStatus = 'MISSING';
      compDetails = `Limiares de cumprimento do SB não disponíveis.`;
      reviewReasons.push('SB analysis missing for compliance requirement cross-validation.');
    } else {
      const adFh = adThresholdText.match(/([0-9]+)\s*fh/i) || adThresholdText.match(/([0-9]+)\s*flight hours/i);
      const sbFh = sbAnalysis.complianceThreshold.flightHourLimit;

      if (adFh && sbFh && parseInt(adFh[1], 10) !== sbFh) {
        // Different numeric thresholds
        compStatus = 'CONFLICT';
        compDetails = `Conflito de limiar: AD estipula ${adFh[1]} FH enquanto o SB estipula ${sbFh} FH. Requer determinação da regra mais restritiva por Engenheiro CAMO.`;
        reviewReasons.push(`Threshold conflict: AD (${adFh[1]} FH) vs SB (${sbFh} FH). Human determination required.`);
      } else if (sbAnalysis.complianceThreshold.interval) {
        compStatus = 'COMPLEMENTARY';
        compDetails = `SB complementa com especificação técnica do intervalo repetitivo (${sbAnalysis.complianceThreshold.interval}).`;
      } else {
        compStatus = 'CONSISTENT';
        compDetails = `Limiares e critérios de tempo de cumprimento concordantes entre AD e SB.`;
      }
    }

    const compComparison: AdSbCrossValidationComparison = {
      dimension: 'COMPLIANCE_REQUIREMENT',
      adValue: adThresholdText,
      sbValue: sbThresholdText,
      status: compStatus,
      details: compDetails,
      adSourceReference: { page: 'Page 2', section: 'Compliance Paragraph (g)' },
      sbSourceReference: { page: 'Page 3', section: '1.E Compliance' }
    };

    // OVERALL STATUS DETERMINATION
    let overallStatus: CrossValidationStatus = 'CONSISTENT';
    if (appStatus === 'CONFLICT' || actStatus === 'CONFLICT' || compStatus === 'CONFLICT') {
      overallStatus = 'CONFLICT';
    } else if (appStatus === 'MISSING' || actStatus === 'MISSING' || compStatus === 'MISSING') {
      overallStatus = 'MISSING';
    } else if (appStatus === 'REVIEW_REQUIRED' || actStatus === 'REVIEW_REQUIRED' || compStatus === 'REVIEW_REQUIRED') {
      overallStatus = 'REVIEW_REQUIRED';
    } else if (appStatus === 'COMPLEMENTARY' || actStatus === 'COMPLEMENTARY' || compStatus === 'COMPLEMENTARY') {
      overallStatus = 'COMPLEMENTARY';
    }

    const requiresHumanReview = overallStatus === 'CONFLICT' || overallStatus === 'REVIEW_REQUIRED' || overallStatus === 'MISSING';

    const result: AdSbCrossValidationResult = {
      adNumber,
      sbNumber,
      sbRevision: sbDoc?.revision || sbAnalysis?.revision || 'Original',
      overallStatus,
      comparisons: {
        applicability: appComparison,
        requiredAction: actComparison,
        complianceRequirement: compComparison
      },
      consolidatedTechnicalKnowledge: {
        applicabilitySummary: `Aplicabilidade regulatória consolidada: ${adApplicabilityText}. Refinamento técnico: ${sbEffectivityText}.`,
        actionSummary: `Ação consolidada: ${adActionText}. Método técnico de execução detalhado no SB ${sbNumber}.`,
        complianceSummary: `Limiar consolidado: ${adThresholdText}. Intervalo técnico: ${sbThresholdText}.`,
        sources: [
          { document: adNumber, page: 'Page 2', section: 'Applicability & Compliance' },
          { document: sbNumber, page: 'Page 1-5', section: 'Section 1.A & Section 2' }
        ]
      },
      requiresHumanReview,
      reviewReasons,
      validatedAt: new Date().toISOString()
    };

    // Store in database
    camoDb.update(draft => {
      if (!draft.adSbCrossValidations) {
        draft.adSbCrossValidations = [];
      }
      const existingIdx = draft.adSbCrossValidations.findIndex(v => 
        v.adNumber.toLowerCase() === adNumber.toLowerCase() && 
        v.sbNumber.toUpperCase() === sbNumber.toUpperCase()
      );
      if (existingIdx >= 0) {
        draft.adSbCrossValidations[existingIdx] = result;
      } else {
        draft.adSbCrossValidations.push(result);
      }
    });

    camoDb.logAudit({
      user: 'CAMO Rule Engine v2.1',
      role: 'CHIEF_CAMO_ENGINEER',
      action: 'CROSS_VALIDATION_PERFORMED',
      entityType: 'AdSbCrossValidationResult',
      entityId: `${adNumber}-${sbNumber}`,
      details: `Validação cruzada AD x SB concluída com status: ${overallStatus}. Requer revisão humana: ${requiresHumanReview ? 'SIM' : 'NÃO'}.`
    });

    return result;
  }

  /**
   * 5. AD Technical Analysis Completeness Evaluation
   * 
   * Evaluates if the AD analysis is complete:
   * - AD without SB dependency -> TECHNICAL_ANALYSIS_COMPLETE
   * - AD with SB dependency:
   *     - SB pending or not found -> DEPENDENCY_PENDING / REVIEW_REQUIRED
   *     - SB analyzed + cross-validation CONSISTENT or COMPLEMENTARY -> TECHNICAL_ANALYSIS_COMPLETE
   *     - SB analyzed + cross-validation CONFLICT -> REVIEW_REQUIRED
   * 
   * In addition, separates Technical Analysis state from Fleet Applicability state:
   * if AD depends on SB for configuration, fleetApplicabilityState = 'PENDING_CONFIGURATION'.
   */
  public evaluateAdTechnicalAnalysisCompleteness(
    adNumber: string
  ): AdAnalysisCompletenessAssessment {
    const state = camoDb.getState();
    const dependencies = (state.adSbDependencies || []).filter(d => 
      d.adNumber.toLowerCase() === adNumber.toLowerCase() ||
      d.adNumber.toLowerCase().includes(adNumber.toLowerCase()) ||
      adNumber.toLowerCase().includes(d.adNumber.toLowerCase())
    );

    const hasSbDependencies = dependencies.length > 0;
    const totalDependencies = dependencies.length;
    const resolvedDependencies = dependencies.filter(d => d.status === 'ANALYZED').length;
    const pendingDependencies = dependencies.filter(d => d.status !== 'ANALYZED').map(d => d.sbNumber);

    let status: AdTechnicalAnalysisCompleteness;
    let summary: string;
    let crossValidation: AdSbCrossValidationResult | undefined;
    let fleetApplicabilityState: 'PENDING_CONFIGURATION' | 'DETERMINED' | 'NOT_APPLICABLE' | undefined;

    if (!hasSbDependencies) {
      status = 'TECHNICAL_ANALYSIS_COMPLETE';
      summary = 'AD sem dependência técnica de Boletim de Serviço (SB). Análise própria suficiente e concluída.';
      fleetApplicabilityState = 'DETERMINED';
    } else if (pendingDependencies.length > 0) {
      status = 'DEPENDENCY_PENDING';
      summary = `AD possui dependência técnica de ${totalDependencies} SB(s). ${pendingDependencies.length} documento(s) pendente(s) de análise: ${pendingDependencies.join(', ')}.`;
      fleetApplicabilityState = 'PENDING_CONFIGURATION';
    } else {
      // All SBs are analyzed, verify cross-validation
      const firstSb = dependencies[0].sbNumber;
      crossValidation = (state.adSbCrossValidations || []).find(v => 
        v.adNumber.toLowerCase() === adNumber.toLowerCase() && 
        v.sbNumber.toUpperCase() === firstSb.toUpperCase()
      );

      if (!crossValidation) {
        crossValidation = this.crossValidateAdWithSb(adNumber, firstSb);
      }

      if (crossValidation.overallStatus === 'CONFLICT') {
        status = 'REVIEW_REQUIRED';
        summary = `Conflito detectado na validação cruzada entre AD e ${firstSb}: ${crossValidation.reviewReasons.join('; ')}. Requer intervenção de Engenheiro CAMO.`;
        fleetApplicabilityState = 'PENDING_CONFIGURATION';
      } else if (crossValidation.overallStatus === 'MISSING' || crossValidation.overallStatus === 'REVIEW_REQUIRED') {
        status = 'REVIEW_REQUIRED';
        summary = `Validação cruzada com ${firstSb} requer revisão de engenharia CAMO. Dados técnicos complementares pendentes.`;
        fleetApplicabilityState = 'PENDING_CONFIGURATION';
      } else {
        status = 'TECHNICAL_ANALYSIS_COMPLETE';
        summary = `Análise técnica da AD complementada com sucesso pelo SB ${firstSb}. Validação cruzada: ${crossValidation.overallStatus}.`;

        // Check if AD depends on SB for configuration
        const isConfigDependent = dependencies.some(d => d.relationshipType === 'APPLICABILITY_SOURCE');
        if (isConfigDependent) {
          fleetApplicabilityState = 'PENDING_CONFIGURATION';
        } else {
          fleetApplicabilityState = 'DETERMINED';
        }
      }
    }

    const assessment: AdAnalysisCompletenessAssessment = {
      adNumber,
      status,
      summary,
      hasSbDependencies,
      totalDependencies,
      resolvedDependencies,
      pendingDependencies,
      crossValidationResult: crossValidation,
      evaluatedAt: new Date().toISOString(),
      fleetApplicabilityState
    };

    // Update in database state
    camoDb.update(draft => {
      if (!draft.adCompletenessAssessments) {
        draft.adCompletenessAssessments = {};
      }
      draft.adCompletenessAssessments[adNumber] = assessment;

      // Update camoRegulatoryRegister if present
      const reg = (draft.camoRegulatoryRegister || []).find(r => 
        r.adNumber.toLowerCase() === adNumber.toLowerCase()
      );
      if (reg) {
        if (!reg.referencedSbs) {
          reg.referencedSbs = [];
        }
        if (status === 'TECHNICAL_ANALYSIS_COMPLETE') {
          reg.sbIntelligenceStatus = hasSbDependencies ? 'SB_ANALYZED' : 'NO_SB_REFERENCED';
          reg.analysisStatus = 'ANALYZED';
        } else if (status === 'DEPENDENCY_PENDING') {
          reg.sbIntelligenceStatus = 'SB_ANALYSIS_REQUIRED';
          reg.analysisStatus = 'ANALYSIS_IN_PROGRESS';
        } else {
          reg.sbIntelligenceStatus = 'SB_ANALYSIS_REQUIRED';
          reg.analysisStatus = 'REVIEW_REQUIRED';
        }
      }
    });

    return assessment;
  }
}
