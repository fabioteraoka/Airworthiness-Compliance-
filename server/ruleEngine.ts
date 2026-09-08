import { 
  Aircraft, 
  Engine, 
  Component, 
  ComponentInstallation, 
  ComplianceRequirement, 
  ComplianceAssessment, 
  ApplicabilityRule,
  ApplicabilityStatus,
  ComplianceStatus,
  ActionComplianceAssessment,
  InstalledSoftwareRecord,
  MaintenanceActionAccomplishment,
  KnowledgeFact,
  UserQuestion,
  DynamicApplicabilityCriteria,
  AssessmentCriteriaMatch
} from '../src/types';

export interface RuleEvaluationResult {
  assessments: ComplianceAssessment[];
  generatedQuestions: UserQuestion[];
  appliedKnowledgeFacts: KnowledgeFact[];
  validationErrors?: string[];
}

export function normalizeText(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[-_/\s.]/g, '').trim();
}

export interface CanonicalModel {
  family: string;
  variant: string;
  raw: string;
}

/**
 * Resolves an aircraft model string to its canonical family and exact variant.
 * Strictly distinguishes between 737 MAX (737-7, 737-8, 737-9, 737-10) and 737 NG (737-600, 737-700, 737-800, 737-900).
 * Strictly distinguishes between A320ceo (A320-214) and A320neo (A320-271N).
 */
export function getCanonicalAircraftModel(modelStr: string): CanonicalModel {
  const raw = modelStr.trim();
  const lower = raw.toLowerCase().replace(/boeing|airbus|embraer|the\s+boeing\s+company/gi, '').trim();

  // 1. Boeing 737 MAX Family (737-7, 737-8, 737-8200, 737-9, 737-10)
  if (/\b(?:737-?8200|737\s*max\s*8-?200|737-?8-?200)\b/i.test(lower)) {
    return { family: 'B737_MAX', variant: '737-8200', raw };
  }
  if (/\b(?:737-?8\b|737\s*max\s*8\b|b38m\b|737-8\s*max)/i.test(lower) && !/\b737-?800\b/i.test(lower)) {
    return { family: 'B737_MAX', variant: '737-8', raw };
  }
  if (/\b(?:737-?9\b|737\s*max\s*9\b|b39m\b|737-9\s*max)/i.test(lower) && !/\b737-?900\b/i.test(lower)) {
    return { family: 'B737_MAX', variant: '737-9', raw };
  }
  if (/\b(?:737-?7\b|737\s*max\s*7\b|737-7\s*max)/i.test(lower) && !/\b737-?700\b/i.test(lower)) {
    return { family: 'B737_MAX', variant: '737-7', raw };
  }
  if (/\b(?:737-?10\b|737\s*max\s*10\b)/i.test(lower)) {
    return { family: 'B737_MAX', variant: '737-10', raw };
  }
  if (/\b(?:737\s*max|b737m)\b/i.test(lower) && !/\b(?:800|700|900)\b/i.test(lower)) {
    return { family: 'B737_MAX', variant: 'B737_MAX_ALL', raw };
  }

  // 2. Boeing 737 Next Generation (NG) Family (737-600, 737-700, 737-700C, 737-800, 737-900, 737-900ER)
  if (/\b(?:737-?800(?:bcf|sf)?|b738|738|737-800ng)\b/i.test(lower)) {
    return { family: 'B737_NG', variant: '737-800', raw };
  }
  if (/\b(?:737-?700[c|er]?|737-?700c|737-?700er|b737|737-700ng)\b/i.test(lower) && !/\b737-?7\b/i.test(lower)) {
    return { family: 'B737_NG', variant: '737-700', raw };
  }
  if (/\b(?:737-?900er|737-?900|b739)\b/i.test(lower) && !/\b737-?9\b/i.test(lower)) {
    return { family: 'B737_NG', variant: '737-900', raw };
  }
  if (/\b(?:737-?600|b736)\b/i.test(lower)) {
    return { family: 'B737_NG', variant: '737-600', raw };
  }
  if (/\b(?:737\s*ng|737\s*next\s*generation)\b/i.test(lower)) {
    return { family: 'B737_NG', variant: 'B737_NG_ALL', raw };
  }

  // 3. Boeing 737 Classic Family
  if (/\b(?:737-?300|b733)\b/i.test(lower)) return { family: 'B737_CL', variant: '737-300', raw };
  if (/\b(?:737-?400|b734)\b/i.test(lower)) return { family: 'B737_CL', variant: '737-400', raw };
  if (/\b(?:737-?500|b735)\b/i.test(lower)) return { family: 'B737_CL', variant: '737-500', raw };

  // 4. Airbus A320 Families
  if (/\b(?:a320-?271n|a320-?251n|a320neo|a320\s*neo)\b/i.test(lower)) {
    return { family: 'A320_NEO', variant: 'A320neo', raw };
  }
  if (/\b(?:a321-?271n|a321-?251n|a321neo|a321\s*neo)\b/i.test(lower)) {
    return { family: 'A320_NEO', variant: 'A321neo', raw };
  }
  if (/\b(?:a320-?214|a320-?200|a320ceo|a320)\b/i.test(lower) && !/\bneo\b/i.test(lower)) {
    return { family: 'A320_CEO', variant: 'A320-214', raw };
  }
  if (/\b(?:a321-?200|a321ceo|a321)\b/i.test(lower) && !/\bneo\b/i.test(lower)) {
    return { family: 'A320_CEO', variant: 'A321-200', raw };
  }
  if (/\b(?:a319-?100|a319)\b/i.test(lower) && !/\bneo\b/i.test(lower)) {
    return { family: 'A320_CEO', variant: 'A319-100', raw };
  }

  // 5. Embraer E-Jets
  if (/\b(?:e195-?e2|erj-?\s*190-?\s*400)\b/i.test(lower)) return { family: 'EJET_E2', variant: 'E195-E2', raw };
  if (/\b(?:e190-?e2|erj-?\s*190-?\s*300)\b/i.test(lower)) return { family: 'EJET_E2', variant: 'E190-E2', raw };
  if (/\b(?:e195|erj-?\s*190-?\s*200)\b/i.test(lower) && !/\be2\b/i.test(lower)) return { family: 'EJET_E1', variant: 'E195', raw };
  if (/\b(?:e190|erj-?\s*190-?\s*100)\b/i.test(lower) && !/\be2\b/i.test(lower)) return { family: 'EJET_E1', variant: 'E190', raw };

  // 6. Boeing Widebodies & Other Models
  if (/\b(?:747-?400|747-?8|747-?100|747-?200|747-?300|747)\b/i.test(lower)) {
    return { family: 'B747', variant: lower.includes('747-400') ? '747-400' : '747', raw };
  }
  if (/\b(?:777-?200|777-?300|777-?300er|777-?200lr|777-?8|777-?9|777|777f)\b/i.test(lower)) {
    return { family: 'B777', variant: '777', raw };
  }
  if (/\b(?:787-?8|787-?9|787-?10|787)\b/i.test(lower)) {
    return { family: 'B787', variant: '787', raw };
  }
  if (/\b(?:767-?200|767-?300|767-?300er|767-?400er|767)\b/i.test(lower)) {
    return { family: 'B767', variant: '767', raw };
  }
  if (/\b(?:757-?200|757-?300|757)\b/i.test(lower)) {
    return { family: 'B757', variant: '757', raw };
  }

  // 7. Airbus Widebodies
  if (/\b(?:a330-?200|a330-?300|a330-?800|a330-?900|a330)\b/i.test(lower)) {
    return { family: 'A330', variant: 'A330', raw };
  }
  if (/\b(?:a350-?900|a350-?1000|a350)\b/i.test(lower)) {
    return { family: 'A350', variant: 'A350', raw };
  }
  if (/\b(?:a380-?800|a380)\b/i.test(lower)) {
    return { family: 'A380', variant: 'A380', raw };
  }

  // Fallback exact normalized string
  return { family: 'CUSTOM', variant: normalizeText(modelStr), raw };
}

