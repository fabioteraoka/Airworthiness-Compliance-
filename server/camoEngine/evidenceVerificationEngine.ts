/**
 * CAMO PHASE 6.3 — EVIDENCE MANAGEMENT & VERIFICATION ENGINE
 * Deterministic, auditable, and fail-safe evidence validation engine.
 * 
 * Fundamental Principle:
 * EVIDENCE ATTACHED ≠ EVIDENCE VALID ≠ OBLIGATION COMPLIED
 */

import crypto from 'crypto';
import { 
  Evidence, 
  EvidenceType, 
  EvidenceVerificationStatus, 
  EvidenceReviewReasonCode, 
  EvidenceAuditTrailEntry,
  ComplianceObligation,
  ComplianceRequirement,
  MandatedAction,
  Aircraft,
  ObligationEvidenceLink
} from '../../src/types';
import { camoDb } from '../dataStore';
import { dueDateThresholdEngine } from './dueDateThresholdEngine';

export const EVIDENCE_ENGINE_VERSION = '6.3.0';

export interface EvidenceValidationRequest {
  evidence: Evidence;
  obligation: ComplianceObligation;
  requirement?: ComplianceRequirement;
  mandatedAction?: MandatedAction;
  aircraft?: Aircraft;
  componentInstallation?: any;
  evaluator?: string;
  evaluatorRole?: string;
}

export interface EvidenceValidationResult {
  evidenceId: string;
  obligationId: string;
  status: EvidenceVerificationStatus;
  isValid: boolean;
  isInsufficient: boolean;
  isInvalid: boolean;
  isOverdueCompliance: boolean;
  reasons: string[];
  structuredReasons: EvidenceReviewReasonCode[];
  verificationTimestamp: string;
  verificationHash: string;
  inputHash: string;
  ruleResponsible: string;
  requiresHumanReview: boolean;
  probatoryWeight: number; // 0 (none) to 100 (full proof)
  details: {
    entityMatch: boolean;
    requirementMatch: boolean;
    temporalMatch: boolean;
    actionSufficiencyMatch: boolean;
    documentIntegrityMatch: boolean;
    terminatingActionProof: boolean;
  };
}

export interface ProbatorySetEvaluationResult {
  obligationId: string;
  canTransitionToComplied: boolean;
  resultingStatus: 'COMPLIED' | 'OPEN' | 'REVIEW_REQUIRED' | 'OVERDUE' | 'DUE_SOON';
  isOverdueCompliance: boolean;
  validEvidences: Evidence[];
  insufficientEvidences: Evidence[];
  invalidEvidences: Evidence[];
  conflictingEvidences: Array<{ evA: string; evB: string; reason: string }>;
  reasons: string[];
  structuredReasons: EvidenceReviewReasonCode[];
  latestValidAccomplishment?: {
    date?: string;
    fh?: number;
    fc?: number;
    evidenceId: string;
    sourceRef: string;
  };
  terminatingActionProven: boolean;
  evaluationHash: string;
}

export class EvidenceVerificationEngine {
  private static instance: EvidenceVerificationEngine;

  public static getInstance(): EvidenceVerificationEngine {
    if (!EvidenceVerificationEngine.instance) {
      EvidenceVerificationEngine.instance = new EvidenceVerificationEngine();
    }
    return EvidenceVerificationEngine.instance;
  }

