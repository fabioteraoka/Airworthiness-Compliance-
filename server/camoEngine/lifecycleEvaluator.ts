import { MandatedAction, Aircraft, MaintenanceActionAccomplishment } from '../../src/types';
import { DecisionBasisItem } from './types';

export interface LifecycleEvaluationResult {
  isOverdue: boolean;
  isTerminating: boolean;
  dueDate?: string;
  dueHours?: number;
  dueCycles?: number;
  nextDueHours?: number;
  nextDueCycles?: number;
  nextDueDate?: string;
  reasoning: string[];
  decisionBasis: DecisionBasisItem[];
  missingInformation: string[];
}

/**
 * Avalia ciclo de vida de uma ação mandatória (Threshold, Intervalo Repetitivo, Ação Terminativa)
 * Zero-Fabrication: Não inventa contadores de horas, ciclos ou datas.
 */
export function evaluateActionLifecycle(
  action: MandatedAction,
  aircraft: Aircraft,
  effectiveDateStr?: string | null,
  latestAccomplishment?: MaintenanceActionAccomplishment
): LifecycleEvaluationResult {
  const reasoning: string[] = [];
  const decisionBasis: DecisionBasisItem[] = [];
  const missingInformation: string[] = [];

  const isTerminating = action.isTerminatingAction === true;
  let isOverdue = false;
  let dueDate: string | undefined;
  let dueHours: number | undefined;
  let dueCycles: number | undefined;
  let nextDueHours: number | undefined;
  let nextDueCycles: number | undefined;
  let nextDueDate: string | undefined;

  const threshold = action.complianceThreshold;

  // 1. Avaliação do Threshold Inicial
  if (threshold && !latestAccomplishment) {
    if (threshold.thresholdType === 'BEFORE_FURTHER_FLIGHT') {
      const msg = `Threshold mandatário: ANTES DO PRÓXIMO VOO (Before Further Flight).`;
      reasoning.push(msg);
      decisionBasis.push({
        category: 'LIFECYCLE',
        source: 'AD_DOCUMENT',
        analyzedField: 'complianceThreshold.thresholdType',
        foundValue: 'BEFORE_FURTHER_FLIGHT',
        reason: msg,
        paragraphReference: action.paragraphReference,
        status: 'REVIEW_REQUIRED'
      });
    } else if (threshold.thresholdType === 'CALENDAR_DAYS' && threshold.thresholdValue && effectiveDateStr) {
      try {
        const effDate = new Date(effectiveDateStr);
        if (!isNaN(effDate.getTime())) {
          const calculatedDue = new Date(effDate.getTime() + threshold.thresholdValue * 24 * 60 * 60 * 1000);
          dueDate = calculatedDue.toISOString().split('T')[0];
          const now = new Date();
          if (now > calculatedDue) {
            isOverdue = true;
          }
          const msg = `Prazo de calendário calculado: ${dueDate} (${threshold.thresholdValue} dias após data efetiva ${effectiveDateStr}). Status: ${isOverdue ? 'VENCIDO (OVERDUE)' : 'DENTRO DO PRAZO'}.`;
          reasoning.push(msg);
          decisionBasis.push({
            category: 'LIFECYCLE',
            source: 'RULE_ENGINE_V2',
            analyzedField: 'calculated_due_date',
            foundValue: dueDate,
            expectedValue: `Before ${dueDate}`,
            reason: msg,
            paragraphReference: action.paragraphReference,
            status: isOverdue ? 'NOT_SATISFIED' : 'SATISFIED'
          });
        }
      } catch {
        missingInformation.push(`Data efetiva válida para cálculo de threshold em: ${action.paragraphReference || 'Ação'}`);
      }
    } else if (threshold.thresholdType === 'FLIGHT_HOURS' && threshold.thresholdValue) {
      dueHours = threshold.thresholdValue;
      if (aircraft.totalFlightHours && aircraft.totalFlightHours > threshold.thresholdValue) {
        reasoning.push(`Threshold de horas de voo: ${threshold.thresholdValue} FH.`);
      }
    } else if (threshold.thresholdType === 'FLIGHT_CYCLES' && threshold.thresholdValue) {
      dueCycles = threshold.thresholdValue;
      reasoning.push(`Threshold de ciclos de voo: ${threshold.thresholdValue} FC.`);
    }
  }

  // 2. Avaliação de Intervalo Repetitivo
  if (action.repetitiveInterval) {
    const rep = action.repetitiveInterval;
    if (latestAccomplishment) {
      if (rep.intervalType === 'FLIGHT_HOURS' && rep.intervalValue) {
        nextDueHours = (latestAccomplishment.accomplishmentFlightHours || 0) + rep.intervalValue;
        const currentHours = aircraft.totalFlightHours || 0;
        if (currentHours > nextDueHours) {
          isOverdue = true;
          const msg = `Ação repetitiva VENCIDA por horas de voo: Executada com ${latestAccomplishment.accomplishmentFlightHours} FH, limite de ${nextDueHours} FH (Intervalo: ${rep.intervalValue} FH), Horas atuais: ${currentHours} FH.`;
          reasoning.push(msg);
          decisionBasis.push({
            category: 'LIFECYCLE',
            source: 'RULE_ENGINE_V2',
            analyzedField: 'repetitiveInterval.flightHours',
            foundValue: `${currentHours} FH`,
            expectedValue: `< ${nextDueHours} FH`,
            reason: msg,
            paragraphReference: action.paragraphReference,
            status: 'NOT_SATISFIED'
          });
        } else {
          reasoning.push(`Próximo vencimento repetitivo por horas de voo: ${nextDueHours} FH (Atual: ${currentHours} FH).`);
        }
      } else if (rep.intervalType === 'FLIGHT_CYCLES' && rep.intervalValue) {
        nextDueCycles = (latestAccomplishment.accomplishmentCycles || 0) + rep.intervalValue;
        const currentCycles = aircraft.totalCycles || 0;
        if (currentCycles > nextDueCycles) {
          isOverdue = true;
          const msg = `Ação repetitiva VENCIDA por ciclos de voo: Executada com ${latestAccomplishment.accomplishmentCycles} FC, limite de ${nextDueCycles} FC (Intervalo: ${rep.intervalValue} FC), Ciclos atuais: ${currentCycles} FC.`;
          reasoning.push(msg);
          decisionBasis.push({
            category: 'LIFECYCLE',
            source: 'RULE_ENGINE_V2',
            analyzedField: 'repetitiveInterval.flightCycles',
            foundValue: `${currentCycles} FC`,
            expectedValue: `< ${nextDueCycles} FC`,
            reason: msg,
            paragraphReference: action.paragraphReference,
            status: 'NOT_SATISFIED'
          });
        } else {
          reasoning.push(`Próximo vencimento repetitivo por ciclos de voo: ${nextDueCycles} FC (Atual: ${currentCycles} FC).`);
        }
      } else if (rep.intervalType === 'CALENDAR_DAYS' && rep.intervalValue && latestAccomplishment.accomplishmentDate) {
        try {
          const lastDate = new Date(latestAccomplishment.accomplishmentDate);
          if (!isNaN(lastDate.getTime())) {
            const nextDateObj = new Date(lastDate.getTime() + rep.intervalValue * 24 * 60 * 60 * 1000);
            nextDueDate = nextDateObj.toISOString().split('T')[0];
            const now = new Date();
            if (now > nextDateObj) {
              isOverdue = true;
              const msg = `Ação repetitiva VENCIDA por calendário: Última execução em ${latestAccomplishment.accomplishmentDate}, limite ${nextDueDate} (Intervalo: ${rep.intervalValue} dias).`;
              reasoning.push(msg);
              decisionBasis.push({
                category: 'LIFECYCLE',
                source: 'RULE_ENGINE_V2',
                analyzedField: 'repetitiveInterval.calendarDays',
                foundValue: new Date().toISOString().split('T')[0],
                expectedValue: `< ${nextDueDate}`,
                reason: msg,
                paragraphReference: action.paragraphReference,
                status: 'NOT_SATISFIED'
              });
            } else {
              reasoning.push(`Próximo vencimento repetitivo por calendário: ${nextDueDate}.`);
            }
          }
        } catch {
          missingInformation.push(`Data válida de cumprimento anterior para cálculo do intervalo repetitivo em: ${action.paragraphReference || 'Ação'}`);
        }
      }
    } else {
      reasoning.push(`Ação repetitiva aguardando cumprimento inicial com intervalo: ${rep.rawDescription || `${rep.intervalValue} ${rep.intervalType}`}`);
    }
  }

  return {
    isOverdue,
    isTerminating,
    dueDate,
    dueHours,
    dueCycles,
    nextDueHours,
    nextDueCycles,
    nextDueDate,
    reasoning,
    decisionBasis,
    missingInformation
  };
}
