import { 
  MandatedAction, 
  ComplianceRequirement, 
  ActionComplianceAssessment, 
  ComplianceStatus 
} from '../../src/types';
import { 
  DecisionBasisItem, 
  FleetInventoryInput, 
  ApplicabilityEvaluationResult 
} from './types';
import { evaluateSoftwareRequirement } from './softwareEvaluator';
import { evaluateActionEvidence } from './evidenceEvaluator';
import { evaluateActionLifecycle } from './lifecycleEvaluator';

export interface ActionEvaluationBundle {
  assessment: ActionComplianceAssessment;
  decisionBasis: DecisionBasisItem[];
}

/**
 * Phase II — Avaliador Atômico de MandatedAction
 * Avalia cada ação individualmente sem agrupamento ou efeitos colaterais entre ações.
 */
export function evaluateMandatedAction(
  action: MandatedAction,
  requirement: ComplianceRequirement,
  applicabilityResult: ApplicabilityEvaluationResult,
  inventory: FleetInventoryInput,
  index: number
): ActionEvaluationBundle {
  const reasoning: string[] = [];
  const decisionBasis: DecisionBasisItem[] = [];
  const missingInformation: string[] = [];
  const aircraft = inventory.aircraft;

  const actionId = action.id || `action-${index + 1}`;
  const actionLabel = action.paragraphReference || `Action #${action.sequence || index + 1}`;

  // Caso 1: AD Não Aplicável à aeronave
  if (applicabilityResult.status === 'NOT_APPLICABLE') {
    const notAppMsg = `Aeronave não aplicável para esta AD. Ação [${actionLabel}] dispensada.`;
    reasoning.push(notAppMsg);
    
    return {
      assessment: {
        id: `assess-${aircraft.id}-${actionId}`,
        complianceRequirementId: requirement.id,
        aircraftId: aircraft.id,
        entityId: aircraft.id,
        mandatedActionId: actionId,
        applicabilityStatus: 'NOT_APPLICABLE',
        complianceStatus: 'NOT_REQUIRED',
        confidence: 'HIGH',
        reasoning,
        evidence: [],
        missingInformation: [],
        assessedBy: 'CAMO Rule Engine V2 (Decoupled)',
        assessmentDate: new Date().toISOString()
      },
      decisionBasis: []
    };
  }

  // Caso 2: Verificar se uma ação terminativa encerrou esta ação
  const terminatingActionExecuted = (requirement.mandatedActions || []).some(otherAct => {
    if (otherAct.id === actionId) return false;
    const isTerminatingForThis = (otherAct.terminatesMandatedActionIds || []).includes(actionId) || 
      (otherAct.isTerminatingAction && action.repetitiveInterval !== undefined);
    if (!isTerminatingForThis) return false;

    // Verificar se a ação terminativa possui accomplishment válido
    const hasValidTerminatingAcc = (inventory.actionAccomplishments || []).some(acc =>
      acc.aircraftId === aircraft.id &&
      acc.complianceRequirementId === requirement.id &&
      acc.mandatedActionId === otherAct.id &&
      acc.eventStatus === 'EXECUTED_VALID'
    );
    return hasValidTerminatingAcc;
  });

  if (terminatingActionExecuted) {
    const termMsg = `Ação [${actionLabel}] TERMINADA por ação terminativa cumprida na mesma diretriz. Dispensada de cumprimento repetitivo.`;
    reasoning.push(termMsg);
    decisionBasis.push({
      category: 'ACTION',
      source: 'RULE_ENGINE_V2',
      analyzedField: 'terminatingActionAccomplishment',
      foundValue: 'TERMINATING_ACTION_EXECUTED',
      expectedValue: 'TERMINATED',
      reason: termMsg,
      paragraphReference: action.paragraphReference,
      status: 'SATISFIED'
    });

    return {
      assessment: {
        id: `assess-${aircraft.id}-${actionId}`,
        complianceRequirementId: requirement.id,
        aircraftId: aircraft.id,
        entityId: aircraft.id,
        mandatedActionId: actionId,
        applicabilityStatus: 'APPLICABLE',
        complianceStatus: 'COMPLIED',
        confidence: 'HIGH',
        reasoning,
        evidence: [],
        missingInformation: [],
        assessedBy: 'CAMO Rule Engine V2 (Decoupled)',
        assessmentDate: new Date().toISOString()
      },
      decisionBasis
    };
  }

  // Caso 3: Avaliação de Evidência e Cumprimento Factual
  const evidenceEval = evaluateActionEvidence(
    action, 
    requirement.id, 
    inventory
  );
  decisionBasis.push(...evidenceEval.decisionBasis);
  reasoning.push(...evidenceEval.reasoning);
  missingInformation.push(...evidenceEval.missingInformation);

  // Caso 4: Avaliação de Ciclo de Vida (Lifecycle) considerando accomplishment
  const lifecycle = evaluateActionLifecycle(
    action, 
    aircraft, 
    requirement.effectiveDate, 
    evidenceEval.matchedAccomplishment
  );
  decisionBasis.push(...lifecycle.decisionBasis);
  reasoning.push(...lifecycle.reasoning);
  missingInformation.push(...lifecycle.missingInformation);

  let actionComplianceStatus: ComplianceStatus = 'OPEN';
  let actionApplicabilityStatus: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' = 
    applicabilityResult.status === 'APPLICABLE' ? 'APPLICABLE' : 'REVIEW_REQUIRED';

  // Caso 5: Ação de Software de Aviônica
  if (action.actionType === 'AVIONICS_SOFTWARE_LOAD' || action.softwareRequirement) {
    const swReq = action.softwareRequirement || {
      softwarePartNumber: action.accomplishmentReference?.documentReference || 'UNKNOWN_PN',
      targetSystem: action.targetEntity?.description || 'Avionics System',
      targetLru: action.targetEntity?.identifier,
      mandatedSoftware: action.accomplishmentReference?.documentReference
    };

    const swEval = evaluateSoftwareRequirement(swReq, inventory);
    decisionBasis.push(...swEval.decisionBasis);
    reasoning.push(...swEval.reasoning);
    missingInformation.push(...swEval.missingInformation);

    if (swEval.status === 'COMPLIED') {
      actionComplianceStatus = 'COMPLIED';
    } else if (swEval.status === 'REVIEW_REQUIRED') {
      actionComplianceStatus = 'REVIEW_REQUIRED';
    } else {
      actionComplianceStatus = lifecycle.isOverdue ? 'OVERDUE' : 'OPEN';
    }
  } else {
    // Caso 6: Ação Física / Teste / Inspeção / Revisão de Manual / Procedimento
    if (evidenceEval.hasValidEvidence) {
      if (lifecycle.isOverdue) {
        actionComplianceStatus = 'OVERDUE';
      } else {
        actionComplianceStatus = 'COMPLIED';
      }
    } else if (lifecycle.isOverdue) {
      actionComplianceStatus = 'OVERDUE';
    } else if (evidenceEval.missingInformation.length > 0 && applicabilityResult.status === 'REVIEW_REQUIRED') {
      actionComplianceStatus = 'REVIEW_REQUIRED';
    } else {
      actionComplianceStatus = 'OPEN';
    }
  }

  const assessment: ActionComplianceAssessment = {
    id: `assess-${aircraft.id}-${actionId}`,
    complianceRequirementId: requirement.id,
    aircraftId: aircraft.id,
    entityId: aircraft.id,
    mandatedActionId: actionId,
    applicabilityStatus: actionApplicabilityStatus,
    complianceStatus: actionComplianceStatus,
    confidence: missingInformation.length > 0 ? 'MEDIUM' : 'HIGH',
    reasoning,
    evidence: [],
    missingInformation,
    assessedBy: 'CAMO Rule Engine V2 (Decoupled)',
    assessmentDate: new Date().toISOString()
  };

  return {
    assessment,
    decisionBasis
  };
}
