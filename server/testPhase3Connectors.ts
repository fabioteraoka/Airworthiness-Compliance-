import { FederalRegisterConnector } from './regulatoryConnectors/federalRegisterConnector';
import { regulatorySourceRegistry } from './regulatoryConnectors/sourceRegistry';
import { sourceReconciler } from './regulatoryConnectors/sourceReconciler';
import { fleetScreeningEngine } from './regulatoryConnectors/fleetScreeningEngine';
import { camoDb } from './dataStore';
import { getCanonicalAircraftModel, matchesModel } from './ruleEngine';
import { RegulatorySourceRecord, ComplianceRequirement } from '../src/types';

async function runPhase3AuditTestSuite() {
  console.log('================================================================');
  console.log('PHASE 3 AUDIT & CORRECTION TEST SUITE — CAMO REGULATORY CONNECTOR');
  console.log('================================================================\n');

  const frConnector = new FederalRegisterConnector();
  const state = camoDb.getState();
  const fleet = {
    aircraft: state.aircraft,
    engines: state.engines,
    components: state.components,
    installations: state.installations
  };

  // ==========================================================================
  // SECTION 1: UNIT TESTS (Pure function & logic checks with TEST_FIXTURE)
  // ==========================================================================
  console.log('================================================================');
  console.log('[SECTION 1: UNIT_TEST]');
  console.log('================================================================\n');

  console.log('--- [UNIT_TEST 1.1] CANONICAL MODEL ISOLATION (737-8 MAX vs 737-800 NG) ---');
  const b737Max = getCanonicalAircraftModel('737-8');
  const b737Ng = getCanonicalAircraftModel('737-800');
  const a320Ceo = getCanonicalAircraftModel('A320-214');
  const a320Neo = getCanonicalAircraftModel('A320-271N');

  console.log(`Model '737-8'   -> Canonical: ${b737Max.family}:${b737Max.variant}`);
  console.log(`Model '737-800' -> Canonical: ${b737Ng.family}:${b737Ng.variant}`);
  console.log(`Model 'A320-214' -> Canonical: ${a320Ceo.family}:${a320Ceo.variant}`);
  console.log(`Model 'A320-271N' -> Canonical: ${a320Neo.family}:${a320Neo.variant}`);

  const matchMaxAgainstNg = matchesModel('737-800', ['737-8', '737-9']);
  const matchMaxAgainstMax = matchesModel('737-8', ['737-8', '737-9']);
  console.log(`matchesModel('737-800', ['737-8', '737-9']) -> ${matchMaxAgainstNg} (Expected: false)`);
  console.log(`matchesModel('737-8', ['737-8', '737-9'])   -> ${matchMaxAgainstMax} (Expected: true)`);
  if (!matchMaxAgainstNg && matchMaxAgainstMax) {
    console.log('>> PASS: Canonical isolation strictly prevents cross-family confusion.\n');
  } else {
    console.error('>> FAIL: Canonical model isolation failed!');
  }

  console.log('--- [UNIT_TEST 1.2] FALSE NEGATIVE PROTECTION ON DERIVED MODELS ---');
  const partialExtractionFixture: RegulatorySourceRecord = {
    source: 'FEDERAL_REGISTER',
    authority: 'FAA',
    documentNumber: 'TEST_FIXTURE_PARTIAL_SCOPE',
    adNumber: '2025-XX-YY',
    title: 'Airworthiness Directives; Boeing Model 737-600 Airplanes (TEST_FIXTURE)',
    make: 'Boeing',
    models: ['737-600'], // Incomplete extraction of 737 NG series
    isPartialModelExtraction: true,
    retrievedAt: new Date().toISOString()
  };

  const screeningReportFixture = fleetScreeningEngine.screenFleetAgainstRegulatoryMetadata(partialExtractionFixture, fleet);
  const prGuoAssessment = screeningReportFixture.assessments.find(a => a.registration === 'PR-GUO');
  const prAiaAssessment = screeningReportFixture.assessments.find(a => a.registration === 'PR-AIA');

  console.log(`PR-GUO (737-800 NG) Status against [737-600] partial: ${prGuoAssessment?.status} (${prGuoAssessment?.reason})`);
  console.log(`PR-AIA (A320-214 Airbus) Status against Boeing: ${prAiaAssessment?.status} (${prAiaAssessment?.reason})`);

  if (prGuoAssessment?.status === 'INSUFFICIENT_METADATA' && prAiaAssessment?.status === 'NO_MATCH') {
    console.log('>> PASS: False Negative Protection works: PR-GUO was NOT excluded with NO_MATCH; marked INSUFFICIENT_METADATA for engineering review.\n');
  } else {
    console.error('>> FAIL: False Negative Protection failed!');
  }

  // ==========================================================================
  // SECTION 2: INTEGRATION TESTS (Reconciliation of SAME AD & Rule Engine)
  // ==========================================================================
  console.log('================================================================');
  console.log('[SECTION 2: INTEGRATION_TEST]');
  console.log('================================================================\n');

  console.log('--- [INTEGRATION_TEST 2.1] RECONCILIATION OF THE SAME AD (FAA AD 2020-24-02) ---');
  console.log('CASO 1: Federal Register Doc 2021-13458 vs Official Record of Same AD 2020-24-02');

  const officialAd2020Record: RegulatorySourceRecord = {
    source: 'FAA_DRS',
    authority: 'FAA',
    documentNumber: 'FAA-AD-2020-24-02',
    adNumber: '2020-24-02',
    title: 'Airworthiness Directives; The Boeing Company Model 737-8 and 737-9 (737 MAX) Airplanes',
    publicationDate: '2021-06-23',
    effectiveDate: '2021-07-28',
    docketNumber: 'Docket No. FAA-2020-0686',
    make: 'Boeing',
    models: ['737-8', '737-9'],
    retrievedAt: new Date().toISOString()
  };

  const frAd2020Record: RegulatorySourceRecord = {
    source: 'FEDERAL_REGISTER',
    authority: 'FAA',
    documentNumber: '2021-13458',
    adNumber: '2020-24-02',
    title: 'Airworthiness Directives; The Boeing Company Airplanes',
    publicationDate: '2021-06-23',
    effectiveDate: '2021-07-28',
    docketNumber: 'FAA-2020-0686',
    citation: '86 FR 32747',
    make: 'Boeing',
    models: ['737-8', '737-9', '737 MAX'],
    retrievedAt: new Date().toISOString()
  };

  const reconSameAd = sourceReconciler.reconcileSourceRecords(officialAd2020Record, frAd2020Record);
  console.log(`Reconciliation Overall Status: ${reconSameAd.overallStatus}`);
  console.log(`Summary: ${reconSameAd.summary}`);
  reconSameAd.fieldComparisons.forEach(fc => {
    console.log(` - Field '${fc.fieldName}': [${fc.status}] ${fc.reason}`);
  });

  if (reconSameAd.overallStatus === 'CONSISTENT' || reconSameAd.overallStatus === 'PARTIALLY_CONSISTENT') {
    console.log('>> PASS: Successfully reconciled two sources for the SAME AD with consistent status.\n');
  } else {
    console.error('>> FAIL: Same AD reconciliation failed!');
  }

  console.log('--- [INTEGRATION_TEST 2.2] APPLICABILITY VS COMPLIANCE SEPARATION ---');
  const sampleAssessment = state.assessments[0];
  console.log(`Assessment ID: ${sampleAssessment.id}`);
  console.log(`Applicability Dimension: applicabilityStatus = '${sampleAssessment.applicabilityStatus}'`);
  console.log(`Compliance Dimension:    complianceStatus    = '${sampleAssessment.complianceStatus}'`);
  console.log(`Result Dimension:        result              = '${sampleAssessment.result}'`);
  if (sampleAssessment.applicabilityStatus && sampleAssessment.complianceStatus && sampleAssessment.applicabilityStatus !== sampleAssessment.complianceStatus) {
    console.log('>> PASS: Applicability domain is completely independent from Compliance domain.\n');
  }

  // ==========================================================================
  // SECTION 3: LIVE REGULATORY TESTS (Real HTTPS Calls to Federal Register)
  // ==========================================================================
  console.log('================================================================');
  console.log('[SECTION 3: LIVE_REGULATORY_TEST (Federal Register Public API v1)]');
  console.log('================================================================\n');

  const adQueries = ['2020-24-02', '2025-07-03', '2025-15-01'];

  for (const adQuery of adQueries) {
    console.log(`----------------------------------------------------------------`);
    console.log(`LIVE QUERY: FAA AD ${adQuery}`);
    console.log(`----------------------------------------------------------------`);
    
    const results = await frConnector.searchByADNumber(adQuery);
    console.log(`Federal Register Records Found: ${results.length}`);

    if (results.length > 0) {
      const topDoc = results[0];
      console.log(`1. AD Number Solicitado:               ${adQuery}`);
      console.log(`2. FR Document Number Encontrado:      ${topDoc.documentNumber}`);
      console.log(`3. Título Retornado:                   ${topDoc.title}`);
      console.log(`4. Publication Date:                   ${topDoc.publicationDate || 'N/A'}`);
      console.log(`5. Effective Date:                     ${topDoc.effectiveDate || 'NOT_AVAILABLE_FROM_SOURCE'}`);
      console.log(`6. Make Determinado:                   ${topDoc.make || 'N/A'}`);
      console.log(`   - Origem do Make:                   DERIVED_METADATA (Regexp parser on title/abstract)`);
      console.log(`7. Models Determinados:                [${topDoc.models?.join(', ') || 'N/A'}]`);
      console.log(`   - Origem dos Models:                DERIVED_METADATA (Series regex parser on title/abstract)`);
      console.log(`8. Detalhamento de Proveniência (Field-Level):`);
      
      if (topDoc.provenanceMap) {
        Object.entries(topDoc.provenanceMap).forEach(([field, fact]: [string, any]) => {
          console.log(`   * Field '${field}':`);
          console.log(`     - Value:             ${Array.isArray(fact.value) ? `[${fact.value.join(', ')}]` : fact.value}`);
          console.log(`     - Source:            ${fact.source}`);
          console.log(`     - Source Reference:  ${fact.sourceReference}`);
          console.log(`     - Origin Type:       ${fact.originType}`);
          if (fact.derivationRule) {
            console.log(`     - Derivation Rule:   ${fact.derivationRule}`);
          }
          console.log(`     - Confidence:        ${fact.confidence}%`);
          console.log(`     - Retrieved At:      ${fact.retrievedAt}`);
        });
      }

      console.log(`\n[Live Regulatory Screening against CAMO Fleet]`);
      const report = fleetScreeningEngine.screenFleetAgainstRegulatoryMetadata(topDoc, fleet);
      console.log(`Total Screened: ${report.totalScreened} | Matches: ${report.potentialMatches} | Excluded: ${report.noMatches} | Insufficient: ${report.insufficientMetadata}`);
      report.assessments.forEach(a => {
        console.log(` - ${a.registration} (${a.aircraftModel} MSN ${a.msn}) -> [${a.status}] ${a.reason}`);
      });
      console.log('');
    } else {
      console.warn(`No records found for ${adQuery}`);
    }
  }

  console.log('================================================================');
  console.log('PHASE 3 AUDIT SUITE EXECUTION COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');
}

runPhase3AuditTestSuite().catch(console.error);

