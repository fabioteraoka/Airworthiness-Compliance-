import { 
  ComplianceRequirement, 
  ComplianceAssessment, 
  Aircraft, 
  Engine, 
  Component, 
  InstalledSoftwareRecord, 
  MaintenanceActionAccomplishment, 
  Evidence,
  MandatedAction,
  ComplianceObligation,
  ComplianceObligationStatus,
  ObligationStateTransition,
  ObligationEvidenceLink,
  ObligationThresholdConfig,
  ObligationIntervalConfig,
  ObligationTemporalCounters,
  ObligationQueryFilter,
  ObligationEvaluationSummary,
  AuditTrailEntry,
  DueDateCalculationResult,
  EvidenceType,
  EvidenceVerificationStatus
} from '../../src/types';
import { camoDb } from '../dataStore';
import { dueDateThresholdEngine } from './dueDateThresholdEngine';
import { evidenceVerificationEngine, EvidenceValidationResult, ProbatorySetEvaluationResult } from './evidenceVerificationEngine';

export const COMPLIANCE_OBLIGATION_ENGINE_VERSION = '6.3.0';

// Configurable thresholds for DUE_SOON warning window
export const DUE_SOON_CONFIG = {
  DAYS_THRESHOLD: 30,
  FLIGHT_HOURS_THRESHOLD: 100,
  FLIGHT_CYCLES_THRESHOLD: 50
};

export interface CreateObligationInput {
  requirement: ComplianceRequirement;
  aircraft: Aircraft;
  targetEntity?: {
    entityType: 'AIRCRAFT' | 'ENGINE' | 'COMPONENT' | 'INSTALLATION' | 'SOFTWARE' | 'FLEET';
    entityId: string;
    serialNumber?: string;
    partNumber?: string;
    position?: string;
  };
  applicabilityStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT';
  applicabilityReasoning?: string[];
  applicabilityAssessmentId?: string;
  mandatedAction?: MandatedAction;
  initialEvidence?: Evidence[];
  actionAccomplishments?: MaintenanceActionAccomplishment[];
  actor?: string;
}

export interface TransitionObligationInput {
  obligationId: string;
  toStatus: ComplianceObligationStatus;
  reason: string;
  ruleResponsible: string;
  actor: string;
  actorRole?: string;
  evidence?: ObligationEvidenceLink;
  details?: Record<string, any>;
  skipEvidenceCheck?: boolean; // Only for specific system administrative states like CANCELLED
}

export interface HumanReviewObligationInput {
  obligationId: string;
  decision: 'CONFIRMED' | 'OVERRIDDEN' | 'DISMISSED';
  newStatus?: ComplianceObligationStatus;
  justification: string;
  reviewedBy: string;
  reviewedByRole?: string;
}

export interface AttachEvidenceInput {
  obligationId: string;
  evidenceId?: string;
  evidenceType: EvidenceType | string;
  documentReference: string;
  sourceReference?: string;
  description: string;
  accomplishmentDate?: string;
  accomplishmentFH?: number;
  accomplishmentFC?: number;
  recordedBy: string;
  verified?: boolean;
  verificationStatus?: EvidenceVerificationStatus;
  documentHash?: string;
  uploadedFileData?: string;
  notes?: string;
  triggerComplianceEvaluation?: boolean;
  metadata?: Record<string, any>;
}

export class ComplianceObligationService {
  private static instance: ComplianceObligationService;

  public static getInstance(): ComplianceObligationService {
    if (!ComplianceObligationService.instance) {
      ComplianceObligationService.instance = new ComplianceObligationService();
    }
    return ComplianceObligationService.instance;
  }

  /**
   * Generates a deterministic, idempotent logical identity for a compliance obligation
   */
  public generateObligationKey(
    requirementId: string, 
    entityId: string, 
    mandatedActionId?: string
  ): string {
    const actionPart = mandatedActionId ? `-act-${mandatedActionId}` : '';
    return `obl-${requirementId}-${entityId}${actionPart}`;
  }

  /**
   * Calculates temporal parameters using Phase 6.2 Deterministic DueDateThresholdEngine
   */
  public calculateTemporalCounters(
    effectiveDateStr?: string | null,
    threshold?: ObligationThresholdConfig,
    interval?: ObligationIntervalConfig,
    aircraft?: Aircraft,
    lastAccomplishment?: MaintenanceActionAccomplishment | ObligationEvidenceLink,
    cycleCount: number = 0
  ): ObligationTemporalCounters {
    const accAny = lastAccomplishment as any;
    const calcResult = dueDateThresholdEngine.calculateDue({
      threshold,
      interval,
      effectiveDate: effectiveDateStr,
      currentAirframeFH: aircraft?.totalFlightHours,
      currentAirframeFC: aircraft?.totalCycles,
      lastComplianceDate: lastAccomplishment?.accomplishmentDate,
      lastComplianceFH: accAny?.accomplishmentFH ?? accAny?.accomplishmentFlightHours,
      lastComplianceFC: accAny?.accomplishmentFC ?? accAny?.accomplishmentCycles,
      cycleCount,
      alertWindow: {
        alertWindowDays: DUE_SOON_CONFIG.DAYS_THRESHOLD,
        alertWindowFH: DUE_SOON_CONFIG.FLIGHT_HOURS_THRESHOLD,
        alertWindowFC: DUE_SOON_CONFIG.FLIGHT_CYCLES_THRESHOLD
      }
    });

    return calcResult.counters;
  }

