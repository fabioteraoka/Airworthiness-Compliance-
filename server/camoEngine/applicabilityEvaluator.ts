import { 
  ComplianceRequirement, 
  ApplicabilityRule, 
  Aircraft 
} from '../../src/types';
import { 
  ApplicabilityEvaluationResult, 
  DecisionBasisItem, 
  FleetInventoryInput 
} from './types';
import { evaluateExternalEffectivity } from './externalEffectivityEvaluator';
import { matchesModel, getCanonicalAircraftModel, buildDynamicApplicabilityCriteria, isSerialInRange } from '../ruleEngine';

/**
 * Phase I — Avaliador de Aplicabilidade Primária (Célula / Aeronave / Dynamic Criteria)
 * Desacoplado de conformidade e de ações individuais.
 * Itera sobre os critérios dinâmicos com regras:
 * - IF status == 'NOT_REQUIRED': CONTINUE (ignora o critério)
 * - IF status == 'NOT_EXTRACTED': REVIEW_REQUIRED (falha de extração regulatória)
 * - IF status == 'UNKNOWN_FLEET_DATA': REVIEW_REQUIRED (falha de dados da frota)
 * - IF status == 'REQUIRED': Avalia estritamente contra o inventário da frota
 */
export function evaluateApplicability(
  req: ComplianceRequirement,
  inventory: FleetInventoryInput
): ApplicabilityEvaluationResult {
  const aircraft = inventory.aircraft;
  const reasoning: string[] = [];
  const decisionBasis: DecisionBasisItem[] = [];
  const missingInformation: string[] = [];

  // Obter ou construir critérios dinâmicos de aplicabilidade
  const criteria = buildDynamicApplicabilityCriteria(req);
  req.applicabilityCriteria = criteria;

  // 1. Validar se há ao menos um critério ou modelo extraído
  if (criteria.aircraftModel.status === 'NOT_EXTRACTED') {
    reasoning.push('Critério de modelo de aeronave não pôde ser extraído com segurança do texto da AD (status: NOT_EXTRACTED).');
    missingInformation.push('Regras de aplicabilidade de modelo de aeronave');
    decisionBasis.push({
      category: 'APPLICABILITY',
      source: 'AD_DOCUMENT',
      analyzedField: 'applicabilityCriteria.aircraftModel',
      foundValue: 'NOT_EXTRACTED',
      reason: 'Ausência ou falha na extração de modelos afetados da AD.',
      status: 'REVIEW_REQUIRED'
    });
    return {
      status: 'REVIEW_REQUIRED',
      confidence: 'LOW',
      reasoning,
      decisionBasis,
      missingInformation,
      externalEffectivityRequired: false,
      externalEffectivityVerified: false
    };
  }

  // 2. Avaliação Estrita de Modelo de Aeronave (se REQUIRED)
  let matchingModelName = '';
  if (criteria.aircraftModel.status === 'REQUIRED') {
    const targetModels = criteria.aircraftModel.values || [];
    const modelMatched = matchesModel(`${aircraft.manufacturer} ${aircraft.model}`, targetModels);

    if (!modelMatched) {
      const acCanon = getCanonicalAircraftModel(aircraft.model || '');
      let mismatchDetail = `Canonical model mismatch. Aircraft model [${aircraft.model}] does not match AD applicable models (${targetModels.join(', ')}).`;
      
      if (acCanon.family === 'B737_NG' && targetModels.some(m => getCanonicalAircraftModel(m).family === 'B737_MAX')) {
        mismatchDetail = `Canonical model mismatch. ${aircraft.model} (Boeing 737 Next Generation / NG) is not equivalent to Boeing 737 MAX (${targetModels.join(', ')}).`;
      } else if (acCanon.family === 'B737_MAX' && targetModels.some(m => getCanonicalAircraftModel(m).family === 'B737_NG')) {
        mismatchDetail = `Canonical model mismatch. ${aircraft.model} (Boeing 737 MAX) is not equivalent to Boeing 737 Next Generation / NG (${targetModels.join(', ')}).`;
      } else if (acCanon.family.startsWith('A320') && targetModels.some(m => getCanonicalAircraftModel(m).family.startsWith('B737'))) {
        mismatchDetail = `Canonical model mismatch. Aircraft ${aircraft.model} (${aircraft.manufacturer || 'Airbus'}) is not equivalent to Boeing 737 (${targetModels.join(', ')}).`;
      }

      reasoning.push(mismatchDetail);
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'FLEET_INVENTORY',
        analyzedField: 'aircraft.model',
        foundValue: aircraft.model,
        expectedValue: targetModels,
        reason: mismatchDetail,
        status: 'NOT_SATISFIED'
      });

      return {
        status: 'NOT_APPLICABLE',
        confidence: 'HIGH',
        reasoning,
        decisionBasis,
        missingInformation: [],
        externalEffectivityRequired: false,
        externalEffectivityVerified: false
      };
    }

    matchingModelName = targetModels.find(m => matchesModel(aircraft.model, [m])) || targetModels[0] || aircraft.model;
    const modelMatchMsg = `Modelo da aeronave [${aircraft.model}] é aplicável à AD (coincide canonicamente com [${matchingModelName}]).`;
    reasoning.push(modelMatchMsg);
    decisionBasis.push({
      category: 'APPLICABILITY',
      source: 'FLEET_INVENTORY',
      analyzedField: 'aircraft.model',
      foundValue: aircraft.model,
      expectedValue: matchingModelName,
      reason: modelMatchMsg,
      status: 'SATISFIED'
    });
  }

  // 3. Avaliar Dependência de Efetividade Externa (Phase I - Gatekeeper)
  const isExternalDocBased = Boolean(
    req.referencedDocuments?.some(d => d.availabilityStatus === 'NOT_AVAILABLE' && d.requiredForEvaluation !== false) ||
    (req.externalEffectivityReferences && req.externalEffectivityReferences.length > 0)
  );

  const extEval = evaluateExternalEffectivity(
    req.externalEffectivityReferences,
    isExternalDocBased,
    inventory
  );

  decisionBasis.push(...extEval.decisionBasis);
  reasoning.push(...extEval.reasoning);
  missingInformation.push(...extEval.missingInformation);

  if (extEval.status === 'REVIEW_REQUIRED') {
    return {
      status: 'REVIEW_REQUIRED',
      confidence: 'HIGH',
      reasoning,
      decisionBasis,
      missingInformation,
      matchedModel: matchingModelName,
      matchedMsn: aircraft.msn,
      externalEffectivityRequired: true,
      externalEffectivityVerified: false
    };
  }

  if (extEval.status === 'NOT_APPLICABLE') {
    return {
      status: 'NOT_APPLICABLE',
      confidence: 'HIGH',
      reasoning,
      decisionBasis,
      missingInformation,
      matchedModel: matchingModelName,
      matchedMsn: aircraft.msn,
      externalEffectivityRequired: true,
      externalEffectivityVerified: true
    };
  }

  // 4. Avaliar Aircraft MSN (se REQUIRED)
  if (criteria.aircraftMSN.status === 'REQUIRED') {
    if (!aircraft.msn || aircraft.msn.trim() === '') {
      const msg = `MSN da aeronave não informado na base da frota. Impossível determinar aplicabilidade por número de série.`;
      reasoning.push(msg);
      missingInformation.push('MSN da aeronave');
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'FLEET_INVENTORY',
        analyzedField: 'aircraft.msn',
        foundValue: undefined,
        reason: msg,
        status: 'REVIEW_REQUIRED'
      });
      return {
        status: 'REVIEW_REQUIRED',
        confidence: 'HIGH',
        reasoning,
        decisionBasis,
        missingInformation,
        matchedModel: matchingModelName,
        externalEffectivityRequired: extEval.isExternalEffectivityRequired,
        externalEffectivityVerified: extEval.isVerified
      };
    }

    const msnRange = criteria.aircraftMSN.ranges?.[0] || {
      list: criteria.aircraftMSN.list,
      description: criteria.aircraftMSN.description
    };
    const msnMatch = isSerialInRange(aircraft.msn, msnRange);

    if (msnMatch) {
      const msg = `MSN da aeronave [${aircraft.msn}] está contemplado na regra de aplicabilidade (${criteria.aircraftMSN.description || 'lista/faixa afeta'}).`;
      reasoning.push(msg);
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'AD_DOCUMENT',
        analyzedField: 'applicabilityCriteria.aircraftMSN',
        foundValue: aircraft.msn,
        reason: msg,
        status: 'SATISFIED'
      });
    } else {
      const msg = `MSN da aeronave [${aircraft.msn}] está FORA da faixa/lista de aplicabilidade (${criteria.aircraftMSN.description || 'especificada na AD'}).`;
      reasoning.push(msg);
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'AD_DOCUMENT',
        analyzedField: 'applicabilityCriteria.aircraftMSN',
        foundValue: aircraft.msn,
        reason: msg,
        status: 'NOT_SATISFIED'
      });
      return {
        status: 'NOT_APPLICABLE',
        confidence: 'HIGH',
        reasoning,
        decisionBasis,
        missingInformation: [],
        matchedModel: matchingModelName,
        matchedMsn: aircraft.msn,
        externalEffectivityRequired: extEval.isExternalEffectivityRequired,
        externalEffectivityVerified: extEval.isVerified
      };
    }
  }

  // 5. Avaliar Engine Model & Serial Number (se REQUIRED)
  if (criteria.engineModel.status === 'REQUIRED') {
    const installedEngines = inventory.engines.filter(e => e.aircraftId === aircraft.id && e.status === 'INSTALLED');
    if (installedEngines.length === 0) {
      const msg = `Nenhum registro de motor instalado encontrado para a aeronave ${aircraft.registration}.`;
      reasoning.push(msg);
      missingInformation.push('Dados de motores instalados');
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'FLEET_INVENTORY',
        analyzedField: 'engines',
        foundValue: 'None',
        reason: msg,
        status: 'REVIEW_REQUIRED'
      });
      return {
        status: 'REVIEW_REQUIRED',
        confidence: 'MEDIUM',
        reasoning,
        decisionBasis,
        missingInformation,
        matchedModel: matchingModelName,
        matchedMsn: aircraft.msn,
        externalEffectivityRequired: extEval.isExternalEffectivityRequired,
        externalEffectivityVerified: extEval.isVerified
      };
    }

    const targetEngModels = criteria.engineModel.values || [];
    const matchingEngines = installedEngines.filter(e => matchesModel(`${e.manufacturer} ${e.model}`, targetEngModels));

    if (matchingEngines.length === 0) {
      const msg = `Motores instalados [${installedEngines.map(e => e.model).join(', ')}] não coincidem com os motores afetados pela AD [${targetEngModels.join(', ')}].`;
      reasoning.push(msg);
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'FLEET_INVENTORY',
        analyzedField: 'engines.model',
        foundValue: installedEngines.map(e => e.model),
        expectedValue: targetEngModels,
        reason: msg,
        status: 'NOT_SATISFIED'
      });
      return {
        status: 'NOT_APPLICABLE',
        confidence: 'HIGH',
        reasoning,
        decisionBasis,
        missingInformation: [],
        matchedModel: matchingModelName,
        matchedMsn: aircraft.msn,
        externalEffectivityRequired: extEval.isExternalEffectivityRequired,
        externalEffectivityVerified: extEval.isVerified
      };
    }
  }

  // 6. Avaliar Component Part Number (se REQUIRED)
  if (criteria.componentPartNumber.status === 'REQUIRED') {
    const targetPartNumbers = criteria.componentPartNumber.values || [];
    const installations = inventory.installations || [];
    const installedComps = installations.filter(inst => 
      inst.aircraftId === aircraft.id && 
      targetPartNumbers.some(tpn => inst.component?.partNumber && inst.component.partNumber.toLowerCase().replace(/[-_/\s.]/g, '') === tpn.toLowerCase().replace(/[-_/\s.]/g, ''))
    );

    if (installedComps.length === 0) {
      const msg = `Nenhum registro de componente com P/N [${targetPartNumbers.join(', ')}] localizado para a aeronave ${aircraft.registration}.`;
      reasoning.push(msg);
      missingInformation.push(`Status de instalação do componente P/N ${targetPartNumbers.join(', ')}`);
      decisionBasis.push({
        category: 'APPLICABILITY',
        source: 'FLEET_INVENTORY',
        analyzedField: 'components.partNumber',
        foundValue: 'None',
        expectedValue: targetPartNumbers,
        reason: msg,
        status: 'REVIEW_REQUIRED'
      });
      return {
        status: 'REVIEW_REQUIRED',
        confidence: 'MEDIUM',
        reasoning,
        decisionBasis,
        missingInformation,
        matchedModel: matchingModelName,
        matchedMsn: aircraft.msn,
        externalEffectivityRequired: extEval.isExternalEffectivityRequired,
        externalEffectivityVerified: extEval.isVerified
      };
    }
  }

  // 7. Todos os critérios REQUIRED foram satisfeitos com sucesso
  const msg = `Todos os critérios de aplicabilidade REQUIRED foram satisfeitos para a aeronave ${aircraft.registration} (${aircraft.model}).`;
  reasoning.push(msg);
  decisionBasis.push({
    category: 'APPLICABILITY',
    source: 'RULE_ENGINE_V2',
    analyzedField: 'dynamic_applicability_criteria',
    foundValue: `Registration: ${aircraft.registration}, Model: ${aircraft.model}`,
    reason: msg,
    status: 'SATISFIED'
  });

  return {
    status: 'APPLICABLE',
    confidence: 'HIGH',
    reasoning,
    decisionBasis,
    missingInformation: [],
    matchedModel: matchingModelName,
    matchedMsn: aircraft.msn,
    externalEffectivityRequired: extEval.isExternalEffectivityRequired,
    externalEffectivityVerified: extEval.isVerified
  };
}
