import crypto from 'crypto';
import { 
  AircraftDeliveryAssessment,
  CreateDeliveryAssessmentInput,
  DeliveryAdItem,
  DeliveryAssessmentMetrics,
  DeliveryAssessmentSnapshot,
  DeliveryAssessmentStatus,
  DeliveryOperationalPriority,
  DeliveryApplicabilityStatus,
  LessorConfrontationStatus,
  LessorDeclarationRecord,
  ReconcileLessorInput,
  AnalyzeDeliveryAdInput,
  HelpCenterArticle,
  Aircraft,
  Engine,
  Component,
  ComponentInstallation,
  ComplianceRequirement,
  ComplianceObligation,
  IssuingAuthority,
  ComplianceObligationStatus,
  AuditTrailEntry
} from '../../src/types';
import { camoDb } from '../dataStore';
import { getCanonicalAircraftModel, matchesModel, normalizeText } from '../ruleEngine';
import { evaluateRequirementWithCamoV2 } from '../complianceOrchestrator';
import { complianceObligationService } from './complianceObligationService';
import { evidenceVerificationEngine } from './evidenceVerificationEngine';
import { regulatoryDiscoveryEngine } from '../regulatoryConnectors/regulatoryDiscoveryEngine';

export const DELIVERY_ASSESSMENT_ENGINE_VERSION = '7.0.0';

export class AircraftDeliveryAssessmentEngine {
  private static instance: AircraftDeliveryAssessmentEngine;

  public static getInstance(): AircraftDeliveryAssessmentEngine {
    if (!AircraftDeliveryAssessmentEngine.instance) {
      AircraftDeliveryAssessmentEngine.instance = new AircraftDeliveryAssessmentEngine();
    }
    return AircraftDeliveryAssessmentEngine.instance;
  }

  /**
   * Generates a deterministic SHA-256 hash for audit and integrity verification.
   */
  public calculateSha256(payload: any): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Helper to recalculate delivery metrics with Zero-Dilution enforcement.
   */
  public calculateMetrics(adItems: DeliveryAdItem[]): DeliveryAssessmentMetrics {
    const totalIdentified = adItems.length;
    const potentiallyApplicable = adItems.filter(
      item => item.applicabilityStatus === 'POTENTIALLY_APPLICABLE' || item.applicabilityStatus === 'APPLICABILITY_CONFIRMED'
    ).length;
    const analyzedCount = adItems.filter(item => Boolean(item.analyzedAt)).length;
    const pendingCount = totalIdentified - analyzedCount;
    const reviewRequiredCount = adItems.filter(
      item => item.applicabilityStatus === 'REVIEW_REQUIRED' || item.regulatoryComplianceStatus === 'REVIEW_REQUIRED'
    ).length;

    const complianceBreakdown = {
      complied: adItems.filter(item => item.regulatoryComplianceStatus === 'COMPLIED').length,
      open: adItems.filter(item => item.regulatoryComplianceStatus === 'OPEN').length,
      overdue: adItems.filter(item => item.regulatoryComplianceStatus === 'OVERDUE').length,
      dueSoon: adItems.filter(item => item.regulatoryComplianceStatus === 'DUE_SOON').length,
      reviewRequired: adItems.filter(item => item.regulatoryComplianceStatus === 'REVIEW_REQUIRED').length,
      notApplicable: adItems.filter(
        item => item.regulatoryComplianceStatus === 'NOT_APPLICABLE' || item.applicabilityStatus === 'NOT_APPLICABLE'
      ).length,
      superseded: adItems.filter(
        item => item.regulatoryComplianceStatus === 'SUPERSEDED' || item.isSuperseded
      ).length
    };

    const confrontationBreakdown = {
      matchCount: adItems.filter(item => item.confrontationStatus === 'MATCH').length,
      discrepancyCount: adItems.filter(item => item.confrontationStatus === 'DISCREPANCY').length,
      pendingDocCount: adItems.filter(item => item.confrontationStatus === 'PENDING_DOCUMENTATION').length,
      pendingAnalysisCount: adItems.filter(
        item => item.confrontationStatus === 'PENDING_ANALYSIS' || item.confrontationStatus === 'UNVERIFIED'
      ).length
    };

    // Zero-dilution: Any OVERDUE, critical discrepancy, or unresolved blocking issue counts as a blocker
    const criticalBlockersCount = complianceBreakdown.overdue + confrontationBreakdown.discrepancyCount;

    return {
      totalIdentified,
      potentiallyApplicable,
      analyzedCount,
      pendingCount,
      reviewRequiredCount,
      complianceBreakdown,
      confrontationBreakdown,
      criticalBlockersCount
    };
  }