  /**
   * Phase 6.2: Calculates detailed Due Date & Threshold analysis with complete explainability,
   * audit trail hash, and alternative composition limits.
   */
  public calculateObligationDueDetailed(
    obligationId: string,
    customCurrentDate?: string
  ): DueDateCalculationResult {
    const state = camoDb.getState();
    const oblList = state.complianceObligations || state.obligations || [];
    const obl = oblList.find(o => o.id === obligationId);
    if (!obl) {
      throw new Error(`Compliance obligation '${obligationId}' not found.`);
    }

    const targetAcId = obl.targetEntity?.aircraftId || obl.targetEntity?.entityId || obl.aircraftId;
    const aircraft = state.aircraft.find(a => a.id === targetAcId);
    const reqId = obl.complianceRequirementId || obl.requirementId;
    const req = state.requirements.find(r => r.id === reqId);

    const evidenceList = obl.evidence || obl.evidenceLinks || [];
    const latestEvidence = evidenceList.length > 0
      ? evidenceList[evidenceList.length - 1]
      : undefined;

    const effDate = obl.effectiveDate || obl.temporalCounters?.effectiveDate || req?.effectiveDate;

    const calcResult = dueDateThresholdEngine.calculateDue({
      obligationId: obl.id,
      threshold: obl.threshold,
      interval: obl.interval,
      effectiveDate: effDate || undefined,
      currentAirframeFH: aircraft?.totalFlightHours ?? obl.temporalCounters.currentAirframeFH,
      currentAirframeFC: aircraft?.totalCycles ?? obl.temporalCounters.currentAirframeFC,
      currentDate: customCurrentDate,
      lastComplianceDate: obl.temporalCounters.lastComplianceDate || latestEvidence?.accomplishmentDate,
      lastComplianceFH: obl.temporalCounters.lastComplianceFH,
      lastComplianceFC: obl.temporalCounters.lastComplianceFC,
      cycleCount: obl.cycleCount ?? obl.temporalCounters.cycleCount,
      isTerminated: Boolean(obl.isTerminated || obl.terminatingAction?.isTerminated || obl.status === 'COMPLIED'),
      isSuperseded: Boolean(obl.supersedence?.isSuperseded || obl.status === 'SUPERSEDED'),
      alertWindow: {
        alertWindowDays: DUE_SOON_CONFIG.DAYS_THRESHOLD,
        alertWindowFH: DUE_SOON_CONFIG.FLIGHT_HOURS_THRESHOLD,
        alertWindowFC: DUE_SOON_CONFIG.FLIGHT_CYCLES_THRESHOLD
      }
    });

    // Synchronize latest calculation into the obligation's temporal counters
    obl.temporalCounters = {
      ...obl.temporalCounters,
      ...calcResult.counters
    };

    // If calculation flagged data integrity or missing data, update review flags
    if (calcResult.reviewRequired) {
      const reason = calcResult.reviewReason || calcResult.controllingReason;
      if (!obl.reviewState) {
        obl.reviewState = {
          requiresHumanReview: true,
          reviewReasons: [reason]
        };
      } else {
        obl.reviewState.requiresHumanReview = true;
        if (!Array.isArray(obl.reviewState.reviewReasons)) {
          obl.reviewState.reviewReasons = [];
        }
        if (!obl.reviewState.reviewReasons.includes(reason)) {
          obl.reviewState.reviewReasons.push(reason);
        }
      }
      obl.requiresHumanReview = true;
      obl.humanReviewReason = reason;
    }

    obl.updatedAt = new Date().toISOString();
    return calcResult;
  }

  /**
   * Deterministically determines the initial state of a newly created compliance obligation
   */
  public determineInitialStatus(
    applicabilityStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'EXEMPT',
    effectiveDateStr?: string | null,
    evidenceList: ObligationEvidenceLink[] = [],
    temporalCounters?: ObligationTemporalCounters,
    isSuperseded: boolean = false
  ): { status: ComplianceObligationStatus; reason: string; ruleResponsible: string } {
    if (isSuperseded) {
      return {
        status: 'SUPERSEDED',
        reason: 'Obrigação vinculada a requisito regulatório superado/revogado.',
        ruleResponsible: 'RULE_SUPERSEDED_REGULATORY_REQUIREMENT'
      };
    }

    if (applicabilityStatus === 'NOT_APPLICABLE' || applicabilityStatus === 'EXEMPT') {
      return {
        status: 'NOT_APPLICABLE',
        reason: 'Requisito regulatório comprovadamente não aplicável à entidade avaliada.',
        ruleResponsible: 'RULE_APPLICABILITY_NOT_APPLICABLE'
      };
    }

    // Has verified accomplishment evidence
    const validEvidence = evidenceList.filter(e => {
      if (e.verificationStatus) {
        return e.verificationStatus === 'VALID';
      }
      return e.verified === true;
    });

    if (validEvidence.length > 0) {
      return {
        status: 'COMPLIED',
        reason: `Cumprimento de obrigação demonstrado por ${validEvidence.length} evidência(s) técnica(s) válida(s).`,
        ruleResponsible: 'RULE_COMPLIANCE_EVIDENCE_VALIDATED'
      };
    }

    if (applicabilityStatus === 'REVIEW_REQUIRED') {
      return {
        status: 'REVIEW_REQUIRED',
        reason: 'Incerteza na aplicabilidade técnica ou dados incompletos de configuração de frota.',
        ruleResponsible: 'RULE_APPLICABILITY_INSUFFICIENT_METADATA'
      };
    }

    // Has insufficient or review required evidence
    const insufficientEvidence = evidenceList.filter(e => 
      e.verificationStatus === 'INSUFFICIENT' || e.verificationStatus === 'REVIEW_REQUIRED'
    );
    if (insufficientEvidence.length > 0) {
      return {
        status: 'REVIEW_REQUIRED',
        reason: 'Evidência anexada considerada insuficiente ou com inconsistência estruturada.',
        ruleResponsible: 'RULE_EVIDENCE_DATA_INSUFFICIENT'
      };
    }

    // Check effective date
    const todayIso = new Date().toISOString().split('T')[0];
    if (effectiveDateStr && effectiveDateStr > todayIso) {
      return {
        status: 'NOT_YET_EFFECTIVE',
        reason: `Requisito regulatório aplicável porém com data de efetividade futura (${effectiveDateStr}).`,
        ruleResponsible: 'RULE_EFFECTIVE_DATE_FUTURE'
      };
    }

    // Check overdue / due soon if counters exist
    if (temporalCounters?.isOverdue) {
      return {
        status: 'OVERDUE',
        reason: 'Prazo limite mandatário (calendário, horas ou ciclos) excedido.',
        ruleResponsible: 'RULE_THRESHOLD_OVERDUE'
      };
    }

    if (temporalCounters?.isDueSoon) {
      return {
        status: 'DUE_SOON',
        reason: 'Prazo de cumprimento dentro da janela de alerta operacional.',
        ruleResponsible: 'RULE_THRESHOLD_DUE_SOON'
      };
    }

    // Default open state for active, applicable requirement
    return {
      status: 'OPEN',
      reason: 'Obrigação de aeronavegabilidade ativa e em vigor aguardando cumprimento.',
      ruleResponsible: 'RULE_OBLIGATION_OPEN_ACTIVE'
    };
  }

