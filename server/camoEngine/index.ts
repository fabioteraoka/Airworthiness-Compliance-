import { 
  ComplianceRequirement, 
  MandatedAction, 
  ActionComplianceAssessment 
} from '../../src/types';
import { 
  CamoAssessment, 
  FleetInventoryInput, 
  DecisionBasisItem 
} from './types';
import { evaluateApplicability } from './applicabilityEvaluator';
import { evaluateMandatedAction } from './mandatedActionEvaluator';
import { aggregateCompliance } from './complianceAggregator';

export * from './types';
export * from './applicabilityEvaluator';
export * from './externalEffectivityEvaluator';
export * from './softwareEvaluator';
export * from './mandatedActionEvaluator';
export * from './evidenceEvaluator';
export * from './lifecycleEvaluator';
export * from './complianceAggregator';
export * from './complianceObligationService';
export * from './dueDateThresholdEngine';
export * from './evidenceVerificationEngine';
export * from './fleetAirworthinessControlEngine';
export * from './aircraftDeliveryAssessmentEngine';

/**
 * Ponto de Entrada Principal do CAMO Rule Engine V2 (Decoupled Engine)
 * Executa a avaliação em 3 fases com garantia de Zero-Fabrication e Precedência Estrita.
 */
export function evaluateCamoCompliance(
  requirement: ComplianceRequirement,
  inventory: FleetInventoryInput
): CamoAssessment {
  const aircraft = inventory.aircraft;
  const allDecisionBasis: DecisionBasisItem[] = [];

  // ==========================================
  // PHASE I: APPLICABILITY GATEWAY
  // ==========================================
  const applicabilityResult = evaluateApplicability(requirement, inventory);
  allDecisionBasis.push(...applicabilityResult.decisionBasis);

  // ==========================================
  // PHASE II: ATOMIC MANDATED ACTIONS EVALUATION
  // ==========================================
  const actionAssessments: ActionComplianceAssessment[] = [];

  // Identificar ações com autoridade (mandatedActions[] > actions[] legado)
  let actionsToEvaluate: MandatedAction[] = [];
  if (requirement.mandatedActions && requirement.mandatedActions.length > 0) {
    actionsToEvaluate = requirement.mandatedActions;
  } else if (requirement.actions && requirement.actions.length > 0) {
    // Adapter temporário para registros legados que só possuem actions[]
    actionsToEvaluate = requirement.actions.map(a => ({
      id: a.id,
      paragraphReference: a.paragraphReference,
      actionType: a.actionType as any,
      description: a.actionName || a.fullInstruction,
      sequence: a.sequence,
      complianceThreshold: a.complianceTime ? { rawDescription: a.complianceTime } : undefined,
      repetitiveInterval: a.repetitiveInterval ? { rawDescription: a.repetitiveInterval } : undefined,
      isTerminatingAction: !!a.terminatingAction
    }));
  }

  for (let i = 0; i < actionsToEvaluate.length; i++) {
    const action = actionsToEvaluate[i];
    const { assessment, decisionBasis } = evaluateMandatedAction(
      action,
      requirement,
      applicabilityResult,
      inventory,
      i
    );
    actionAssessments.push(assessment);
    allDecisionBasis.push(...decisionBasis);
  }

  // ==========================================
  // PHASE III: COMPLIANCE AGGREGATION
  // ==========================================
  const aggregated = aggregateCompliance(
    applicabilityResult,
    actionAssessments,
    allDecisionBasis
  );

  const combinedReasoning = [
    ...applicabilityResult.reasoning,
    ...aggregated.reasoning
  ];

  const camoAssessment: CamoAssessment = {
    id: `camo-assess-${aircraft.id}-${requirement.id}-${Date.now()}`,
    complianceRequirementId: requirement.id,
    adNumber: requirement.sourceNumber || 'AD',
    aircraftId: aircraft.id,
    aircraftRegistration: aircraft.registration,
    aircraftMsn: aircraft.msn,
    aircraftModel: aircraft.model,
    applicabilityStatus: applicabilityResult.status,
    complianceStatus: aggregated.complianceStatus,
    confidence: applicabilityResult.confidence,
    reasoning: combinedReasoning,
    decisionBasis: allDecisionBasis,
    missingInformation: aggregated.missingInformation,
    actionAssessments,
    legacyResultEquivalent: aggregated.legacyResultEquivalent,
    assessedBy: 'CAMO Rule Engine V2 (Decoupled)',
    assessmentDate: new Date().toISOString(),
    engineVersion: '2.0.0-DECOUPLED'
  };

  return camoAssessment;
}
