/**
 * CAMO PHASE 6.4 — COMPLIANCE STATUS & FLEET AIRWORTHINESS CONTROL ENGINE
 * 
 * Deterministic, audit-ready consolidation layer for compliance status across:
 * 1. Obligations (Level 1)
 * 2. Requirements / ADs (Level 2)
 * 3. Aircraft Airworthiness (Level 3)
 * 4. Fleet Airworthiness (Level 4)
 * 
 * Key Principles:
 * - Deterministic, rule-based consolidation of upstream engine outputs (no duplicate logic)
 * - Strict Aeronautical Airworthiness Hierarchy:
 *   OVERDUE -> GROUNDED / AOG_UNAIRWORTHY (Immediate flight block)
 *   REVIEW_REQUIRED -> MAINTENANCE_HOLD (Engineering clearance required)
 *   DUE_SOON -> AIRWORTHY_WITH_WARNINGS (Flight allowed, scheduled intervention)
 *   COMPLIED -> AIRWORTHY (Fully compliant)
 * - Zero-Dilution Fleet Principle: A fleet cannot be considered compliant just because
 *   a percentage of its aircraft are compliant. A single grounded aircraft marks the fleet
 *   as FLEET_CRITICAL_NON_COMPLIANT.
 * - Cryptographic audit trail & explainability (SHA-256 tamper-evident hashes).
 */

import crypto from 'crypto';
import { 
  ComplianceObligation,
  ComplianceRequirement,
  Aircraft,
  AirworthinessSeverity,
  AircraftComplianceStatus,
  OperationalDecisionSource,
  AircraftAirworthinessStatus,
  OperationalAirworthinessRule,
  FleetComplianceStatus,
  RequirementComplianceStatus,
  ObligationComplianceAssessment,
  RequirementComplianceAssessment,
  AircraftAirworthinessAssessment,
  AircraftControllingDeadlines,
  FleetAirworthinessAssessment,
  FleetBlockingObligationItem
} from '../../src/types';
import { camoDb } from '../dataStore';

export const FLEET_AIRWORTHINESS_ENGINE_VERSION = '6.4.1';

export class FleetAirworthinessControlEngine {
  private static instance: FleetAirworthinessControlEngine;

  /**
   * Pre-authorized operational airworthiness rules and procedures.
   * Grounding or maintenance hold requires a traceable rule or human review.
   */
  public static readonly AUTHORIZED_RULES: Record<string, OperationalAirworthinessRule> = {
    FAR_39_MANDATORY_GROUNDING: {
      ruleId: 'rule-far-39-grounding',
      source: 'REGULATORY_REQUIREMENT',
      ruleName: 'FAR_39_MANDATORY_GROUNDING',
      sourceReference: '14 CFR § 39.7 / RBAC 39',
      description: 'Determinação mandatória: Nenhuma pessoa pode operar uma aeronave para a qual se aplique uma Diretriz de Aeronavegabilidade, exceto de acordo com os requisitos dessa diretriz.',
      overdueConsequence: 'GROUNDED',
      nonCompliantConsequence: 'GROUNDED',
      authorizedBy: 'FAA / ANAC Mandatory Airworthiness Directive Framework'
    },
    CAMO_DISCREPANCY_HOLD: {
      ruleId: 'rule-camo-discrepancy-hold',
      source: 'APPROVED_CAMO_PROCEDURE',
      ruleName: 'CAMO_SOP_04_DISCREPANCY_HOLD',
      sourceReference: 'CAMO-CMM-PROC-4.3',
      description: 'Procedimento aprovado CAMO: Obrigações com incerteza técnica, dados insuficientes ou revisão pendente colocam a aeronave em retenção preventiva de manutenção (Maintenance Hold).',
      reviewRequiredConsequence: 'MAINTENANCE_HOLD',
      authorizedBy: 'CAMO Quality & Engineering Department'
    },
    AUTHORITY_DIRECTIVE_GROUNDING: {
      ruleId: 'rule-authority-ead',
      source: 'AUTHORITY_DECISION',
      ruleName: 'EMERGENCY_AD_IMMEDIATE_GROUNDING',
      sourceReference: 'EAD-2026-01-EXP',
      description: 'Decisão expressa e emergencial de autoridade de aviação civil determinando interdição operacional imediata de voo.',
      overdueConsequence: 'GROUNDED',
      nonCompliantConsequence: 'GROUNDED',
      authorizedBy: 'Airworthiness Authority (FAA/EASA/ANAC)'
    },
    OPERATOR_FOM_RESTRICTION: {
      ruleId: 'rule-fom-ops-restriction',
      source: 'APPROVED_OPERATOR_RULE',
      ruleName: 'OPERATOR_FOM_SEC_8_MAINT_LIMIT',
      sourceReference: 'FOM-REV-12-CH8',
      description: 'Regra operacional aprovada em Manual Geral de Operações (FOM): Limitação operacional para aeronaves com itens pendentes de engenharia.',
      reviewRequiredConsequence: 'MAINTENANCE_HOLD',
      authorizedBy: 'Diretor de Operações de Voo (DOV)'
    },
    HUMAN_CHIEF_ENGINEER_DISPOSITION: {
      ruleId: 'rule-human-disposition',
      source: 'HUMAN_REVIEW_DECISION',
      ruleName: 'CHIEF_ENGINEER_FORMAL_DISPOSITION',
      sourceReference: 'ENG-DISP-2026-088',
      description: 'Decisão técnica formal registrada em ata e assinada pelo Engenheiro Responsável Técnico.',
      reviewRequiredConsequence: 'MAINTENANCE_HOLD',
      authorizedBy: 'Engenheiro Chefe de Manutenção (CREA/ANAC)'
    }
  };

  public static getInstance(): FleetAirworthinessControlEngine {
    if (!FleetAirworthinessControlEngine.instance) {
      FleetAirworthinessControlEngine.instance = new FleetAirworthinessControlEngine();
    }
    return FleetAirworthinessControlEngine.instance;
  }

  /**
   * Retrieves an authorized operational airworthiness rule by key, ruleId, or ruleName.
   */
  public getAuthorizedRule(ruleKeyOrId: string): OperationalAirworthinessRule | undefined {
    if (FleetAirworthinessControlEngine.AUTHORIZED_RULES[ruleKeyOrId]) {
      return FleetAirworthinessControlEngine.AUTHORIZED_RULES[ruleKeyOrId];
    }
    return Object.values(FleetAirworthinessControlEngine.AUTHORIZED_RULES).find(
      r => r.ruleId === ruleKeyOrId || r.ruleName === ruleKeyOrId
    );
  }

