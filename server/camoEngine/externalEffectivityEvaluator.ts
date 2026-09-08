import { ExternalEffectivityReference } from '../../src/types';
import { DecisionBasisItem, FleetInventoryInput } from './types';

export interface ExternalEffectivityEvaluationResult {
  isExternalEffectivityRequired: boolean;
  isVerified: boolean;
  status: 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED' | 'NO_EXTERNAL_DEPENDENCY';
  reasoning: string[];
  decisionBasis: DecisionBasisItem[];
  missingInformation: string[];
  referencedDocument?: string;
}

/**
 * Avalia referências de efetividade externa (ex: Boeing Requirements Bulletin / Service Bulletins)
 * Zero-Fabrication: Se o documento for mandatório para determinação de aplicabilidade de MSN/configuração
 * e não estiver disponível e formalmente verificado, o status DEVE ser REVIEW_REQUIRED.
 */
export function evaluateExternalEffectivity(
  externalRefs: ExternalEffectivityReference[] | undefined,
  isExternalDocBased: boolean | undefined,
  inventory: FleetInventoryInput
): ExternalEffectivityEvaluationResult {
  const reasoning: string[] = [];
  const decisionBasis: DecisionBasisItem[] = [];
  const missingInformation: string[] = [];

  // Se não houver referências externas nem flag indicativa, não há dependência externa
  if ((!externalRefs || externalRefs.length === 0) && !isExternalDocBased) {
    return {
      isExternalEffectivityRequired: false,
      isVerified: true,
      status: 'NO_EXTERNAL_DEPENDENCY',
      reasoning: ['Nenhuma dependência de documento externo mandatória para determinação de aplicabilidade da célula.'],
      decisionBasis: [{
        category: 'EXTERNAL_EFFECTIVITY',
        source: 'AD_DOCUMENT',
        analyzedField: 'externalEffectivityReferences',
        foundValue: 'None',
        reason: 'AD autossuficiente para determinação de aplicabilidade de célula.',
        status: 'SATISFIED'
      }],
      missingInformation: []
    };
  }

  const refs = externalRefs || [];
  let requiresReview = false;
  let allVerifiedOutOfScope = true;
  let atLeastOneInScope = false;

  for (const ref of refs) {
    const docName = ref.documentReference || 'Documento Externo Não Identificado';
    const isRequired = ref.requiredForApplicability !== false; // default true if listed

    if (isRequired) {
      if (ref.availabilityStatus === 'NOT_AVAILABLE' || ref.availabilityStatus === 'PENDING_UPLOAD' || !ref.effectivityVerified) {
        requiresReview = true;
        allVerifiedOutOfScope = false;
        const msg = `Documento mandatório de efetividade [${docName}] está com disponibilidade [${ref.availabilityStatus}] e effectivityVerified=[${ref.effectivityVerified}]. Necessária auditoria técnica do documento para confirmar MSNs afetados.`;
        reasoning.push(msg);
        missingInformation.push(`Disponibilidade ou verificação técnica de efetividade de: ${docName}`);
        
        decisionBasis.push({
          category: 'EXTERNAL_EFFECTIVITY',
          source: 'EXTERNAL_RB_SB',
          analyzedField: 'availabilityStatus / effectivityVerified',
          foundValue: { availabilityStatus: ref.availabilityStatus, effectivityVerified: ref.effectivityVerified },
          expectedValue: { availabilityStatus: 'AVAILABLE', effectivityVerified: true },
          reason: msg,
          documentReference: docName,
          paragraphReference: ref.citedParagraph,
          status: 'REVIEW_REQUIRED'
        });
      } else if (ref.verificationStatus === 'VERIFIED_IN_SCOPE') {
        atLeastOneInScope = true;
        allVerifiedOutOfScope = false;
        const msg = `Documento de efetividade [${docName}] verificado: aeronave MSN ${inventory.aircraft.msn} confirmada no escopo de efetividade.`;
        reasoning.push(msg);
        decisionBasis.push({
          category: 'EXTERNAL_EFFECTIVITY',
          source: 'EXTERNAL_RB_SB',
          analyzedField: 'verificationStatus',
          foundValue: ref.verificationStatus,
          expectedValue: 'VERIFIED_IN_SCOPE',
          reason: msg,
          documentReference: docName,
          paragraphReference: ref.citedParagraph,
          status: 'SATISFIED'
        });
      } else if (ref.verificationStatus === 'VERIFIED_OUT_OF_SCOPE') {
        const msg = `Documento de efetividade [${docName}] verificado: aeronave MSN ${inventory.aircraft.msn} confirmada FORA do escopo de efetividade.`;
        reasoning.push(msg);
        decisionBasis.push({
          category: 'EXTERNAL_EFFECTIVITY',
          source: 'EXTERNAL_RB_SB',
          analyzedField: 'verificationStatus',
          foundValue: ref.verificationStatus,
          expectedValue: 'VERIFIED_OUT_OF_SCOPE',
          reason: msg,
          documentReference: docName,
          paragraphReference: ref.citedParagraph,
          status: 'NOT_SATISFIED'
        });
      } else {
        requiresReview = true;
        allVerifiedOutOfScope = false;
        const msg = `Documento [${docName}] presente, mas status de verificação é [${ref.verificationStatus}]. Requer auditoria.`;
        reasoning.push(msg);
        missingInformation.push(`Auditoria de escopo para: ${docName}`);
        decisionBasis.push({
          category: 'EXTERNAL_EFFECTIVITY',
          source: 'EXTERNAL_RB_SB',
          analyzedField: 'verificationStatus',
          foundValue: ref.verificationStatus,
          reason: msg,
          documentReference: docName,
          status: 'REVIEW_REQUIRED'
        });
      }
    }
  }

  if (requiresReview) {
    return {
      isExternalEffectivityRequired: true,
      isVerified: false,
      status: 'REVIEW_REQUIRED',
      reasoning,
      decisionBasis,
      missingInformation,
      referencedDocument: refs.map(r => r.documentReference).join(', ')
    };
  }

  if (atLeastOneInScope) {
    return {
      isExternalEffectivityRequired: true,
      isVerified: true,
      status: 'APPLICABLE',
      reasoning,
      decisionBasis,
      missingInformation,
      referencedDocument: refs.map(r => r.documentReference).join(', ')
    };
  }

  if (allVerifiedOutOfScope && refs.length > 0) {
    return {
      isExternalEffectivityRequired: true,
      isVerified: true,
      status: 'NOT_APPLICABLE',
      reasoning,
      decisionBasis,
      missingInformation,
      referencedDocument: refs.map(r => r.documentReference).join(', ')
    };
  }

  return {
    isExternalEffectivityRequired: true,
    isVerified: false,
    status: 'REVIEW_REQUIRED',
    reasoning: ['Incerteza na avaliação de efetividade de documentos externos.'],
    decisionBasis,
    missingInformation: ['Confirmação documental de efetividade externa']
  };
}
