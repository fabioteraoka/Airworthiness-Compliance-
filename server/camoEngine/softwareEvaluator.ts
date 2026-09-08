import { SoftwareRequirement, InstalledSoftwareRecord } from '../../src/types';
import { 
  SoftwareEvaluationResult, 
  DecisionBasisItem, 
  FleetInventoryInput
} from './types';

/**
 * Normaliza P/N ou versão de software para matching confiável
 */
function normalizePartNumber(pn: string): string {
  return pn.toUpperCase().trim().replace(/[\s\-_]/g, '');
}

/**
 * Phase II — Avaliador de Requisitos de Software de Aviônica
 * Avalia posições atômicas de LRU (ex: FCC A, FCC B, MDS Display Units, EEC, FMS).
 * Consome registros canônicos de InstalledSoftwareRecord com status INSTALLED.
 */
export function evaluateSoftwareRequirement(
  req: SoftwareRequirement,
  inventory: FleetInventoryInput
): SoftwareEvaluationResult {
  const reasoning: string[] = [];
  const decisionBasis: DecisionBasisItem[] = [];
  const missingInformation: string[] = [];
  const aircraftId = inventory.aircraft.id;

  const installedRecords: InstalledSoftwareRecord[] = (inventory.installedSoftware || [])
    .filter(inst => inst.status === 'INSTALLED' && (!inst.aircraftId || inst.aircraftId === aircraftId));

  // Buscar registro correspondente ao targetSystem, targetLru ou installationPosition
  const targetSysNorm = (req.targetSystem || '').toUpperCase();
  const targetLruNorm = (req.targetLru || '').toUpperCase();
  const targetPosNorm = (req.installationPosition || '').toUpperCase();

  const matchingInstalled = installedRecords.find(inst => {
    const instSys = (inst.targetSystem || '').toUpperCase();
    const instLru = (inst.lruIdentifier || '').toUpperCase();
    const instPos = (inst.lruPosition || '').toUpperCase();

    if (targetLruNorm && (instLru.includes(targetLruNorm) || targetLruNorm.includes(instLru))) return true;
    if (targetPosNorm && (instPos.includes(targetPosNorm) || targetPosNorm.includes(instPos))) return true;
    if (targetSysNorm && (instSys.includes(targetSysNorm) || targetSysNorm.includes(instSys))) return true;
    return false;
  });

  // Zero-Fabrication: Se não houver dados de software ativo instalado para esta LRU
  if (!matchingInstalled || !matchingInstalled.softwarePartNumber) {
    const lruLabel = req.targetLru || req.installationPosition || req.targetSystem || 'Aviônica';
    const msg = `Inventário de software para [${lruLabel}] na aeronave ${inventory.aircraft.registration} (MSN ${inventory.aircraft.msn}) está UNKNOWN/Indisponível ou não possui registro ativo (INSTALLED). Impossível determinar versão carregada.`;
    reasoning.push(msg);
    missingInformation.push(`Versão/PN do software carregado em: ${lruLabel}`);
    
    decisionBasis.push({
      category: 'SOFTWARE',
      source: 'FLEET_INVENTORY',
      analyzedField: `installedSoftware[${lruLabel}]`,
      foundValue: 'UNKNOWN / NO_ACTIVE_RECORD',
      expectedValue: req.mandatedSoftware || req.softwarePartNumber,
      reason: msg,
      paragraphReference: req.targetLru || req.installationPosition,
      status: 'REVIEW_REQUIRED'
    });

    return {
      status: 'REVIEW_REQUIRED',
      confidence: 'HIGH',
      reasoning,
      decisionBasis,
      missingInformation,
      isMandatedLoaded: false,
      isProhibitedFound: false
    };
  }

  const installedPn = matchingInstalled.softwarePartNumber;
  const normInstalledPn = normalizePartNumber(installedPn);

  // 1. Verificar Softwares Proibidos
  if (req.prohibitedSoftware && req.prohibitedSoftware.length > 0) {
    for (const prohibited of req.prohibitedSoftware) {
      if (normalizePartNumber(prohibited) === normInstalledPn) {
        const msg = `Software proibido pela AD detectado em [${req.targetLru || req.targetSystem}]: P/N ${installedPn}. Aeronave NÃO CONFORME / Ação aberta.`;
        reasoning.push(msg);
        decisionBasis.push({
          category: 'SOFTWARE',
          source: 'FLEET_INVENTORY',
          analyzedField: 'prohibitedSoftware',
          foundValue: installedPn,
          expectedValue: `NOT ${prohibited}`,
          reason: msg,
          paragraphReference: req.targetLru,
          status: 'NOT_SATISFIED'
        });

        return {
          status: 'OPEN',
          confidence: 'HIGH',
          reasoning,
          decisionBasis,
          missingInformation: [],
          installedSoftwareFound: matchingInstalled,
          isMandatedLoaded: false,
          isProhibitedFound: true
        };
      }
    }
  }

  // 2. Verificar Software Mandatório
  const mandatedTarget = req.mandatedSoftware || req.softwarePartNumber;
  if (mandatedTarget) {
    const normMandated = normalizePartNumber(mandatedTarget);
    if (normInstalledPn === normMandated) {
      const msg = `Software mandatório [P/N ${mandatedTarget}] confirmado como carregado em [${req.targetLru || req.targetSystem}].`;
      reasoning.push(msg);
      decisionBasis.push({
        category: 'SOFTWARE',
        source: 'FLEET_INVENTORY',
        analyzedField: 'mandatedSoftware',
        foundValue: installedPn,
        expectedValue: mandatedTarget,
        reason: msg,
        paragraphReference: req.targetLru,
        status: 'SATISFIED'
      });

      return {
        status: 'COMPLIED',
        confidence: 'HIGH',
        reasoning,
        decisionBasis,
        missingInformation: [],
        installedSoftwareFound: matchingInstalled,
        isMandatedLoaded: true,
        isProhibitedFound: false
      };
    } else {
      const msg = `Software mandatório [P/N ${mandatedTarget}] NÃO está carregado em [${req.targetLru || req.targetSystem}]. P/N instalado atual: [${installedPn}].`;
      reasoning.push(msg);
      decisionBasis.push({
        category: 'SOFTWARE',
        source: 'FLEET_INVENTORY',
        analyzedField: 'mandatedSoftware',
        foundValue: installedPn,
        expectedValue: mandatedTarget,
        reason: msg,
        paragraphReference: req.targetLru,
        status: 'NOT_SATISFIED'
      });

      return {
        status: 'OPEN',
        confidence: 'HIGH',
        reasoning,
        decisionBasis,
        missingInformation: [],
        installedSoftwareFound: matchingInstalled,
        isMandatedLoaded: false,
        isProhibitedFound: false
      };
    }
  }

  return {
    status: 'REVIEW_REQUIRED',
    confidence: 'MEDIUM',
    reasoning: ['Requisito de software não especifica P/N mandatório nem proibido de forma clara.'],
    decisionBasis,
    missingInformation: ['Critério de conformidade de software mandatório'],
    installedSoftwareFound: matchingInstalled,
    isMandatedLoaded: false,
    isProhibitedFound: false
  };
}