  /**
   * Helper to generate a deterministic SHA-256 hash for audit and tamper detection.
   */
  public generateAuditHash(payload: Record<string, any>): string {
    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj !== null && typeof obj === 'object') {
        const sortedKeys = Object.keys(obj).sort();
        const result: Record<string, any> = {};
        for (const key of sortedKeys) {
          if (key !== 'auditHash' && key !== 'assessedAt' && key !== 'evaluatedAt') {
            result[key] = sanitize(obj[key]);
          }
        }
        return result;
      }
      return obj;
    };

    const sanitized = sanitize(payload);
    return crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex');
  }

  // ===========================================================================
  // LEVEL 1: OBLIGATION COMPLIANCE ASSESSMENT
  // ===========================================================================

  /**
   * Assesses a single ComplianceObligation deterministically, classifying severity,
   * blocking status, controlling thresholds, and structured explainability.
   */
  public assessObligation(
    obligation: ComplianceObligation,
    options?: { aircraft?: Aircraft; requirement?: ComplianceRequirement }
  ): ObligationComplianceAssessment {
    const nowIso = new Date().toISOString();
    const blockingReasons: string[] = [];
    const warningReasons: string[] = [];
    const structuredReasonCodes: string[] = [];

    // Upstream data points
    const status = obligation.status;
    const counters = obligation.temporalCounters || ({} as any);
    const evidences = obligation.evidence || [];
    const reviewState = obligation.reviewState || { requiresHumanReview: false, reviewReasons: [] };
    const terminating = obligation.terminatingAction;
    const isSuperseded = obligation.supersedence?.isSuperseded;

    // Categorize evidence
    const validEvidences = evidences.filter(e => e.verified && e.verificationStatus === 'VALID');
    const insufficientEvidences = evidences.filter(e => e.verificationStatus === 'INSUFFICIENT' || e.verificationStatus === 'REVIEW_REQUIRED');
    const revokedEvidences = evidences.filter(e => e.verificationStatus === 'REVOKED' || e.verificationStatus === 'INVALID');

    // Find latest valid accomplishment date
    let latestAccomplishmentDate: string | undefined;
    if (validEvidences.length > 0) {
      const dates = validEvidences
        .map(e => e.accomplishmentDate)
        .filter(Boolean) as string[];
      if (dates.length > 0) {
        dates.sort();
        latestAccomplishmentDate = dates[dates.length - 1];
      }
    }

    const isExcluded = status === 'NOT_APPLICABLE' || status === 'SUPERSEDED' || status === 'CANCELLED' || obligation.applicabilityStatus === 'NOT_APPLICABLE';
    const isOverdue = !isExcluded && (status === 'OVERDUE' || counters.isOverdue === true);
    const isDueSoon = !isExcluded && (status === 'DUE_SOON' || counters.isDueSoon === true);
    const isReviewRequired = !isExcluded && (status === 'REVIEW_REQUIRED' || reviewState.requiresHumanReview);

    let severity: AirworthinessSeverity = 'INFO';
    let isAirworthy = true;
    let isBlocking = false;
    let explanation = '';

    if (isOverdue) {
      severity = 'CRITICAL';
      isAirworthy = false;
      isBlocking = true;
      const overdueReason = `Obrigação regulatória VENCIDA (OVERDUE). Prazo limite excedido em ` +
        `${counters.remainingDays !== undefined && counters.remainingDays < 0 ? Math.abs(counters.remainingDays) + ' dia(s)' : ''} ` +
        `${counters.remainingFH !== undefined && counters.remainingFH < 0 ? Math.abs(counters.remainingFH) + ' FH' : ''} ` +
        `${counters.remainingFC !== undefined && counters.remainingFC < 0 ? Math.abs(counters.remainingFC) + ' FC' : ''}. ` +
        `Operação de voo imediatamente bloqueada até cumprimento técnico formal e certificação de retorno ao serviço.`;
      blockingReasons.push(overdueReason.trim());
      structuredReasonCodes.push('OBLIGATION_OVERDUE');
      structuredReasonCodes.push('AIRWORTHINESS_DIRECTIVE_EXPIRED');
      explanation = overdueReason.trim();
    } else if (isReviewRequired) {
      severity = 'HIGH';
      isAirworthy = false;
      isBlocking = true;
      const reviewReason = `Revisão técnica de engenharia obrigatória (REVIEW_REQUIRED): ${reviewState.reviewReasons.join('; ') || obligation.statusReason || 'Inconsistência técnica pendente de análise'}.`;
      blockingReasons.push(reviewReason);
      structuredReasonCodes.push('HUMAN_REVIEW_REQUIRED');
      structuredReasonCodes.push('TECHNICAL_UNCERTAINTY');
      explanation = reviewReason;
    } else if (isDueSoon) {
      severity = 'MEDIUM';
      isAirworthy = true;
      isBlocking = false;
      const dueSoonReason = `Obrigação na janela de alerta de vencimento (DUE_SOON). Restam: ` +
        `${counters.remainingDays !== undefined ? counters.remainingDays + ' dia(s)' : ''} ` +
        `${counters.remainingFH !== undefined ? counters.remainingFH + ' FH' : ''} ` +
        `${counters.remainingFC !== undefined ? counters.remainingFC + ' FC' : ''}. Requer programação de manutenção preventiva.`;
      warningReasons.push(dueSoonReason.trim());
      structuredReasonCodes.push('THRESHOLD_DUE_SOON');
      explanation = dueSoonReason.trim();
    } else if (status === 'NEXT_CYCLE_OPEN') {
      severity = 'MEDIUM';
      isAirworthy = true;
      isBlocking = false;
      const repReason = `Obrigação repetitiva em novo ciclo aberto (NEXT_CYCLE_OPEN, Ciclo #${counters.cycleCount || 1}). ` +
        `Próximo vencimento: ${counters.nextDueDate || (counters.nextDueFH ? counters.nextDueFH + ' FH' : (counters.nextDueFC ? counters.nextDueFC + ' FC' : 'conforme programa'))}.`;
      warningReasons.push(repReason);
      structuredReasonCodes.push('REPETITIVE_CYCLE_ACTIVE');
      explanation = repReason;
    } else if (status === 'OPEN') {
      severity = 'LOW';
      isAirworthy = true;
      isBlocking = false;
      explanation = `Obrigação aplicável em aberto (OPEN). Prazo operacional dentro dos limites normais de planejamento.`;
      structuredReasonCodes.push('OBLIGATION_OPEN_NORMAL');
    } else if (status === 'NOT_YET_EFFECTIVE') {
      severity = 'LOW';
      isAirworthy = true;
      isBlocking = false;
      explanation = `Requisito publicado, porém anterior à data de efetividade mandatória (${counters.effectiveDate || obligation.temporalCounters?.effectiveDate || 'futura'}).`;
      structuredReasonCodes.push('NOT_YET_EFFECTIVE');
    } else if (status === 'COMPLIED') {
      if (revokedEvidences.length > 0) {
        severity = 'CRITICAL';
        isAirworthy = false;
        isBlocking = true;
        const revReason = `Obrigação com status COMPLIED possui evidência revogada ou inválida (REVOKED/INVALID). Bloqueio mandatório de aeronavegabilidade.`;
        blockingReasons.push(revReason);
        structuredReasonCodes.push('REVOKED_EVIDENCE_CONFLICT');
        explanation = revReason;
      } else if (evidences.length === 0) {
        severity = 'CRITICAL';
        isAirworthy = false;
        isBlocking = true;
        const noEvReason = `Obrigação marcada como COMPLIED sem nenhuma evidência técnica comprovatória anexada.`;
        blockingReasons.push(noEvReason);
        structuredReasonCodes.push('MISSING_EVIDENCE_FOR_COMPLIANCE');
        explanation = noEvReason;
      } else if (validEvidences.length === 0) {
        severity = 'CRITICAL';
        isAirworthy = false;
        isBlocking = true;
        const unvReason = `Obrigação com evidência anexada sem verificação técnica válida aprovada pelo motor de auditoria (Evidence Attached NÃO significa Compliance).`;
        blockingReasons.push(unvReason);
        structuredReasonCodes.push('UNVERIFIED_EVIDENCE_ATTACHED');
        explanation = unvReason;
      } else {
        severity = 'INFO';
        isAirworthy = true;
        isBlocking = false;
        explanation = terminating?.isTerminated 
          ? `Obrigação permanentemente cumprida e encerrada por Ação Terminatória validada (${terminating.terminatingParagraph || 'Terminating Action'}).`
          : `Obrigação formalmente cumprida com evidência técnica válida arquivada.`;
        structuredReasonCodes.push('COMPLIANCE_SATISFIED');
      }
    } else if (status === 'NOT_APPLICABLE' || obligation.applicabilityStatus === 'NOT_APPLICABLE') {
      severity = 'INFO';
      isAirworthy = true;
      isBlocking = false;
      explanation = `Requisito não aplicável à entidade avaliada: ${obligation.applicabilityReasoning.join('; ') || 'Configuração ou número de série fora da efetividade'}.`;
      structuredReasonCodes.push('NOT_APPLICABLE_EXCLUDED');
    } else if (status === 'SUPERSEDED' || isSuperseded) {
      severity = 'INFO';
      isAirworthy = true;
      isBlocking = false;
      explanation = `Obrigação superada (SUPERSEDED) por revisão regulatória mais recente (${obligation.supersedence?.supersededByAdNumber || 'Nova Diretriz'}).`;
      structuredReasonCodes.push('SUPERSEDED_HISTORICAL');
    } else {
      severity = 'LOW';
      isAirworthy = true;
      isBlocking = false;
      explanation = `Obrigação com status ${status}: ${obligation.statusReason || 'Sem pendências ativas'}.`;
      structuredReasonCodes.push('STATUS_OTHER');
    }

    const assessment: ObligationComplianceAssessment = {
      obligationId: obligation.id,
      complianceRequirementId: obligation.complianceRequirementId,
      adNumber: obligation.adNumber || 'UNKNOWN-AD',
      targetEntityId: obligation.targetEntity?.entityId || obligation.targetEntityId || 'UNKNOWN-ENTITY',
      targetEntityType: obligation.targetEntity?.entityType || obligation.targetEntityType || 'AIRCRAFT',
      aircraftId: obligation.targetEntity?.aircraftId || obligation.aircraftId,
      aircraftRegistration: obligation.targetEntity?.aircraftRegistration,
      status: obligation.status,
      severity,
      isAirworthy,
      isBlocking,
      controllingLimit: counters.controllingLimit,
      remainingDays: counters.remainingDays,
      remainingFH: counters.remainingFH,
      remainingFC: counters.remainingFC,
      dueSoon: isDueSoon,
      overdue: isOverdue,
      evidenceSummary: {
        total: evidences.length,
        valid: validEvidences.length,
        insufficient: insufficientEvidences.length,
        revoked: revokedEvidences.length,
        latestAccomplishmentDate
      },
      blockingReasons,
      warningReasons,
      explanation,
      structuredReasonCodes,
      auditHash: '',
      assessedAt: nowIso
    };

    assessment.auditHash = this.generateAuditHash(assessment);
    return assessment;
  }

  // ===========================================================================
  // LEVEL 2: REQUIREMENT / AD COMPLIANCE ASSESSMENT
  // ===========================================================================

  /**
   * Evaluates compliance across all obligations linked to a given ComplianceRequirement.
   * Preserves individual obligation failures (if 1 obligation is overdue, the requirement is NON_COMPLIANT).
   */
  public assessRequirement(
    requirementId: string,
    options?: { aircraftId?: string; obligations?: ComplianceObligation[]; requirement?: ComplianceRequirement }
  ): RequirementComplianceAssessment {
    const nowIso = new Date().toISOString();
    const state = camoDb.getState();
    const req = options?.requirement || state.requirements.find(r => r.id === requirementId);

    if (!req) {
      throw new Error(`ComplianceRequirement not found: ${requirementId}`);
    }

    // Filter obligations for this requirement
    const candidateObls = options?.obligations || state.obligations;
    let obls = candidateObls.filter(o => o.complianceRequirementId === requirementId || o.adNumber === req.sourceNumber);
    if (options?.aircraftId) {
      obls = obls.filter(o => 
        o.targetEntity?.aircraftId === options.aircraftId || 
        o.aircraftId === options.aircraftId ||
        o.targetEntity?.entityId === options.aircraftId
      );
    }

    const assessedObls = obls.map(o => this.assessObligation(o));

    const totalObligations = assessedObls.length;
    let applicableObligations = 0;
    let compliedObligations = 0;
    let overdueObligations = 0;
    let dueSoonObligations = 0;
    let openObligations = 0;
    let reviewRequiredObligations = 0;
    let notApplicableObligations = 0;
    let supersededObligations = 0;

    const blockingReasons: string[] = [];
    const warningReasons: string[] = [];
    const affectedAircraftSet = new Set<string>();
    const nonCompliantAircraftSet = new Set<string>();

    for (const item of assessedObls) {
      const reg = item.aircraftRegistration || item.aircraftId || item.targetEntityId;
      if (reg) affectedAircraftSet.add(reg);

      switch (item.status) {
        case 'OVERDUE':
          overdueObligations++;
          applicableObligations++;
          if (reg) nonCompliantAircraftSet.add(reg);
          blockingReasons.push(`Aeronave/Entidade ${reg}: ${item.explanation}`);
          break;
        case 'REVIEW_REQUIRED':
          reviewRequiredObligations++;
          applicableObligations++;
          if (reg) nonCompliantAircraftSet.add(reg);
          blockingReasons.push(`Aeronave/Entidade ${reg}: ${item.explanation}`);
          break;
        case 'DUE_SOON':
          dueSoonObligations++;
          applicableObligations++;
          warningReasons.push(`Aeronave/Entidade ${reg}: ${item.explanation}`);
          break;
        case 'NEXT_CYCLE_OPEN':
          applicableObligations++;
          warningReasons.push(`Aeronave/Entidade ${reg}: ${item.explanation}`);
          break;
        case 'OPEN':
        case 'NOT_YET_EFFECTIVE':
          openObligations++;
          applicableObligations++;
          break;
        case 'COMPLIED':
          compliedObligations++;
          applicableObligations++;
          break;
        case 'NOT_APPLICABLE':
          notApplicableObligations++;
          break;
        case 'SUPERSEDED':
          supersededObligations++;
          break;
        default:
          applicableObligations++;
          break;
      }
    }

    // Determine consolidated status
    let status: RequirementComplianceStatus = 'FULLY_COMPLIANT';
    let severity: AirworthinessSeverity = 'INFO';
    let isBlocking = false;

    if (overdueObligations > 0) {
      status = 'NON_COMPLIANT';
      severity = 'CRITICAL';
      isBlocking = true;
    } else if (reviewRequiredObligations > 0 || dueSoonObligations > 0) {
      status = 'ATTENTION_REQUIRED';
      severity = reviewRequiredObligations > 0 ? 'HIGH' : 'MEDIUM';
      isBlocking = reviewRequiredObligations > 0;
    } else if (applicableObligations === 0 && notApplicableObligations > 0) {
      status = 'NOT_APPLICABLE';
      severity = 'INFO';
    } else if (applicableObligations === 0 && supersededObligations > 0) {
      status = 'SUPERSEDED';
      severity = 'INFO';
    } else if (compliedObligations === applicableObligations && applicableObligations > 0) {
      status = 'FULLY_COMPLIANT';
      severity = 'INFO';
    } else if (compliedObligations > 0 && compliedObligations < applicableObligations) {
      status = 'PARTIALLY_COMPLIANT';
      severity = 'LOW';
    } else {
      status = 'PARTIALLY_COMPLIANT';
      severity = 'LOW';
    }

    const complianceRate = applicableObligations > 0 
      ? Math.round((compliedObligations / applicableObligations) * 10000) / 100 
      : 100;

    const assessment: RequirementComplianceAssessment = {
      complianceRequirementId: req.id,
      adNumber: req.sourceNumber || 'AD-UNKNOWN',
      adTitle: req.title,
      issuingAuthority: req.issuingAuthority || 'FAA',
      status,
      severity,
      totalObligations,
      applicableObligations,
      compliedObligations,
      overdueObligations,
      dueSoonObligations,
      openObligations,
      reviewRequiredObligations,
      notApplicableObligations,
      supersededObligations,
      complianceRate,
      isBlocking,
      blockingReasons,
      warningReasons,
      affectedAircraft: Array.from(affectedAircraftSet),
      nonCompliantAircraft: Array.from(nonCompliantAircraftSet),
      obligations: assessedObls,
      auditHash: '',
      assessedAt: nowIso
    };

    assessment.auditHash = this.generateAuditHash(assessment);
    return assessment;
  }

  // ===========================================================================
  // LEVEL 3: AIRCRAFT AIRWORTHINESS ASSESSMENT
  // ===========================================================================

  /**
   * Evaluates the comprehensive airworthiness status of a single physical aircraft.
   * Enforces strict airworthiness invariants:
   * - ANY overdue obligation => GROUNDED / AOG_UNAIRWORTHY (canFly: false)
   * - ANY review required obligation => MAINTENANCE_HOLD (canFly: false)
   * - ANY due soon obligation => AIRWORTHY_WITH_WARNINGS (canFly: true)
   * - ALL complied or not applicable => AIRWORTHY (canFly: true)
   */
  public assessAircraftAirworthiness(
    aircraftId: string,
    options?: { 
      obligations?: ComplianceObligation[]; 
      aircraft?: Aircraft;
      operationalRule?: OperationalAirworthinessRule;
    }
  ): AircraftAirworthinessAssessment {
    const nowIso = new Date().toISOString();
    const state = camoDb.getState();
    const aircraft = options?.aircraft || state.aircraft.find(a => a.id === aircraftId || a.registration === aircraftId);

    if (!aircraft) {
      throw new Error(`Aircraft not found: ${aircraftId}`);
    }

    // Gather all obligations for this aircraft (airframe + installed engines + installed components)
    const candidateObls = options?.obligations || state.obligations;
    const reg = aircraft.registration;
    const acId = aircraft.id;
    const obls = candidateObls.filter(o => {
      const target = o.targetEntity;
      if (!target) return false;
      if (target.aircraftId === acId || target.aircraftRegistration === reg) return true;
      if (target.entityId === acId || target.entityId === reg) return true;
      if (o.aircraftId === acId) return true;
      return false;
    });

    const assessedObls = obls.map(o => this.assessObligation(o, { aircraft }));

    let applicableObligations = 0;
    let compliedObligations = 0;
    let overdueObligations = 0;
    let dueSoonObligations = 0;
    let openObligations = 0;
    let reviewRequiredObligations = 0;
    let notApplicableObligations = 0;
    let supersededObligations = 0;

    const blockingObligations: ObligationComplianceAssessment[] = [];
    const warningObligations: ObligationComplianceAssessment[] = [];
    const blockingReasons: string[] = [];
    const warningReasons: string[] = [];

    // Controlling deadlines calculation
    let minRemainingDays: number | undefined;
    let nextDueDate: string | undefined;
    let minRemainingFH: number | undefined;
    let nextDueFH: number | undefined;
    let minRemainingFC: number | undefined;
    let nextDueFC: number | undefined;
    let controllingObligationId: string | undefined;
    let controllingAdNumber: string | undefined;

    for (const item of assessedObls) {
      switch (item.status) {
        case 'OVERDUE':
          overdueObligations++;
          applicableObligations++;
          blockingObligations.push(item);
          blockingReasons.push(`AD ${item.adNumber}: ${item.explanation}`);
          break;
        case 'REVIEW_REQUIRED':
          reviewRequiredObligations++;
          applicableObligations++;
          blockingObligations.push(item);
          blockingReasons.push(`AD ${item.adNumber} (Pendente de Revisão): ${item.explanation}`);
          break;
        case 'DUE_SOON':
          dueSoonObligations++;
          applicableObligations++;
          warningObligations.push(item);
          warningReasons.push(`AD ${item.adNumber} (Vencimento Próximo): ${item.explanation}`);
          break;
        case 'NEXT_CYCLE_OPEN':
          applicableObligations++;
          warningObligations.push(item);
          warningReasons.push(`AD ${item.adNumber} (Ciclo Recorrente Ativo): ${item.explanation}`);
          break;
        case 'OPEN':
        case 'NOT_YET_EFFECTIVE':
          openObligations++;
          applicableObligations++;
          break;
        case 'COMPLIED':
          compliedObligations++;
          applicableObligations++;
          break;
        case 'NOT_APPLICABLE':
          notApplicableObligations++;
          break;
        case 'SUPERSEDED':
          supersededObligations++;
          break;
        default:
          applicableObligations++;
          break;
      }

      // Track controlling limits for non-complied obligations
      if (item.status === 'OPEN' || item.status === 'DUE_SOON' || item.status === 'NEXT_CYCLE_OPEN' || item.status === 'OVERDUE') {
        if (item.remainingDays !== undefined) {
          if (minRemainingDays === undefined || item.remainingDays < minRemainingDays) {
            minRemainingDays = item.remainingDays;
            controllingObligationId = item.obligationId;
            controllingAdNumber = item.adNumber;
          }
        }
        if (item.remainingFH !== undefined) {
          if (minRemainingFH === undefined || item.remainingFH < minRemainingFH) {
            minRemainingFH = item.remainingFH;
            if (!controllingObligationId) {
              controllingObligationId = item.obligationId;
              controllingAdNumber = item.adNumber;
            }
          }
        }
        if (item.remainingFC !== undefined) {
          if (minRemainingFC === undefined || item.remainingFC < minRemainingFC) {
            minRemainingFC = item.remainingFC;
            if (!controllingObligationId) {
              controllingObligationId = item.obligationId;
              controllingAdNumber = item.adNumber;
            }
          }
        }
      }
    }

    // Resolve date from remainingDays if applicable
    if (minRemainingDays !== undefined) {
      const targetTime = Date.now() + minRemainingDays * 86400000;
      nextDueDate = new Date(targetTime).toISOString().split('T')[0];
    }
    if (minRemainingFH !== undefined && aircraft.totalFlightHours !== undefined) {
      nextDueFH = aircraft.totalFlightHours + minRemainingFH;
    }
    if (minRemainingFC !== undefined && aircraft.totalCycles !== undefined) {
      nextDueFC = aircraft.totalCycles + minRemainingFC;
    }

    // 1. REGULATORY COMPLIANCE STATUS
    let complianceStatus: AircraftComplianceStatus = 'COMPLIANT';
    if (overdueObligations > 0) {
      complianceStatus = 'NON_COMPLIANT';
    } else if (reviewRequiredObligations > 0) {
      complianceStatus = 'PENDING_REVIEW';
    } else if (dueSoonObligations > 0) {
      complianceStatus = 'ATTENTION_REQUIRED';
    } else if (applicableObligations === 0 && notApplicableObligations > 0) {
      complianceStatus = 'NOT_APPLICABLE';
    } else if (applicableObligations === 0 && supersededObligations > 0) {
      complianceStatus = 'SUPERSEDED';
    } else {
      complianceStatus = 'COMPLIANT';
    }

    // 2. OPERATIONAL SEVERITY
    let severity: AirworthinessSeverity = 'INFO';
    if (overdueObligations > 0) {
      severity = 'CRITICAL';
    } else if (reviewRequiredObligations > 0) {
      severity = 'HIGH';
    } else if (dueSoonObligations > 0) {
      severity = 'MEDIUM';
    } else if (openObligations > 0) {
      severity = 'LOW';
    } else {
      severity = 'INFO';
    }

    // 3. OPERATIONAL AIRWORTHINESS DETERMINATION & EXPLAINABILITY
    // Strict Architectural Mandate: Compliance status MUST NOT be automatically converted
    // into an operational flight grounding/hold without an authorized rule or human decision.
    let airworthinessStatus: AircraftAirworthinessStatus = 'AIRWORTHY';
    let canFly: boolean | null = true;
    let isGrounded = false;
    let decisionSource: OperationalDecisionSource = 'APPROVED_CAMO_PROCEDURE';
    let decisionRule = 'AIRWORTHINESS_BASELINE_COMPLIANT';
    let decisionReason = '';
    let sourceReference: string | undefined = undefined;
    let summary = '';

    const rule = options?.operationalRule;

    if (overdueObligations > 0) {
      // Obligation is OVERDUE: compliance is NON_COMPLIANT and blocking.
      // Operational grounding requires an authorized operational rule or mandate!
      if (rule && rule.overdueConsequence) {
        airworthinessStatus = rule.overdueConsequence;
        canFly = (rule.overdueConsequence === 'GROUNDED' || rule.overdueConsequence === 'MAINTENANCE_HOLD') ? false : null;
        isGrounded = rule.overdueConsequence === 'GROUNDED';
        decisionSource = rule.source;
        decisionRule = rule.ruleName;
        decisionReason = rule.description || `Interdição operacional de voo (${rule.overdueConsequence}) determinada conforme regra autorizada ${rule.ruleName}.`;
        sourceReference = rule.sourceReference;
        summary = `Aeronave ${aircraft.registration} em CONDIÇÃO OPERACIONAL [${airworthinessStatus}]. ` +
          `Fonte: ${decisionSource} (${decisionRule}). ` +
          `Detectada(s) ${overdueObligations} obrigação(ões) OVERDUE. Decisão: ${decisionReason}`;
      } else {
        // Safe fail-safe: in the absence of an authorized operational rule, operational airworthiness is NOT_DETERMINED!
        airworthinessStatus = 'NOT_DETERMINED';
        canFly = null; // Strictly null
        isGrounded = false; // Strictly false: never assume GROUNDED automatically!
        decisionSource = 'NOT_DETERMINED';
        decisionRule = 'NO_AUTHORIZED_OPERATIONAL_RULE';
        decisionReason = 'Obrigação(ões) regulatória(s) OVERDUE detectada(s). O compliance da aeronave é NON_COMPLIANT e bloqueador, porém a determinação operacional de voo requer regra autorizada, procedimento aprovado ou decisão formal humana de engenharia.';
        sourceReference = 'PENDING_AUTHORIZED_RULE_OR_HUMAN_DISPOSITION';
        summary = `Aeronave ${aircraft.registration} com compliance NÃO CONFORME (NON_COMPLIANT). ` +
          `Detectada(s) ${overdueObligations} obrigação(ões) com prazo vencido. ` +
          `Condição operacional de voo: NÃO DETERMINADA (aguardando disposição formal de engenharia / regra autorizada).`;
      }
    } else if (reviewRequiredObligations > 0) {
      // Obligation in REVIEW_REQUIRED: compliance is PENDING_REVIEW and blocking.
      // Operational hold requires an authorized rule or approved procedure!
      if (rule && rule.reviewRequiredConsequence) {
        airworthinessStatus = rule.reviewRequiredConsequence;
        canFly = (rule.reviewRequiredConsequence === 'MAINTENANCE_HOLD' || rule.reviewRequiredConsequence === 'GROUNDED') ? false : null;
        isGrounded = rule.reviewRequiredConsequence === 'GROUNDED';
        decisionSource = rule.source;
        decisionRule = rule.ruleName;
        decisionReason = rule.description || `Retenção operacional de manutenção (${rule.reviewRequiredConsequence}) determinada conforme regra autorizada ${rule.ruleName}.`;
        sourceReference = rule.sourceReference;
        summary = `Aeronave ${aircraft.registration} em RETENÇÃO OPERACIONAL [${airworthinessStatus}]. ` +
          `Fonte: ${decisionSource} (${decisionRule}). ` +
          `Existe(m) ${reviewRequiredObligations} obrigação(ões) pendente(s) de revisão. Decisão: ${decisionReason}`;
      } else {
        // Safe fail-safe: in the absence of an authorized operational rule, operational airworthiness is NOT_DETERMINED!
        airworthinessStatus = 'NOT_DETERMINED';
        canFly = null; // Strictly null
        isGrounded = false;
        decisionSource = 'NOT_DETERMINED';
        decisionRule = 'NO_AUTHORIZED_OPERATIONAL_RULE';
        decisionReason = 'Obrigação(ões) regulatória(s) em REVIEW_REQUIRED preservada(s) com todos os motivos técnicos. A determinação operacional de voo requer revisão humana/técnica formal e não é presumida automaticamente.';
        sourceReference = 'PENDING_AUTHORIZED_RULE_OR_HUMAN_DISPOSITION';
        summary = `Aeronave ${aircraft.registration} com compliance PENDENTE DE REVISÃO (PENDING_REVIEW). ` +
          `Existe(m) ${reviewRequiredObligations} obrigação(ões) com pendência técnica. ` +
          `Condição operacional de voo: NÃO DETERMINADA (necessária revisão técnica humana formal).`;
      }
    } else if (dueSoonObligations > 0) {
      airworthinessStatus = 'AIRWORTHY_WITH_WARNINGS';
      canFly = true;
      isGrounded = false;
      decisionSource = 'APPROVED_CAMO_PROCEDURE';
      decisionRule = 'PREVENTIVE_WARNING_MONITORING';
      decisionReason = 'Aeronave em conformidade operacional, com obrigações regulatórias na janela preventiva de alerta (DUE_SOON).';
      sourceReference = 'CAMO-PROC-AIRWORTHINESS-02';
      summary = `Aeronave ${aircraft.registration} AERONAVEGÁVEL COM ALERTAS (AIRWORTHY_WITH_WARNINGS). ` +
        `Aeronave segura para voo, porém com ${dueSoonObligations} obrigação(ões) dentro da janela preventiva de vencimento.`;
    } else {
      airworthinessStatus = 'AIRWORTHY';
      canFly = true;
      isGrounded = false;
      decisionSource = 'APPROVED_CAMO_PROCEDURE';
      decisionRule = 'COMPLIANT_BASELINE_AIRWORTHY';
      decisionReason = 'Todas as obrigações regulatórias aplicáveis estão plenamente cumpridas ou em prazo operacional regular.';
      sourceReference = 'CAMO-PROC-AIRWORTHINESS-01';
      summary = `Aeronave ${aircraft.registration} TOTALMENTE CONFORME E AERONAVEGÁVEL (AIRWORTHY). ` +
        `Todas as ${applicableObligations} obrigações aplicáveis cumpridas ou com prazos regulares.`;
    }

    const status: AircraftAirworthinessStatus = airworthinessStatus;

    const controllingDeadlines: AircraftControllingDeadlines = {
      nextDueDate,
      daysRemaining: minRemainingDays,
      nextDueFH,
      fhRemaining: minRemainingFH,
      nextDueFC,
      fcRemaining: minRemainingFC,
      controllingObligationId,
      controllingAdNumber
    };

    const assessment: AircraftAirworthinessAssessment = {
      aircraftId: aircraft.id,
      registration: aircraft.registration,
      model: aircraft.model,
      msn: aircraft.msn,
      currentFH: aircraft.totalFlightHours || 0,
      currentFC: aircraft.totalCycles || 0,
      complianceStatus,
      status,
      airworthinessStatus,
      severity,
      canFly,
      isGrounded,
      decisionSource,
      decisionRule,
      decisionReason,
      sourceReference,
      totalObligations: assessedObls.length,
      applicableObligations,
      compliedObligations,
      overdueObligations,
      dueSoonObligations,
      openObligations,
      reviewRequiredObligations,
      notApplicableObligations,
      supersededObligations,
      controllingDeadlines,
      blockingObligations,
      warningObligations,
      blockingReasons,
      warningReasons,
      summary,
      auditHash: '',
      assessedAt: nowIso
    };

    assessment.auditHash = this.generateAuditHash(assessment);
    return assessment;
  }

  // ===========================================================================
  // LEVEL 4: FLEET AIRWORTHINESS ASSESSMENT
  // ===========================================================================

  /**
   * Consolidates the airworthiness status of the entire fleet.
   * Zero-Dilution Fleet Principle:
   * - If ANY single aircraft is GROUNDED, the fleet is FLEET_CRITICAL_NON_COMPLIANT.
   * - If ANY aircraft is MAINTENANCE_HOLD, the fleet is FLEET_RESTRICTED.
   * - If ANY aircraft has DUE_SOON warnings, the fleet is FLEET_ATTENTION.
   * - Only if 100% of aircraft are AIRWORTHY with no warnings is the fleet FLEET_COMPLIANT.
   */
  public assessFleetAirworthiness(
    options?: { 
      aircraftList?: Aircraft[]; 
      obligations?: ComplianceObligation[];
      operationalRule?: OperationalAirworthinessRule;
    }
  ): FleetAirworthinessAssessment {
    const nowIso = new Date().toISOString();
    const state = camoDb.getState();
    const fleet = options?.aircraftList || state.aircraft;
    const allObligations = options?.obligations || state.obligations;

    const aircraftAssessments: AircraftAirworthinessAssessment[] = [];
    const groundedAircraftRegistrations: string[] = [];
    const restrictedAircraftRegistrations: string[] = [];
    const undeterminedAircraftRegistrations: string[] = [];
    const nonCompliantAircraftRegistrations: string[] = [];
    const blockingObligationsSummary: FleetBlockingObligationItem[] = [];

    let totalAircraft = fleet.length;
    let airworthyAircraftCount = 0;
    let airworthyWithWarningsCount = 0;
    let maintenanceHoldCount = 0;
    let groundedAircraftCount = 0;
    let undeterminedAirworthinessCount = 0;

    let compliantAircraftCount = 0;
    let nonCompliantAircraftCount = 0;
    let pendingReviewAircraftCount = 0;
    let attentionAircraftCount = 0;

    let totalObligations = 0;
    let fleetCompliedObligations = 0;
    let fleetOverdueObligations = 0;
    let fleetDueSoonObligations = 0;
    let fleetOpenObligations = 0;
    let fleetReviewRequiredObligations = 0;
    let fleetApplicableCount = 0;

    const authorityMap: Record<string, { total: number; complied: number; overdue: number; dueSoon: number }> = {
      FAA: { total: 0, complied: 0, overdue: 0, dueSoon: 0 },
      EASA: { total: 0, complied: 0, overdue: 0, dueSoon: 0 },
      ANAC: { total: 0, complied: 0, overdue: 0, dueSoon: 0 },
      OTHER: { total: 0, complied: 0, overdue: 0, dueSoon: 0 }
    };

    // Evaluate each aircraft
    for (const ac of fleet) {
      const acAssessment = this.assessAircraftAirworthiness(ac.id, {
        aircraft: ac,
        obligations: allObligations,
        operationalRule: options?.operationalRule
      });
      aircraftAssessments.push(acAssessment);

      totalObligations += acAssessment.totalObligations;
      fleetCompliedObligations += acAssessment.compliedObligations;
      fleetOverdueObligations += acAssessment.overdueObligations;
      fleetDueSoonObligations += acAssessment.dueSoonObligations;
      fleetOpenObligations += acAssessment.openObligations;
      fleetReviewRequiredObligations += acAssessment.reviewRequiredObligations;
      fleetApplicableCount += acAssessment.applicableObligations;

      // Track Aircraft Compliance Status
      if (acAssessment.complianceStatus === 'NON_COMPLIANT') {
        nonCompliantAircraftCount++;
        nonCompliantAircraftRegistrations.push(acAssessment.registration);
      } else if (acAssessment.complianceStatus === 'PENDING_REVIEW') {
        pendingReviewAircraftCount++;
      } else if (acAssessment.complianceStatus === 'ATTENTION_REQUIRED') {
        attentionAircraftCount++;
      } else {
        compliantAircraftCount++;
      }

      // Track Operational Airworthiness Status
      switch (acAssessment.status) {
        case 'GROUNDED':
          groundedAircraftCount++;
          groundedAircraftRegistrations.push(acAssessment.registration);
          for (const blk of acAssessment.blockingObligations) {
            blockingObligationsSummary.push({
              obligationId: blk.obligationId,
              adNumber: blk.adNumber,
              aircraftRegistration: acAssessment.registration,
              reason: blk.explanation,
              overdueSinceDate: blk.remainingDays !== undefined && blk.remainingDays < 0 ? blk.assessedAt.split('T')[0] : undefined,
              overdueFH: blk.remainingFH !== undefined && blk.remainingFH < 0 ? Math.abs(blk.remainingFH) : undefined,
              overdueFC: blk.remainingFC !== undefined && blk.remainingFC < 0 ? Math.abs(blk.remainingFC) : undefined
            });
          }
          break;
        case 'MAINTENANCE_HOLD':
          maintenanceHoldCount++;
          restrictedAircraftRegistrations.push(acAssessment.registration);
          for (const blk of acAssessment.blockingObligations) {
            blockingObligationsSummary.push({
              obligationId: blk.obligationId,
              adNumber: blk.adNumber,
              aircraftRegistration: acAssessment.registration,
              reason: blk.explanation
            });
          }
          break;
        case 'NOT_DETERMINED':
          undeterminedAirworthinessCount++;
          undeterminedAircraftRegistrations.push(acAssessment.registration);
          for (const blk of acAssessment.blockingObligations) {
            blockingObligationsSummary.push({
              obligationId: blk.obligationId,
              adNumber: blk.adNumber,
              aircraftRegistration: acAssessment.registration,
              reason: blk.explanation,
              overdueSinceDate: blk.remainingDays !== undefined && blk.remainingDays < 0 ? blk.assessedAt.split('T')[0] : undefined,
              overdueFH: blk.remainingFH !== undefined && blk.remainingFH < 0 ? Math.abs(blk.remainingFH) : undefined,
              overdueFC: blk.remainingFC !== undefined && blk.remainingFC < 0 ? Math.abs(blk.remainingFC) : undefined
            });
          }
          break;
        case 'AIRWORTHY_WITH_WARNINGS':
          airworthyWithWarningsCount++;
          break;
        case 'AIRWORTHY':
          airworthyAircraftCount++;
          break;
      }
    }

    // Populate Authority Breakdown from obligations
    for (const obl of allObligations) {
      const auth = (obl.issuingAuthority as string) || 'OTHER';
      const key = authorityMap[auth] ? auth : 'OTHER';
      authorityMap[key].total++;
      if (obl.status === 'COMPLIED') authorityMap[key].complied++;
      else if (obl.status === 'OVERDUE') authorityMap[key].overdue++;
      else if (obl.status === 'DUE_SOON') authorityMap[key].dueSoon++;
    }

    // Fleet Airworthiness & Compliance Rates
    const fleetAirworthinessRate = totalAircraft > 0 
      ? Math.round(((airworthyAircraftCount + airworthyWithWarningsCount) / totalAircraft) * 10000) / 100 
      : 100;

    const fleetComplianceRate = fleetApplicableCount > 0 
      ? Math.round((fleetCompliedObligations / fleetApplicableCount) * 10000) / 100 
      : 100;

    // Strict Fleet Compliance Determination
    let fleetComplianceStatus: 'FLEET_COMPLIANT' | 'FLEET_ATTENTION' | 'FLEET_PENDING_REVIEW' | 'FLEET_NON_COMPLIANT' = 'FLEET_COMPLIANT';
    if (nonCompliantAircraftCount > 0 || fleetOverdueObligations > 0) {
      fleetComplianceStatus = 'FLEET_NON_COMPLIANT';
    } else if (pendingReviewAircraftCount > 0 || fleetReviewRequiredObligations > 0) {
      fleetComplianceStatus = 'FLEET_PENDING_REVIEW';
    } else if (attentionAircraftCount > 0 || fleetDueSoonObligations > 0) {
      fleetComplianceStatus = 'FLEET_ATTENTION';
    } else {
      fleetComplianceStatus = 'FLEET_COMPLIANT';
    }

    // Strict Fleet Airworthiness Precedence Determination (Zero-Dilution Principle)
    let fleetStatus: FleetComplianceStatus = 'FLEET_COMPLIANT';
    let severity: AirworthinessSeverity = 'INFO';
    let summary = '';

    if (groundedAircraftCount > 0) {
      fleetStatus = 'FLEET_CRITICAL_NON_COMPLIANT';
      severity = 'CRITICAL';
      summary = `CRÍTICO: ${groundedAircraftCount} aeronave(s) em solo (GROUNDED / AOG) por regra autorizada (${groundedAircraftRegistrations.join(', ')}). ` +
        `Total de ${fleetOverdueObligations} obrigação(ões) regulatória(s) vencida(s). Ação imediata de CAMO requerida.`;
    } else if (maintenanceHoldCount > 0) {
      fleetStatus = 'FLEET_RESTRICTED';
      severity = 'HIGH';
      summary = `OPERAÇÃO RESTRITA: ${maintenanceHoldCount} aeronave(s) em retenção de engenharia (MAINTENANCE_HOLD) (${restrictedAircraftRegistrations.join(', ')}). ` +
        `Zero aeronaves em solo por vencimento, porém existem ${fleetReviewRequiredObligations} obrigação(ões) pendentes de revisão técnica formal.`;
    } else if (nonCompliantAircraftCount > 0 || fleetOverdueObligations > 0) {
      // OVERDUE exists without an explicit operational grounding rule:
      // Zero-Dilution ensures this problematic condition is never masked.
      fleetStatus = 'FLEET_CRITICAL_NON_COMPLIANT';
      severity = 'CRITICAL';
      summary = `ALERTA CRÍTICO DE COMPLIANCE: ${nonCompliantAircraftCount} aeronave(s) com obrigações OVERDUE (${nonCompliantAircraftRegistrations.join(', ')}). ` +
        `Compliance da frota: FLEET_CRITICAL_NON_COMPLIANT. Condição operacional de voo: NÃO DETERMINADA (aguardando regra autorizada ou disposição de engenharia).`;
    } else if (pendingReviewAircraftCount > 0 || fleetReviewRequiredObligations > 0) {
      fleetStatus = 'FLEET_RESTRICTED';
      severity = 'HIGH';
      summary = `FROTA COM PENDÊNCIAS TÉCNICAS: ${pendingReviewAircraftCount} aeronave(s) com itens em revisão (REVIEW_REQUIRED). ` +
        `Compliance pleno da frota impedido até conclusão formal da revisão técnica.`;
    } else if (airworthyWithWarningsCount > 0 || fleetDueSoonObligations > 0) {
      fleetStatus = 'FLEET_ATTENTION';
      severity = 'MEDIUM';
      summary = `FROTA OPERACIONAL COM ALERTAS: 100% das aeronaves aptas para voo, porém ${airworthyWithWarningsCount} aeronave(s) possuem ` +
        `${fleetDueSoonObligations} obrigação(ões) na janela de alerta de vencimento (DUE_SOON). Manutenção preventiva deve ser agendada.`;
    } else {
      fleetStatus = 'FLEET_COMPLIANT';
      severity = 'INFO';
      summary = `FROTA 100% CONFORME E AERONAVEGÁVEL: Todas as ${totalAircraft} aeronaves operacionais e em total conformidade com os requisitos mandatórios. ` +
        `Índice de conformidade regulatória da frota: ${fleetComplianceRate}%.`;
    }

    const assessment: FleetAirworthinessAssessment = {
      fleetComplianceStatus,
      fleetStatus,
      severity,
      totalAircraft,
      airworthyAircraftCount,
      airworthyWithWarningsCount,
      maintenanceHoldCount,
      groundedAircraftCount,
      undeterminedAirworthinessCount,
      compliantAircraftCount,
      nonCompliantAircraftCount,
      pendingReviewAircraftCount,
      attentionAircraftCount,
      fleetAirworthinessRate,
      totalObligations,
      fleetCompliedObligations,
      fleetOverdueObligations,
      fleetDueSoonObligations,
      fleetOpenObligations,
      fleetReviewRequiredObligations,
      fleetComplianceRate,
      groundedAircraftRegistrations,
      restrictedAircraftRegistrations,
      undeterminedAircraftRegistrations,
      nonCompliantAircraftRegistrations,
      blockingObligationsSummary,
      authorityBreakdown: authorityMap,
      aircraftAssessments,
      summary,
      auditHash: '',
      engineVersion: FLEET_AIRWORTHINESS_ENGINE_VERSION,
      assessedAt: nowIso
    };

    assessment.auditHash = this.generateAuditHash(assessment);
    return assessment;
  }

  // ===========================================================================
  // AUDIT & EXPORT CAPABILITIES
  // ===========================================================================

  /**
   * Generates a tamper-evident airworthiness snapshot and stores it in the database audit trail.
   */
  public generateAirworthinessSnapshot(label = 'Operational Fleet Snapshot'): {
    snapshotId: string;
    assessment: FleetAirworthinessAssessment;
    timestamp: string;
  } {
    const assessment = this.assessFleetAirworthiness();
    const timestamp = new Date().toISOString();
    const snapshotId = `snap-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    camoDb.logAudit({
      user: 'CAMO Fleet Controller v6.4.0',
      role: 'SYSTEM',
      action: 'AIRWORTHINESS_EVALUATION',
      entityType: 'FleetAirworthinessAssessment',
      entityId: snapshotId,
      details: `Generated Airworthiness Snapshot "${label}". Status: ${assessment.fleetStatus}, Airworthy: ${assessment.fleetAirworthinessRate}%, Grounded: ${assessment.groundedAircraftCount}, Hash: ${assessment.auditHash.substring(0, 12)}...`
    });

    return {
      snapshotId,
      assessment,
      timestamp
    };
  }

  /**
   * Verifies the cryptographic integrity of any assessment object.
   */
  public verifyAssessmentIntegrity(assessment: { auditHash: string; [key: string]: any }): boolean {
    if (!assessment || !assessment.auditHash) return false;
    const computedHash = this.generateAuditHash(assessment);
    return computedHash === assessment.auditHash;
  }
}

export const fleetAirworthinessControlEngine = FleetAirworthinessControlEngine.getInstance();