/**
 * Checks if an aircraft model matches target effectivity models with strict canonical rules.
 * e.g. 737-8 (MAX) does NOT match 737-800 (NG).
 */
export function matchesModel(aircraftModel: string, targetModels: string[]): boolean {
  if (!targetModels || targetModels.length === 0) return true; // Generic AD applicability
  
  const acCanon = getCanonicalAircraftModel(aircraftModel);
  
  return targetModels.some(target => {
    if (!target || target.trim().length === 0) return false;
    const targetCanon = getCanonicalAircraftModel(target);

    // If both belong to distinct known families that do NOT overlap (e.g. B737_MAX vs B737_NG), return FALSE
    if (acCanon.family !== 'CUSTOM' && targetCanon.family !== 'CUSTOM') {
      if (acCanon.family !== targetCanon.family) {
        return false;
      }
      // Same family: check variant or whole-family target
      if (targetCanon.variant === `${targetCanon.family}_ALL`) return true;
      return acCanon.variant === targetCanon.variant;
    }

    // Custom / Generic match with strict token equality (avoid substring prefix clashes)
    const normAc = normalizeText(aircraftModel);
    const normTg = normalizeText(target);
    if (normAc === normTg) return true;

    // Safety guard against substring collision:
    // e.g. "7378" should never match "737800"
    if (normTg === '7378' && normAc.includes('737800')) return false;
    if (normTg === '7379' && normAc.includes('737900')) return false;
    if (normAc === '7378' && normTg.includes('737800')) return false;

    return normAc.includes(normTg) && normTg.length > 5;
  });
}

/**
 * Check serial number against range (e.g., 400000 - 500000)
 * Safely guards against garbage input like ".", "N/A", "Todos", etc.
 */
export function isSerialInRange(
  serial: string, 
  range?: { from?: string | null; to?: string | null; list?: string[]; excluded?: string[]; description?: string | null }
): boolean {
  if (!range) return true;
  
  const cleanSerial = serial ? serial.trim() : '';
  if (!cleanSerial) return false;

  // Clean description check: if description is garbage like "." or "N/A", ignore it
  const desc = range.description?.trim();
  if (desc === '.' || desc === 'N/A' || desc === 'Todos os números de série' || desc === 'Todos') {
    // Treat as no restricted range
  }

  // Excluded list
  if (range.excluded && range.excluded.length > 0) {
    const validExcluded = range.excluded.filter(ex => ex && ex.trim() !== '' && ex.trim() !== '.' && ex.trim().toLowerCase() !== 'n/a');
    if (validExcluded.some(ex => normalizeText(ex) === normalizeText(cleanSerial))) {
      return false;
    }
  }

  // Explicit list
  if (range.list && range.list.length > 0) {
    const validList = range.list.filter(s => s && s.trim() !== '' && s.trim() !== '.' && s.trim().toLowerCase() !== 'n/a');
    if (validList.length > 0) {
      return validList.some(s => normalizeText(s) === normalizeText(cleanSerial));
    }
  }

  // Numeric range comparison if both from/to are valid numbers and not "."
  const rawFrom = range.from?.trim();
  const rawTo = range.to?.trim();
  if (rawFrom && rawTo && rawFrom !== '.' && rawTo !== '.' && rawFrom.toLowerCase() !== 'n/a' && rawTo.toLowerCase() !== 'n/a') {
    const numSerial = parseInt(cleanSerial.replace(/\D/g, ''), 10);
    const numFrom = parseInt(rawFrom.replace(/\D/g, ''), 10);
    const numTo = parseInt(rawTo.replace(/\D/g, ''), 10);

    if (!isNaN(numSerial) && !isNaN(numFrom) && !isNaN(numTo)) {
      return numSerial >= numFrom && numSerial <= numTo;
    }

    // Lexicographical if non-numeric
    return cleanSerial >= rawFrom && cleanSerial <= rawTo;
  }

  return true;
}