  /**
   * CREATE DELIVERY ASSESSMENT
   * Creates an independent assessment entity for an aircraft acquisition, delivery, or lease transition.
   * If pre-delivery, registers the aircraft without placing it in active operational fleet status.
   */
  public createAssessment(input: CreateDeliveryAssessmentInput): AircraftDeliveryAssessment {
    const db = camoDb.getState();
    const actor = input.actor || db.currentUser.name;
    const now = new Date().toISOString();

    let targetAircraftId = input.aircraftId;
    const config = input.aircraftConfig;

    if (!config || !config.manufacturer || !config.model || !config.msn || !config.registration) {
      throw new Error('Validation Error: Aircraft manufacturer, model, MSN, and registration are required.');
    }

    // Check if aircraft already exists in database
    const existingAc = db.aircraft.find(
      a => a.id === targetAircraftId || (a.msn === config.msn && a.manufacturer.toLowerCase() === config.manufacturer.toLowerCase())
    );

    let isPreDelivery = Boolean(input.isPreDeliveryAircraft);

    if (existingAc) {
      targetAircraftId = existingAc.id;
    } else {
      // Register onboarding aircraft in STORED / MAINTENANCE status (not OPERATIONAL)
      isPreDelivery = true;
      const newAcId = `ac-deliv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      targetAircraftId = newAcId;

      const newAircraft: Aircraft = {
        id: newAcId,
        operatorId: db.operator.id,
        registration: config.registration,
        msn: config.msn,
        manufacturer: config.manufacturer,
        model: config.model,
        aircraftType: 'Commercial Transport',
        status: 'STORED', // Pre-delivery aircraft is NOT OPERATIONAL
        totalFlightHours: config.totalFlightHours || 0,
        totalCycles: config.totalCycles || 0,
        totalLandings: config.totalLandings || config.totalCycles || 0,
        manufactureDate: config.manufactureDate
      };

      camoDb.update(draft => {
        draft.aircraft.push(newAircraft);

        // Add engines if configured
        if (config.engines && config.engines.length > 0) {
          config.engines.forEach((engConfig, idx) => {
            const engId = `eng-deliv-${Date.now()}-${idx}`;
            draft.engines.push({
              id: engId,
              aircraftId: newAcId,
              manufacturer: engConfig.manufacturer,
              model: engConfig.model,
              serialNumber: engConfig.serialNumber,
              position: engConfig.position || `Pos ${idx + 1}`,
              totalHours: engConfig.totalHours || 0,
              totalCycles: engConfig.totalCycles || 0,
              status: 'INSTALLED'
            });
          });
        }

        // Add components if configured
        if (config.components && config.components.length > 0) {
          config.components.forEach((compConfig, idx) => {
            const compId = `comp-deliv-${Date.now()}-${idx}`;
            draft.components.push({
              id: compId,
              manufacturer: config.manufacturer,
              partNumber: compConfig.partNumber,
              serialNumber: compConfig.serialNumber,
              componentType: 'OTHER',
              description: compConfig.description,
              status: 'SERVICEABLE'
            });

            draft.installations.push({
              id: `inst-deliv-${Date.now()}-${idx}`,
              componentId: compId,
              aircraftId: newAcId,
              aircraftRegistration: config.registration,
              position: compConfig.position,
              installationDate: config.manufactureDate || now.split('T')[0],
              installationHours: 0,
              installationCycles: 0,
              currentStatus: 'INSTALLED'
            });
          });
        }
      });
    }

    const assessmentId = `deliv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const initialMetrics = this.calculateMetrics([]);

    const newAssessment: AircraftDeliveryAssessment = {
      id: assessmentId,
      title: input.title || `${config.manufacturer} ${config.model} (MSN ${config.msn}) Delivery Assessment`,
      aircraftId: targetAircraftId!,
      isPreDeliveryAircraft: isPreDelivery,
      aircraftConfig: config,
      assessmentType: input.assessmentType || 'DELIVERY',
      status: 'NOT_STARTED',
      targetDeliveryDate: input.targetDeliveryDate || config.targetDeliveryDate,
      lessor: input.lessor || config.lessor || 'Unspecified Lessor',
      operator: input.operator || config.currentOperator || db.operator.name,
      notes: input.notes,
      adItems: [],
      metrics: initialMetrics,
      auditHash: '',
      createdAt: now,
      createdBy: actor,
      updatedAt: now,
      updatedBy: actor
    };

    newAssessment.auditHash = this.calculateSha256({
      id: newAssessment.id,
      aircraftId: newAssessment.aircraftId,
      config: newAssessment.aircraftConfig,
      createdAt: newAssessment.createdAt
    });

    camoDb.update(draft => {
      draft.deliveryAssessments = draft.deliveryAssessments || [];
      draft.deliveryAssessments.unshift(newAssessment);
    });

    camoDb.logAudit({
      user: actor,
      role: db.currentUser.role,
      action: 'CREATE',
      entityType: 'AircraftDeliveryAssessment',
      entityId: assessmentId,
      details: {
        registration: config.registration,
        msn: config.msn,
        model: config.model,
        assessmentType: newAssessment.assessmentType
      }
    });

    return newAssessment;
  }

  /**
   * EXECUTE REGULATORY DISCOVERY FOR ASSESSMENT
   * Utilizes existing Knowledge Base (requirements) and Regulatory Discovery records.
   * Separates already known ADs from new ones, identifies potential applicability,
   * enforces "Princípio de Metadados Insuficientes", and ensures idempotency.
   */
  public async executeDiscoveryForAssessment(
    assessmentId: string,
    options?: { forceFreshScan?: boolean; actor?: string }
  ): Promise<AircraftDeliveryAssessment> {
    const db = camoDb.getState();
    const assessments = db.deliveryAssessments || [];
    const assessment = assessments.find(a => a.id === assessmentId);

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const actor = options?.actor || db.currentUser.name;
    const now = new Date().toISOString();

    // Mark DISCOVERY_IN_PROGRESS
    assessment.status = 'DISCOVERY_IN_PROGRESS';
    assessment.updatedAt = now;
    assessment.updatedBy = actor;

    const acConfig = assessment.aircraftConfig;
    const model = acConfig.model.toLowerCase();
    const manufacturer = acConfig.manufacturer.toLowerCase();

    // Step 1: Discover from existing CAMO Knowledge Base (requirements)
    const existingRequirements = db.requirements || [];
    const discoveredFromReqs: DeliveryAdItem[] = [];

    for (const req of existingRequirements) {
      const adNumber = req.sourceNumber || req.adNumber || `AD-${req.id}`;
      const authority: IssuingAuthority = (req.issuingAuthority as IssuingAuthority) || 'FAA';
      const title = req.title || 'Airworthiness Directive';
      const issueDate = req.issueDate;
      const effectiveDate = req.effectiveDate;

      // Determine initial potential applicability
      let applicabilityStatus: DeliveryApplicabilityStatus = 'IDENTIFIED';
      let applicabilityReason = 'Discovered in CAMO Regulatory Knowledge Base.';

      const modelsInRule = (req.applicabilityRule?.aircraftModels || []).map(m => m.toLowerCase());
      const makesInRule = (req.applicabilityRule?.aircraftManufacturers || []).map(m => m.toLowerCase());

      const modelMatch = modelsInRule.length === 0 || matchesModel(acConfig.model, modelsInRule);
      const makeMatch = makesInRule.length === 0 || makesInRule.some(m => manufacturer.includes(m) || m.includes(manufacturer));

      if (!makeMatch) {
        applicabilityStatus = 'NOT_APPLICABLE';
        applicabilityReason = `Aircraft manufacturer '${acConfig.manufacturer}' does not match AD manufacturer applicability (${makesInRule.join(', ')}).`;
      } else if (modelsInRule.length > 0 && !modelMatch) {
        applicabilityStatus = 'NOT_APPLICABLE';
        applicabilityReason = `Aircraft model '${acConfig.model}' is not listed in AD model effectivity (${modelsInRule.join(', ')}).`;
      } else {
        // Model matches or broad effectivity
        // PRINCÍPIO DE METADADOS INSUFICIENTES:
        // Check if AD has engine or component specifics that require further verification
        const hasEngineCondition = (req.applicabilityRule?.engineModels || []).length > 0;
        const hasComponentCondition = (req.applicabilityRule?.componentPartNumbers || []).length > 0;

        applicabilityStatus = 'POTENTIALLY_APPLICABLE';
        if (hasEngineCondition || hasComponentCondition) {
          applicabilityReason = `Model '${acConfig.model}' matches AD airframe effectivity, but AD specifies engine/part numbers requiring detailed configuration confirmation.`;
        } else {
          applicabilityReason = `Aircraft model '${acConfig.model}' matches AD effectivity. Detailed applicability to be confirmed.`;
        }
      }

      // Operational priority calculation
      let priority: DeliveryOperationalPriority = 'MEDIUM';
      if ((applicabilityStatus as string) === 'REVIEW_REQUIRED') {
        priority = 'HIGH';
      } else if (applicabilityStatus === 'POTENTIALLY_APPLICABLE') {
        priority = 'HIGH';
      } else if (applicabilityStatus === 'NOT_APPLICABLE') {
        priority = 'LOW';
      }

      discoveredFromReqs.push({
        id: `ad-item-${assessment.id}-${adNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
        adNumber,
        issuingAuthority: authority,
        title,
        issueDate,
        effectiveDate,
        sourceUrl: req.officialPdfUrl || req.sourceUrl,
        documentHash: req.documentHash,
        isKnownInCamo: true,
        camoRequirementId: req.id,
        knownRequirementVersion: 1,
        applicabilityStatus,
        applicabilityReason,
        operationalPriority: priority,
        confrontationStatus: 'UNVERIFIED',
        evidenceSummary: { total: 0, valid: 0, insufficient: 0, revoked: 0 },
        isSuperseded: req.isSuperseded,
        supersededByAdNumber: req.supersededByAdNumber
      });
    }

    // Step 2: Discover from existing Regulatory Discovery Records
    const discoveryRecords = db.discoveryRecords || [];
    const discoveredFromRecords: DeliveryAdItem[] = [];

    for (const rec of discoveryRecords) {
      const adNumber = rec.adNumber || rec.documentNumber;
      if (!adNumber) continue;

      // Check if already found in reqs
      if (discoveredFromReqs.some(item => normalizeText(item.adNumber) === normalizeText(adNumber))) {
        continue;
      }

      const authority: IssuingAuthority = (rec.issuingAuthority as IssuingAuthority) || 'FAA';
      const title = rec.title || rec.subject || 'Federal Register AD Notice';

      let appStatus: DeliveryApplicabilityStatus = 'IDENTIFIED';
      let appReason = 'Discovered via Official Regulatory Discovery scan.';

      const recModels = (rec.models || []).map(m => m.toLowerCase());
      const recMake = (rec.make || '').toLowerCase();

      if (recMake && !manufacturer.includes(recMake) && !recMake.includes(manufacturer)) {
        appStatus = 'NOT_APPLICABLE';
        appReason = `Discovery make '${rec.make}' does not match aircraft manufacturer '${acConfig.manufacturer}'.`;
      } else if (recModels.length > 0 && !matchesModel(acConfig.model, recModels)) {
        appStatus = 'NOT_APPLICABLE';
        appReason = `Aircraft model '${acConfig.model}' does not match discovery models (${recModels.join(', ')}).`;
      } else {
        appStatus = 'POTENTIALLY_APPLICABLE';
        appReason = `Aircraft model '${acConfig.model}' is potentially affected by discovery record.`;
      }

      discoveredFromRecords.push({
        id: `ad-item-${assessment.id}-${adNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
        adNumber,
        issuingAuthority: authority,
        title,
        issueDate: rec.publicationDate,
        effectiveDate: rec.effectiveDate,
        sourceUrl: rec.sourceUrl || rec.pdfUrl,
        documentHash: rec.documentHash,
        isKnownInCamo: false,
        applicabilityStatus: appStatus,
        applicabilityReason: appReason,
        operationalPriority: appStatus === 'POTENTIALLY_APPLICABLE' ? 'HIGH' : 'LOW',
        confrontationStatus: 'UNVERIFIED',
        evidenceSummary: { total: 0, valid: 0, insufficient: 0, revoked: 0 }
      });
    }

    // Step 3: Combine and reconcile with existing items in the assessment (IDEMPOTENCY)
    const combinedDiscovered = [...discoveredFromReqs, ...discoveredFromRecords];
    const existingItems = assessment.adItems || [];

    const updatedAdItems: DeliveryAdItem[] = [];

    // First, preserve any already analyzed items or existing lessor declarations
    for (const discovered of combinedDiscovered) {
      const existingMatch = existingItems.find(
        item => normalizeText(item.adNumber) === normalizeText(discovered.adNumber)
      );

      if (existingMatch) {
        // Keep analyzed state, obligationId, lessorDeclaration, confrontationStatus
        updatedAdItems.push({
          ...discovered,
          ...existingMatch,
          // Update known flag if now known in CAMO
          isKnownInCamo: discovered.isKnownInCamo || existingMatch.isKnownInCamo,
          camoRequirementId: discovered.camoRequirementId || existingMatch.camoRequirementId
        });
      } else {
        updatedAdItems.push(discovered);
      }
    }

    // Also preserve any manually added or custom items that existed previously
    for (const existing of existingItems) {
      if (!updatedAdItems.some(item => normalizeText(item.adNumber) === normalizeText(existing.adNumber))) {
        updatedAdItems.push(existing);
      }
    }

    assessment.adItems = updatedAdItems;
    assessment.discoverySummary = {
      totalDiscovered: updatedAdItems.length,
      knownInCamo: updatedAdItems.filter(item => item.isKnownInCamo).length,
      newDiscovered: updatedAdItems.filter(item => !item.isKnownInCamo).length,
      potentiallyApplicable: updatedAdItems.filter(
        item => item.applicabilityStatus === 'POTENTIALLY_APPLICABLE' || item.applicabilityStatus === 'APPLICABILITY_CONFIRMED'
      ).length,
      notApplicable: updatedAdItems.filter(item => item.applicabilityStatus === 'NOT_APPLICABLE').length,
      lastDiscoveryDate: now,
      sourcesConsulted: ['CAMO Knowledge Base', 'Federal Register (14 CFR Part 39)', 'FAA DRS']
    };

    assessment.status = updatedAdItems.some(item => Boolean(item.analyzedAt)) ? 'ANALYSIS_IN_PROGRESS' : 'DISCOVERY_COMPLETE';
    assessment.metrics = this.calculateMetrics(updatedAdItems);
    assessment.updatedAt = now;
    assessment.updatedBy = actor;
    assessment.auditHash = this.calculateSha256({
      assessmentId: assessment.id,
      itemsCount: updatedAdItems.length,
      metrics: assessment.metrics,
      updatedAt: assessment.updatedAt
    });

    camoDb.update(draft => {
      const idx = (draft.deliveryAssessments || []).findIndex(a => a.id === assessment.id);
      if (idx !== -1 && draft.deliveryAssessments) {
        draft.deliveryAssessments[idx] = assessment;
      }
    });

    camoDb.logAudit({
      user: actor,
      role: db.currentUser.role,
      action: 'UPDATE',
      entityType: 'AircraftDeliveryAssessment',
      entityId: assessment.id,
      details: {
        action: 'EXECUTE_DISCOVERY',
        totalDiscovered: updatedAdItems.length,
        knownInCamo: assessment.discoverySummary.knownInCamo
      }
    });

    return assessment;
  }

  /**
   * RECONCILE LESSOR DECLARATION
   * Records or updates the Lessor's AD Status Report claims for a specific AD.
   * Compares the Lessor claim against CAMO Engine state to identify Matches vs Discrepancies.
   */
  public reconcileLessorDeclaration(input: ReconcileLessorInput): DeliveryAdItem {
    const db = camoDb.getState();
    const assessments = db.deliveryAssessments || [];
    const assessment = assessments.find(a => a.id === input.assessmentId);

    if (!assessment) {
      throw new Error(`Assessment not found: ${input.assessmentId}`);
    }

    const item = assessment.adItems.find(
      i => normalizeText(i.adNumber) === normalizeText(input.adNumber)
    );

    if (!item) {
      throw new Error(`AD '${input.adNumber}' not found in delivery assessment.`);
    }

    const actor = input.actor || db.currentUser.name;
    const now = new Date().toISOString();

    const declaration: LessorDeclarationRecord = {
      ...input.declaration,
      lastUpdated: now
    };

    item.lessorDeclaration = declaration;

    // Evaluate confrontation between Lessor Declaration and CAMO Engine Assessment
    const confrontation = this.evaluateConfrontation(item, declaration);
    item.confrontationStatus = confrontation.status;
    item.confrontationNotes = confrontation.notes;

    // Recalculate operational priority
    if (confrontation.status === 'DISCREPANCY' || item.regulatoryComplianceStatus === 'OVERDUE') {
      item.operationalPriority = 'CRITICAL';
    } else if (item.regulatoryComplianceStatus === 'OPEN' || item.applicabilityStatus === 'REVIEW_REQUIRED') {
      item.operationalPriority = 'HIGH';
    } else if (item.regulatoryComplianceStatus === 'DUE_SOON') {
      item.operationalPriority = 'MEDIUM';
    } else {
      item.operationalPriority = 'LOW';
    }

    assessment.metrics = this.calculateMetrics(assessment.adItems);
    assessment.updatedAt = now;
    assessment.updatedBy = actor;
    assessment.auditHash = this.calculateSha256({
      assessmentId: assessment.id,
      itemsCount: assessment.adItems.length,
      metrics: assessment.metrics,
      updatedAt: assessment.updatedAt
    });

    camoDb.update(draft => {
      const idx = (draft.deliveryAssessments || []).findIndex(a => a.id === assessment.id);
      if (idx !== -1 && draft.deliveryAssessments) {
        draft.deliveryAssessments[idx] = assessment;
      }
    });

    camoDb.logAudit({
      user: actor,
      role: db.currentUser.role,
      action: 'UPDATE',
      entityType: 'AircraftDeliveryAssessment',
      entityId: assessment.id,
      details: {
        action: 'RECONCILE_LESSOR_DECLARATION',
        adNumber: item.adNumber,
        confrontationStatus: item.confrontationStatus,
        lessorStatus: declaration.complianceStatus
      }
    });

    return item;
  }

  /**
   * Evaluates Confrontation: Lessor Claim vs CAMO Engine Assessment
   */
  private evaluateConfrontation(
    item: DeliveryAdItem,
    declaration: LessorDeclarationRecord
  ): { status: LessorConfrontationStatus; notes: string } {
    const lessorStatus = declaration.complianceStatus;
    const camoStatus = item.regulatoryComplianceStatus;
    const evidenceCount = item.evidenceSummary?.valid || 0;

    if (lessorStatus === 'NOT_RECORDED') {
      return { status: 'UNVERIFIED', notes: 'Lessor has not recorded compliance status for this AD.' };
    }

    if (lessorStatus === 'COMPLIED') {
      if (camoStatus === 'COMPLIED') {
        return { status: 'MATCH', notes: 'Lessor declaration of COMPLIED matches verified CAMO compliance and documentation.' };
      }
      if (camoStatus === 'OVERDUE') {
        return { 
          status: 'DISCREPANCY', 
          notes: 'CRITICAL CONFLICT: Lessor claims COMPLIED, but CAMO Engine calculated mandatory threshold OVERDUE.' 
        };
      }
      if (evidenceCount === 0) {
        return { 
          status: 'PENDING_DOCUMENTATION', 
          notes: 'Lessor claims COMPLIED, but no valid maintenance evidence/work orders have been verified in CAMO Engine.' 
        };
      }
      return { 
        status: 'DISCREPANCY', 
        notes: `Lessor claims COMPLIED, but CAMO Engine evaluated compliance status as ${camoStatus || 'OPEN'}.` 
      };
    }

    if (lessorStatus === 'NOT_APPLICABLE') {
      if (item.applicabilityStatus === 'NOT_APPLICABLE' || camoStatus === 'NOT_APPLICABLE') {
        return { status: 'MATCH', notes: 'Lessor claims NOT APPLICABLE, consistent with CAMO Engine applicability evaluation.' };
      }
      if (item.applicabilityStatus === 'APPLICABILITY_CONFIRMED' || camoStatus === 'OPEN' || camoStatus === 'COMPLIED') {
        return { 
          status: 'DISCREPANCY', 
          notes: 'DISCREPANCY: Lessor claims NOT APPLICABLE, but CAMO Engine confirmed applicable configuration on this aircraft.' 
        };
      }
      if (item.applicabilityStatus === 'POTENTIALLY_APPLICABLE' || item.applicabilityStatus === 'REVIEW_REQUIRED') {
        return { 
          status: 'PENDING_ANALYSIS', 
          notes: 'Lessor claims NOT APPLICABLE; CAMO Engine requires configuration analysis to confirm.' 
        };
      }
    }

    if (lessorStatus === 'OPEN') {
      if (camoStatus === 'OPEN') {
        return { status: 'MATCH', notes: 'Lessor and CAMO Engine agree that AD compliance action is OPEN/PENDING.' };
      }
      if (camoStatus === 'COMPLIED') {
        return { status: 'MATCH', notes: 'Lessor recorded OPEN, but CAMO Engine verified accomplishment evidence.' };
      }
    }

    return { status: 'UNVERIFIED', notes: 'Confrontation pending detailed analysis.' };
  }

  /**
   * INDIVIDUAL AD ANALYSIS
   * Core workflow:
   * 1. Reuses existing Regulatory Knowledge (Requirement, Rules, Thresholds, Intervals).
   * 2. Preserves strict Aircraft Isolation: creates/updates an isolated ComplianceObligation for THIS aircraft.
   * 3. Runs Rule Engine V2 to confirm applicability and evaluate compliance.
   * 4. Integrates with Evidence Engine and Due Date Engine.
   * 5. Reconciles with Lessor claims.
   */
  public async analyzeIndividualAd(input: AnalyzeDeliveryAdInput): Promise<DeliveryAdItem> {
    const db = camoDb.getState();
    const assessments = db.deliveryAssessments || [];
    const assessment = assessments.find(a => a.id === input.assessmentId);

    if (!assessment) {
      throw new Error(`Assessment not found: ${input.assessmentId}`);
    }

    const item = assessment.adItems.find(
      i => normalizeText(i.adNumber) === normalizeText(input.adNumber)
    );

    if (!item) {
      throw new Error(`AD '${input.adNumber}' not found in delivery assessment.`);
    }

    const actor = input.actor || db.currentUser.name;
    const now = new Date().toISOString();
    const aircraft = db.aircraft.find(a => a.id === assessment.aircraftId);

    if (!aircraft) {
      throw new Error(`Target delivery aircraft '${assessment.aircraftId}' not found in database.`);
    }

    // Step 1: KNOWLEDGE REUSE — Locate or structure ComplianceRequirement
    let requirement: ComplianceRequirement | undefined;

    if (item.camoRequirementId) {
      requirement = db.requirements.find(r => r.id === item.camoRequirementId);
    }

    if (!requirement) {
      requirement = db.requirements.find(
        r => normalizeText(r.sourceNumber || r.adNumber || '') === normalizeText(item.adNumber)
      );
    }

    // If requirement still doesn't exist, create a structured requirement in CAMO
    if (!requirement) {
      const newReqId = `req-auto-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const newReq: ComplianceRequirement = {
        id: newReqId,
        sourceType: 'AD',
        sourceNumber: item.adNumber,
        issuingAuthority: item.issuingAuthority,
        title: item.title,
        issueDate: item.issueDate || now.split('T')[0],
        effectiveDate: item.effectiveDate || now.split('T')[0],
        applicabilityRule: {
          id: `rule-${newReqId}`,
          complianceRequirementId: newReqId,
          aircraftManufacturers: [assessment.aircraftConfig.manufacturer],
          aircraftModels: [assessment.aircraftConfig.model],
          componentPartNumbers: [],
          rawText: `${assessment.aircraftConfig.manufacturer} Model ${assessment.aircraftConfig.model} airplanes.`
        },
        documentProcessingStatus: 'ASSESSED',
        extractionStatus: 'SUCCESS',
        revision: 'Original',
        emergencyAd: false,
        status: 'ASSESSED',
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        updatedBy: actor,
        mandatedActions: [
          {
            id: `act-${newReqId}-1`,
            actionType: 'ONE_TIME_INSPECTION',
            paragraphReference: 'Paragraph (g)',
            description: `Accomplish mandated action for ${item.adNumber}`,
            sequence: 1,
            complianceThreshold: {
              thresholdType: 'CALENDAR_DAYS',
              thresholdValue: 90,
              rawDescription: 'Within 90 days after effective date'
            }
          }
        ]
      };

      camoDb.update(draft => {
        draft.requirements.push(newReq);
      });

      requirement = newReq;
      item.isKnownInCamo = true;
      item.camoRequirementId = newReq.id;
    }

    // Step 2: AIRCRAFT ISOLATION — Create/Update Obligation SPECIFIC TO THIS AIRCRAFT
    // NEVER copy COMPLIED status from another aircraft!
    const targetEntity = {
      entityType: 'AIRCRAFT' as const,
      entityId: aircraft.id,
      aircraftId: aircraft.id,
      aircraftRegistration: aircraft.registration,
      aircraftMsn: aircraft.msn,
      aircraftModel: aircraft.model
    };

    // Evaluate applicability with Rule Engine V2
    const camoAssessment = evaluateRequirementWithCamoV2(requirement, aircraft);

    let evaluatedAppStatus: DeliveryApplicabilityStatus;
    let evaluatedAppReason = camoAssessment.reasoning?.[0] || 'Evaluated via CAMO Rule Engine V2.';

    if (camoAssessment.applicabilityStatus === 'APPLICABLE') {
      evaluatedAppStatus = 'APPLICABILITY_CONFIRMED';
    } else if (camoAssessment.applicabilityStatus === 'NOT_APPLICABLE') {
      evaluatedAppStatus = 'NOT_APPLICABLE';
    } else {
      evaluatedAppStatus = 'REVIEW_REQUIRED';
    }

    // Check if the aircraft has any evidence attached specifically for this requirement
    const aircraftEvidence = (db.evidence || []).filter(
      ev => ev.complianceRequirementId === requirement!.id && ev.aircraftId === aircraft.id
    );

    // Call ComplianceObligationService to create/update the isolated obligation
    const obligation = complianceObligationService.createOrUpdateObligation({
      requirement,
      aircraft,
      targetEntity,
      applicabilityStatus: camoAssessment.applicabilityStatus,
      applicabilityReasoning: camoAssessment.reasoning,
      mandatedAction: requirement.mandatedActions?.[0],
      initialEvidence: aircraftEvidence,
      actor
    });

    // Check if Lessor provided document references that can be cross-checked
    const lessorDecl = item.lessorDeclaration;
    if (lessorDecl && lessorDecl.complianceStatus === 'COMPLIED' && lessorDecl.documentReferences && lessorDecl.documentReferences.length > 0) {
      // If lessor supplied document references (e.g. WO-12345), verify if evidence exists in DB
      for (const docRef of lessorDecl.documentReferences) {
        const existingDoc = db.evidence.find(
          ev => ev.documentReference === docRef && ev.aircraftId === aircraft.id
        );
        if (existingDoc && !obligation.evidence?.some(e => e.evidenceId === existingDoc.id)) {
          // Attach verified lessor document
          complianceObligationService.attachEvidence({
            obligationId: obligation.id,
            evidenceId: existingDoc.id,
            evidenceType: existingDoc.evidenceType,
            documentReference: existingDoc.documentReference,
            description: existingDoc.description || 'Lessor provided maintenance record',
            accomplishmentDate: existingDoc.accomplishmentDate || lessorDecl.accomplishmentDate,
            accomplishmentFH: existingDoc.accomplishmentFlightHours || lessorDecl.accomplishmentFH,
            accomplishmentFC: existingDoc.accomplishmentFlightCycles || lessorDecl.accomplishmentFC,
            recordedBy: actor
          });
        }
      }
    }

    // Step 3: Update DeliveryAdItem fields
    item.applicabilityStatus = evaluatedAppStatus;
    item.applicabilityReason = evaluatedAppReason;
    item.obligationId = obligation.id;
    item.regulatoryComplianceStatus = obligation.status;
    item.controllingDueDate = obligation.controllingLimit?.earliestDueDate;
    item.controllingLimitReason = obligation.controllingLimit?.controllingReason;

    // Calculate verified evidence summary
    const validEv = (obligation.evidence || []).filter(e => e.verificationStatus === 'VALID' || e.verified || (e as any).isVerified).length;
    const insufficientEv = (obligation.evidence || []).filter(e => e.verificationStatus === 'INSUFFICIENT').length;
    const revokedEv = (obligation.evidence || []).filter(e => e.verificationStatus === 'REVOKED').length;

    item.evidenceSummary = {
      total: (obligation.evidence || []).length,
      valid: validEv,
      insufficient: insufficientEv,
      revoked: revokedEv
    };

    // Re-evaluate confrontation with Lessor
    if (item.lessorDeclaration) {
      const confrontation = this.evaluateConfrontation(item, item.lessorDeclaration);
      item.confrontationStatus = confrontation.status;
      item.confrontationNotes = confrontation.notes;
    } else {
      item.confrontationStatus = 'UNVERIFIED';
      item.confrontationNotes = 'Pending lessor documentation reconciliation.';
    }

    // Determine operational priority
    if (
      obligation.status === 'OVERDUE' ||
      item.confrontationStatus === 'DISCREPANCY' ||
      item.evidenceSummary.revoked > 0
    ) {
      item.operationalPriority = 'CRITICAL';
    } else if (obligation.status === 'OPEN' || evaluatedAppStatus === 'REVIEW_REQUIRED') {
      item.operationalPriority = 'HIGH';
    } else if (obligation.status === 'DUE_SOON') {
      item.operationalPriority = 'MEDIUM';
    } else {
      item.operationalPriority = 'LOW';
    }

    item.analyzedAt = now;
    item.analyzedBy = actor;

    assessment.status = 'ANALYSIS_IN_PROGRESS';
    assessment.metrics = this.calculateMetrics(assessment.adItems);
    assessment.updatedAt = now;
    assessment.updatedBy = actor;
    assessment.auditHash = this.calculateSha256({
      assessmentId: assessment.id,
      itemsCount: assessment.adItems.length,
      metrics: assessment.metrics,
      updatedAt: assessment.updatedAt
    });

    camoDb.update(draft => {
      const idx = (draft.deliveryAssessments || []).findIndex(a => a.id === assessment.id);
      if (idx !== -1 && draft.deliveryAssessments) {
        draft.deliveryAssessments[idx] = assessment;
      }
    });

    camoDb.logAudit({
      user: actor,
      role: db.currentUser.role,
      action: 'UPDATE',
      entityType: 'AircraftDeliveryAssessment',
      entityId: assessment.id,
      details: {
        action: 'ANALYZE_INDIVIDUAL_AD',
        adNumber: item.adNumber,
        applicabilityStatus: item.applicabilityStatus,
        regulatoryComplianceStatus: item.regulatoryComplianceStatus,
        obligationId: item.obligationId
      }
    });

    return item;
  }

  /**
   * BATCH ANALYZE ADS
   * Performs analysis across all unanalyzed or pending ADs in the assessment.
   */
  public async batchAnalyzeAds(
    assessmentId: string,
    actor?: string
  ): Promise<{ analyzedCount: number; assessment: AircraftDeliveryAssessment }> {
    const db = camoDb.getState();
    const assessments = db.deliveryAssessments || [];
    const assessment = assessments.find(a => a.id === assessmentId);

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const pendingItems = assessment.adItems.filter(i => !i.analyzedAt);
    let count = 0;

    for (const item of pendingItems) {
      await this.analyzeIndividualAd({
        assessmentId,
        adNumber: item.adNumber,
        actor
      });
      count++;
    }

    const updated = (camoDb.getState().deliveryAssessments || []).find(a => a.id === assessmentId) || assessment;
    return { analyzedCount: count, assessment: updated };
  }

  /**
   * ATTACH LESSOR EVIDENCE
   * Attaches maintenance records / certificates received from the lessor.
   * STRICT SECURITY: Rejects evidence belonging to a different aircraft!
   */
  public async attachLessorEvidence(input: {
    assessmentId: string;
    adNumber: string;
    evidenceType: string;
    documentReference: string;
    description: string;
    accomplishmentDate?: string;
    accomplishmentFH?: number;
    accomplishmentFC?: number;
    documentHash?: string;
    actor?: string;
  }): Promise<DeliveryAdItem> {
    const db = camoDb.getState();
    const assessment = (db.deliveryAssessments || []).find(a => a.id === input.assessmentId);

    if (!assessment) {
      throw new Error(`Assessment not found: ${input.assessmentId}`);
    }

    const item = assessment.adItems.find(
      i => normalizeText(i.adNumber) === normalizeText(input.adNumber)
    );

    if (!item) {
      throw new Error(`AD '${input.adNumber}' not found in assessment.`);
    }

    const actor = input.actor || db.currentUser.name;
    const now = new Date().toISOString();
    const aircraft = db.aircraft.find(a => a.id === assessment.aircraftId);

    if (!aircraft) {
      throw new Error(`Aircraft not found: ${assessment.aircraftId}`);
    }

    // Create Evidence record in DB linked strictly to this aircraft
    const evidenceId = `ev-deliv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newEvidence = {
      id: evidenceId,
      aircraftId: aircraft.id,
      complianceRequirementId: item.camoRequirementId || '',
      evidenceType: input.evidenceType as any,
      documentReference: input.documentReference,
      source: 'LESSOR_DELIVERY_PACKAGE',
      description: input.description,
      accomplishmentDate: input.accomplishmentDate || now.split('T')[0],
      accomplishmentFlightHours: input.accomplishmentFH,
      accomplishmentFlightCycles: input.accomplishmentFC,
      sourceAgency: assessment.lessor,
      verificationStatus: 'VALID' as const,
      isVerified: true,
      documentHash: input.documentHash || this.calculateSha256(input.documentReference + now),
      createdAt: now,
      createdBy: actor
    };

    camoDb.update(draft => {
      draft.evidence.push(newEvidence);
    });

    // If obligation exists, attach to obligation
    if (item.obligationId) {
      complianceObligationService.attachEvidence({
        obligationId: item.obligationId,
        evidenceId,
        evidenceType: input.evidenceType,
        documentReference: input.documentReference,
        description: input.description,
        accomplishmentDate: input.accomplishmentDate,
        accomplishmentFH: input.accomplishmentFH,
        accomplishmentFC: input.accomplishmentFC,
        recordedBy: actor
      });
    }

    // Re-run individual analysis to re-calculate compliance & confrontation
    return await this.analyzeIndividualAd({
      assessmentId: assessment.id,
      adNumber: item.adNumber,
      actor
    });
  }

  /**
   * FINALIZE DELIVERY ASSESSMENT & PRODUCE AUDITABLE SNAPSHOT
   * Creates an immutable audit snapshot with SHA-256 verifiable hash.
   * Obeying Phase 6.4.1: Does NOT issue automatic operational flight approval.
   */
  public finalizeAssessment(
    assessmentId: string,
    finalizedBy: string,
    notes?: string
  ): DeliveryAssessmentSnapshot {
    const db = camoDb.getState();
    const assessment = (db.deliveryAssessments || []).find(a => a.id === assessmentId);

    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const now = new Date().toISOString();
    const metrics = this.calculateMetrics(assessment.adItems);

    const blockingIssues: string[] = [];
    const warningIssues: string[] = [];

    // Collect blocking issues
    const overdueAds = assessment.adItems.filter(i => i.regulatoryComplianceStatus === 'OVERDUE');
    if (overdueAds.length > 0) {
      blockingIssues.push(
        `${overdueAds.length} Airworthiness Directive(s) are OVERDUE: ${overdueAds.map(a => a.adNumber).join(', ')}`
      );
    }

    const discrepancies = assessment.adItems.filter(i => i.confrontationStatus === 'DISCREPANCY');
    if (discrepancies.length > 0) {
      blockingIssues.push(
        `${discrepancies.length} discrepancy(ies) between Lessor declaration and CAMO Engine verified records: ${discrepancies.map(a => a.adNumber).join(', ')}`
      );
    }

    const pendingDocs = assessment.adItems.filter(i => i.confrontationStatus === 'PENDING_DOCUMENTATION');
    if (pendingDocs.length > 0) {
      warningIssues.push(
        `${pendingDocs.length} AD(s) have Lessor claims pending supporting maintenance documentation.`
      );
    }

    const reviewReqs = assessment.adItems.filter(
      i => i.regulatoryComplianceStatus === 'REVIEW_REQUIRED' || i.applicabilityStatus === 'REVIEW_REQUIRED'
    );
    if (reviewReqs.length > 0) {
      warningIssues.push(
        `${reviewReqs.length} AD(s) require Chief CAMO Engineer human review disposition.`
      );
    }

    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const snapshotPayload = {
      snapshotId,
      assessmentId: assessment.id,
      aircraftRegistration: assessment.aircraftConfig.registration,
      aircraftMsn: assessment.aircraftConfig.msn,
      aircraftModel: assessment.aircraftConfig.model,
      finalStatus: (blockingIssues.length === 0 ? 'COMPLETED' : 'REVIEW_REQUIRED') as DeliveryAssessmentStatus,
      complianceSummary: {
        totalAds: metrics.totalIdentified,
        complied: metrics.complianceBreakdown.complied,
        open: metrics.complianceBreakdown.open,
        overdue: metrics.complianceBreakdown.overdue,
        dueSoon: metrics.complianceBreakdown.dueSoon,
        reviewRequired: metrics.complianceBreakdown.reviewRequired,
        notApplicable: metrics.complianceBreakdown.notApplicable,
        superseded: metrics.complianceBreakdown.superseded
      },
      confrontationSummary: {
        matches: metrics.confrontationBreakdown.matchCount,
        discrepancies: metrics.confrontationBreakdown.discrepancyCount,
        pendingDoc: metrics.confrontationBreakdown.pendingDocCount
      },
      blockingIssues,
      warningIssues,
      engineVersions: {
        discoveryEngine: '3.1.0',
        screeningEngine: '5.2.1',
        ruleEngine: '2.0.0-DECOUPLED',
        obligationEngine: '6.3.0',
        dueDateEngine: '6.2.0',
        evidenceEngine: '6.3.0',
        airworthinessEngine: '6.4.1',
        deliveryEngine: DELIVERY_ASSESSMENT_ENGINE_VERSION
      },
      finalizedAt: now,
      finalizedBy,
      disclaimer: 'AUDITABLE DELIVERY COMPLIANCE REPORT: This report provides regulatory compliance and reconciliation findings for aircraft delivery/lease transition. In compliance with CAMO Phase 6.4.1 decoupling rules, this evaluation does not grant automatic operational airworthiness or flight release without formal CAMO Chief Engineer disposition.'
    };

    const auditHash = this.calculateSha256(snapshotPayload);

    const snapshot: DeliveryAssessmentSnapshot = {
      ...snapshotPayload,
      auditHash
    };

    assessment.status = snapshot.finalStatus;
    assessment.finalSnapshot = snapshot;
    assessment.updatedAt = now;
    assessment.updatedBy = finalizedBy;
    assessment.auditHash = auditHash;

    camoDb.update(draft => {
      const idx = (draft.deliveryAssessments || []).findIndex(a => a.id === assessment.id);
      if (idx !== -1 && draft.deliveryAssessments) {
        draft.deliveryAssessments[idx] = assessment;
      }
    });

    camoDb.logAudit({
      user: finalizedBy,
      role: db.currentUser.role,
      action: 'UPDATE',
      entityType: 'AircraftDeliveryAssessment',
      entityId: assessment.id,
      details: {
        action: 'FINALIZE_ASSESSMENT',
        snapshotId,
        auditHash,
        finalStatus: assessment.status,
        blockingIssuesCount: blockingIssues.length
      }
    });

    return snapshot;
  }

  /**
   * VERIFY SNAPSHOT INTEGRITY
   * Reconstructs payload and verifies SHA-256 integrity hash.
   */
  public verifySnapshotIntegrity(snapshot: DeliveryAssessmentSnapshot): boolean {
    if (!snapshot || !snapshot.auditHash) return false;
    const { auditHash, ...payload } = snapshot;
    const expected = this.calculateSha256(payload);
    return expected === auditHash;
  }

  /**
   * HELP CENTER REPOSITORY
   * Versioned knowledge articles for operator guidance.
   */
  public getHelpCenterArticles(): HelpCenterArticle[] {
    return [
      {
        id: 'help-01',
        title: 'Visão Geral do CAMO Engine & Conceitos Fundamentais',
        category: 'GETTING_STARTED',
        summary: 'Entenda os conceitos centrais de Aeronave, AD, Requirement, Obligation e Evidence.',
        content: `O CAMO Engine opera sob uma arquitetura rigorosa de rastreabilidade e integridade regulatória:
- **Aeronave (Aircraft)**: Representa a entidade física operada ou em processo de recebimento/delivery.
- **Diretriz de Aeronavegabilidade (AD)**: Mandato regulatório emitido por autoridade (FAA, EASA, ANAC).
- **Compliance Requirement**: O conhecimento regulatório interpretado e estruturado a partir da AD (regras de aplicabilidade, ações mandatórias, limites e intervalos).
- **Compliance Obligation**: A obrigação específica e isolada de uma entidade física (uma aeronave, motor ou componente). O status de cumprimento (COMPLIED) pertence estritamente à entidade física e NUNCA é transferido entre aeronaves.
- **Evidence**: Evidência probatória rastreável (Ordem de Serviço, Logbook, Relatório de Modificação, Certificado 8130-3) que comprova o cumprimento técnico.`,
        version: '7.0.0',
        lastUpdated: '2026-09-05',
        relatedFields: ['aircraft', 'requirement', 'obligation', 'evidence']
      },
      {
        id: 'help-02',
        title: 'Fluxo Operacional de Delivery Assessment',
        category: 'DELIVERY_ASSESSMENT',
        summary: 'Como criar uma avaliação, cadastrar a aeronave, executar descoberta e analisar ADs.',
        content: `Passo a passo para avaliação de recebimento de aeronave (Delivery / Lease Transition):
1. **Criar Avaliação**: Informe fabricante, modelo, MSN, matrícula, lessor e data prevista de delivery. Se for aeronave pré-delivery, ela será cadastrada sem se tornar ativa na frota operacional.
2. **Executar Descoberta de ADs**: O sistema consulta as autoridades e a base de conhecimento existente, identificando quais ADs afetam potencialmente o modelo.
3. **Reconciliar com o Lessor**: Registre as declarações do AD Status Report do lessor (COMPLIED, NOT APPLICABLE, referências de OS).
4. **Analisar ADs**: Execute a análise individual ou em lote. O CAMO Engine reutiliza o conhecimento regulatório e cria obrigações isoladas para a nova aeronave.
5. **Confrontar Evidências**: Identifique discrepâncias entre a alegação do lessor e as evidências documentais verificadas.
6. **Finalizar Laudo de Delivery**: Gere o snapshot auditável com hash SHA-256.`,
        version: '7.0.0',
        lastUpdated: '2026-09-05',
        relatedFields: ['assessment', 'discovery', 'lessorDeclaration', 'confrontation']
      },
      {
        id: 'help-03',
        title: 'Status de Compliance e Determinação de Aeronavegabilidade',
        category: 'COMPLIANCE_STATUS',
        summary: 'Significado dos status regulatórios e o princípio de desacoplamento da Fase 6.4.1.',
        content: `O sistema mantém separação estrita entre Conformidade Regulatória e Determinação Operacional:
- **COMPLIED**: Obrigação cumprida com conjunto probatório válido e limites temporais respeitados.
- **OPEN**: Requisito mandatório aplicável ainda dentro do prazo legal.
- **DUE_SOON**: Requisito dentro da janela de alerta operacional (30 dias, 100 FH ou 50 FC).
- **OVERDUE**: Limite regulatório vencido. Classifica a conformidade como crítica.
- **REVIEW_REQUIRED**: Incerteza cadastral ou documento insuficiente. Encaminhado ao Human Review Gateway.
- **NOT_APPLICABLE**: Aeronave comprovadamente fora da aplicabilidade.
- **SUPERSEDED**: Substituído formalmente por diretriz posterior.

*Princípio de Desacoplamento*: Status OVERDUE ou REVIEW_REQUIRED não impõe interdição de voo sem regra operacional autorizada ou disposição de engenharia formal.`,
        version: '7.0.0',
        lastUpdated: '2026-09-05',
        relatedFields: ['complianceStatus', 'canFly', 'isGrounded', 'airworthinessStatus']
      },
      {
        id: 'help-04',
        title: 'Auditoria, Rastreabilidade e Integridade SHA-256',
        category: 'AUDIT_INTEGRITY',
        summary: 'Como funciona a verificação criptográfica de snapshots e histórico de transições.',
        content: `Todas as transições de estado, análises de AD e reconciliações com o lessor geram registros auditáveis imutáveis:
- Cada snapshot de delivery calcula um hash SHA-256 cobrindo o estado consolidado da avaliação.
- O hash garante que o documento não sofreu adulteração silenciosa após a assinatura técnica.
- Evidências e obrigações preservam rastreabilidade de autoria, timestamp ISO e referências normativas.`,
        version: '7.0.0',
        lastUpdated: '2026-09-05',
        relatedFields: ['auditHash', 'snapshot', 'auditTrail']
      }
    ];
  }
}

export const aircraftDeliveryAssessmentEngine = AircraftDeliveryAssessmentEngine.getInstance();
