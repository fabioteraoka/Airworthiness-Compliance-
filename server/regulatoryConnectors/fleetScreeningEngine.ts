import {
  RegulatorySourceRecord,
  RegulatoryDocumentMetadata,
  FleetRegulatoryScreeningReport,
  AircraftScreeningAssessment,
  RegulatoryScreeningStatus,
  Aircraft,
  Engine,
  Component,
  ComponentInstallation,
  RegulatoryDiscoveryRecord,
  RegulatoryScreeningAssessment,
  RegulatoryScreeningSummary
} from '../../src/types';
import { getCanonicalAircraftModel, matchesModel, normalizeText } from '../ruleEngine';

export interface FleetInventoryInput {
  aircraft: Aircraft[];
  engines?: Engine[];
  components?: Component[];
  installations?: ComponentInstallation[];
}

export class FleetScreeningEngine {
  /**
   * Version of the Automated Fleet Regulatory Screening Algorithm.
   * Crucial for audit trails and historical repeatability.
   */
  public readonly ENGINE_VERSION = '5.2.1';

  /**
   * PHASE 5.2 & 5.3.1: Screen an official Regulatory Discovery Record against the CAMO Fleet Inventory.
   * Produces independent RegulatoryScreeningAssessment records with complete provenance and explanation.
   */
  public screenDiscoveryRecordAgainstFleet(
    discovery: RegulatoryDiscoveryRecord,
    fleet: FleetInventoryInput
  ): RegulatoryScreeningSummary {
    const startTime = Date.now();
    const aircraftList = fleet.aircraft || [];
    const assessments: RegulatoryScreeningAssessment[] = [];

    const regulatoryMake = discovery.make || undefined;
    const regulatoryModels = discovery.models && discovery.models.length > 0 ? discovery.models : undefined;
    const productType = discovery.productType || 'AIRCRAFT';

    const makeProv = discovery.provenanceMap?.make;
    const modelsProv = discovery.provenanceMap?.models;

    for (const ac of aircraftList) {
      const assessment = this.evaluateSingleDiscoveryAgainstAircraft(discovery, ac, {
        make: regulatoryMake,
        models: regulatoryModels,
        productType,
        makeProv,
        modelsProv,
        engines: fleet.engines,
        components: fleet.components,
        installations: fleet.installations
      });
      assessments.push(assessment);
    }

    const potentialMatches = assessments.filter(a => a.result === 'POTENTIAL_MATCH').length;
    const noMatches = assessments.filter(a => a.result === 'NO_MATCH').length;
    const insufficientMetadata = assessments.filter(a => a.result === 'INSUFFICIENT_METADATA').length;

    const executionTimeMs = Date.now() - startTime;

    return {
      discoveryRecordId: discovery.id,
      documentNumber: discovery.documentNumber,
      adNumber: discovery.adNumber || undefined,
      screenedAt: new Date().toISOString(),
      totalScreened: aircraftList.length,
      potentialMatches,
      noMatches,
      insufficientMetadata,
      engineVersion: this.ENGINE_VERSION,
      executionTimeMs,
      disclaimer: 'CAMO SCOPING NOTICE: Automated Fleet Regulatory Screening (Phase 5.2/5.3.1) is an initial fleet scoping filter and DOES NOT replace the Deterministic Rule Engine, dynamic serial/configuration verification, or Engineering Sign-off.',
      assessments
    };
  }