/**
 * Builds or normalizes the DynamicApplicabilityCriteria from an AD requirement.
 * Eliminates fixed templates; only criteria actually present are marked as REQUIRED.
 */
export function buildDynamicApplicabilityCriteria(
  req: ComplianceRequirement,
  rule?: ApplicabilityRule
): DynamicApplicabilityCriteria {
  if (req.applicabilityCriteria) {
    return req.applicabilityCriteria;
  }
  if (rule?.applicabilityCriteria) {
    return rule.applicabilityCriteria;
  }

  const targetRule = rule || req.applicabilityRule;
  const targetModels = (targetRule?.aircraftModels || []).filter(m => m && m.trim() !== '' && m !== '.');
  const targetEngineModels = (targetRule?.engineModels || []).filter(m => m && m.trim() !== '' && m !== '.');
  const targetPartNumbers = (targetRule?.componentPartNumbers || []).filter(p => p && p.trim() !== '' && p !== '.');
  const serialRanges = targetRule?.aircraftSerialRanges;
  const hasMsnRestriction = Boolean(
    !targetRule?.isMsnExplicitlyAll &&
    serialRanges &&
    ((serialRanges.from && serialRanges.from !== '.') || 
     (serialRanges.to && serialRanges.to !== '.') || 
     (serialRanges.list && serialRanges.list.length > 0))
  );

  const engineSerialRanges = targetRule?.engineSerialRanges;
  const hasEngineSerialRestriction = Boolean(
    engineSerialRanges &&
    ((engineSerialRanges.from && engineSerialRanges.from !== '.') || 
     (engineSerialRanges.to && engineSerialRanges.to !== '.') || 
     (engineSerialRanges.list && engineSerialRanges.list.length > 0))
  );

  const compSerialRanges = targetRule?.componentSerialRanges;
  const hasCompSerialRestriction = Boolean(
    compSerialRanges &&
    ((compSerialRanges.from && compSerialRanges.from !== '.') || 
     (compSerialRanges.to && compSerialRanges.to !== '.') || 
     (compSerialRanges.list && compSerialRanges.list.length > 0))
  );

  const hasSoftwareRequirement = Boolean(req.softwareRequirements && req.softwareRequirements.length > 0);
  const hasConfig = Boolean(targetRule?.affectedConfiguration && targetRule.affectedConfiguration.trim().length > 3);

  const criteria: DynamicApplicabilityCriteria = {
    aircraftModel: {
      status: targetModels.length > 0 ? 'REQUIRED' : 'NOT_EXTRACTED',
      values: targetModels,
      confidence: targetModels.length > 0 ? 'HIGH' : 'LOW',
      reasoning: targetModels.length > 0 ? `Target aircraft models: ${targetModels.join(', ')}` : 'No aircraft model extracted from AD effectivity'
    },
    aircraftMSN: {
      status: hasMsnRestriction ? 'REQUIRED' : 'NOT_REQUIRED',
      ranges: serialRanges ? [serialRanges] : [],
      list: serialRanges?.list || [],
      description: serialRanges?.description || (serialRanges?.from ? `${serialRanges.from} - ${serialRanges.to || ''}` : undefined),
      confidence: 'HIGH',
      reasoning: hasMsnRestriction 
        ? `AD restricts applicability to specific MSN range (${serialRanges?.description || `${serialRanges?.from}-${serialRanges?.to}`})`
        : 'AD applies to all serial numbers of applicable models (no MSN restriction)'
    },
    aircraftConfiguration: {
      status: hasConfig ? 'REQUIRED' : 'NOT_REQUIRED',
      conditions: hasConfig && targetRule?.affectedConfiguration ? [targetRule.affectedConfiguration] : [],
      confidence: 'HIGH'
    },
    engineModel: {
      status: targetEngineModels.length > 0 ? 'REQUIRED' : 'NOT_REQUIRED',
      values: targetEngineModels,
      confidence: 'HIGH',
      reasoning: targetEngineModels.length > 0 ? `Target engine models: ${targetEngineModels.join(', ')}` : 'No engine model restriction'
    },
    enginePartNumber: {
      status: 'NOT_REQUIRED',
      values: [],
      confidence: 'HIGH'
    },
    engineSerialNumber: {
      status: hasEngineSerialRestriction ? 'REQUIRED' : 'NOT_REQUIRED',
      ranges: engineSerialRanges ? [engineSerialRanges] : [],
      list: engineSerialRanges?.list || [],
      description: engineSerialRanges?.description,
      confidence: 'HIGH'
    },
    componentIdentity: {
      status: targetPartNumbers.length > 0 ? 'REQUIRED' : 'NOT_REQUIRED',
      values: targetPartNumbers,
      confidence: 'HIGH'
    },
    componentPartNumber: {
      status: targetPartNumbers.length > 0 ? 'REQUIRED' : 'NOT_REQUIRED',
      values: targetPartNumbers,
      confidence: 'HIGH',
      reasoning: targetPartNumbers.length > 0 ? `Target component P/Ns: ${targetPartNumbers.join(', ')}` : 'No component P/N restriction'
    },
    componentSerialNumber: {
      status: hasCompSerialRestriction ? 'REQUIRED' : 'NOT_REQUIRED',
      ranges: compSerialRanges ? [compSerialRanges] : [],
      list: compSerialRanges?.list || [],
      description: compSerialRanges?.description,
      confidence: 'HIGH'
    },
    modificationStatus: {
      status: (req.referencedDocuments && req.referencedDocuments.some(d => d.requiredForEvaluation !== false)) ? 'REQUIRED' : 'NOT_REQUIRED',
      conditions: (req.referencedDocuments || []).map(d => d.documentReference),
      confidence: 'HIGH'
    },
    softwareConfiguration: {
      status: hasSoftwareRequirement ? 'REQUIRED' : 'NOT_REQUIRED',
      conditions: (req.softwareRequirements || []).map(sw => sw.softwarePartNumber || sw.mandatedSoftware || ''),
      values: (req.softwareRequirements || []).map(sw => sw.mandatedSoftware || sw.softwarePartNumber),
      confidence: 'HIGH'
    }
  };

  return criteria;
}

