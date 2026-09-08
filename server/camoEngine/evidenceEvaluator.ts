import { Evidence, MandatedAction, MaintenanceActionAccomplishment } from '../../src/types';
import { DecisionBasisItem, FleetInventoryInput } from './types';

export interface EvidenceEvaluationResult {
  hasValidEvidence: boolean;
  isOverdue: boolean;
  matchedAccomplishment?: MaintenanceActionAccomplishment;
  matchedEvidences: Evidence[];
  reasoning: string[];
  decisionBasis: DecisionBasisItem[];
  missingInformation: string[];
}

/**
 * Avalia fatos históricos de cumprimento (MaintenanceActionAccomplishment) e evidências técnicas
 * Zero-Fabrication: Ausência de cumprimento válido / evidência verificada NUNCA gera COMPLIED.
 */
export function evaluateActionEvidence(
  action: MandatedAction,
  requirementId: string,
  inventory: FleetInventoryInput,
  isOverdue: boolean = false
): EvidenceEvaluationResult {
  const reasoning: string[] = [];
  const decisionBasis: DecisionBasisItem[] = [];
  const missingInformation: string[] = [];
  const aircraftId = inventory.aircraft.id;

  const allEvidences: Evidence[] = inventory.evidence || [];
  const allAccomplishments: MaintenanceActionAccomplishment[] = inventory.actionAccomplishments || [];

  // 1. Buscar registros de MaintenanceActionAccomplishment válidos
  const validAccomplishments = allAccomplishments
    .filter(acc => 
      acc.aircraftId === aircraftId &&
      acc.complianceRequirementId === requirementId &&
      acc.mandatedActionId === action.id &&
      acc.eventStatus === 'EXECUTED_VALID'
    )
    .sort((a, b) => {
      // Ordenar do mais recente para o mais antigo por horas/data
      const diffHours = (b.accomplishmentFlightHours || 0) - (a.accomplishmentFlightHours || 0);
      if (diffHours !== 0) return diffHours;
      return new Date(b.accomplishmentDate).getTime() - new Date(a.accomplishmentDate).getTime();
    });

  if (validAccomplishments.length > 0) {
    const latestAcc = validAccomplishments[0];
    
    // Verificar se as evidências anexadas ao accomplishment estão verificadas
    const linkedEvidences = allEvidences.filter(ev => 
      (latestAcc.evidenceIds || []).includes(ev.id)
    );

    // Se houver evidenceIds declaradas, todas ou ao menos as vinculadas devem estar verificadas
    const unverifiedLinked = linkedEvidences.filter(ev => !ev.verified);

    if (latestAcc.evidenceIds.length === 0 && linkedEvidences.length === 0) {
      // Accomplishment registrado sem evidência anexada -> requer revisão de comprovação
      const msg = `Cumprimento de manutenção registrado (W/O ${latestAcc.workOrderReference}), mas NENHUMA evidência documental anexada (evidenceIds vazio). Revisão necessária.`;
      reasoning.push(msg);
      missingInformation.push(`Evidência documental comprobatória para a W/O ${latestAcc.workOrderReference}`);
      decisionBasis.push({
        category: 'EVIDENCE',
        source: 'TECH_LOG',
        analyzedField: 'actionAccomplishment.evidenceIds',
        foundValue: 'NENHUMA EVIDÊNCIA ANEXADA',
        expectedValue: 'VERIFIED_EVIDENCE_ATTACHMENT',
        reason: msg,
        paragraphReference: action.paragraphReference,
        status: 'REVIEW_REQUIRED'
      });

      return {
        hasValidEvidence: false,
        isOverdue,
        matchedAccomplishment: latestAcc,
        matchedEvidences: [],
        reasoning,
        decisionBasis,
        missingInformation
      };
    }

    if (unverifiedLinked.length > 0) {
      const msg = `Cumprimento registrado (W/O ${latestAcc.workOrderReference}), porém possui evidência(s) NÃO VERIFICADA(S) pela equipe CAMO.`;
      reasoning.push(msg);
      missingInformation.push(`Verificação formal das evidências: ${unverifiedLinked.map(e => e.documentReference).join(', ')}`);
      decisionBasis.push({
        category: 'EVIDENCE',
        source: 'TECH_LOG',
        analyzedField: 'evidence.verified',
        foundValue: 'UNVERIFIED',
        expectedValue: 'VERIFIED',
        reason: msg,
        paragraphReference: action.paragraphReference,
        status: 'REVIEW_REQUIRED'
      });

      return {
        hasValidEvidence: false,
        isOverdue,
        matchedAccomplishment: latestAcc,
        matchedEvidences: linkedEvidences,
        reasoning,
        decisionBasis,
        missingInformation
      };
    }

    // Cumprimento válido com evidências verificadas
    const msg = `Cumprimento válido de manutenção confirmado: W/O ${latestAcc.workOrderReference} em ${latestAcc.accomplishmentDate} (${latestAcc.accomplishmentFlightHours} FH / ${latestAcc.accomplishmentCycles} FC). Evidências técnicas verificadas.`;
    reasoning.push(msg);
    decisionBasis.push({
      category: 'ACTION',
      source: 'TECH_LOG',
      analyzedField: 'actionAccomplishment.workOrderReference',
      foundValue: `W/O: ${latestAcc.workOrderReference} (${latestAcc.accomplishmentFlightHours} FH)`,
      expectedValue: 'EXECUTED_VALID',
      reason: msg,
      paragraphReference: action.paragraphReference,
      status: 'SATISFIED'
    });

    return {
      hasValidEvidence: true,
      isOverdue: false,
      matchedAccomplishment: latestAcc,
      matchedEvidences: linkedEvidences,
      reasoning,
      decisionBasis,
      missingInformation: []
    };
  }

  // 2. Fallback de correspondência de evidências diretas no DB
  const matchingEvidences = allEvidences.filter(ev => {
    if (ev.complianceRequirementId && ev.complianceRequirementId !== requirementId) {
      return false;
    }
    const descMatch = action.accomplishmentReference?.documentReference && 
      ev.documentReference?.toLowerCase().includes(action.accomplishmentReference.documentReference.toLowerCase());
    const actionDescMatch = ev.description?.toLowerCase().includes(action.description.slice(0, 30).toLowerCase());
    const paragraphMatch = action.paragraphReference && ev.description?.includes(action.paragraphReference);

    return (descMatch || actionDescMatch || paragraphMatch) && ev.verified;
  });

  if (matchingEvidences.length > 0) {
    const evRefs = matchingEvidences.map(e => `${e.type}: ${e.documentReference}`).join(', ');
    const msg = `Evidência técnica verificada encontrada para ação [${action.paragraphReference || action.description.slice(0, 30)}]: ${evRefs}.`;
    reasoning.push(msg);
    decisionBasis.push({
      category: 'EVIDENCE',
      source: 'TECH_LOG',
      analyzedField: 'evidence_records',
      foundValue: evRefs,
      expectedValue: 'VERIFIED_RECORD',
      reason: msg,
      paragraphReference: action.paragraphReference,
      status: 'SATISFIED'
    });

    return {
      hasValidEvidence: true,
      isOverdue: false,
      matchedEvidences: matchingEvidences,
      reasoning,
      decisionBasis,
      missingInformation: []
    };
  }

  // Ausência de cumprimento e evidência
  if (isOverdue) {
    const msg = `Nenhum registro de cumprimento (MaintenanceActionAccomplishment) ou evidência técnica verificada para [${action.paragraphReference || 'Ação'}]. Prazo regulatório VENCIDO (OVERDUE).`;
    reasoning.push(msg);
    missingInformation.push(`Registro de cumprimento (W/O) para ${action.paragraphReference || action.description.slice(0, 40)}`);
    decisionBasis.push({
      category: 'EVIDENCE',
      source: 'FLEET_INVENTORY',
      analyzedField: 'maintenance_records',
      foundValue: 'NENHUM CUMPRIMENTO VÁLIDO',
      expectedValue: 'EXECUTED_VALID_ACCOMPLISHMENT',
      reason: msg,
      paragraphReference: action.paragraphReference,
      status: 'NOT_SATISFIED'
    });

    return {
      hasValidEvidence: false,
      isOverdue: true,
      matchedEvidences: [],
      reasoning,
      decisionBasis,
      missingInformation
    };
  }

  const msg = `Nenhum cumprimento factual válido registrado para [${action.paragraphReference || 'Ação'}]. Status permanece ABERTO (OPEN).`;
  reasoning.push(msg);
  missingInformation.push(`Cumprimento/evidência para: ${action.paragraphReference || action.description.slice(0, 40)}`);
  decisionBasis.push({
    category: 'EVIDENCE',
    source: 'FLEET_INVENTORY',
    analyzedField: 'maintenance_records',
    foundValue: 'NENHUM CUMPRIMENTO VÁLIDO',
    expectedValue: 'EXECUTED_VALID_ACCOMPLISHMENT',
    reason: msg,
    paragraphReference: action.paragraphReference,
    status: 'NOT_SATISFIED'
  });

  return {
    hasValidEvidence: false,
    isOverdue: false,
    matchedEvidences: [],
    reasoning,
    decisionBasis,
    missingInformation
  };
}