  /**
   * Evaluates a single aircraft against a discovery record with strict false-negative prevention rules.
   */
  private evaluateSingleDiscoveryAgainstAircraft(
    discovery: RegulatoryDiscoveryRecord,
    ac: Aircraft,
    scope: {
      make?: string;
      models?: string[];
      productType?: string;
      makeProv?: any;
      modelsProv?: any;
      engines?: Engine[];
      components?: Component[];
      installations?: ComponentInstallation[];
    }
  ): RegulatoryScreeningAssessment {
    const canonicalAcModel = getCanonicalAircraftModel(ac.model);
    const normAcMake = normalizeText(ac.manufacturer);
    const assessmentId = `scr-${discovery.id}-${ac.id}`;
    const nowIso = new Date().toISOString();

    const makeOrigin = scope.makeProv?.originType || discovery.provenanceMap?.make?.originType || (scope.make ? 'SOURCE_METADATA' : 'UNKNOWN');
    const makeConfidence = scope.makeProv?.confidence || discovery.provenanceMap?.make?.confidence || (scope.make ? 90 : 0);
    const modelsOrigin = scope.modelsProv?.originType || discovery.provenanceMap?.models?.originType || (scope.models ? 'SOURCE_METADATA' : 'UNKNOWN');
    const modelsConfidence = scope.modelsProv?.confidence || discovery.provenanceMap?.models?.confidence || (scope.models ? 90 : 0);

    const baseProvenance = {
      manufacturer: scope.make ? { value: scope.make, origin: makeOrigin, confidence: makeConfidence } : undefined,
      models: scope.models ? { value: scope.models, origin: modelsOrigin, confidence: modelsConfidence } : undefined,
      fleetModel: { value: ac.model, origin: 'CAMO_FLEET' },
      canonicalFamily: { value: canonicalAcModel.family, derivation: 'getCanonicalAircraftModel()' },
      derivationNote: `DECISÃO DERIVADA PELO CAMO SCREENING ENGINE (v${this.ENGINE_VERSION})`
    };

    const docTextContext = `${discovery.title || ''} ${discovery.abstract || ''} ${discovery.documentNumber || ''}`;
    const hasConfigOrStcKeywords = /STC|Supplemental Type Certificate|modified by|incorporating|equipped with|modification|configuration/i.test(docTextContext);
    const hasNegativeKeywords = /except|unless|excluding|with the exception of/i.test(docTextContext);

    // 1. INSUFFICIENT METADATA: Metadata completely lacks make and models
    if (!scope.make && (!scope.models || scope.models.length === 0)) {
      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'INSUFFICIENT_METADATA',
        reason: 'Regulatory source metadata does not provide make or model effectivity specifications.',
        matchedManufacturer: undefined,
        matchedModel: undefined,
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: undefined,
        confidence: 50,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: scope.productType,
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_INSUFFICIENT_METADATA_NO_MAKE_OR_MODEL'
        },
        details: { isAmbiguous: true }
      };
    }

    // 2. PRODUCT TYPE: ENGINE SCREENING
    if (scope.productType === 'ENGINE' || (scope.make && /CFM|Pratt & Whitney|Rolls-Royce|General Electric|IAE|International Aero Engines|Safran/i.test(scope.make))) {
      return this.evaluateEngineScopeForDiscovery(discovery, ac, scope, canonicalAcModel, baseProvenance, assessmentId, nowIso);
    }

    // 3. PRODUCT TYPE: APPLIANCE / COMPONENT (Hardened Case B)
    // Appliances and rotable components can be installed across diverse airframes.
    // An incomplete inventory does NOT prove absence. Withhold NO_MATCH unless aircraft make is totally incompatible.
    if (scope.productType === 'APPLIANCE' || scope.productType === 'COMPONENT' || /appliance|transponder|ELT|altimeter|seat|valve|actuator|pump|battery|avionics/i.test(discovery.title || '')) {
      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'INSUFFICIENT_METADATA',
        reason: `Product type is ${scope.productType || 'APPLIANCE/COMPONENT'} (${scope.make || 'Generic'}). Specific component part numbers, appliance serial numbers, or installation effectivity require full document-level extraction and engineering verification.`,
        matchedManufacturer: scope.make,
        matchedModel: undefined,
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: undefined,
        confidence: 60,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: scope.productType || 'APPLIANCE',
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_APPLIANCE_COMPONENT_INSUFFICIENT_METADATA'
        },
        details: { isAmbiguous: true }
      };
    }

    // 4. AIRCRAFT MANUFACTURER VERIFICATION
    let makeMatch = true;
    if (scope.make) {
      const normScopeMake = normalizeText(scope.make);
      makeMatch = normAcMake.includes(normScopeMake) || normScopeMake.includes(normAcMake);
    }

    if (!makeMatch) {
      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'NO_MATCH',
        reason: `Manufacturer mismatch:\nRegulatory manufacturer = ${scope.make}\nFleet manufacturer = ${ac.manufacturer}`,
        matchedManufacturer: scope.make,
        matchedModel: undefined,
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: undefined,
        confidence: 100,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: scope.productType,
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_MANUFACTURER_MISMATCH'
        },
        details: { makeMatch: false, modelMatch: false }
      };
    }

    // 5. AIRCRAFT MODEL EFFECTIVITY & CANONICAL MATCHING
    if (scope.models && scope.models.length > 0) {
      const modelMatch = matchesModel(ac.model, scope.models);

      // Determine regulatory canonical family from models
      const regFamilies = Array.from(new Set(scope.models.map(m => getCanonicalAircraftModel(m).family)));
      const regCanonicalSummary = regFamilies.join(', ');

      if (modelMatch) {
        return {
          id: assessmentId,
          discoveryRecordId: discovery.id,
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          result: 'POTENTIAL_MATCH',
          reason: `Manufacturer matched: ${ac.manufacturer}\nAircraft model matched: ${ac.model}\nCanonical family matched: ${canonicalAcModel.family}\nRegulatory metadata source: Federal Register API\nModel metadata origin: ${modelsOrigin}`,
          matchedManufacturer: ac.manufacturer,
          matchedModel: ac.model,
          fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          regulatoryCanonicalModel: regCanonicalSummary,
          confidence: 95,
          evaluatedAt: nowIso,
          engineVersion: this.ENGINE_VERSION,
          productType: scope.productType,
          provenance: {
            ...baseProvenance,
            ruleApplied: 'RULE_MODEL_EXACT_OR_CANONICAL_POTENTIAL_MATCH'
          },
          details: { makeMatch: true, modelMatch: true, isSameFamily: true }
        };
      }

      // Check if aircraft belongs to the same family as any model in scope
      const isSameFamily = regFamilies.includes(canonicalAcModel.family);

      // FALSE NEGATIVE SAFETY RULE (Phase 4.1 & Phase 5.2 / 5.3.1):
      // If manufacturer matches, but the regulatory models are derived, ambiguous, or generic (e.g. "737 Series", "Airplanes", "Derived from title"),
      // or if STC/modifications or negative exceptions exist, NEVER return NO_MATCH.
      // Return INSUFFICIENT_METADATA with clear justification.
      const isDerived = modelsOrigin === 'DERIVED_METADATA' || modelsOrigin === 'DERIVED';
      const hasGenericTokens = scope.models.some(m => /series|all|airplanes|aircraft|derived|unknown|various|category/i.test(m));
      const mentionsModelBroadly = scope.models.some(m => {
        const normM = normalizeText(m);
        const normAc = normalizeText(ac.model);
        return normM.includes(normAc) || normAc.includes(normM) || (normM.includes('737') && normAc.includes('737'));
      });

      if (hasConfigOrStcKeywords || hasNegativeKeywords) {
        return {
          id: assessmentId,
          discoveryRecordId: discovery.id,
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          result: 'INSUFFICIENT_METADATA',
          reason: `Regulatory record references specific STC, configuration modifications, or conditional applicability exceptions.\nManufacturer matches ${ac.manufacturer}.\nCategorical exclusion withheld to prevent false negatives; requires document-level verification.`,
          matchedManufacturer: ac.manufacturer,
          matchedModel: undefined,
          fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          regulatoryCanonicalModel: regCanonicalSummary,
          confidence: 65,
          evaluatedAt: nowIso,
          engineVersion: this.ENGINE_VERSION,
          productType: scope.productType,
          provenance: {
            ...baseProvenance,
            ruleApplied: 'RULE_FALSE_NEGATIVE_PROTECTION_CONFIGURATION_OR_STC'
          },
          details: { makeMatch: true, modelMatch: false, isAmbiguous: true }
        };
      }

      if (isSameFamily) {
        const isDerivedOrPartial = isDerived || scope.models.length <= 3;
        if (isDerivedOrPartial) {
          return {
            id: assessmentId,
            discoveryRecordId: discovery.id,
            aircraftId: ac.id,
            registration: ac.registration,
            msn: ac.msn,
            aircraftModel: ac.model,
            result: 'INSUFFICIENT_METADATA',
            reason: `Regulatory model metadata is incomplete or ambiguous.\nAircraft ${ac.registration} (${ac.model}) belongs to the same canonical family (${canonicalAcModel.family}).\nFull applicability requires document-level analysis.`,
            matchedManufacturer: ac.manufacturer,
            matchedModel: undefined,
            fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
            regulatoryCanonicalModel: regCanonicalSummary,
            confidence: 60,
            evaluatedAt: nowIso,
            engineVersion: this.ENGINE_VERSION,
            productType: scope.productType,
            provenance: {
              ...baseProvenance,
              ruleApplied: 'RULE_FALSE_NEGATIVE_PROTECTION_SAME_FAMILY_DERIVED_METADATA'
            },
            details: { makeMatch: true, modelMatch: false, isAmbiguous: true, isSameFamily: true }
          };
        }
      }

      // Generic or Ambiguous Scope with Model overlap (Case D)
      if (hasGenericTokens || (regFamilies.includes('CUSTOM') && mentionsModelBroadly)) {
        return {
          id: assessmentId,
          discoveryRecordId: discovery.id,
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          result: 'INSUFFICIENT_METADATA',
          reason: `Regulatory model metadata is generic or ambiguous (${scope.models.join(', ')}).\nManufacturer matches ${ac.manufacturer} (${ac.model}).\nCategorical exclusion withheld to prevent false negatives; requires document-level verification.`,
          matchedManufacturer: ac.manufacturer,
          matchedModel: undefined,
          fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          regulatoryCanonicalModel: regCanonicalSummary,
          confidence: 60,
          evaluatedAt: nowIso,
          engineVersion: this.ENGINE_VERSION,
          productType: scope.productType,
          provenance: {
            ...baseProvenance,
            ruleApplied: 'RULE_FALSE_NEGATIVE_PROTECTION_DERIVED_GENERIC_METADATA'
          },
          details: { makeMatch: true, modelMatch: false, isAmbiguous: true }
        };
      }

      // Categorical Exclusion: Different canonical family (e.g. B737_MAX vs B737_NG, or B747 vs B737_NG)
      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'NO_MATCH',
        reason: `Canonical family mismatch:\nRegulatory canonical family = ${regCanonicalSummary}\nFleet canonical family = ${canonicalAcModel.family} (${ac.model})`,
        matchedManufacturer: ac.manufacturer,
        matchedModel: undefined,
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: regCanonicalSummary,
        confidence: 100,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: scope.productType,
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_CANONICAL_FAMILY_MISMATCH'
        },
        details: { makeMatch: true, modelMatch: false, isSameFamily: false }
      };
    }

    // 6. IF ONLY MAKE MATCHED WITHOUT MODEL CONSTRAINTS (Case E)
    return {
      id: assessmentId,
      discoveryRecordId: discovery.id,
      aircraftId: ac.id,
      registration: ac.registration,
      msn: ac.msn,
      aircraftModel: ac.model,
      result: 'INSUFFICIENT_METADATA',
      reason: `Manufacturer matched: ${ac.manufacturer}\nSpecific models not delimited in regulatory metadata.\nDocument-level analysis required to determine effectivity.`,
      matchedManufacturer: ac.manufacturer,
      matchedModel: undefined,
      fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
      regulatoryCanonicalModel: undefined,
      confidence: 60,
      evaluatedAt: nowIso,
      engineVersion: this.ENGINE_VERSION,
      productType: scope.productType,
      provenance: {
        ...baseProvenance,
        ruleApplied: 'RULE_UNCONSTRAINED_MAKE_INSUFFICIENT_METADATA'
      },
      details: { makeMatch: true, modelMatch: false, isAmbiguous: true }
    };
  }

  /**
   * Helper for Engine AD Screening with provenance and strict disjunctive safety.
   */
  private evaluateEngineScopeForDiscovery(
    discovery: RegulatoryDiscoveryRecord,
    ac: Aircraft,
    scope: {
      make?: string;
      models?: string[];
      productType?: string;
      engines?: Engine[];
      installations?: ComponentInstallation[];
    },
    canonicalAcModel: any,
    baseProvenance: any,
    assessmentId: string,
    nowIso: string
  ): RegulatoryScreeningAssessment {
    const installations = (scope.installations || []).filter(i => i.aircraftId === ac.id && i.currentStatus === 'INSTALLED');
    const installedEngineIds = new Set(installations.map(i => i.componentId));
    const installedEngines = (scope.engines || []).filter(e => installedEngineIds.has(e.id) || e.aircraftId === ac.id);

    const hasLeap1B = scope.models?.some(m => /LEAP-1B/i.test(m));
    const hasCfm56 = scope.models?.some(m => /CFM56/i.test(m));
    const hasLeap1A = scope.models?.some(m => /LEAP-1A/i.test(m));
    const hasPw1100 = scope.models?.some(m => /PW1100|PW1000/i.test(m));

    // Natural pairing check based on aircraft family
    if (canonicalAcModel.family === 'B737_MAX' && hasLeap1B) {
      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'POTENTIAL_MATCH',
        reason: `Engine potential match: Aircraft ${ac.registration} (737 MAX) is powered by CFM LEAP-1B engines.`,
        matchedManufacturer: scope.make,
        matchedModel: 'LEAP-1B',
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: 'CFM:LEAP-1B',
        confidence: 90,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: 'ENGINE',
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_ENGINE_NATURAL_PAIRING_POTENTIAL_MATCH'
        },
        details: { makeMatch: true, modelMatch: true }
      };
    }

    if (canonicalAcModel.family === 'B737_NG' && hasCfm56) {
      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'POTENTIAL_MATCH',
        reason: `Engine potential match: Aircraft ${ac.registration} (737 NG) is powered by CFM56-7B engines.`,
        matchedManufacturer: scope.make,
        matchedModel: 'CFM56-7B',
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: 'CFM:CFM56-7B',
        confidence: 90,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: 'ENGINE',
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_ENGINE_NATURAL_PAIRING_POTENTIAL_MATCH'
        },
        details: { makeMatch: true, modelMatch: true }
      };
    }

    // Check installed engines against scope
    for (const eng of installedEngines) {
      const engMake = normalizeText(eng.manufacturer);
      const scopeMake = normalizeText(scope.make || '');

      if (scope.make && !engMake.includes(scopeMake) && !scopeMake.includes(engMake)) {
        continue;
      }

      if (!scope.models || scope.models.length === 0) {
        return {
          id: assessmentId,
          discoveryRecordId: discovery.id,
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          result: 'POTENTIAL_MATCH',
          reason: `Engine manufacturer match: Installed engine ${eng.model} (${eng.manufacturer}).`,
          matchedManufacturer: eng.manufacturer,
          matchedModel: eng.model,
          fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          regulatoryCanonicalModel: undefined,
          confidence: 85,
          evaluatedAt: nowIso,
          engineVersion: this.ENGINE_VERSION,
          productType: 'ENGINE',
          provenance: {
            ...baseProvenance,
            ruleApplied: 'RULE_ENGINE_MANUFACTURER_MATCH'
          },
          details: { makeMatch: true, modelMatch: true }
        };
      }

      const matchesEngModel = scope.models.some(target => {
        const normTarget = normalizeText(target);
        const normEng = normalizeText(eng.model);
        return normEng === normTarget || normEng.includes(normTarget) || normTarget.includes(normEng);
      });

      if (matchesEngModel) {
        return {
          id: assessmentId,
          discoveryRecordId: discovery.id,
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          result: 'POTENTIAL_MATCH',
          reason: `Installed engine match: Engine ${eng.model} (S/N ${eng.serialNumber}) matches regulatory model scope [${scope.models.join(', ')}].`,
          matchedManufacturer: eng.manufacturer,
          matchedModel: eng.model,
          fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          regulatoryCanonicalModel: scope.models.join(', '),
          confidence: 95,
          evaluatedAt: nowIso,
          engineVersion: this.ENGINE_VERSION,
          productType: 'ENGINE',
          provenance: {
            ...baseProvenance,
            ruleApplied: 'RULE_ENGINE_EXACT_MODEL_MATCH'
          },
          details: { makeMatch: true, modelMatch: true }
        };
      }
    }

    // If no installed engines in inventory and no natural pairing match
    if (installedEngines.length === 0) {
      // Disjunctive exclusion check: Only return NO_MATCH if every listed engine model is clearly outside the aircraft family
      if (canonicalAcModel.family === 'B737_NG' && hasLeap1B && !hasCfm56) {
        return {
          id: assessmentId,
          discoveryRecordId: discovery.id,
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          result: 'NO_MATCH',
          reason: `Engine mismatch: Aircraft ${ac.registration} (737 NG) uses CFM56-7B engines, outside LEAP-1B scope.`,
          matchedManufacturer: scope.make,
          matchedModel: undefined,
          fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          regulatoryCanonicalModel: 'CFM:LEAP-1B',
          confidence: 98,
          evaluatedAt: nowIso,
          engineVersion: this.ENGINE_VERSION,
          productType: 'ENGINE',
          provenance: {
            ...baseProvenance,
            ruleApplied: 'RULE_ENGINE_NATURAL_PAIRING_MISMATCH'
          },
          details: { makeMatch: false, modelMatch: false }
        };
      }

      return {
        id: assessmentId,
        discoveryRecordId: discovery.id,
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        result: 'INSUFFICIENT_METADATA',
        reason: 'No installed engines documented in fleet inventory for this aircraft to confirm engine AD effectivity.',
        matchedManufacturer: scope.make,
        matchedModel: undefined,
        fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        regulatoryCanonicalModel: undefined,
        confidence: 60,
        evaluatedAt: nowIso,
        engineVersion: this.ENGINE_VERSION,
        productType: 'ENGINE',
        provenance: {
          ...baseProvenance,
          ruleApplied: 'RULE_ENGINE_MISSING_INVENTORY_INSUFFICIENT_METADATA'
        },
        details: { isAmbiguous: true }
      };
    }

    return {
      id: assessmentId,
      discoveryRecordId: discovery.id,
      aircraftId: ac.id,
      registration: ac.registration,
      msn: ac.msn,
      aircraftModel: ac.model,
      result: 'NO_MATCH',
      reason: `Installed engines do not match regulatory engine models [${scope.models?.join(', ') || 'N/A'}].`,
      matchedManufacturer: scope.make,
      matchedModel: undefined,
      fleetCanonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
      regulatoryCanonicalModel: scope.models?.join(', '),
      confidence: 95,
      evaluatedAt: nowIso,
      engineVersion: this.ENGINE_VERSION,
      productType: 'ENGINE',
      provenance: {
        ...baseProvenance,
        ruleApplied: 'RULE_ENGINE_MODEL_MISMATCH'
      },
      details: { makeMatch: false, modelMatch: false }
    };
  }

  // --------------------------------------------------------------------------
  // BACKWARD COMPATIBILITY (PHASE 3 & PHASE 4)
  // --------------------------------------------------------------------------

  /**
   * Screen fleet assets against high-level regulatory metadata (Legacy Phase 3/4 support).
   */
  screenFleetAgainstRegulatoryMetadata(
    metadataInput: RegulatoryDocumentMetadata | RegulatorySourceRecord,
    fleet: FleetInventoryInput
  ): FleetRegulatoryScreeningReport {
    const adNumber = this.extractAdNumber(metadataInput);
    const sourceAuthority = this.extractAuthority(metadataInput);
    const make = this.extractMake(metadataInput);
    const models = this.extractModels(metadataInput);
    const productType = this.extractProductType(metadataInput);
    const isPartialExtraction = 'isPartialModelExtraction' in metadataInput ? (metadataInput as any).isPartialModelExtraction : false;

    const assessments: AircraftScreeningAssessment[] = [];
    const aircraftList = fleet.aircraft || [];

    for (const ac of aircraftList) {
      const assessment = this.screenSingleAircraft(ac, {
        make,
        models,
        productType,
        isPartialExtraction,
        engines: fleet.engines,
        installations: fleet.installations
      });
      assessments.push(assessment);
    }

    const potentialMatches = assessments.filter(a => a.status === 'POTENTIAL_MATCH').length;
    const noMatches = assessments.filter(a => a.status === 'NO_MATCH').length;
    const insufficientMetadata = assessments.filter(a => a.status === 'INSUFFICIENT_METADATA').length;

    return {
      adNumber,
      sourceAuthority,
      screenedAt: new Date().toISOString(),
      totalScreened: aircraftList.length,
      potentialMatches,
      noMatches,
      insufficientMetadata,
      disclaimer: 'REGULATORY NOTICE: Regulatory Screening is an initial scoping filter and DOES NOT constitute final applicability or compliance determination. Final determination is strictly governed by the Deterministic Rule Engine, Dynamic Applicability Criteria, and Fleet Verification Facts.',
      assessments
    };
  }

  private screenSingleAircraft(
    ac: Aircraft,
    scope: {
      make?: string;
      models?: string[];
      productType?: string;
      isPartialExtraction?: boolean;
      engines?: Engine[];
      installations?: ComponentInstallation[];
    }
  ): AircraftScreeningAssessment {
    const canonicalAcModel = getCanonicalAircraftModel(ac.model);
    const normAcMake = normalizeText(ac.manufacturer);

    if (!scope.make && (!scope.models || scope.models.length === 0)) {
      return {
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        status: 'INSUFFICIENT_METADATA',
        reason: 'Regulatory source metadata does not provide make or model effectivity specifications.',
        confidence: 50,
        details: { isAmbiguous: true }
      };
    }

    if (scope.productType === 'ENGINE' || (scope.make && /CFM|Pratt & Whitney|Rolls-Royce|General Electric/i.test(scope.make))) {
      return this.screenEngineScope(ac, scope, canonicalAcModel);
    }

    let makeMatch = true;
    if (scope.make) {
      const normScopeMake = normalizeText(scope.make);
      makeMatch = normAcMake.includes(normScopeMake) || normScopeMake.includes(normAcMake);
    }

    if (!makeMatch) {
      return {
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        status: 'NO_MATCH',
        reason: `Manufacturer mismatch: Fleet aircraft is ${ac.manufacturer}, but regulatory record specifies ${scope.make}.`,
        confidence: 100,
        details: { makeMatch: false, modelMatch: false }
      };
    }

    if (scope.models && scope.models.length > 0) {
      const modelMatch = matchesModel(ac.model, scope.models);

      if (modelMatch) {
        return {
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          status: 'POTENTIAL_MATCH',
          reason: `Model potential match: Fleet model ${ac.model} (${canonicalAcModel.family}:${canonicalAcModel.variant}) is within regulatory models [${scope.models.join(', ')}]. Ready for Rule Engine evaluation.`,
          confidence: 95,
          details: { makeMatch: true, modelMatch: true }
        };
      }

      const scopeFamilies = scope.models.map(m => getCanonicalAircraftModel(m).family);
      const isSameFamily = scopeFamilies.includes(canonicalAcModel.family);

      if (isSameFamily) {
        const isPotentialPartial = scope.isPartialExtraction || scope.models.length <= 2;
        if (isPotentialPartial) {
          return {
            aircraftId: ac.id,
            registration: ac.registration,
            msn: ac.msn,
            aircraftModel: ac.model,
            canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
            status: 'INSUFFICIENT_METADATA',
            reason: `Ambiguous model scope: Aircraft ${ac.registration} is in the same family (${canonicalAcModel.family}) as regulatory models [${scope.models.join(', ')}]. Because model metadata was derived from document text, full variant applicability requires Rule Engine verification.`,
            confidence: 60,
            details: { makeMatch: true, modelMatch: false, isAmbiguous: true }
          };
        }
      }

      return {
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        status: 'NO_MATCH',
        reason: `Canonical model mismatch: Fleet aircraft is ${ac.model} (${canonicalAcModel.family}:${canonicalAcModel.variant}), which is outside regulatory scope [${scope.models.join(', ')}].`,
        confidence: 100,
        details: { makeMatch: true, modelMatch: false }
      };
    }

    return {
      aircraftId: ac.id,
      registration: ac.registration,
      msn: ac.msn,
      aircraftModel: ac.model,
      canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
      status: 'POTENTIAL_MATCH',
      reason: `Manufacturer potential match: ${ac.manufacturer}. Specific models not delimited in regulatory metadata.`,
      confidence: 75,
      details: { makeMatch: true, modelMatch: true, isAmbiguous: true }
    };
  }

  private screenEngineScope(
    ac: Aircraft,
    scope: {
      make?: string;
      models?: string[];
      engines?: Engine[];
      installations?: ComponentInstallation[];
    },
    canonicalAcModel: any
  ): AircraftScreeningAssessment {
    const installations = (scope.installations || []).filter(i => i.aircraftId === ac.id && i.currentStatus === 'INSTALLED');
    const installedEngineIds = new Set(installations.map(i => i.componentId));
    const installedEngines = (scope.engines || []).filter(e => installedEngineIds.has(e.id) || e.aircraftId === ac.id);

    if (installedEngines.length === 0) {
      if (canonicalAcModel.family === 'B737_MAX' && scope.models?.some(m => /LEAP-1B/i.test(m))) {
        return {
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          status: 'POTENTIAL_MATCH',
          reason: `Engine potential match: Aircraft ${ac.registration} (737 MAX) is powered by CFM LEAP-1B engines.`,
          confidence: 90,
          details: { makeMatch: true, modelMatch: true }
        };
      }

      if (canonicalAcModel.family === 'B737_NG' && scope.models?.some(m => /LEAP-1B/i.test(m))) {
        return {
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          status: 'NO_MATCH',
          reason: `Engine mismatch: Aircraft ${ac.registration} (737 NG) uses CFM56-7B engines, outside LEAP-1B scope.`,
          confidence: 98,
          details: { makeMatch: false, modelMatch: false }
        };
      }

      return {
        aircraftId: ac.id,
        registration: ac.registration,
        msn: ac.msn,
        aircraftModel: ac.model,
        canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
        status: 'INSUFFICIENT_METADATA',
        reason: 'No installed engines documented in fleet inventory for this aircraft to confirm engine AD effectivity.',
        confidence: 60,
        details: { isAmbiguous: true }
      };
    }

    for (const eng of installedEngines) {
      const engMake = normalizeText(eng.manufacturer);
      const scopeMake = normalizeText(scope.make || '');

      if (scope.make && !engMake.includes(scopeMake) && !scopeMake.includes(engMake)) {
        continue;
      }

      if (!scope.models || scope.models.length === 0) {
        return {
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          status: 'POTENTIAL_MATCH',
          reason: `Engine manufacturer match: Installed engine ${eng.model} (${eng.manufacturer}).`,
          confidence: 85,
          details: { makeMatch: true, modelMatch: true }
        };
      }

      const matchesEngModel = scope.models.some(target => {
        const normTarget = normalizeText(target);
        const normEng = normalizeText(eng.model);
        return normEng === normTarget || normEng.includes(normTarget) || normTarget.includes(normEng);
      });

      if (matchesEngModel) {
        return {
          aircraftId: ac.id,
          registration: ac.registration,
          msn: ac.msn,
          aircraftModel: ac.model,
          canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
          status: 'POTENTIAL_MATCH',
          reason: `Installed engine match: Engine ${eng.model} (S/N ${eng.serialNumber}) matches regulatory model scope [${scope.models.join(', ')}].`,
          confidence: 95,
          details: { makeMatch: true, modelMatch: true }
        };
      }
    }

    return {
      aircraftId: ac.id,
      registration: ac.registration,
      msn: ac.msn,
      aircraftModel: ac.model,
      canonicalModel: `${canonicalAcModel.family}:${canonicalAcModel.variant}`,
      status: 'NO_MATCH',
      reason: `Installed engines do not match regulatory engine models [${scope.models?.join(', ') || 'N/A'}].`,
      confidence: 95,
      details: { makeMatch: false, modelMatch: false }
    };
  }

  // --------------------------------------------------------------------------
  // INPUT NORMALIZERS
  // --------------------------------------------------------------------------

  private extractAdNumber(input: RegulatoryDocumentMetadata | RegulatorySourceRecord): string {
    if ('sourceRecords' in input && (input as any).adNumber?.value) {
      return (input as any).adNumber.value;
    }
    return (input as RegulatorySourceRecord).adNumber || (input as RegulatorySourceRecord).documentNumber || 'UNKNOWN_AD';
  }

  private extractAuthority(input: RegulatoryDocumentMetadata | RegulatorySourceRecord): string {
    if ('sourceRecords' in input && (input as any).authority?.value) {
      return (input as any).authority.value;
    }
    return (input as RegulatorySourceRecord).authority || 'FAA';
  }

  private extractMake(input: RegulatoryDocumentMetadata | RegulatorySourceRecord): string | undefined {
    if ('sourceRecords' in input) {
      return (input as any).make?.value;
    }
    return (input as RegulatorySourceRecord).make;
  }

  private extractModels(input: RegulatoryDocumentMetadata | RegulatorySourceRecord): string[] | undefined {
    if ('sourceRecords' in input) {
      return (input as any).models?.value;
    }
    return (input as RegulatorySourceRecord).models;
  }

  private extractProductType(input: RegulatoryDocumentMetadata | RegulatorySourceRecord): string | undefined {
    if ('sourceRecords' in input) {
      return (input as any).productType?.value;
    }
    return (input as RegulatorySourceRecord).productType;
  }
}

export const fleetScreeningEngine = new FleetScreeningEngine();
