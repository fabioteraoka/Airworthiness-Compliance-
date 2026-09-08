import { 
  ActionComplianceAssessment, 
  ComplianceStatus, 
  AssessmentResult 
} from '../../src/types';
import { 
  ApplicabilityEvaluationResult, 
  DecisionBasisItem, 
  CamoAssessment, 
  FleetInventoryInput 
} from './types';

export interface AggregationResult {
  complianceStatus: ComplianceStatus;
  legacyResultEquivalent: AssessmentResult;
  reasoning: string[];
  missingInformation: string[];
}

/**
 * Phase III — Compliance Aggregator
 * Implementa a matriz de precedência estrita:
 * NOT_APPLICABLE -> REVIEW_REQUIRED -> OVERDUE -> OPEN -> PARTIALLY_COMPLIED -> COMPLIED
 */
export function aggregateCompliance(
  applicability: ApplicabilityEvaluationResult,
  actionAssessments: ActionComplianceAssessment[],
  allDecisionBasis: DecisionBasisItem[]
): AggregationResult {
  const reasoning: string[] = [];
  const missingInfoSet = new Set<string>();

  for (const item of applicability.missingInformation) {
    missingInfoSet.add(item);
  }

  for (const action of actionAssessments) {
    for (const item of action.missingInformation || []) {
      missingInfoSet.add(item);
    }
  }

  // 1. Precedência 1: NOT_APPLICABLE de Célula
  if (applicability.status === 'NOT_APPLICABLE') {
    reasoning.push('AD determinada como NÃO APLICÁVEL para a aeronave/célula.');
    return {
      complianceStatus: 'NOT_REQUIRED',
      legacyResultEquivalent: 'NOT_APPLICABLE',
      reasoning,
      missingInformation: Array.from(missingInfoSet)
    };
  }

  // 2. Precedência 2: REVIEW_REQUIRED (Incerteza Técnica de Célula ou Ação)
  if (applicability.status === 'REVIEW_REQUIRED') {
    reasoning.push('Aplicabilidade primária da AD depende de revisão técnica (documento de efetividade externa ou dados de série pendentes).');
    return {
      complianceStatus: 'REVIEW_REQUIRED',
      legacyResultEquivalent: 'REVIEW_REQUIRED',
      reasoning,
      missingInformation: Array.from(missingInfoSet)
    };
  }

  // Se não houver ações mandatórias extraídas
  if (actionAssessments.length === 0) {
    reasoning.push('Nenhuma ação mandatória extraída para avaliação de cumprimento.');
    return {
      complianceStatus: 'REVIEW_REQUIRED',
      legacyResultEquivalent: 'REVIEW_REQUIRED',
      reasoning,
      missingInformation: ['Ações mandatórias do requisito']
    };
  }

  const actionStatuses = actionAssessments.map(a => a.complianceStatus);
  const hasReviewRequiredAction = actionStatuses.includes('REVIEW_REQUIRED');
  const hasOverdueAction = actionStatuses.includes('OVERDUE');
  const hasOpenAction = actionStatuses.includes('OPEN');
  const hasCompliedAction = actionStatuses.includes('COMPLIED');
  const allComplied = actionStatuses.every(s => s === 'COMPLIED');
  const allOpen = actionStatuses.every(s => s === 'OPEN');

  // Se qualquer ação requer revisão técnica
  if (hasReviewRequiredAction) {
    reasoning.push(`Existe(m) ${actionStatuses.filter(s => s === 'REVIEW_REQUIRED').length} ação(ões) com pendência de verificação técnica/software.`);
    return {
      complianceStatus: 'REVIEW_REQUIRED',
      legacyResultEquivalent: 'REVIEW_REQUIRED',
      reasoning,
      missingInformation: Array.from(missingInfoSet)
    };
  }

  // 3. Precedência 3: OVERDUE (Prazo regulatório estourado)
  if (hasOverdueAction) {
    reasoning.push(`Bloqueio de aeronavegabilidade: ${actionStatuses.filter(s => s === 'OVERDUE').length} ação(ões) com prazo regulatório VENCIDO.`);
    return {
      complianceStatus: 'OVERDUE',
      legacyResultEquivalent: 'APPLICABLE',
      reasoning,
      missingInformation: Array.from(missingInfoSet)
    };
  }

  // 4. Todas cumpridas
  if (allComplied) {
    reasoning.push(`Todas as ${actionAssessments.length} ações mandatórias estão formalmente CUMPRIDAS (COMPLIED) com evidência técnica.`);
    return {
      complianceStatus: 'COMPLIED',
      legacyResultEquivalent: 'APPLICABLE',
      reasoning,
      missingInformation: []
    };
  }

  // 5. Todas em aberto
  if (allOpen) {
    reasoning.push(`Todas as ${actionAssessments.length} ações mandatórias estão PENDENTES DE EXECUÇÃO (OPEN).`);
    return {
      complianceStatus: 'OPEN',
      legacyResultEquivalent: 'APPLICABLE',
      reasoning,
      missingInformation: Array.from(missingInfoSet)
    };
  }

  // 6. Parcialmente cumpridas (algumas COMPLIED e outras OPEN)
  if (hasCompliedAction && hasOpenAction) {
    const compliedCount = actionStatuses.filter(s => s === 'COMPLIED').length;
    reasoning.push(`Cumprimento parcial: ${compliedCount} de ${actionAssessments.length} ações mandatórias cumpridas.`);
    return {
      complianceStatus: 'PARTIALLY_COMPLIED',
      legacyResultEquivalent: 'APPLICABLE',
      reasoning,
      missingInformation: Array.from(missingInfoSet)
    };
  }

  return {
    complianceStatus: 'OPEN',
    legacyResultEquivalent: 'APPLICABLE',
    reasoning: ['Ações mandatórias abertas.'],
    missingInformation: Array.from(missingInfoSet)
  };
}