  /**
   * Creates or updates a Compliance Obligation (IDEMPOTENT)
   */
  public createOrUpdateObligation(input: CreateObligationInput): ComplianceObligation {
    const { 
      requirement, 
      aircraft, 
      targetEntity, 
      applicabilityStatus, 
      applicabilityReasoning, 
      applicabilityAssessmentId,
      mandatedAction, 
      initialEvidence = [],
      actionAccomplishments = [],
      actor = 'ComplianceObligationEngine v6.1.0'
    } = input;

    const entity = targetEntity || {
      entityType: 'AIRCRAFT',
      entityId: aircraft.id,
      aircraftId: aircraft.id,
      aircraftRegistration: aircraft.registration,
      aircraftMsn: aircraft.msn,
      aircraftModel: aircraft.model
    };

    const obligationId = this.generateObligationKey(
      requirement.id, 
      entity.entityId, 
      mandatedAction?.id
    );

    const nowIso = new Date().toISOString();
    const existingObligations = camoDb.getState().obligations || [];
    const existing = existingObligations.find(o => o.id === obligationId);
    const liveAircraft = camoDb.getState().aircraft.find(a => a.id === aircraft.id) || aircraft;

    // Build Threshold config from mandatedAction or requirement
    const threshold: ObligationThresholdConfig | undefined = mandatedAction?.complianceThreshold ? {
      thresholdType: mandatedAction.complianceThreshold.thresholdType,
      thresholdValue: mandatedAction.complianceThreshold.thresholdValue,
      thresholdDate: mandatedAction.complianceThreshold.thresholdDate,
      description: mandatedAction.complianceThreshold.rawDescription
    } : requirement.requirementDetails?.initialThreshold ? {
      description: requirement.requirementDetails.initialThreshold
    } : undefined;

    // Build Interval config
    const interval: ObligationIntervalConfig | undefined = mandatedAction?.repetitiveInterval ? {
      isRepetitive: true,
      intervalType: mandatedAction.repetitiveInterval.intervalType,
      intervalValue: mandatedAction.repetitiveInterval.intervalValue,
      description: mandatedAction.repetitiveInterval.rawDescription
    } : requirement.requirementDetails?.repetitiveInterval ? {
      isRepetitive: true,
      description: requirement.requirementDetails.repetitiveInterval
    } : undefined;

    // Map evidence links from input or matching accomplishments
    const evidenceLinks: ObligationEvidenceLink[] = existing?.evidence ? [...existing.evidence] : [];

    // Add matching maintenance accomplishments as evidence
    for (const acc of actionAccomplishments) {
      const accAny = acc as any;
      const alreadyLinked = evidenceLinks.some(e => e.documentReference === acc.workOrderReference || e.evidenceId === acc.id);
      if (!alreadyLinked && (acc.aircraftId === aircraft.id || accAny.aircraftRegistration === aircraft.registration)) {
        evidenceLinks.push({
          evidenceId: acc.id,
          evidenceType: 'TECH_LOG',
          documentReference: acc.workOrderReference || `WO-${acc.id}`,
          description: accAny.description || 'Cumprimento de ação de manutenção registrado no log técnico.',
          accomplishmentDate: acc.accomplishmentDate,
          accomplishmentFH: acc.accomplishmentFlightHours,
          accomplishmentFC: acc.accomplishmentCycles,
          recordedAt: accAny.recordedDate || nowIso,
          recordedBy: accAny.recordedBy || 'Maintenance Engineer',
          verified: accAny.status === 'VALID' || accAny.status === 'VERIFIED' || true,
          verifiedBy: accAny.recordedBy,
          verifiedAt: accAny.recordedDate || nowIso
        });
      }
    }

    // Add initial evidence items
    for (const ev of initialEvidence) {
      const alreadyLinked = evidenceLinks.some(e => e.evidenceId === ev.id);
      if (!alreadyLinked) {
        evidenceLinks.push({
          evidenceId: ev.id,
          evidenceType: ev.type,
          documentReference: ev.documentReference,
          description: ev.description,
          accomplishmentDate: ev.date,
          recordedAt: nowIso,
          recordedBy: ev.verifiedBy || 'CAMO Inspector',
          verified: ev.verified,
          verifiedBy: ev.verified ? ev.verifiedBy : undefined,
          verifiedAt: ev.verified ? nowIso : undefined
        });
      }
    }

    const verifiedLinks = evidenceLinks.filter(e => e.verified || e.verificationStatus === 'VALID');
    verifiedLinks.sort((a, b) => {
      const fhDiff = (b.accomplishmentFH || 0) - (a.accomplishmentFH || 0);
      if (fhDiff !== 0) return fhDiff;
      const dateA = a.accomplishmentDate || '';
      const dateB = b.accomplishmentDate || '';
      return dateB.localeCompare(dateA);
    });
    const latestAccomplishment = verifiedLinks[0];
    const temporalCounters = this.calculateTemporalCounters(
      requirement.effectiveDate,
      threshold,
      interval,
      liveAircraft,
      latestAccomplishment,
      existing?.temporalCounters?.cycleCount || 0
    );

    const isSuperseded = Boolean(requirement.supersededBy || existing?.supersedence?.isSuperseded);

    if (existing) {
      // Idempotent update — preserve existing history, transitions and human decisions!
      let newStatus = existing.status;
      let transitionReason = 'Idempotent refresh of compliance obligation parameters.';
      let ruleResponsible = 'RULE_IDEMPOTENT_REFRESH';

      // Preserve active lifecycle states: NEXT_CYCLE_OPEN, COMPLIED, SUPERSEDED
      const isLifecycleState = existing.status === 'NEXT_CYCLE_OPEN' || 
                               existing.status === 'COMPLIED' || 
                               existing.status === 'SUPERSEDED';

      // If existing has a human override, preserve it
      if (!isLifecycleState && (!existing.reviewState.humanDecision || existing.reviewState.humanDecision === 'DISMISSED')) {
        const autoDetermination = this.determineInitialStatus(
          applicabilityStatus,
          requirement.effectiveDate,
          evidenceLinks,
          temporalCounters,
          isSuperseded
        );
        if (autoDetermination.status !== existing.status) {
          newStatus = autoDetermination.status;
          transitionReason = autoDetermination.reason;
          ruleResponsible = autoDetermination.ruleResponsible;
          
          // Record state transition
          const transition: ObligationStateTransition = {
            id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            fromStatus: existing.status,
            toStatus: newStatus,
            reason: transitionReason,
            timestamp: nowIso,
            ruleResponsible: ruleResponsible,
            actor: actor
          };
          existing.stateTransitions.push(transition);
        }
      }

      existing.applicabilityStatus = applicabilityStatus;
      existing.applicabilityReasoning = applicabilityReasoning || existing.applicabilityReasoning;
      existing.applicabilityAssessmentId = applicabilityAssessmentId || existing.applicabilityAssessmentId;
      existing.status = newStatus;
      existing.statusReason = transitionReason;
      existing.temporalCounters = temporalCounters;
      existing.evidence = evidenceLinks;
      existing.threshold = threshold || existing.threshold;
      existing.interval = interval || existing.interval;
      existing.aircraftId = aircraft.id;
      existing.updatedAt = nowIso;
      existing.updatedBy = actor;
      existing.version = (existing.version || 1) + 1;

      camoDb.update(state => {
        const idx = state.obligations.findIndex(o => o.id === obligationId);
        if (idx >= 0) {
          state.obligations[idx] = existing;
        }
      });

      return existing;
    }

    // New Obligation Creation
    const initialDetermination = this.determineInitialStatus(
      applicabilityStatus,
      requirement.effectiveDate,
      evidenceLinks,
      temporalCounters,
      isSuperseded
    );

    const initialTransition: ObligationStateTransition = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      fromStatus: 'IDENTIFIED',
      toStatus: initialDetermination.status,
      reason: initialDetermination.reason,
      timestamp: nowIso,
      ruleResponsible: initialDetermination.ruleResponsible,
      actor: actor
    };