  /**
   * Generates deterministic SHA-256 hash for document content or metadata
   */
  public calculateDocumentHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generates a deterministic input hash for reproducibility and audit
   */
  public calculateInputHash(input: any): string {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Validates state machine transition legitimacy
   */
  public isValidStateTransition(
    currentStatus: EvidenceVerificationStatus, 
    targetStatus: EvidenceVerificationStatus
  ): { allowed: boolean; reason?: string } {
    if (currentStatus === targetStatus) {
      return { allowed: true }; // Idempotent
    }

    const transitions: Record<EvidenceVerificationStatus, EvidenceVerificationStatus[]> = {
      SUBMITTED: ['RECEIVED', 'PENDING_VALIDATION', 'INVALID', 'REVOKED'],
      RECEIVED: ['PENDING_VALIDATION', 'INVALID', 'REVOKED'],
      PENDING_VALIDATION: ['VALID', 'INVALID', 'INSUFFICIENT', 'REVIEW_REQUIRED', 'REVOKED'],
      VALID: ['SUPERSEDED', 'REVOKED', 'REVIEW_REQUIRED'],
      INVALID: ['REVIEW_REQUIRED'], // Can only be challenged via review
      INSUFFICIENT: ['PENDING_VALIDATION', 'REVIEW_REQUIRED', 'REVOKED'],
      REVIEW_REQUIRED: ['PENDING_VALIDATION', 'VALID', 'INVALID', 'INSUFFICIENT', 'REVOKED'],
      SUPERSEDED: ['REVOKED'],
      REVOKED: [] // Terminal
    };

    const allowedTargets = transitions[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return {
        allowed: false,
        reason: `ILLEGAL_TRANSITION: Cannot transition evidence from ${currentStatus} to ${targetStatus}.`
      };
    }

    return { allowed: true };
  }

  /**
   * Primary Deterministic Verification Method for a single Evidence
   */
  public verifyEvidence(request: EvidenceValidationRequest): EvidenceValidationResult {
    const { 
      evidence, 
      obligation, 
      requirement, 
      mandatedAction, 
      aircraft,
      evaluator = 'EvidenceVerificationEngine v6.3.0',
      evaluatorRole = 'SYSTEM_VERIFIER'
    } = request;

    const reasons: string[] = [];
    const structuredReasons: EvidenceReviewReasonCode[] = [];
    const timestamp = new Date().toISOString();

    let entityMatch = true;
    let requirementMatch = true;
    let temporalMatch = true;
    let actionSufficiencyMatch = true;
    let documentIntegrityMatch = true;
    let terminatingActionProof = false;
    let isOverdueCompliance = false;

    // 1. ENTITY IDENTITY VALIDATION
    // Target entity check
    const oblTarget = obligation.targetEntity;
    const evEntityId = evidence.entityId || evidence.targetEntity?.entityId;
    const evReg = evidence.targetEntity?.registration;
    const evMsn = (evidence.metadata?.msn as string) || (evidence.targetEntity as any)?.msn;
    const evSn = evidence.targetEntity?.serialNumber || (evidence.metadata?.serialNumber as string);

    if (oblTarget) {
      // Aircraft level check
      if (oblTarget.entityType === 'AIRCRAFT') {
        const expectedId = oblTarget.entityId || oblTarget.aircraftId;
        const expectedReg = oblTarget.aircraftRegistration || aircraft?.registration;
        const expectedSn = oblTarget.serialNumber || oblTarget.aircraftMsn || (aircraft as any)?.serialNumber || (aircraft as any)?.msn;

        if (evEntityId && expectedId && evEntityId !== expectedId && evEntityId !== expectedReg) {
          entityMatch = false;
          reasons.push(`Divergência de entidade: Evidência emitida para ${evEntityId}, mas obrigação pertence a ${expectedId} (${expectedReg}).`);
          structuredReasons.push('ENTITY_MISMATCH');
          structuredReasons.push('WRONG_ENTITY');
        } else if (evReg && expectedReg && evReg.toUpperCase() !== expectedReg.toUpperCase()) {
          entityMatch = false;
          reasons.push(`Divergência de matrícula: Evidência emitida para ${evReg}, mas obrigação pertence a ${expectedReg}.`);
          structuredReasons.push('ENTITY_MISMATCH');
          structuredReasons.push('WRONG_ENTITY');
        } else if (evSn && expectedSn && evSn !== expectedSn) {
          entityMatch = false;
          reasons.push(`Divergência de S/N/MSN da aeronave: Evidência emitida para ${evSn}, mas obrigação pertence ao S/N ${expectedSn}.`);
          structuredReasons.push('ENTITY_MISMATCH');
          structuredReasons.push('INCORRECT_SERIAL_NUMBER');
          structuredReasons.push('WRONG_ENTITY');
        }
      } else if (oblTarget.entityType === 'ENGINE' || oblTarget.entityType === 'COMPONENT') {
        const expectedSn = oblTarget.serialNumber;
        const expectedPn = oblTarget.partNumber;

        if (expectedSn && evSn && expectedSn !== evSn) {
          entityMatch = false;
          reasons.push(`Divergência de S/N de componente: Evidência para S/N ${evSn}, esperado S/N ${expectedSn}.`);
          structuredReasons.push('ENTITY_MISMATCH');
          structuredReasons.push('INCORRECT_SERIAL_NUMBER');
          structuredReasons.push('WRONG_ENTITY');
        }
        if (expectedPn && evidence.targetEntity?.partNumber && expectedPn !== evidence.targetEntity.partNumber) {
          entityMatch = false;
          reasons.push(`Divergência de P/N: Evidência para P/N ${evidence.targetEntity.partNumber}, esperado P/N ${expectedPn}.`);
          structuredReasons.push('ENTITY_MISMATCH');
          structuredReasons.push('INCORRECT_PART_NUMBER');
          structuredReasons.push('WRONG_ENTITY');
        }
      }
    }

    // 2. REQUIREMENT / AD VALIDATION
    const evReqId = evidence.requirementId || evidence.complianceRequirementId;
    const evAdNumber = evidence.metadata?.adNumber as string;
    const expectedReqId = obligation.complianceRequirementId || requirement?.id;
    const expectedAdNumber = obligation.adNumber || requirement?.sourceNumber;

    if (evReqId && expectedReqId && evReqId !== expectedReqId) {
      requirementMatch = false;
      reasons.push(`Divergência de requisito: Evidência vinculada ao requisito ${evReqId}, esperado ${expectedReqId}.`);
      structuredReasons.push('REQUIREMENT_MISMATCH');
    }
    if (evAdNumber && expectedAdNumber && evAdNumber !== expectedAdNumber) {
      requirementMatch = false;
      reasons.push(`Divergência de AD: Evidência cita AD ${evAdNumber}, esperado ${expectedAdNumber}.`);
      structuredReasons.push('REQUIREMENT_MISMATCH');
    }

    // 3. TEMPORAL VALIDATION
    const eventDate = evidence.eventDate || evidence.date;
    const eventFH = evidence.eventFlightHours;
    const eventFC = evidence.eventFlightCycles;
    const todayIso = timestamp.split('T')[0];

    // Impossible date check (future date relative to today)
    if (eventDate) {
      if (eventDate > todayIso) {
        temporalMatch = false;
        reasons.push(`Data do evento no futuro (${eventDate}), inconsistente com execução física válida.`);
        structuredReasons.push('FUTURE_DATE');
        structuredReasons.push('TEMPORAL_INCONSISTENCY');
      }
    } else {
      reasons.push('Data de cumprimento não informada na evidência.');
      structuredReasons.push('MISSING_EVENT_DATE');
    }

    // Prior to effective date check (Aviation Principle: Prior Accomplishment / UAA is valid)
    const effectiveDate = obligation.temporalCounters?.effectiveDate || requirement?.effectiveDate;
    if (effectiveDate && eventDate && eventDate < effectiveDate) {
      reasons.push(`Cumprimento prévio (Prior Accomplishment / UAA): executado em ${eventDate}, anterior à data de efetividade mandatória (${effectiveDate}).`);
    }

    // Impossible date check: Prior to aircraft manufacture date
    if (aircraft?.manufactureDate && eventDate && eventDate < aircraft.manufactureDate) {
      temporalMatch = false;
      reasons.push(`Data do evento (${eventDate}) é anterior à fabricação da célula (${aircraft.manufactureDate}). Inconsistência física.`);
      structuredReasons.push('TEMPORAL_INCONSISTENCY');
    }

    // Counter validity (negative checks)
    if (eventFH !== undefined && eventFH < 0) {
      temporalMatch = false;
      reasons.push(`Horímetro negativo informado (${eventFH} FH), fisicamente impossível.`);
      structuredReasons.push('TEMPORAL_INCONSISTENCY');
    }
    if (eventFC !== undefined && eventFC < 0) {
      temporalMatch = false;
      reasons.push(`Ciclos negativos informados (${eventFC} FC), fisicamente impossível.`);
      structuredReasons.push('TEMPORAL_INCONSISTENCY');
    }

    // Rollback / Impossible counters compared to current aircraft counters
    if (aircraft) {
      if (eventFH !== undefined && aircraft.totalFlightHours !== undefined) {
        // Event FH cannot exceed current airframe FH by more than tolerance
        if (eventFH > aircraft.totalFlightHours + 5) {
          temporalMatch = false;
          reasons.push(`Horímetro da evidência (${eventFH} FH) excede horímetro atual da célula (${aircraft.totalFlightHours} FH). Inconsistência física.`);
          structuredReasons.push('COUNTER_REGRESSION');
          structuredReasons.push('TEMPORAL_INCONSISTENCY');
        }
      }
      if (eventFC !== undefined && aircraft.totalCycles !== undefined) {
        if (eventFC > aircraft.totalCycles + 5) {
          temporalMatch = false;
          reasons.push(`Ciclos da evidência (${eventFC} FC) excedem total da célula (${aircraft.totalCycles} FC).`);
          structuredReasons.push('COUNTER_REGRESSION');
          structuredReasons.push('TEMPORAL_INCONSISTENCY');
        }
      }
    }

    // Rollback against prior compliance event (lastComplianceFH / lastComplianceFC)
    const priorCompFH = obligation.temporalCounters?.lastComplianceFH;
    if (priorCompFH !== undefined && eventFH !== undefined && eventFH < priorCompFH) {
      temporalMatch = false;
      reasons.push(`Rollback temporal detectado: horímetro da evidência (${eventFH} FH) inferior ao cumprimento anterior (${priorCompFH} FH).`);
      structuredReasons.push('FH_COUNTER_ROLLBACK');
      structuredReasons.push('COUNTER_REGRESSION');
      structuredReasons.push('TEMPORAL_INCONSISTENCY');
    }
    const priorCompFC = obligation.temporalCounters?.lastComplianceFC;
    if (priorCompFC !== undefined && eventFC !== undefined && eventFC < priorCompFC) {
      temporalMatch = false;
      reasons.push(`Rollback temporal detectado: ciclos da evidência (${eventFC} FC) inferiores ao cumprimento anterior (${priorCompFC} FC).`);
      structuredReasons.push('FC_COUNTER_ROLLBACK');
      structuredReasons.push('COUNTER_REGRESSION');
      structuredReasons.push('TEMPORAL_INCONSISTENCY');
    }

    // Component installation temporal verification
    const targetCompId = obligation.targetEntity?.entityType === 'COMPONENT' ? obligation.targetEntity.entityId : undefined;
    const targetCompPn = obligation.targetEntity?.entityType === 'COMPONENT' ? obligation.targetEntity.partNumber : undefined;
    const targetCompSn = obligation.targetEntity?.entityType === 'COMPONENT' ? obligation.targetEntity.serialNumber : undefined;

    let compInst = request.componentInstallation;
    if (!compInst && (targetCompId || targetCompPn || targetCompSn)) {
      const dbState = camoDb.getState();
      compInst = dbState.installations.find(inst => 
        (targetCompId && inst.componentId === targetCompId) ||
        (inst.aircraftId === obligation.aircraftId && (
          (targetCompSn && inst.component?.serialNumber === targetCompSn) ||
          (targetCompPn && inst.component?.partNumber === targetCompPn)
        ))
      );
    }

    if (compInst && eventDate) {
      // 1. Corrupted installation dates (removal before installation)
      if (compInst.installationDate && compInst.removalDate && compInst.removalDate < compInst.installationDate) {
        temporalMatch = false;
        reasons.push(`Inconsistência física: histórico de instalação corrompido com data de remoção (${compInst.removalDate}) anterior à instalação (${compInst.installationDate}).`);
        structuredReasons.push('TEMPORAL_INCONSISTENCY');
        structuredReasons.push('DATA_INTEGRITY_REVIEW');
      }

      // 2. Execution date prior to component installation
      if (compInst.installationDate && eventDate < compInst.installationDate) {
        temporalMatch = false;
        reasons.push(`Data do cumprimento (${eventDate}) é anterior à data de instalação do componente na aeronave (${compInst.installationDate}). Inconsistência física.`);
        structuredReasons.push('TEMPORAL_INCONSISTENCY');
        structuredReasons.push('EXECUTION_PRIOR_TO_INSTALLATION');
      }

      // 3. Execution date posterior to component removal
      if (compInst.removalDate && eventDate > compInst.removalDate) {
        temporalMatch = false;
        reasons.push(`Data do cumprimento (${eventDate}) é posterior à data de remoção do componente da aeronave (${compInst.removalDate}). Inconsistência física.`);
        structuredReasons.push('TEMPORAL_INCONSISTENCY');
        structuredReasons.push('EXECUTION_AFTER_REMOVAL');
      }
    }

    // Check against obligation due limits (Overdue vs On-time)
    const counters = obligation.temporalCounters;
    const effDueDate = counters?.dueDate || counters?.nextDueDate || counters?.complianceDueDate;
    const effDueFH = counters?.dueFH !== undefined ? counters.dueFH : counters?.nextDueFH;
    const effDueFC = counters?.dueFC !== undefined ? counters.dueFC : counters?.nextDueFC;

    if (counters) {
      if (effDueDate && eventDate && eventDate > effDueDate) {
        isOverdueCompliance = true;
        reasons.push(`Cumprimento realizado em ${eventDate}, após o limite de calendário regulatório (${effDueDate}). Cumprimento em atraso.`);
        structuredReasons.push('OVERDUE_COMPLIANCE');
      }
      if (effDueFH !== undefined && eventFH !== undefined && eventFH > effDueFH) {
        isOverdueCompliance = true;
        reasons.push(`Cumprimento realizado a ${eventFH} FH, após o limite regulatório (${effDueFH} FH). Cumprimento em atraso.`);
        structuredReasons.push('OVERDUE_COMPLIANCE');
      }
      if (effDueFC !== undefined && eventFC !== undefined && eventFC > effDueFC) {
        isOverdueCompliance = true;
        reasons.push(`Cumprimento realizado a ${eventFC} FC, após o limite regulatório (${effDueFC} FC). Cumprimento em atraso.`);
        structuredReasons.push('OVERDUE_COMPLIANCE');
      }

      // If obligation requires FH and evidence has none
      if (effDueFH !== undefined && eventFH === undefined && counters.controllingLimit === 'FLIGHT_HOURS') {
        reasons.push(`Obrigação controlada por Horas de Voo (Due FH ${effDueFH}), mas a evidência não contém registro de FH do evento.`);
        structuredReasons.push('MISSING_FH');
      }
      // If obligation requires FC and evidence has none
      if (effDueFC !== undefined && eventFC === undefined && counters.controllingLimit === 'FLIGHT_CYCLES') {
        reasons.push(`Obrigação controlada por Ciclos (Due FC ${effDueFC}), mas a evidência não contém registro de FC do evento.`);
        structuredReasons.push('MISSING_FC');
      }
    }

    // 4. ACTION NATURE & SUFFICIENCY VALIDATION
    const evType = evidence.evidenceType || evidence.type || 'OTHER';
    let actionType = mandatedAction?.actionType || (obligation as any)?.mandatedActionType || (obligation as any)?.actionType;
    if (!actionType) {
      const stateReqs = camoDb.getState().requirements || [];
      const req = requirement || stateReqs.find(r => r.id === (obligation.complianceRequirementId || (obligation as any).requirementId));
      if (req && req.mandatedActions) {
        const matchedAct = req.mandatedActions.find(a => a.id === obligation.mandatedActionId);
        if (matchedAct) {
          actionType = matchedAct.actionType;
        }
      }
    }
    if (!actionType && obligation.terminatingAction?.hasTerminatingAction) {
      actionType = 'HARDWARE_MODIFICATION';
    }
    if (!actionType) {
      actionType = 'ONE_TIME_INSPECTION';
    }
    const descLower = (evidence.description || '').toLowerCase();

    // Document reference / identifier presence check
    const hasDocRef = Boolean((evidence.documentReference && evidence.documentReference.trim()) || (evidence.sourceReference && evidence.sourceReference.trim()));
    if (!hasDocRef) {
      actionSufficiencyMatch = false;
      reasons.push('Identificador ou número de referência do documento comprobatório ausente.');
      structuredReasons.push('MISSING_IDENTIFIER');
      structuredReasons.push('INSUFFICIENT_DOCUMENT');
    }

    // Mapping action types to accepted evidence types
    const actTypeStr = (actionType as string);
    if (actTypeStr === 'ONE_TIME_INSPECTION' || actTypeStr === 'REPETITIVE_INSPECTION' || actTypeStr === 'WIRING_INTEGRITY_CHECK' || actTypeStr === 'FUNCTIONAL_TEST' || actTypeStr === 'INSPECTION') {
      const inspectionTypes: (EvidenceType | string)[] = [
        'INSPECTION_RECORD', 'WORK_ORDER', 'TASK_CARD', 'AIRCRAFT_LOGBOOK', 
        'MAINTENANCE_RECORD', 'TEST_RESULT', 'MEASUREMENT', 'TECH_LOG', 'MANUAL_INSPECTION',
        'LOGBOOK_ENTRY', 'CERTIFICATE_OF_RELEASE_TO_SERVICE', 'CRS', 'AUTHORIZED_RELEASE', 'CERTIFICATE', 'FORM'
      ];
      if (obligation.terminatingAction?.hasTerminatingAction || mandatedAction?.isTerminatingAction) {
        inspectionTypes.push('SERVICE_BULLETIN_RECORD', 'SB_ACCOMPLISHMENT', 'MODIFICATION_RECORD', 'MOD_RECORD');
      }
      if (evType === 'PHOTO' && !descLower.includes('inspeção') && !descLower.includes('inspection')) {
        actionSufficiencyMatch = false;
        reasons.push('Evidência do tipo PHOTO isolada é insuficiente para comprovar inspeção técnica requerida.');
        structuredReasons.push('INSUFFICIENT_DOCUMENT');
      } else if (!inspectionTypes.includes(evType as any)) {
        actionSufficiencyMatch = false;
        reasons.push(`Tipo de evidência ${evType} incompatível com ação mandatória de inspeção ou teste funcional.`);
        structuredReasons.push('AMBIGUOUS_ACTION');
      }
    } else if (actTypeStr === 'HARDWARE_REPLACEMENT' || actTypeStr === 'HARDWARE_MODIFICATION' || actTypeStr === 'REPLACEMENT' || actTypeStr === 'COMPONENT_REPLACEMENT' || actTypeStr === 'MODIFICATION') {
      const replacementTypes: (EvidenceType | string)[] = [
        'COMPONENT_CHANGE_RECORD', 'COMPONENT_INSTALLATION_RECORD', 'AUTHORIZED_RELEASE',
        'COMPONENT_TAG_8130', 'EASA_FORM_ONE', 'WORK_ORDER', 'MAINTENANCE_RECORD', 'INSTALLATION_RECORD',
        'AUTHORIZED_RELEASE_CERTIFICATE', 'MOD_RECORD', 'MODIFICATION_RECORD',
        'CERTIFICATE_OF_RELEASE_TO_SERVICE', 'CRS', 'LOGBOOK_ENTRY', 'AIRCRAFT_LOGBOOK', 'FORM', 'CERTIFICATE'
      ];
      if (!replacementTypes.includes(evType as any)) {
        actionSufficiencyMatch = false;
        reasons.push(`Tipo de evidência ${evType} insuficiente para demonstrar substituição/modificação de componente.`);
        structuredReasons.push('AMBIGUOUS_ACTION');
        structuredReasons.push('INSUFFICIENT_DOCUMENT');
      } else if (evType === 'INSPECTION_RECORD' && !descLower.includes('substituição') && !descLower.includes('installed')) {
        actionSufficiencyMatch = false;
        reasons.push('Registro exclusivo de inspeção não comprova a substituição mandatória de componente.');
        structuredReasons.push('AMBIGUOUS_ACTION');
        structuredReasons.push('INSUFFICIENT_DOCUMENT');
      }
    } else if (actionType === 'OPERATIONAL_PROCEDURE' || actionType === 'AFM_REVISION' || actionType === 'MEL_OPERATIONAL_PROVISION' || actionType === 'DOCUMENT_REVIEW') {
      // Manual revision, AFM update
      const operationalTypes: EvidenceType[] = [
        'OPERATOR_RECORD', 'FORM', 'CERTIFICATE', 'WORK_ORDER', 'USER_DECLARATION', 'MAINTENANCE_RECORD'
      ];
      if (!operationalTypes.includes(evType as any) && !descLower.includes('afm') && !descLower.includes('manual') && !descLower.includes('procedimento')) {
        actionSufficiencyMatch = false;
        reasons.push(`Tipo de evidência ${evType} não demonstra revisão de procedimento operacional.`);
        structuredReasons.push('AMBIGUOUS_ACTION');
      }
    }

    // 5. TERMINATING ACTION VERIFICATION
    if (obligation.terminatingAction?.hasTerminatingAction || mandatedAction?.isTerminatingAction) {
      const isSbRecord = evType === 'SERVICE_BULLETIN_RECORD' || evType === 'SB_ACCOMPLISHMENT';
      const mentionsSb = descLower.includes('terminat') || descLower.includes('sb') || descLower.includes('service bulletin');
      if (isSbRecord || mentionsSb) {
        terminatingActionProof = true;
      }
    }

    // 6. DOCUMENT INTEGRITY & HASH VALIDATION
    if (evidence.documentHash && evidence.uploadedFileData) {
      const calculatedHash = this.calculateDocumentHash(evidence.uploadedFileData);
      if (calculatedHash !== evidence.documentHash) {
        documentIntegrityMatch = false;
        reasons.push(`Falha de integridade criptográfica: Hash do documento (${calculatedHash}) diverge do registrado (${evidence.documentHash}).`);
        structuredReasons.push('TAMPERING_SUSPECTED');
        structuredReasons.push('DOCUMENT_INTEGRITY_FAILURE');
      }
    }

    // If previously verified and hash tampered
    if (evidence.verificationHash && evidence.verificationStatus === 'VALID') {
      // Re-verify previous verification state hash
      const expectedOldHash = this.calculateInputHash({
        id: evidence.id,
        obligationId: evidence.obligationId,
        documentHash: evidence.documentHash,
        eventDate: eventDate,
        eventFH: eventFH
      });
      if (evidence.metadata?.expectedOldHash && evidence.metadata.expectedOldHash !== expectedOldHash) {
        documentIntegrityMatch = false;
        reasons.push('Evidência previamente validada sofreu alteração retrospectiva não autorizada.');
        structuredReasons.push('DOCUMENT_INTEGRITY_FAILURE');
      }
    }

    // DETERMINISTIC DECISION LOGIC
    let status: EvidenceVerificationStatus;
    let isValid = false;
    let isInsufficient = false;
    let isInvalid = false;
    let requiresHumanReview = false;
    let probatoryWeight = 0;
    let ruleResponsible = 'RULE_EVIDENCE_VALIDATION_DETERMINISTIC';

    // Critical Invariant: If entity, requirement, or document integrity fails -> INVALID
    if (!entityMatch || !requirementMatch || !documentIntegrityMatch || !temporalMatch) {
      status = 'INVALID';
      isInvalid = true;
      probatoryWeight = 0;
      ruleResponsible = !entityMatch ? 'RULE_ENTITY_MISMATCH_INVALID' :
                        !requirementMatch ? 'RULE_REQUIREMENT_MISMATCH_INVALID' :
                        !documentIntegrityMatch ? 'RULE_DOCUMENT_TAMPER_INVALID' : 'RULE_TEMPORAL_CONTRADICTION_INVALID';
    } 
    // If data is missing or ambiguous -> INSUFFICIENT / REVIEW_REQUIRED
    else if (!actionSufficiencyMatch || structuredReasons.includes('MISSING_EVENT_DATE') || structuredReasons.includes('MISSING_FH') || structuredReasons.includes('MISSING_FC')) {
      status = 'INSUFFICIENT';
      isInsufficient = true;
      requiresHumanReview = true;
      probatoryWeight = 30;
      ruleResponsible = 'RULE_EVIDENCE_DATA_INSUFFICIENT';
    } 
    // Otherwise: VALID
    else {
      status = 'VALID';
      isValid = true;
      probatoryWeight = 100;
      ruleResponsible = isOverdueCompliance ? 'RULE_EVIDENCE_VALID_OVERDUE_COMPLIANCE' : 'RULE_EVIDENCE_VALID_ON_TIME';
      if (reasons.length === 0) {
        reasons.push(`Evidência técnica documental verificada com sucesso (${evidence.documentReference || evidence.sourceReference}).`);
      }
    }

    const inputHash = this.calculateInputHash({
      evidenceId: evidence.id,
      obligationId: obligation.id,
      eventDate,
      eventFH,
      eventFC,
      entityId: evEntityId,
      documentHash: evidence.documentHash
    });

    const verificationHash = this.calculateInputHash({
      inputHash,
      status,
      isValid,
      ruleResponsible
    });

    return {
      evidenceId: evidence.id,
      obligationId: obligation.id,
      status,
      isValid,
      isInsufficient,
      isInvalid,
      isOverdueCompliance,
      reasons,
      structuredReasons,
      verificationTimestamp: timestamp,
      verificationHash,
      inputHash,
      ruleResponsible,
      requiresHumanReview,
      probatoryWeight,
      details: {
        entityMatch,
        requirementMatch,
        temporalMatch,
        actionSufficiencyMatch,
        documentIntegrityMatch,
        terminatingActionProof
      }
    };
  }

  /**
   * Evaluates the full Probatory Set of an obligation (Multi-evidence & Conflict Detection)
   */
  public evaluateObligationProbatorySet(
    obligation: ComplianceObligation,
    evidences: Evidence[],
    aircraft?: Aircraft
  ): ProbatorySetEvaluationResult {
    const reasons: string[] = [];
    const structuredReasons: EvidenceReviewReasonCode[] = [];
    const conflictingEvidences: Array<{ evA: string; evB: string; reason: string }> = [];

    const validEvidences: Evidence[] = [];
    const insufficientEvidences: Evidence[] = [];
    const invalidEvidences: Evidence[] = [];

    const stateReqs = camoDb.getState().requirements || [];
    const resolvedReq = stateReqs.find(r => r.id === (obligation.complianceRequirementId || (obligation as any).requirementId));
    const resolvedMandatedAction = resolvedReq?.mandatedActions?.find(a => a.id === obligation.mandatedActionId);

    // Verify each evidence in probatory set
    for (const ev of evidences) {
      if (ev.verificationStatus === 'REVOKED') {
        invalidEvidences.push(ev);
        continue;
      }
      if (ev.verificationStatus === 'INVALID') {
        invalidEvidences.push(ev);
        continue;
      }
      if (ev.verificationStatus === 'INSUFFICIENT') {
        insufficientEvidences.push(ev);
        continue;
      }
      if (ev.verificationStatus === 'VALID' && ev.verified) {
        validEvidences.push(ev);
        continue;
      }

      const result = this.verifyEvidence({
        evidence: ev,
        obligation,
        requirement: resolvedReq,
        mandatedAction: resolvedMandatedAction,
        aircraft
      });

      if (result.status === 'VALID') {
        validEvidences.push(ev);
      } else if (result.status === 'INSUFFICIENT' || result.status === 'REVIEW_REQUIRED') {
        insufficientEvidences.push(ev);
      } else {
        invalidEvidences.push(ev);
      }
    }

    // CONFLICT DETECTION ACROSS VALID EVIDENCES
    // Case 1: Conflicting event dates and FH (e.g. chronological regression)
    for (let i = 0; i < validEvidences.length; i++) {
      for (let j = i + 1; j < validEvidences.length; j++) {
        const a = validEvidences[i];
        const b = validEvidences[j];

        const dateA = a.eventDate || a.date;
        const dateB = b.eventDate || b.date;
        const fhA = a.eventFlightHours;
        const fhB = b.eventFlightHours;

        if (dateA && dateB && fhA !== undefined && fhB !== undefined) {
          // If dateA > dateB but fhA < fhB -> regression anomaly!
          if (dateA > dateB && fhA < fhB) {
            const msg = `Conflito de horímetro temporal: Evidência ${a.documentReference} em ${dateA} registra ${fhA} FH, mas evidência ${b.documentReference} em ${dateB} registra ${fhB} FH.`;
            conflictingEvidences.push({ evA: a.id, evB: b.id, reason: msg });
            reasons.push(msg);
            structuredReasons.push('CONFLICTING_RECORDS');
          } else if (dateB > dateA && fhB < fhA) {
            const msg = `Conflito de horímetro temporal: Evidência ${b.documentReference} em ${dateB} registra ${fhB} FH, mas evidência ${a.documentReference} em ${dateA} registra ${fhA} FH.`;
            conflictingEvidences.push({ evA: a.id, evB: b.id, reason: msg });
            reasons.push(msg);
            structuredReasons.push('CONFLICTING_RECORDS');
          }
        }
      }
    }

    let terminatingActionProven = false;
    if (obligation.terminatingAction?.hasTerminatingAction) {
      terminatingActionProven = validEvidences.some(e => {
        const desc = (e.description || '').toLowerCase();
        return e.evidenceType === 'SERVICE_BULLETIN_RECORD' || 
               e.evidenceType === 'SB_ACCOMPLISHMENT' ||
               desc.includes('terminating') || 
               desc.includes('sb ');
      });
    }

    // SORT VALID EVIDENCES CHRONOLOGICALLY TO FIND LATEST ACCOMPLISHMENT
    validEvidences.sort((a, b) => {
      const fhDiff = (b.eventFlightHours || 0) - (a.eventFlightHours || 0);
      if (fhDiff !== 0) return fhDiff;
      const dateA = a.eventDate || a.date || '';
      const dateB = b.eventDate || b.date || '';
      return dateB.localeCompare(dateA);
    });

    const latest = validEvidences[0];
    const latestValidAccomplishment = latest ? {
      date: latest.eventDate || latest.date,
      fh: latest.eventFlightHours,
      fc: latest.eventFlightCycles,
      evidenceId: latest.id,
      sourceRef: latest.documentReference || latest.sourceReference || latest.id
    } : undefined;

    // Check if latest accomplishment was accomplished past due
    let isOverdueCompliance = false;
    if (latest && obligation.temporalCounters) {
      const counters = obligation.temporalCounters;
      const lDate = latest.eventDate || latest.date;
      const effDueDate = counters.dueDate || counters.nextDueDate || counters.complianceDueDate;
      const effDueFH = counters.dueFH !== undefined ? counters.dueFH : counters.nextDueFH;
      if (effDueDate && lDate && lDate > effDueDate) {
        isOverdueCompliance = true;
      }
      if (effDueFH !== undefined && latest.eventFlightHours !== undefined && latest.eventFlightHours > effDueFH) {
        isOverdueCompliance = true;
      }
    }

    // DECISION ON OBLIGATION STATUS
    let canTransitionToComplied = false;
    let resultingStatus: 'COMPLIED' | 'OPEN' | 'REVIEW_REQUIRED' | 'OVERDUE' | 'DUE_SOON';

    if (conflictingEvidences.length > 0) {
      canTransitionToComplied = false;
      resultingStatus = 'REVIEW_REQUIRED';
      reasons.push('Conjunto probatório contém evidências conflitantes não conciliadas.');
    } else if (validEvidences.length > 0) {
      canTransitionToComplied = true;
      resultingStatus = 'COMPLIED';
      reasons.push(`Obrigação atendida por ${validEvidences.length} evidência(s) técnica(s) válida(s).`);
    } else if (insufficientEvidences.length > 0) {
      canTransitionToComplied = false;
      resultingStatus = 'REVIEW_REQUIRED';
      reasons.push('Evidências anexadas são insuficientes para demonstrar cumprimento. Revisão necessária.');
    } else {
      canTransitionToComplied = false;
      if (obligation.temporalCounters?.isOverdue) {
        resultingStatus = 'OVERDUE';
      } else if (obligation.temporalCounters?.isDueSoon) {
        resultingStatus = 'DUE_SOON';
      } else {
        resultingStatus = 'OPEN';
      }
      reasons.push('Nenhuma evidência válida anexada para demonstrar cumprimento.');
    }

    const evaluationHash = this.calculateInputHash({
      obligationId: obligation.id,
      validCount: validEvidences.length,
      invalidCount: invalidEvidences.length,
      insufficientCount: insufficientEvidences.length,
      canTransitionToComplied,
      resultingStatus
    });

    return {
      obligationId: obligation.id,
      canTransitionToComplied,
      resultingStatus,
      isOverdueCompliance,
      validEvidences,
      insufficientEvidences,
      invalidEvidences,
      conflictingEvidences,
      reasons,
      structuredReasons,
      latestValidAccomplishment,
      terminatingActionProven,
      evaluationHash
    };
  }
}

export const evidenceVerificationEngine = EvidenceVerificationEngine.getInstance();