/**
 * Core CAMO Deterministic Rule Engine with Dynamic Applicability Criteria
 * Evaluates ONLY criteria with status === 'REQUIRED'.
 * Criteria with status === 'NOT_REQUIRED' are completely ignored.
 * Missing regulatory information (NOT_EXTRACTED) or missing fleet information (UNKNOWN_FLEET_DATA) -> REVIEW_REQUIRED.
 * Strictly separates Applicability (Is AD applicable?) from Compliance (Has AD requirement been fulfilled?).
 */
export function evaluateComplianceRequirement(
  req: ComplianceRequirement,
  fleet: {
    aircraft: Aircraft[];
    engines: Engine[];
    components: Component[];
    installations: ComponentInstallation[];
    installedSoftware?: InstalledSoftwareRecord[];
    actionAccomplishments?: MaintenanceActionAccomplishment[];
    knowledgeFacts: KnowledgeFact[];
    existingQuestions?: UserQuestion[];
  }
): RuleEvaluationResult {
  const assessments: ComplianceAssessment[] = [];
  const generatedQuestions: UserQuestion[] = [];
  const appliedFacts: KnowledgeFact[] = [];
  const validationErrors: string[] = [];

  // =========================================================================
  // VALIDATION GATE BEFORE RULE ENGINE
  // =========================================================================
  const isExtractionFailed = 
    req.documentProcessingStatus === 'EXTRACTION_FAILED' || 
    req.extractionStatus === 'EXTRACTION_FAILED' || 
    !req.sourceNumber || 
    req.sourceNumber === 'NOT_EXTRACTED' || 
    req.sourceNumber === 'UNKNOWN_AD';

  if (isExtractionFailed) {
    validationErrors.push('AD document extraction failed or was incomplete. Critical metadata is missing.');
  }

  // Dynamic Criteria Construction
  const criteria = buildDynamicApplicabilityCriteria(req);
  req.applicabilityCriteria = criteria;

  const targetAircraftModels = criteria.aircraftModel.values || [];
  const targetEngineModels = criteria.engineModel.values || [];
  const targetPartNumbers = criteria.componentPartNumber.values || [];

  const hasAnyEffectivity = 
    criteria.aircraftModel.status === 'REQUIRED' || 
    criteria.engineModel.status === 'REQUIRED' || 
    criteria.componentPartNumber.status === 'REQUIRED' ||
    (req.applicabilityRule?.rawText && req.applicabilityRule.rawText.length > 10);

  if (!hasAnyEffectivity && !validationErrors.length) {
    validationErrors.push('AD does not declare any identifiable aircraft, engine, or component effectivity criteria.');
  }

  // If validation gate fails, mark all fleet evaluations as REVIEW_REQUIRED with low confidence
  if (validationErrors.length > 0) {
    for (const ac of fleet.aircraft) {
      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: `${ac.registration} (${ac.model})`,
        result: 'REVIEW_REQUIRED',
        applicabilityStatus: 'REVIEW_REQUIRED',
        complianceStatus: 'UNKNOWN',
        confidence: 'LOW',
        reasoning: [
          'Assessment blocked because the source document extraction was not successfully validated.',
          ...validationErrors.map(e => `Validation Failure: ${e}`),
          'A certified Continuing Airworthiness engineer must manually review the AD PDF to establish applicability.'
        ],
        missingInformationNotes: validationErrors,
        matchedCriteria: {
          aircraftModelMatch: {
            matched: false,
            status: 'MISSING_DATA',
            detail: 'Unvalidated AD effectivity definition',
            confidence: 0
          }
        },
        assessedBy: 'CAMO Dynamic Rule Engine v2.0 (Strict Airworthiness Safety)',
        assessmentDate: new Date().toISOString(),
        status: 'PENDING_USER_INPUT'
      });
    }

    return {
      assessments,
      generatedQuestions,
      appliedKnowledgeFacts: appliedFacts,
      validationErrors
    };
  }

  // =========================================================================
  // FLEET EVALUATION LOOP — DYNAMIC EVALUATION OF REQUIRED CRITERIA ONLY
  // =========================================================================
  for (const ac of fleet.aircraft) {
    const acLabel = `${ac.registration} (MSN ${ac.msn} - ${ac.manufacturer} ${ac.model})`;
    const reasoning: string[] = [];
    const missingNotes: string[] = [];

    // Track state of required evaluations
    let applicabilityBlockedByMissingData = false;
    let applicabilityFailed = false;
    let applicabilityFailureReason = '';
    const matchedCriteriaSummary: {
      aircraftModelMatch: AssessmentCriteriaMatch;
      serialRangeMatch?: AssessmentCriteriaMatch;
      engineMatch?: AssessmentCriteriaMatch;
      componentMatch?: AssessmentCriteriaMatch;
      configurationMatch?: AssessmentCriteriaMatch;
    } = {
      aircraftModelMatch: {
        matched: criteria.aircraftModel.status === 'NOT_REQUIRED',
        status: criteria.aircraftModel.status === 'NOT_REQUIRED' ? 'CONFIRMED' : 'MISSING_DATA',
        detail: criteria.aircraftModel.status === 'NOT_REQUIRED' ? 'Aircraft model criterion not required by AD' : 'Evaluating model applicability',
        confidence: 100
      }
    };

    // -------------------------------------------------------------
    // CRITERION 1: Aircraft Model (if REQUIRED)
    // -------------------------------------------------------------
    if (criteria.aircraftModel.status === 'REQUIRED') {
      const isModelApplicable = matchesModel(`${ac.manufacturer} ${ac.model}`, targetAircraftModels);
      if (!isModelApplicable) {
        applicabilityFailed = true;
        applicabilityFailureReason = `Aircraft model ${ac.manufacturer} ${ac.model} is not within AD applicable models [${targetAircraftModels.join(', ')}].`;
        matchedCriteriaSummary.aircraftModelMatch = {
          matched: false,
          status: 'NOT_PRESENT',
          detail: `Model ${ac.model} is excluded from AD effectivity (${targetAircraftModels.join(', ')})`,
          confidence: 100
        };
      } else {
        matchedCriteriaSummary.aircraftModelMatch = {
          matched: true,
          status: 'CONFIRMED',
          detail: `Model ${ac.model} matches AD effectivity [${targetAircraftModels.join(', ')}]`,
          confidence: 100
        };
      }
    } else if (criteria.aircraftModel.status === 'NOT_EXTRACTED') {
      applicabilityBlockedByMissingData = true;
      missingNotes.push('Regulatory aircraft model criterion could not be safely extracted from AD text.');
    }

    // Short-circuit if model check already failed
    if (applicabilityFailed) {
      reasoning.push(`[APPLICABILITY: NOT APPLICABLE] ${applicabilityFailureReason}`);
      reasoning.push(`[COMPLIANCE: NOT REQUIRED] Compliance is not required for non-applicable airframes.`);
      
      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'NOT_APPLICABLE',
        applicabilityStatus: 'NOT_APPLICABLE',
        complianceStatus: 'NOT_REQUIRED',
        confidence: 'HIGH',
        reasoning,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PRELIMINARY'
      });
      continue;
    }

    // -------------------------------------------------------------
    // CRITERION 2: Aircraft MSN (if REQUIRED)
    // -------------------------------------------------------------
    if (criteria.aircraftMSN.status === 'REQUIRED') {
      if (!ac.msn || ac.msn.trim() === '') {
        applicabilityBlockedByMissingData = true;
        missingNotes.push(`Required fleet data unavailable: Aircraft MSN is not recorded for registration ${ac.registration}.`);
      } else {
        const msnRange = criteria.aircraftMSN.ranges?.[0] || {
          list: criteria.aircraftMSN.list,
          description: criteria.aircraftMSN.description
        };
        const msnMatch = isSerialInRange(ac.msn, msnRange);
        if (!msnMatch) {
          applicabilityFailed = true;
          applicabilityFailureReason = `Aircraft model matches, but MSN ${ac.msn} is outside affected serial range (${criteria.aircraftMSN.description || 'specified in AD'}).`;
          matchedCriteriaSummary.serialRangeMatch = {
            matched: false,
            status: 'EXCLUDED',
            detail: `MSN ${ac.msn} is outside affected serial range`,
            confidence: 100
          };
        } else {
          matchedCriteriaSummary.serialRangeMatch = {
            matched: true,
            status: 'CONFIRMED',
            detail: `MSN ${ac.msn} is within affected serial range`,
            confidence: 100
          };
        }
      }
    } else if (criteria.aircraftMSN.status === 'NOT_EXTRACTED') {
      applicabilityBlockedByMissingData = true;
      missingNotes.push('Regulatory MSN applicability criterion could not be safely extracted.');
    }

    if (applicabilityFailed) {
      reasoning.push(`[APPLICABILITY: NOT APPLICABLE] ${applicabilityFailureReason}`);
      reasoning.push(`[COMPLIANCE: NOT REQUIRED] Compliance is not required for out-of-range serial numbers.`);
      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'NOT_APPLICABLE',
        applicabilityStatus: 'NOT_APPLICABLE',
        complianceStatus: 'NOT_REQUIRED',
        confidence: 'HIGH',
        reasoning,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PRELIMINARY'
      });
      continue;
    }

    // -------------------------------------------------------------
    // CRITERION 3: Engine Model & Serial Number (if REQUIRED)
    // -------------------------------------------------------------
    if (criteria.engineModel.status === 'REQUIRED') {
      const installedEngines = fleet.engines.filter(e => e.aircraftId === ac.id && e.status === 'INSTALLED');
      if (installedEngines.length === 0) {
        applicabilityBlockedByMissingData = true;
        missingNotes.push(`Required fleet data unavailable: No installed engine records found for aircraft ${ac.registration}.`);
      } else {
        const matchingEngines = installedEngines.filter(e => matchesModel(`${e.manufacturer} ${e.model}`, targetEngineModels));
        if (matchingEngines.length === 0) {
          applicabilityFailed = true;
          applicabilityFailureReason = `Installed engine models do not match AD affected engine models [${targetEngineModels.join(', ')}].`;
          matchedCriteriaSummary.engineMatch = {
            matched: false,
            status: 'NOT_PRESENT',
            detail: `Installed engines do not match AD engine models [${targetEngineModels.join(', ')}]`,
            confidence: 100
          };
        } else {
          // Check Engine Serial Number if also REQUIRED
          if (criteria.engineSerialNumber.status === 'REQUIRED') {
            const engRange = criteria.engineSerialNumber.ranges?.[0] || {
              list: criteria.engineSerialNumber.list,
              description: criteria.engineSerialNumber.description
            };
            const serialMatches = matchingEngines.filter(e => isSerialInRange(e.serialNumber, engRange));
            if (serialMatches.length === 0) {
              applicabilityFailed = true;
              applicabilityFailureReason = `Installed engine models match, but engine serial numbers are outside affected range (${criteria.engineSerialNumber.description || 'specified in AD'}).`;
              matchedCriteriaSummary.engineMatch = {
                matched: false,
                status: 'EXCLUDED',
                detail: 'Engine serial numbers outside affected range',
                confidence: 100
              };
            } else {
              matchedCriteriaSummary.engineMatch = {
                matched: true,
                status: 'CONFIRMED',
                detail: `Installed engine models and serial numbers match: ${serialMatches.map(e => `${e.position}: ${e.model} S/N ${e.serialNumber}`).join(', ')}`,
                confidence: 100
              };
            }
          } else {
            matchedCriteriaSummary.engineMatch = {
              matched: true,
              status: 'CONFIRMED',
              detail: `Installed engine models match: ${matchingEngines.map(e => `${e.position}: ${e.model}`).join(', ')}`,
              confidence: 100
            };
          }
        }
      }
    }

    if (applicabilityFailed) {
      reasoning.push(`[APPLICABILITY: NOT APPLICABLE] ${applicabilityFailureReason}`);
      reasoning.push(`[COMPLIANCE: NOT REQUIRED] Compliance is not required.`);
      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'NOT_APPLICABLE',
        applicabilityStatus: 'NOT_APPLICABLE',
        complianceStatus: 'NOT_REQUIRED',
        confidence: 'HIGH',
        reasoning,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PRELIMINARY'
      });
      continue;
    }

    // -------------------------------------------------------------
    // CRITERION 4: Component Part Number & Serial Number (if REQUIRED)
    // -------------------------------------------------------------
    let componentMatchFound = false;
    let componentMatchDetails = '';
    let isComponentConfirmedNotInstalled = false;

    if (criteria.componentPartNumber.status === 'REQUIRED') {
      const acInstallations = (fleet.installations || []).filter(i => i.aircraftId === ac.id && i.currentStatus === 'INSTALLED');
      const matchedInstalledComponents: { inst: ComponentInstallation; comp: Component }[] = [];

      for (const inst of acInstallations) {
        const comp = (fleet.components || []).find(c => c.id === inst.componentId);
        if (comp && targetPartNumbers.some(tpn => normalizeText(tpn) === normalizeText(comp.partNumber))) {
          matchedInstalledComponents.push({ inst, comp });
        }
      }

      // Check Knowledge Base facts
      const relatedFacts = (fleet.knowledgeFacts || []).filter(f => 
        f.subjectId === ac.id && 
        !f.isRejected &&
        targetPartNumbers.some(tpn => 
          normalizeText(f.title).includes(normalizeText(tpn)) || 
          normalizeText(f.objectValue).includes(normalizeText(tpn)) ||
          (f.details && f.details.partNumber && normalizeText(f.details.partNumber) === normalizeText(tpn))
        )
      );

      relatedFacts.forEach(f => {
        if (!appliedFacts.some(af => af.id === f.id)) appliedFacts.push(f);
      });

      const confirmedNotInstalledFact = relatedFacts.find(f => f.factType === 'COMPONENT_NOT_INSTALLED' || f.factType === 'FLEET_EXCLUSION');
      const confirmedInstalledFact = relatedFacts.find(f => f.factType === 'COMPONENT_INSTALLED');

      if (matchedInstalledComponents.length > 0) {
        // If component S/N is REQUIRED, check S/N
        if (criteria.componentSerialNumber.status === 'REQUIRED') {
          const compRange = criteria.componentSerialNumber.ranges?.[0] || {
            list: criteria.componentSerialNumber.list,
            description: criteria.componentSerialNumber.description
          };
          const serialMatches = matchedInstalledComponents.filter(({ comp }) => isSerialInRange(comp.serialNumber, compRange));
          if (serialMatches.length > 0) {
            componentMatchFound = true;
            componentMatchDetails = serialMatches.map(({ inst, comp }) => `P/N ${comp.partNumber} (S/N ${comp.serialNumber}) at ${inst.position}`).join('; ');
          } else {
            applicabilityFailed = true;
            applicabilityFailureReason = `Affected component P/N ${targetPartNumbers.join(', ')} is installed, but S/N is outside affected range (${criteria.componentSerialNumber.description || 'specified in AD'}).`;
          }
        } else {
          componentMatchFound = true;
          componentMatchDetails = matchedInstalledComponents.map(({ inst, comp }) => `P/N ${comp.partNumber} at ${inst.position}`).join('; ');
        }
      } else if (confirmedNotInstalledFact) {
        isComponentConfirmedNotInstalled = true;
        applicabilityFailed = true;
        applicabilityFailureReason = `Verified Knowledge Base Fact #${confirmedNotInstalledFact.id} confirms P/N ${targetPartNumbers.join(', ')} is NOT installed on ${ac.registration}.`;
      } else if (confirmedInstalledFact && confirmedInstalledFact.details) {
        const serial = confirmedInstalledFact.details.serialNumber || '';
        if (criteria.componentSerialNumber.status === 'REQUIRED') {
          const compRange = criteria.componentSerialNumber.ranges?.[0] || {
            list: criteria.componentSerialNumber.list,
            description: criteria.componentSerialNumber.description
          };
          if (isSerialInRange(serial, compRange)) {
            componentMatchFound = true;
            componentMatchDetails = `Confirmed via KB Fact #${confirmedInstalledFact.id}: P/N ${targetPartNumbers.join(', ')} (S/N ${serial})`;
          } else {
            applicabilityFailed = true;
            applicabilityFailureReason = `Component confirmed installed via KB Fact, but S/N ${serial} is outside affected range.`;
          }
        } else {
          componentMatchFound = true;
          componentMatchDetails = `Confirmed via KB Fact #${confirmedInstalledFact.id}: P/N ${targetPartNumbers.join(', ')}`;
        }
      } else {
        // Missing component data -> REVIEW_REQUIRED
        applicabilityBlockedByMissingData = true;
        missingNotes.push(`Required fleet data unavailable: No installation record or negative proof for P/N ${targetPartNumbers.join(', ')} on ${ac.registration}.`);
        
        // Generate Question for user
        const assessmentId = `ass-${req.id}-${ac.id}`;
        for (const tpn of targetPartNumbers) {
          const questionId = `q-${req.id}-${ac.id}-${normalizeText(tpn)}`;
          const existingQ = fleet.existingQuestions?.find(q => q.id === questionId);
          if (!existingQ) {
            generatedQuestions.push({
              id: questionId,
              complianceAssessmentId: assessmentId,
              complianceRequirementId: req.id,
              targetEntity: {
                type: 'AIRCRAFT',
                id: ac.id,
                label: ac.registration
              },
              partNumberInQuestion: tpn,
              question: `Is Part Number ${tpn} installed on aircraft ${ac.registration} (MSN ${ac.msn})?`,
              reason: `AD ${req.sourceNumber} requires action on P/N ${tpn} on ${ac.model}. Fleet database has no record for this component on ${ac.registration}.`,
              questionType: 'YES_NO_UNKNOWN',
              options: ['YES - Installed on this Aircraft', 'NO - Verified Not Installed (IPC/Log Check)', 'UNKNOWN / PHYSICAL CHECK REQUIRED'],
              status: 'PENDING'
            });
          }
        }
      }
    }

    if (applicabilityFailed) {
      reasoning.push(`[APPLICABILITY: NOT APPLICABLE] ${applicabilityFailureReason}`);
      reasoning.push(`[COMPLIANCE: NOT REQUIRED] Compliance is not required.`);
      matchedCriteriaSummary.componentMatch = {
        matched: false,
        status: isComponentConfirmedNotInstalled ? 'NOT_PRESENT' : 'EXCLUDED',
        detail: applicabilityFailureReason,
        confidence: 100
      };
      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'NOT_APPLICABLE',
        applicabilityStatus: 'NOT_APPLICABLE',
        complianceStatus: 'NOT_REQUIRED',
        confidence: 'HIGH',
        reasoning,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PRELIMINARY'
      });
      continue;
    }

    if (componentMatchFound) {
      matchedCriteriaSummary.componentMatch = {
        matched: true,
        status: 'CONFIRMED',
        detail: componentMatchDetails,
        confidence: 100
      };
    }

    // -------------------------------------------------------------
    // EVALUATION GATE: APPLICABILITY RESULT
    // -------------------------------------------------------------
    if (applicabilityBlockedByMissingData) {
      reasoning.push(`[APPLICABILITY: REVIEW REQUIRED] Aircraft model ${ac.model} matches primary scope, but one or more REQUIRED applicability criteria could not be evaluated due to missing fleet data.`);
      missingNotes.forEach(note => reasoning.push(`• ${note}`));
      reasoning.push(`[COMPLIANCE: UNKNOWN] Compliance cannot be evaluated until applicability is determined.`);

      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'REVIEW_REQUIRED',
        applicabilityStatus: 'REVIEW_REQUIRED',
        complianceStatus: 'UNKNOWN',
        confidence: 'MEDIUM',
        reasoning,
        missingInformationNotes: missingNotes,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PENDING_USER_INPUT'
      });
      continue;
    }

    // =========================================================================
    // STEP 2: COMPLIANCE EVALUATION (FOR APPLICABLE AIRCRAFT)
    // =========================================================================
    reasoning.push(`[APPLICABILITY: APPLICABLE] All REQUIRED regulatory criteria matched for ${acLabel}.`);

    // Check Software Requirements (if software configuration is present)
    if (req.softwareRequirements && req.softwareRequirements.length > 0) {
      const swReq = req.softwareRequirements[0];
      const installedSw = (fleet.installedSoftware || []).find(sw => 
        sw.aircraftId === ac.id && 
        sw.status === 'INSTALLED' && 
        normalizeText(sw.softwarePartNumber) === normalizeText(swReq.mandatedSoftware || swReq.softwarePartNumber)
      );

      const hasAccomplishment = (fleet.actionAccomplishments || []).some(acc => 
        acc.aircraftId === ac.id && 
        acc.complianceRequirementId === req.id && 
        acc.eventStatus === 'EXECUTED_VALID'
      );

      const isSoftwareComplied = Boolean(installedSw || hasAccomplishment);
      const softwareComplianceStatus: ComplianceStatus = isSoftwareComplied ? 'COMPLIED' : 'OPEN';

      reasoning.push(`[COMPLIANCE: ${softwareComplianceStatus}] Software P/N ${swReq.mandatedSoftware || swReq.softwarePartNumber}: ${isSoftwareComplied ? `Installed & Verified (Version ${swReq.softwareVersion || 'Current'})` : 'Software load pending execution'}.`);

      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'APPLICABLE',
        applicabilityStatus: 'APPLICABLE',
        complianceStatus: softwareComplianceStatus,
        confidence: 'HIGH',
        reasoning,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PRELIMINARY'
      });
      continue;
    }

    // Check Referenced External Accomplishment Documents (e.g. Service Bulletins)
    const unverifiedRefDocs = (req.referencedDocuments || []).filter(doc => {
      const isUnavailable = doc.availabilityStatus === 'NOT_AVAILABLE';
      const isRequired = doc.requiredForEvaluation !== false;
      return isUnavailable || isRequired;
    });

    const sbFacts = (fleet.knowledgeFacts || []).filter(f => 
      f.subjectId === ac.id && 
      !f.isRejected &&
      unverifiedRefDocs.some(doc => 
        normalizeText(f.title).includes(normalizeText(doc.documentReference)) ||
        normalizeText(f.objectValue).includes(normalizeText(doc.documentReference)) ||
        normalizeText(f.source).includes(normalizeText(doc.documentReference))
      )
    );

    sbFacts.forEach(f => {
      if (!appliedFacts.some(af => af.id === f.id)) appliedFacts.push(f);
    });

    const isSbAccomplished = sbFacts.some(f => 
      (f.factType === 'AIRCRAFT_MOD_STATUS' || f.factType === 'FLEET_EXCLUSION') &&
      (normalizeText(f.objectValue).includes('accomplished') || normalizeText(f.objectValue).includes('complied') || normalizeText(f.objectValue).includes('installed') || normalizeText(f.predicate).includes('accomplished'))
    );

    const hasDirectAccomplishment = (fleet.actionAccomplishments || []).some(acc => 
      acc.aircraftId === ac.id && 
      acc.eventStatus === 'EXECUTED_VALID'
    );

    if (unverifiedRefDocs.length > 0 && !isSbAccomplished && !hasDirectAccomplishment) {
      const missingDocRefs = unverifiedRefDocs.map(d => d.documentReference).join(', ');
      missingNotes.push(`Referenced accomplishment document(s) [${missingDocRefs}] require CAMO verification on ${ac.registration}.`);
      reasoning.push(`[COMPLIANCE: REVIEW REQUIRED] AD mandates execution in accordance with: ${missingDocRefs}. Physical accomplishment log requires verification.`);

      assessments.push({
        id: `ass-${req.id}-${ac.id}`,
        complianceRequirementId: req.id,
        entityType: 'AIRCRAFT',
        entityId: ac.id,
        entityRegistration: ac.registration,
        entityMsn: ac.msn,
        entityModel: ac.model,
        entityLabel: acLabel,
        result: 'APPLICABLE',
        applicabilityStatus: 'APPLICABLE',
        complianceStatus: 'REVIEW_REQUIRED',
        confidence: 'MEDIUM',
        reasoning,
        missingInformationNotes: missingNotes,
        matchedCriteria: matchedCriteriaSummary,
        assessedBy: 'CAMO Dynamic Rule Engine v2.0',
        assessmentDate: new Date().toISOString(),
        status: 'PENDING_USER_INPUT'
      });
      continue;
    }

    // General Airframe Compliance
    const generalComplianceStatus: ComplianceStatus = (isSbAccomplished || hasDirectAccomplishment) ? 'COMPLIED' : 'OPEN';
    reasoning.push(`[COMPLIANCE: ${generalComplianceStatus}] Action execution status: ${generalComplianceStatus === 'COMPLIED' ? 'Complied and recorded' : 'Open requirement (Action pending execution)'}.`);
    if (req.requirementDetails?.initialThreshold) {
      reasoning.push(`Initial compliance threshold: ${req.requirementDetails.initialThreshold}.`);
    }

    assessments.push({
      id: `ass-${req.id}-${ac.id}`,
      complianceRequirementId: req.id,
      entityType: 'AIRCRAFT',
      entityId: ac.id,
      entityRegistration: ac.registration,
      entityMsn: ac.msn,
      entityModel: ac.model,
      entityLabel: acLabel,
      result: 'APPLICABLE',
      applicabilityStatus: 'APPLICABLE',
      complianceStatus: generalComplianceStatus,
      confidence: 'HIGH',
      reasoning,
      matchedCriteria: matchedCriteriaSummary,
      assessedBy: 'CAMO Dynamic Rule Engine v2.0',
      assessmentDate: new Date().toISOString(),
      status: 'PRELIMINARY'
    });
  }

  return {
    assessments,
    generatedQuestions,
    appliedKnowledgeFacts: appliedFacts
  };
}