    const newObligation: ComplianceObligation = {
      id: obligationId,
      complianceRequirementId: requirement.id,
      adNumber: requirement.sourceNumber || 'AD-UNKNOWN',
      adRevision: requirement.revision,
      adTitle: requirement.title,
      issuingAuthority: requirement.issuingAuthority,
      aircraftId: aircraft.id,
      
      targetEntity: {
        entityType: entity.entityType || 'AIRCRAFT',
        entityId: entity.entityId,
        aircraftId: aircraft.id,
        aircraftRegistration: aircraft.registration,
        aircraftMsn: aircraft.msn,
        aircraftModel: aircraft.model,
        serialNumber: (entity as any).serialNumber,
        partNumber: (entity as any).partNumber,
        position: (entity as any).position
      },

      applicabilityStatus: applicabilityStatus,
      applicabilityReasoning: applicabilityReasoning || [],
      applicabilityAssessmentId: applicabilityAssessmentId,
      mandatedActionId: mandatedAction?.id,
      mandatedActionParagraph: mandatedAction?.paragraphReference,
      actionDescription: mandatedAction?.description,

      status: initialDetermination.status,
      previousStatus: 'IDENTIFIED',
      statusReason: initialDetermination.reason,

      threshold: threshold,
      interval: interval,
      temporalCounters: temporalCounters,

      evidence: evidenceLinks,
      lastAccomplishmentId: latestAccomplishment?.evidenceId,

      terminatingAction: mandatedAction?.isTerminatingAction ? {
        hasTerminatingAction: true,
        isTerminated: initialDetermination.status === 'COMPLIED',
        terminatingActionId: mandatedAction.id,
        terminatingParagraph: mandatedAction.paragraphReference
      } : undefined,

      supersedence: isSuperseded ? {
        isSuperseded: true,
        supersededByAdNumber: requirement.supersededBy || undefined,
        supersededDate: nowIso,
        reason: 'Requisito regulatório marcado como SUPERSEDED.'
      } : undefined,

      reviewState: {
        requiresHumanReview: initialDetermination.status === 'REVIEW_REQUIRED',
        reviewReasons: initialDetermination.status === 'REVIEW_REQUIRED' ? [initialDetermination.reason] : [],
        originalAutoStatus: initialDetermination.status
      },

      stateTransitions: [initialTransition],
      engineVersion: COMPLIANCE_OBLIGATION_ENGINE_VERSION,
      createdAt: nowIso,
      createdBy: actor,
      updatedAt: nowIso,
      updatedBy: actor,
      version: 1
    };

    camoDb.update(state => {
      state.obligations.push(newObligation);
    });

    camoDb.logAudit({
      user: actor,
      role: 'CAMO_SYSTEM',
      action: 'OBLIGATION_CREATED',
      entityType: 'ComplianceObligation',
      entityId: newObligation.id,
      details: `Created Compliance Obligation for AD ${newObligation.adNumber} on aircraft ${aircraft.registration} with status ${newObligation.status}.`
    });

    return newObligation;
  }

  /**
   * Executes a deterministic state transition on an existing obligation
   */
  public transitionState(input: TransitionObligationInput): ComplianceObligation {
    const { 
      obligationId, 
      toStatus, 
      reason, 
      ruleResponsible, 
      actor, 
      actorRole = 'CAMO_SYSTEM',
      evidence,
      details,
      skipEvidenceCheck = false
    } = input;

    const state = camoDb.getState();
    const obligation = state.obligations.find(o => o.id === obligationId);
    if (!obligation) {
      throw new Error(`Compliance Obligation not found: ${obligationId}`);
    }

    // Strict Invariant: COMPLIED requires valid evidence!
    if (toStatus === 'COMPLIED' && !skipEvidenceCheck) {
      const isLinkValid = (e: ObligationEvidenceLink) => {
        if (e.verificationStatus) {
          return e.verificationStatus === 'VALID';
        }
        return e.verified === true;
      };
      const hasVerifiedEvidence = 
        (obligation.evidence && obligation.evidence.some(isLinkValid)) || 
        (evidence && isLinkValid(evidence));
      if (!hasVerifiedEvidence) {
        throw new Error(
          `TRANSITION_REJECTED: Cannot transition obligation ${obligationId} to COMPLIED without verified compliance evidence (Strict Airworthiness Invariant).`
        );
      }
    }

    const fromStatus = obligation.status;
    if (fromStatus === toStatus) {
      return obligation; // No-op idempotent
    }

    const nowIso = new Date().toISOString();

    // Attach evidence if provided in transition
    if (evidence) {
      const exists = obligation.evidence.some(e => e.evidenceId === evidence.evidenceId);
      if (!exists) {
        obligation.evidence.push(evidence);
      }
    }

    // Handle repetitive cycle transition: COMPLIED -> NEXT_CYCLE_OPEN
    if (toStatus === 'NEXT_CYCLE_OPEN') {
      const aircraft = state.aircraft.find(a => a.id === (obligation.targetEntity?.aircraftId || obligation.aircraftId));
      const verifiedLinks = obligation.evidence.filter(e => e.verified || e.verificationStatus === 'VALID');
      verifiedLinks.sort((a, b) => {
        const fhDiff = (b.accomplishmentFH || 0) - (a.accomplishmentFH || 0);
        if (fhDiff !== 0) return fhDiff;
        const dateA = a.accomplishmentDate || '';
        const dateB = b.accomplishmentDate || '';
        return dateB.localeCompare(dateA);
      });
      const latestAccomplishment = verifiedLinks[0];
      const newCycleCount = (obligation.temporalCounters.cycleCount || 0) + 1;
      obligation.temporalCounters = this.calculateTemporalCounters(
        obligation.temporalCounters.effectiveDate,
        obligation.threshold,
        obligation.interval,
        aircraft,
        latestAccomplishment,
        newCycleCount
      );
    }

    const transition: ObligationStateTransition = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      fromStatus: fromStatus,
      toStatus: toStatus,
      reason: reason,
      timestamp: nowIso,
      ruleResponsible: ruleResponsible,
      actor: actor,
      actorRole: actorRole,
      evidenceId: evidence?.evidenceId,
      details: details
    };

    obligation.previousStatus = fromStatus;
    obligation.status = toStatus;
    obligation.statusReason = reason;
    obligation.stateTransitions.push(transition);
    obligation.updatedAt = nowIso;
    obligation.updatedBy = actor;
    obligation.version = (obligation.version || 1) + 1;

    if (toStatus === 'REVIEW_REQUIRED') {
      obligation.reviewState.requiresHumanReview = true;
      if (!obligation.reviewState.reviewReasons.includes(reason)) {
        obligation.reviewState.reviewReasons.push(reason);
      }
    }

    camoDb.update(draft => {
      const idx = draft.obligations.findIndex(o => o.id === obligationId);
      if (idx >= 0) {
        draft.obligations[idx] = obligation;
      }
    });

    camoDb.logAudit({
      user: actor,
      role: actorRole,
      action: 'OBLIGATION_TRANSITION',
      entityType: 'ComplianceObligation',
      entityId: obligation.id,
      details: `Transitioned obligation ${obligation.id} from ${fromStatus} to ${toStatus}. Reason: ${reason} (Rule: ${ruleResponsible})`,
      previousState: { status: fromStatus },
      newState: { status: toStatus, rule: ruleResponsible }
    });

    return obligation;
  }

  /**
   * Attaches objective compliance evidence to an obligation and optionally evaluates compliance
   */
  public attachEvidence(input: AttachEvidenceInput): ComplianceObligation {
    const {
      obligationId,
      evidenceId,
      evidenceType,
      documentReference,
      sourceReference,
      description,
      accomplishmentDate,
      accomplishmentFH,
      accomplishmentFC,
      recordedBy,
      verified,
      verificationStatus,
      documentHash,
      uploadedFileData,
      notes,
      triggerComplianceEvaluation = true,
      metadata
    } = input;

    const state = camoDb.getState();
    const obligation = state.obligations.find(o => o.id === obligationId);
    if (!obligation) {
      throw new Error(`Compliance Obligation not found: ${obligationId}`);
    }

    const nowIso = new Date().toISOString();
    const aircraft = state.aircraft.find(a => a.id === (obligation.targetEntity?.aircraftId || obligation.aircraftId));
    const requirement = state.requirements.find(r => r.id === obligation.complianceRequirementId);
    const mandatedAction = requirement?.mandatedActions?.find(a => a.id === obligation.mandatedActionId);

    // Deterministic Document Hash
    const computedDocHash = documentHash || (
      uploadedFileData 
        ? evidenceVerificationEngine.calculateDocumentHash(uploadedFileData)
        : evidenceVerificationEngine.calculateInputHash({
            documentReference,
            sourceReference,
            accomplishmentDate,
            accomplishmentFH,
            accomplishmentFC,
            obligationId
          })
    );

    // Idempotency check: detect identical duplicate evidence
    const existingEv = state.evidence.find(e => 
      e.obligationId === obligationId && 
      e.documentHash === computedDocHash &&
      e.documentReference === documentReference
    );

    const actualEvidenceId = evidenceId || existingEv?.id || `ev-obl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Initial Evidence Entity
    const initialStatus: EvidenceVerificationStatus = verificationStatus || 
      (triggerComplianceEvaluation ? 'PENDING_VALIDATION' : (verified ? 'VALID' : 'SUBMITTED'));

    const evidenceEntity: Evidence = existingEv || {
      id: actualEvidenceId,
      obligationId: obligation.id,
      complianceRequirementId: obligation.complianceRequirementId,
      requirementId: obligation.complianceRequirementId,
      aircraftId: aircraft?.id || obligation.targetEntity.aircraftId,
      evidenceType: evidenceType as EvidenceType,
      description: description,
      documentReference: documentReference,
      sourceReference: sourceReference || documentReference,
      source: 'CAMO_EVIDENCE_ATTACHMENT',
      entityId: obligation.targetEntity.entityId || obligation.targetEntity.aircraftId,
      targetEntity: {
        entityType: obligation.targetEntity.entityType,
        entityId: obligation.targetEntity.entityId || obligation.targetEntity.aircraftId,
        registration: obligation.targetEntity.aircraftRegistration,
        serialNumber: obligation.targetEntity.serialNumber,
        partNumber: obligation.targetEntity.partNumber
      },
      eventDate: accomplishmentDate,
      date: accomplishmentDate,
      eventFlightHours: accomplishmentFH,
      eventFlightCycles: accomplishmentFC,
      submittedAt: nowIso,
      submittedBy: recordedBy,
      verificationStatus: initialStatus,
      documentHash: computedDocHash,
      uploadedFileData: uploadedFileData,
      metadata: metadata || {},
      auditTrail: [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: nowIso,
          actor: recordedBy,
          actorRole: 'CAMO_ENGINEER',
          previousStatus: undefined,
          newStatus: initialStatus,
          action: 'EVIDENCE_ATTACHED',
          reason: `Attached to obligation ${obligation.id}.`,
          inputHash: computedDocHash
        }
      ],
      version: 1
    };

    let validationResult: EvidenceValidationResult | undefined;
    if (triggerComplianceEvaluation) {
      validationResult = evidenceVerificationEngine.verifyEvidence({
        evidence: evidenceEntity,
        obligation,
        requirement,
        mandatedAction,
        aircraft,
        evaluator: recordedBy,
        evaluatorRole: 'CAMO_ENGINEER'
      });

      const oldStatus = evidenceEntity.verificationStatus;
      evidenceEntity.verificationStatus = validationResult.status;
      evidenceEntity.verificationReasons = validationResult.reasons;
      evidenceEntity.structuredReviewReasons = validationResult.structuredReasons;
      evidenceEntity.verificationTimestamp = validationResult.verificationTimestamp;
      evidenceEntity.verifiedBy = recordedBy;
      evidenceEntity.verified = validationResult.isValid;
      evidenceEntity.verificationHash = validationResult.verificationHash;

      evidenceEntity.auditTrail?.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: validationResult.verificationTimestamp,
        actor: recordedBy,
        actorRole: 'CAMO_ENGINEER',
        previousStatus: oldStatus,
        newStatus: validationResult.status,
        action: 'EVIDENCE_VALIDATED',
        reason: validationResult.reasons.join('; '),
        inputHash: validationResult.inputHash
      });
    }

    // Persist evidence entity in camoDb.state.evidence
    camoDb.update(draft => {
      const idx = draft.evidence.findIndex(e => e.id === evidenceEntity.id);
      if (idx >= 0) {
        draft.evidence[idx] = evidenceEntity;
      } else {
        draft.evidence.push(evidenceEntity);
      }
    });

    // Link in obligation
    const evidenceLink: ObligationEvidenceLink = {
      evidenceId: evidenceEntity.id,
      evidenceType: evidenceEntity.evidenceType || evidenceType,
      documentReference: documentReference,
      sourceReference: sourceReference || documentReference,
      description: description,
      accomplishmentDate: accomplishmentDate,
      accomplishmentFH: accomplishmentFH,
      accomplishmentFC: accomplishmentFC,
      recordedAt: nowIso,
      recordedBy: recordedBy,
      verified: Boolean(evidenceEntity.verified),
      verifiedBy: evidenceEntity.verified ? recordedBy : undefined,
      verifiedAt: evidenceEntity.verified ? nowIso : undefined,
      verificationStatus: evidenceEntity.verificationStatus,
      verificationReasons: evidenceEntity.verificationReasons,
      structuredReviewReasons: evidenceEntity.structuredReviewReasons,
      documentHash: computedDocHash,
      verificationHash: evidenceEntity.verificationHash,
      notes: notes
    };

    const linkIdx = obligation.evidence.findIndex(e => e.evidenceId === evidenceLink.evidenceId);
    if (linkIdx >= 0) {
      obligation.evidence[linkIdx] = evidenceLink;
    } else {
      obligation.evidence.push(evidenceLink);
    }

    obligation.lastAccomplishmentId = evidenceLink.evidenceId;
    obligation.updatedAt = nowIso;
    obligation.updatedBy = recordedBy;

    // Recalculate temporal counters
    const allVerifiedLinks = obligation.evidence.filter(e => e.verified || e.verificationStatus === 'VALID');
    allVerifiedLinks.sort((a, b) => {
      const fhDiff = (b.accomplishmentFH || 0) - (a.accomplishmentFH || 0);
      if (fhDiff !== 0) return fhDiff;
      const dateA = a.accomplishmentDate || '';
      const dateB = b.accomplishmentDate || '';
      return dateB.localeCompare(dateA);
    });
    const latestVerifiedAccomplishment = allVerifiedLinks[0];

    obligation.temporalCounters = this.calculateTemporalCounters(
      obligation.temporalCounters.effectiveDate,
      obligation.threshold,
      obligation.interval,
      aircraft,
      latestVerifiedAccomplishment,
      obligation.temporalCounters.cycleCount || 0
    );

    camoDb.update(draft => {
      const idx = draft.obligations.findIndex(o => o.id === obligationId);
      if (idx >= 0) {
        draft.obligations[idx] = obligation;
      }
    });

    camoDb.logAudit({
      user: recordedBy,
      role: 'CAMO_ENGINEER',
      action: 'OBLIGATION_EVIDENCE_ATTACHED',
      entityType: 'ComplianceObligation',
      entityId: obligation.id,
      details: `Attached evidence ${documentReference} (${evidenceType}) to obligation ${obligation.id}. Status: ${evidenceEntity.verificationStatus}`
    });

    // Evaluate full probatory set for the obligation
    if (triggerComplianceEvaluation) {
      const allLinkedEvidences = camoDb.getState().evidence.filter(e => 
        obligation.evidence.some(link => link.evidenceId === e.id)
      );

      const probatoryResult = evidenceVerificationEngine.evaluateObligationProbatorySet(
        obligation,
        allLinkedEvidences,
        aircraft
      );

      if (probatoryResult.canTransitionToComplied) {
        // Handle terminating action
        if (probatoryResult.terminatingActionProven && obligation.terminatingAction) {
          obligation.terminatingAction.isTerminated = true;
        }

        this.transitionState({
          obligationId: obligation.id,
          toStatus: 'COMPLIED',
          reason: probatoryResult.reasons.join('; '),
          ruleResponsible: validationResult?.ruleResponsible || 'RULE_COMPLIANCE_PROBATORY_SET_SATISFIED',
          actor: recordedBy,
          evidence: evidenceLink
        });

        // Repetitive action recurrence scheduling
        if (obligation.interval?.isRepetitive && !probatoryResult.terminatingActionProven) {
          this.transitionState({
            obligationId: obligation.id,
            toStatus: 'NEXT_CYCLE_OPEN',
            reason: `Ciclo repetitivo iniciado após cumprimento válido (${evidenceLink.documentReference}).`,
            ruleResponsible: 'RULE_REPETITIVE_CYCLE_SCHEDULING',
            actor: 'Due Date Engine v6.3.0',
            evidence: evidenceLink
          });
        }
      } else if (probatoryResult.resultingStatus === 'REVIEW_REQUIRED' && obligation.status !== 'REVIEW_REQUIRED') {
        this.transitionState({
          obligationId: obligation.id,
          toStatus: 'REVIEW_REQUIRED',
          reason: probatoryResult.reasons.join('; '),
          ruleResponsible: 'RULE_EVIDENCE_EVALUATION_REVIEW_REQUIRED',
          actor: recordedBy,
          evidence: evidenceLink
        });
      }
    }

    return camoDb.getState().obligations.find(o => o.id === obligationId) || obligation;
  }

  /**
   * Revokes an existing evidence item, transitions it to REVOKED, and re-evaluates linked obligations
   */
  public revokeEvidence(input: {
    evidenceId: string;
    obligationId?: string;
    reason: string;
    actor: string;
    actorRole?: string;
  }): { evidence: Evidence; obligation?: ComplianceObligation } {
    const { evidenceId, obligationId, reason, actor, actorRole = 'CAMO_ENGINEER' } = input;
    const state = camoDb.getState();
    const evidence = state.evidence.find(e => e.id === evidenceId);
    if (!evidence) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }

    const currentStatus = evidence.verificationStatus;
    const transitionCheck = evidenceVerificationEngine.isValidStateTransition(currentStatus, 'REVOKED');
    if (!transitionCheck.allowed) {
      throw new Error(transitionCheck.reason || `Cannot revoke evidence from status ${currentStatus}`);
    }

    const nowIso = new Date().toISOString();
    evidence.verificationStatus = 'REVOKED';
    evidence.verified = false;
    if (!evidence.auditTrail) evidence.auditTrail = [];
    evidence.auditTrail.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: nowIso,
      actor,
      actorRole,
      previousStatus: currentStatus,
      newStatus: 'REVOKED',
      action: 'EVIDENCE_REVOKED',
      reason,
      inputHash: evidenceVerificationEngine.calculateInputHash({ evidenceId, reason, timestamp: nowIso })
    });

    camoDb.update(draft => {
      const idx = draft.evidence.findIndex(e => e.id === evidenceId);
      if (idx >= 0) draft.evidence[idx] = evidence;
    });

    camoDb.logAudit({
      user: actor,
      role: actorRole,
      action: 'EVIDENCE_REVOKED',
      entityType: 'Evidence',
      entityId: evidence.id,
      details: `Evidence ${evidence.documentReference || evidence.id} was REVOKED. Reason: ${reason}`
    });

    // Find linked obligations
    const targetObligationId = obligationId || evidence.obligationId;
    let targetObligation = targetObligationId ? state.obligations.find(o => o.id === targetObligationId) : undefined;

    if (targetObligation) {
      // Update link in obligation
      const link = targetObligation.evidence.find(e => e.evidenceId === evidenceId);
      if (link) {
        link.verificationStatus = 'REVOKED';
        link.verified = false;
      }

      camoDb.update(draft => {
        const oblIdx = draft.obligations.findIndex(o => o.id === targetObligation!.id);
        if (oblIdx >= 0) {
          const l = draft.obligations[oblIdx].evidence.find(e => e.evidenceId === evidenceId);
          if (l) {
            l.verificationStatus = 'REVOKED';
            l.verified = false;
          }
        }
      });

      // Re-evaluate obligation probatory set
      const allLinkedEvidences = camoDb.getState().evidence.filter(e => 
        targetObligation!.evidence.some(l => l.evidenceId === e.id)
      );

      const probatoryResult = evidenceVerificationEngine.evaluateObligationProbatorySet(
        targetObligation,
        allLinkedEvidences
      );

      // If obligation was COMPLIED or NEXT_CYCLE_OPEN and no longer can be COMPLIED, REOPEN!
      if ((targetObligation.status === 'COMPLIED' || targetObligation.status === 'NEXT_CYCLE_OPEN') && !probatoryResult.canTransitionToComplied) {
        const revertStatus = probatoryResult.resultingStatus === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 
                             targetObligation.temporalCounters?.isOverdue ? 'OVERDUE' :
                             targetObligation.temporalCounters?.isDueSoon ? 'DUE_SOON' : 'OPEN';

        targetObligation = this.transitionState({
          obligationId: targetObligation.id,
          toStatus: revertStatus,
          reason: `Obrigação reaberta devido à revogação de evidência probatória (${evidence.documentReference || evidence.id}). Motivo: ${reason}`,
          ruleResponsible: 'RULE_EVIDENCE_REVOKED_REOPEN',
          actor,
          actorRole,
          skipEvidenceCheck: true
        });
      }
    }

    return { evidence, obligation: targetObligation };
  }

  /**
   * Deterministically validates an existing evidence item
   */
  public validateEvidence(
    evidenceId: string, 
    actor: string = 'CAMO Engineer',
    actorRole: string = 'CAMO_ENGINEER'
  ): { evidence: Evidence; obligation?: ComplianceObligation; result: EvidenceValidationResult } {
    const state = camoDb.getState();
    const evidence = state.evidence.find(e => e.id === evidenceId);
    if (!evidence) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }

    const obligation = state.obligations.find(o => o.id === evidence.obligationId);
    if (!obligation) {
      throw new Error(`Obligation not found for evidence: ${evidence.obligationId}`);
    }

    const aircraft = state.aircraft.find(a => a.id === obligation.targetEntity.aircraftId);
    const requirement = state.requirements.find(r => r.id === obligation.complianceRequirementId);
    const mandatedAction = requirement?.mandatedActions?.find(a => a.id === obligation.mandatedActionId);

    const result = evidenceVerificationEngine.verifyEvidence({
      evidence,
      obligation,
      requirement,
      mandatedAction,
      aircraft,
      evaluator: actor,
      evaluatorRole: actorRole
    });

    const oldStatus = evidence.verificationStatus;
    evidence.verificationStatus = result.status;
    evidence.verificationReasons = result.reasons;
    evidence.structuredReviewReasons = result.structuredReasons;
    evidence.verificationTimestamp = result.verificationTimestamp;
    evidence.verifiedBy = actor;
    evidence.verified = result.isValid;
    evidence.verificationHash = result.verificationHash;

    if (!evidence.auditTrail) evidence.auditTrail = [];
    evidence.auditTrail.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: result.verificationTimestamp,
      actor,
      actorRole,
      previousStatus: oldStatus,
      newStatus: result.status,
      action: 'EVIDENCE_VALIDATED',
      reason: result.reasons.join('; '),
      inputHash: result.inputHash
    });

    // Update in state
    camoDb.update(draft => {
      const idx = draft.evidence.findIndex(e => e.id === evidence.id);
      if (idx >= 0) draft.evidence[idx] = evidence;
    });

    // Update link in obligation
    const link = obligation.evidence.find(l => l.evidenceId === evidence.id);
    if (link) {
      link.verified = result.isValid;
      link.verificationStatus = result.status;
      link.verificationReasons = result.reasons;
      link.structuredReviewReasons = result.structuredReasons;
      link.verificationHash = result.verificationHash;
    }

    // Evaluate probatory set
    const allLinkedEvidences = camoDb.getState().evidence.filter(e => 
      obligation.evidence.some(l => l.evidenceId === e.id)
    );
    const probatoryResult = evidenceVerificationEngine.evaluateObligationProbatorySet(
      obligation,
      allLinkedEvidences,
      aircraft
    );

    if (probatoryResult.canTransitionToComplied && obligation.status !== 'COMPLIED' && obligation.status !== 'NEXT_CYCLE_OPEN') {
      this.transitionState({
        obligationId: obligation.id,
        toStatus: 'COMPLIED',
        reason: probatoryResult.reasons.join('; '),
        ruleResponsible: result.ruleResponsible,
        actor,
        actorRole
      });
    } else if (probatoryResult.resultingStatus === 'REVIEW_REQUIRED' && obligation.status !== 'REVIEW_REQUIRED') {
      this.transitionState({
        obligationId: obligation.id,
        toStatus: 'REVIEW_REQUIRED',
        reason: probatoryResult.reasons.join('; '),
        ruleResponsible: 'RULE_EVIDENCE_EVALUATION_REVIEW_REQUIRED',
        actor,
        actorRole
      });
    }

    const updatedObligation = camoDb.getState().obligations.find(o => o.id === obligation.id);
    return { evidence, obligation: updatedObligation, result };
  }

  /**
   * Records a Human Review decision without destroying previous automatic evaluations
   */
  public recordHumanReview(input: HumanReviewObligationInput): ComplianceObligation {
    const { obligationId, decision, newStatus, justification, reviewedBy, reviewedByRole = 'CHIEF_CAMO_ENGINEER' } = input;
    const state = camoDb.getState();
    const obligation = state.obligations.find(o => o.id === obligationId);
    if (!obligation) {
      throw new Error(`Compliance Obligation not found: ${obligationId}`);
    }

    const nowIso = new Date().toISOString();
    const previousStatus = obligation.status;

    obligation.reviewState = {
      requiresHumanReview: false,
      reviewReasons: obligation.reviewState.reviewReasons,
      reviewedBy: reviewedBy,
      reviewedAt: nowIso,
      humanDecision: decision,
      humanJustification: justification,
      originalAutoStatus: obligation.reviewState.originalAutoStatus || previousStatus
    };

    let finalStatus = previousStatus;
    if (decision === 'OVERRIDDEN' && newStatus) {
      finalStatus = newStatus;
    }

    const transition: ObligationStateTransition = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      fromStatus: previousStatus,
      toStatus: finalStatus,
      reason: `Human Review [${decision}]: ${justification}`,
      timestamp: nowIso,
      ruleResponsible: 'HUMAN_REVIEW_GATEWAY_DECISION',
      actor: reviewedBy,
      actorRole: reviewedByRole,
      details: { decision, justification, originalAutoStatus: obligation.reviewState.originalAutoStatus }
    };

    obligation.status = finalStatus;
    obligation.statusReason = `Human Review Decision (${decision}): ${justification}`;
    obligation.stateTransitions.push(transition);
    obligation.updatedAt = nowIso;
    obligation.updatedBy = reviewedBy;
    obligation.version = (obligation.version || 1) + 1;

    camoDb.update(draft => {
      const idx = draft.obligations.findIndex(o => o.id === obligationId);
      if (idx >= 0) {
        draft.obligations[idx] = obligation;
      }
    });

    camoDb.logAudit({
      user: reviewedBy,
      role: reviewedByRole,
      action: 'OBLIGATION_REVIEWED',
      entityType: 'ComplianceObligation',
      entityId: obligation.id,
      details: `Human Review recorded on obligation ${obligation.id}. Decision: ${decision}. New status: ${finalStatus}. Justification: ${justification}`,
      previousState: { status: previousStatus },
      newState: { status: finalStatus, humanDecision: decision }
    });

    return obligation;
  }

  /**
   * Marks obligations as SUPERSEDED when a new AD supersedes an existing requirement
   */
  public markSuperseded(
    supersededRequirementId: string, 
    supersedingAdNumber: string, 
    supersedingRequirementId?: string,
    actor: string = 'ComplianceObligationEngine v6.1.0'
  ): number {
    const state = camoDb.getState();
    const matching = state.obligations.filter(
      o => o.complianceRequirementId === supersededRequirementId && o.status !== 'SUPERSEDED' && o.status !== 'CANCELLED'
    );

    let count = 0;
    for (const obl of matching) {
      obl.supersedence = {
        isSuperseded: true,
        supersededByRequirementId: supersedingRequirementId,
        supersededByAdNumber: supersedingAdNumber,
        supersededDate: new Date().toISOString(),
        reason: `Requisito regulatório superado pela AD ${supersedingAdNumber}.`
      };

      this.transitionState({
        obligationId: obl.id,
        toStatus: 'SUPERSEDED',
        reason: `Obrigação superada pela AD ${supersedingAdNumber}. Histórico e evidências de cumprimento preservados.`,
        ruleResponsible: 'RULE_SUPERSEDED_BY_NEW_AD',
        actor: actor,
        skipEvidenceCheck: true
      });
      count++;
    }

    return count;
  }

  /**
   * Evaluates all fleet obligations against current calendar date, flight hours and cycles
   */
  public evaluateAllFleetObligations(actor: string = 'ComplianceObligationEngine v6.1.0'): ObligationEvaluationSummary {
    const state = camoDb.getState();
    const obligations = state.obligations || [];
    const todayIso = new Date().toISOString().split('T')[0];

    let transitionsExecuted = 0;
    const statusCounts: Record<ComplianceObligationStatus, number> = {
      IDENTIFIED: 0,
      APPLICABILITY_PENDING: 0,
      APPLICABLE: 0,
      NOT_YET_EFFECTIVE: 0,
      OPEN: 0,
      DUE_SOON: 0,
      OVERDUE: 0,
      COMPLIED: 0,
      NEXT_CYCLE_OPEN: 0,
      NOT_APPLICABLE: 0,
      REVIEW_REQUIRED: 0,
      SUPERSEDED: 0,
      CANCELLED: 0
    };

    for (const obl of obligations) {
      const aircraft = state.aircraft.find(a => a.id === obl.targetEntity.aircraftId);
      const latestAccomplishment = obl.evidence.find(e => e.verified);
      
      // Update temporal counters
      obl.temporalCounters = this.calculateTemporalCounters(
        obl.temporalCounters.effectiveDate,
        obl.threshold,
        obl.interval,
        aircraft,
        latestAccomplishment,
        obl.temporalCounters.cycleCount || 0
      );

      // Phase 6.2: Transition to REVIEW_REQUIRED if calculation detected data integrity fault or missing mandatory data
      if (obl.temporalCounters.calculationStatus === 'DATA_INTEGRITY_REVIEW' || obl.temporalCounters.calculationStatus === 'INSUFFICIENT_DATA') {
        if (obl.status !== 'REVIEW_REQUIRED' && obl.status !== 'COMPLIED' && obl.status !== 'SUPERSEDED' && obl.status !== 'CANCELLED') {
          this.transitionState({
            obligationId: obl.id,
            toStatus: 'REVIEW_REQUIRED',
            reason: obl.temporalCounters.controllingReason || 'Falha de integridade de dados ou dados regulatórios insuficientes detectados.',
            ruleResponsible: 'RULE_DUE_DATE_ENGINE_INTEGRITY_GUARD',
            actor: actor,
            skipEvidenceCheck: true
          });
          transitionsExecuted++;
        }
      }

      // Evaluate temporal transitions for active states
      if (obl.status === 'NOT_YET_EFFECTIVE') {
        if (obl.temporalCounters.effectiveDate && obl.temporalCounters.effectiveDate <= todayIso) {
          this.transitionState({
            obligationId: obl.id,
            toStatus: obl.temporalCounters.isOverdue ? 'OVERDUE' : (obl.temporalCounters.isDueSoon ? 'DUE_SOON' : 'OPEN'),
            reason: `Data efetiva (${obl.temporalCounters.effectiveDate}) atingida. Requisito em vigor.`,
            ruleResponsible: 'RULE_EFFECTIVE_DATE_REACHED',
            actor: actor
          });
          transitionsExecuted++;
        }
      } else if (obl.status === 'OPEN' || obl.status === 'NEXT_CYCLE_OPEN') {
        if (obl.temporalCounters.isOverdue) {
          this.transitionState({
            obligationId: obl.id,
            toStatus: 'OVERDUE',
            reason: 'Prazo limite mandatário ultrapassado (horas, ciclos ou calendário).',
            ruleResponsible: 'RULE_THRESHOLD_OVERDUE',
            actor: actor
          });
          transitionsExecuted++;
        } else if (obl.temporalCounters.isDueSoon) {
          this.transitionState({
            obligationId: obl.id,
            toStatus: 'DUE_SOON',
            reason: 'Prazo mandatário dentro da janela de alerta operacional.',
            ruleResponsible: 'RULE_THRESHOLD_DUE_SOON',
            actor: actor
          });
          transitionsExecuted++;
        }
      } else if (obl.status === 'DUE_SOON') {
        if (obl.temporalCounters.isOverdue) {
          this.transitionState({
            obligationId: obl.id,
            toStatus: 'OVERDUE',
            reason: 'Prazo de tolerância esgotado. Obrigação em atraso (OVERDUE).',
            ruleResponsible: 'RULE_THRESHOLD_OVERDUE',
            actor: actor
          });
          transitionsExecuted++;
        }
      }

      statusCounts[obl.status] = (statusCounts[obl.status] || 0) + 1;
    }

    return {
      evaluatedAt: new Date().toISOString(),
      totalObligations: obligations.length,
      statusCounts: statusCounts,
      transitionsExecuted: transitionsExecuted,
      overdueCount: statusCounts.OVERDUE || 0,
      dueSoonCount: statusCounts.DUE_SOON || 0,
      reviewRequiredCount: statusCounts.REVIEW_REQUIRED || 0,
      compliedCount: statusCounts.COMPLIED || 0
    };
  }

  /**
   * Queries obligations by flexible filters
   */
  public queryObligations(filter: ObligationQueryFilter = {}): ComplianceObligation[] {
    const state = camoDb.getState();
    let result = state.obligations || [];

    if (filter.complianceRequirementId) {
      result = result.filter(o => o.complianceRequirementId === filter.complianceRequirementId);
    }
    if (filter.aircraftId) {
      result = result.filter(o => o.targetEntity.aircraftId === filter.aircraftId);
    }
    if (filter.aircraftRegistration) {
      result = result.filter(o => o.targetEntity.aircraftRegistration === filter.aircraftRegistration);
    }
    if (filter.adNumber) {
      result = result.filter(o => o.adNumber.toLowerCase().includes(filter.adNumber!.toLowerCase()));
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        result = result.filter(o => filter.status!.includes(o.status));
      } else {
        result = result.filter(o => o.status === filter.status);
      }
    }
    if (filter.isOverdue !== undefined) {
      result = result.filter(o => o.temporalCounters.isOverdue === filter.isOverdue || o.status === 'OVERDUE');
    }
    if (filter.isDueSoon !== undefined) {
      result = result.filter(o => o.temporalCounters.isDueSoon === filter.isDueSoon || o.status === 'DUE_SOON');
    }
    if (filter.requiresHumanReview !== undefined) {
      result = result.filter(o => o.reviewState.requiresHumanReview === filter.requiresHumanReview || o.status === 'REVIEW_REQUIRED');
    }
    if (filter.isRepetitive !== undefined) {
      result = result.filter(o => Boolean(o.interval?.isRepetitive) === filter.isRepetitive);
    }
    if (filter.isSuperseded !== undefined) {
      result = result.filter(o => Boolean(o.supersedence?.isSuperseded) === filter.isSuperseded || o.status === 'SUPERSEDED');
    }

    return result;
  }
}

export const complianceObligationService = ComplianceObligationService.getInstance();
