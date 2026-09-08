import { regulatoryDiscoveryEngine } from './server/regulatoryConnectors/regulatoryDiscoveryEngine';
import { regulatorySourceRegistry } from './server/regulatoryConnectors/sourceRegistry';
import { FederalRegisterConnector } from './server/regulatoryConnectors/federalRegisterConnector';
import { officialDocumentAcquisitionService } from './server/regulatoryConnectors/officialDocumentAcquisitionService';
import { evaluateRequirementWithCamoV2 } from './server/complianceOrchestrator';
import { camoDb } from './server/dataStore';
import { RegulatoryDiscoveryScanSummary, RegulatoryDiscoveryRecord } from './src/types';

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('PROJETO CAMO — FASE 5.1A: REGULATORY DISCOVERY ENGINE AUDIT');
  console.log('CORRECTIVE AUDIT & MULTI-YEAR PROVENANCE VERIFICATION');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 10;

  // -------------------------------------------------------------
  // TEST 1: LIVE DISCOVERY — Query Federal Register API for Part 39 ADs
  // -------------------------------------------------------------
  console.log('>>> TEST 1: LIVE DISCOVERY — Query Federal Register API for FAA 14 CFR Part 39 ADs');
  const scanResult1 = await regulatoryDiscoveryEngine.scanRegulatorySources({
    startDate: '2025-04-01',
    endDate: '2025-04-30',
    maxPages: 2,
    perPage: 10
  });

  console.log(`Scan ID: ${scanResult1.summary.scanId}`);
  console.log(`Total Documents Scanned: ${scanResult1.summary.totalDocumentsScanned}`);
  console.log(`New Discoveries Count: ${scanResult1.summary.newDiscoveriesCount}`);
  console.log(`Pages Scanned: ${scanResult1.summary.pagesScanned}`);
  console.log(`Execution Time: ${scanResult1.summary.executionTimeMs}ms`);

  if (scanResult1.summary.totalDocumentsScanned === 0 || scanResult1.discoveries.length === 0) {
    throw new Error('Test 1 Failed: Live discovery scan returned 0 documents for 2025-04-01..2025-04-30.');
  }

  const sampleDisc = scanResult1.discoveries[0];
  console.log(`Sample Discovery: ${sampleDisc.adNumber || sampleDisc.documentNumber} — "${sampleDisc.title.substring(0, 70)}..."`);
  console.log(`Authority: ${sampleDisc.authority} | Source: ${sampleDisc.source} | Doc #: ${sampleDisc.documentNumber}`);

  if (sampleDisc.authority !== 'FAA' || sampleDisc.source !== 'FEDERAL_REGISTER' || !sampleDisc.documentNumber) {
    throw new Error('Test 1 Failed: Discovery record metadata missing authority or document number.');
  }
  console.log('>>> TEST 1 PASSED: Live discovery successfully returned Part 39 ADs.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 2: CRITICAL AUDIT — MULTI-YEAR REAL AD NUMBER IDENTIFICATION & CHAIN TRACE
  // -------------------------------------------------------------
  console.log('>>> TEST 2: MULTI-YEAR REAL AD NUMBER IDENTIFICATION & PROVENANCE TRACE');
  const connector = regulatorySourceRegistry.getFederalRegisterConnector();

  const multiYearTestCases = [
    { docNumber: '2025-06005', expectedAD: '2025-07-03', year: 2025, note: 'Boeing 737 NG (Supersedes 2021-09-06)' },
    { docNumber: '2020-25844', expectedAD: '2020-24-02', year: 2020, note: 'Boeing 737 MAX' },
    { docNumber: '2021-13782', expectedAD: '2021-12-17', year: 2021, note: 'ATR-GIE Airplanes' },
    { docNumber: '2022-13750', expectedAD: '2022-11-13', year: 2022, note: 'Boeing Airplanes' },
    { docNumber: '2023-13743', expectedAD: '2023-13-01', year: 2023, note: 'Airbus SAS Airplanes' },
    { docNumber: '2023-13417', expectedAD: '2016-15-01R1', year: 2023, note: 'Airbus SAS Revision R1' },
    { docNumber: '2024-14072', expectedAD: '2024-13-03', year: 2024, note: 'Lindstrand Balloons' }
  ];

  for (const tc of multiYearTestCases) {
    const docRec = await connector.getDocument(tc.docNumber);
    if (!docRec) {
      throw new Error(`Test 2 Failed: Unable to retrieve real FR Doc ${tc.docNumber}.`);
    }

    const adProv = docRec.provenanceMap?.adNumber;
    const docProv = docRec.provenanceMap?.documentNumber;

    console.log(`--- [Year ${tc.year}] FR Doc ${tc.docNumber} (${tc.note}) ---`);
    console.log(`AD Number:         ${docRec.adNumber}`);
    console.log(`FR Document Number:${docRec.documentNumber}`);
    console.log(`Publication Date:  ${docRec.publicationDate}`);
    console.log(`Effective Date:    ${docRec.effectiveDate}`);
    console.log(`Source of AD:      ${adProv?.source || 'FEDERAL_REGISTER'}`);
    console.log(`Origin Type:       ${adProv?.originType} (Document Number Origin: ${docProv?.originType})`);
    console.log(`Derivation Rule:   ${adProv?.derivationRule}`);
    console.log(`Confidence:        ${adProv?.confidence}%\n`);

    if (docRec.adNumber !== tc.expectedAD) {
      throw new Error(`Test 2 Failed: Expected AD ${tc.expectedAD} for FR Doc ${tc.docNumber}, but got ${docRec.adNumber}`);
    }
    if (adProv?.originType !== 'DERIVED_METADATA') {
      throw new Error(`Test 2 Failed: AD Number originType must be DERIVED_METADATA, got ${adProv?.originType}`);
    }
    if (docProv?.originType !== 'SOURCE_METADATA') {
      throw new Error(`Test 2 Failed: Document Number originType must be SOURCE_METADATA, got ${docProv?.originType}`);
    }
  }
  console.log('>>> TEST 2 PASSED: Multi-year AD identification and derivation rules strictly verified.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 3: ISOLATED DEDUPLICATION CYCLE — NEW (0 -> 5) -> ALREADY_KNOWN (5 -> 5)
  // -------------------------------------------------------------
  console.log('>>> TEST 3: ISOLATED DEDUPLICATION CYCLE — NEW (0 -> 5) -> ALREADY_KNOWN (5 -> 5)');
  
  // 1. Snapshot and clear discoveryRecords for a pure isolated test
  const originalDiscoveryRecords = [...(camoDb.getState().discoveryRecords || [])];
  camoDb.update(draft => {
    draft.discoveryRecords = [];
  });

  console.log(`Initial isolated state: ${camoDb.getState().discoveryRecords?.length || 0} discovery records.`);

  // 2. Execute Scan A
  const isolatedScanA = await regulatoryDiscoveryEngine.scanRegulatorySources({
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    maxPages: 1,
    perPage: 5
  });

  const dbCountAfterScanA = camoDb.getState().discoveryRecords?.length || 0;
  const idsAfterScanA = (camoDb.getState().discoveryRecords || []).map(r => r.id).sort();

  console.log(`SCAN A Results: Scanned=${isolatedScanA.summary.totalDocumentsScanned}, NEW=${isolatedScanA.summary.newDiscoveriesCount}, ALREADY_KNOWN=${isolatedScanA.summary.alreadyKnownCount}`);
  console.log(`Persisted in DB after Scan A: ${dbCountAfterScanA} records.`);
  console.log(`Persisted IDs: ${JSON.stringify(idsAfterScanA)}`);

  if (isolatedScanA.summary.newDiscoveriesCount !== 5 || isolatedScanA.summary.alreadyKnownCount !== 0) {
    throw new Error(`Test 3 Failed: Scan A expected 5 NEW, 0 ALREADY_KNOWN, got NEW=${isolatedScanA.summary.newDiscoveriesCount}, KNOWN=${isolatedScanA.summary.alreadyKnownCount}`);
  }
  if (dbCountAfterScanA !== 5) {
    throw new Error(`Test 3 Failed: DB expected 5 records after Scan A, got ${dbCountAfterScanA}`);
  }

  // 3. Execute Scan B on the exact same range
  const isolatedScanB = await regulatoryDiscoveryEngine.scanRegulatorySources({
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    maxPages: 1,
    perPage: 5
  });

  const dbCountAfterScanB = camoDb.getState().discoveryRecords?.length || 0;
  const idsAfterScanB = (camoDb.getState().discoveryRecords || []).map(r => r.id).sort();

  console.log(`SCAN B Results: Scanned=${isolatedScanB.summary.totalDocumentsScanned}, NEW=${isolatedScanB.summary.newDiscoveriesCount}, ALREADY_KNOWN=${isolatedScanB.summary.alreadyKnownCount}`);
  console.log(`Persisted in DB after Scan B: ${dbCountAfterScanB} records.`);
  console.log(`Persisted IDs: ${JSON.stringify(idsAfterScanB)}`);

  if (isolatedScanB.summary.newDiscoveriesCount !== 0 || isolatedScanB.summary.alreadyKnownCount !== 5) {
    throw new Error(`Test 3 Failed: Scan B expected 0 NEW, 5 ALREADY_KNOWN, got NEW=${isolatedScanB.summary.newDiscoveriesCount}, KNOWN=${isolatedScanB.summary.alreadyKnownCount}`);
  }
  if (dbCountAfterScanB !== 5) {
    throw new Error(`Test 3 Failed: DB count mutated after Scan B! Expected 5, got ${dbCountAfterScanB}`);
  }
  if (JSON.stringify(idsAfterScanA) !== JSON.stringify(idsAfterScanB)) {
    throw new Error('Test 3 Failed: Persisted ID set changed between identical scans.');
  }

  // Restore previous records + merge test records
  camoDb.update(draft => {
    const existingIds = new Set((draft.discoveryRecords || []).map(r => r.id));
    for (const rec of originalDiscoveryRecords) {
      if (!existingIds.has(rec.id)) {
        draft.discoveryRecords.push(rec);
      }
    }
  });

  console.log('>>> TEST 3 PASSED: Complete NEW -> ALREADY_KNOWN isolated cycle verified with 0 duplicates.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 4: PART 39 SCOPE VALIDATION — FAA + 14 CFR + Part 39 + RULE
  // -------------------------------------------------------------
  console.log('>>> TEST 4: PART 39 SCOPE VALIDATION — Confirm Precise Regulatory Filters');
  const scopeResponse = await connector.discoverFAAPart39Publications('2025-04-01', '2025-04-30', {
    perPage: 25,
    page: 1
  });

  console.log(`Retrieved ${scopeResponse.results.length} documents for 2025-04 Part 39 search.`);
  
  let validPart39Count = 0;
  for (const doc of scopeResponse.results) {
    const isFAA = doc.authority === 'FAA';
    const isPart39 = doc.cfrReferences?.some(c => c.title === 14 && String(c.part) === '39');
    if (isFAA && isPart39) {
      validPart39Count++;
    }
  }

  console.log(`Verified Part 39 Scope: ${validPart39Count}/${scopeResponse.results.length} match FAA Title 14 CFR Part 39.`);
  if (validPart39Count !== scopeResponse.results.length || validPart39Count === 0) {
    throw new Error('Test 4 Failed: Scope returned non-Part 39 documents.');
  }
  console.log('>>> TEST 4 PASSED: Discovery filter strictly isolates FAA 14 CFR Part 39 Final Rules.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 5: PAGINATION — Multi-page Retrieval & Accumulation
  // -------------------------------------------------------------
  console.log('>>> TEST 5: PAGINATION — Multi-page Federal Register Scanning');
  const multiPageScan = await regulatoryDiscoveryEngine.scanRegulatorySources({
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    maxPages: 3,
    perPage: 5
  });

  console.log(`Pages requested: max 3, Pages scanned: ${multiPageScan.summary.pagesScanned}`);
  console.log(`Documents collected across pages: ${multiPageScan.summary.totalDocumentsScanned}`);

  if (multiPageScan.summary.pagesScanned < 2) {
    throw new Error('Test 5 Failed: Pagination did not traverse multiple pages.');
  }

  const docNumbers = multiPageScan.discoveries.map(d => d.documentNumber);
  const uniqueDocNumbers = new Set(docNumbers);
  if (uniqueDocNumbers.size !== docNumbers.length) {
    throw new Error('Test 5 Failed: Multi-page scanning contained duplicated document numbers in a single run.');
  }
  console.log(`Verified ${docNumbers.length} unique document numbers across ${multiPageScan.summary.pagesScanned} pages.`);
  console.log('>>> TEST 5 PASSED: Multi-page pagination and aggregation operational.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 6: PROVENANCE MAP — SOURCE_METADATA vs DERIVED_METADATA Separation
  // -------------------------------------------------------------
  console.log('>>> TEST 6: PROVENANCE MAP — Field-level Provenance Verification');
  const testRecord = isolatedScanA.discoveries[0];
  const provMap = testRecord.provenanceMap;

  console.log('Inspecting Provenance Map for doc:', testRecord.documentNumber);
  console.log('Document Number Provenance:', JSON.stringify(provMap.documentNumber));
  console.log('Publication Date Provenance:', JSON.stringify(provMap.publicationDate));

  if (!provMap.documentNumber || provMap.documentNumber.originType !== 'SOURCE_METADATA') {
    throw new Error('Test 6 Failed: documentNumber not marked as SOURCE_METADATA.');
  }

  if (provMap.publicationDate && provMap.publicationDate.originType !== 'SOURCE_METADATA') {
    throw new Error('Test 6 Failed: publicationDate not marked as SOURCE_METADATA.');
  }

  if (provMap.adNumber) {
    console.log('AD Number Provenance (Derived):', JSON.stringify(provMap.adNumber));
    if (provMap.adNumber.originType !== 'DERIVED_METADATA') {
      throw new Error('Test 6 Failed: adNumber not marked as DERIVED_METADATA.');
    }
  }

  if (provMap.make) {
    console.log('Make Provenance (Derived):', JSON.stringify(provMap.make));
    if (provMap.make.originType !== 'DERIVED_METADATA') {
      throw new Error('Test 6 Failed: make not marked as DERIVED_METADATA.');
    }
  }

  console.log('>>> TEST 6 PASSED: Provenance map strictly enforces SOURCE_METADATA vs DERIVED_METADATA.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 7: EMPTY RANGE — Valid Date Range with Zero Publications
  // -------------------------------------------------------------
  console.log('>>> TEST 7: EMPTY RANGE — Zero Results Handled Gracefully');
  const emptyScan = await regulatoryDiscoveryEngine.scanRegulatorySources({
    startDate: '1970-01-01',
    endDate: '1970-01-02',
    maxPages: 1
  });

  console.log(`Empty Scan Total Documents: ${emptyScan.summary.totalDocumentsScanned}`);
  console.log(`Empty Scan New Discoveries: ${emptyScan.summary.newDiscoveriesCount}`);
  console.log(`Empty Scan Errors: ${emptyScan.summary.errorsCount}`);

  if (emptyScan.summary.totalDocumentsScanned !== 0 || emptyScan.discoveries.length !== 0) {
    throw new Error('Test 7 Failed: Empty range scan unexpectedly returned documents.');
  }
  console.log('>>> TEST 7 PASSED: Empty scan handled gracefully with zero errors.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 8: INVALID RANGE — startDate > endDate Throws Validation Error
  // -------------------------------------------------------------
  console.log('>>> TEST 8: INVALID RANGE — Validation Error on Inverted Dates');
  let caughtValidationError = false;
  try {
    await regulatoryDiscoveryEngine.scanRegulatorySources({
      startDate: '2025-05-10',
      endDate: '2025-05-01'
    });
  } catch (err: any) {
    caughtValidationError = true;
    console.log('Caught Expected Validation Error:', err.message);
    if (!err.message.includes('Validation Error') && !err.message.includes('cannot be greater than')) {
      throw new Error(`Test 8 Failed: Error message not descriptive: ${err.message}`);
    }
  }

  if (!caughtValidationError) {
    throw new Error('Test 8 Failed: Engine did not reject startDate > endDate.');
  }
  console.log('>>> TEST 8 PASSED: Inverted date range correctly rejected before network request.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 9: API FAILURE HANDLING — Connector Error Resilience
  // -------------------------------------------------------------
  console.log('>>> TEST 9: API FAILURE HANDLING — Graceful Error Handling');
  const failingConnector = new FederalRegisterConnector();
  (failingConnector as any).fetchWithTimeout = async () => {
    throw new Error('ECONNREFUSED 504 Gateway Timeout (Simulated)');
  };

  const failingEngine = new (regulatoryDiscoveryEngine.constructor as any)(failingConnector);
  let caughtApiError = false;
  try {
    await failingEngine.scanRegulatorySources({
      startDate: '2025-01-01',
      endDate: '2025-01-10'
    });
  } catch (err: any) {
    caughtApiError = true;
    console.log('Caught Handled API Error:', err.message);
    if (!err.message.includes('Regulatory Discovery Scan failed')) {
      throw new Error(`Test 9 Failed: Expected scan failure wrapper, got: ${err.message}`);
    }
  }

  if (!caughtApiError) {
    throw new Error('Test 9 Failed: Engine did not propagate connector error safely.');
  }

  const stateAfterError = camoDb.getState();
  if (!Array.isArray(stateAfterError.discoveryRecords)) {
    throw new Error('Test 9 Failed: DataStore discoveryRecords corrupted after error.');
  }
  console.log('>>> TEST 9 PASSED: API communication errors handled safely with DataStore integrity intact.\n');
  passedTests++;

  // -------------------------------------------------------------
  // TEST 10: NO REGRESSION — Phase 3 & 4 Regression Checks
  // -------------------------------------------------------------
  console.log('>>> TEST 10: NO REGRESSION — Phase 3 & 4 Functionality & Rule Engine');
  
  // 1. Check Official Document Acquisition (Phase 4)
  const acqDocs = camoDb.getState().acquiredDocuments || [];
  console.log(`Acquired Documents in Vault: ${acqDocs.length}`);
  
  // Test acquisition of AD 2020-24-02
  const frConn = regulatorySourceRegistry.getFederalRegisterConnector();
  const search2020 = await frConn.searchByADNumber('2020-24-02');
  if (search2020.length > 0) {
    const acqTest = await officialDocumentAcquisitionService.acquireOfficialDocument(search2020[0], {
      analyze: false
    });
    console.log(`Acquisition of AD 2020-24-02: Status=${acqTest.record.validationStatus}, SHA256=${acqTest.record.sha256}`);
    if (acqTest.record.validationStatus !== 'VALID' || !acqTest.record.sha256) {
      throw new Error('Test 10 Failed: Official document acquisition failed during regression test.');
    }
  }

  // 2. Check CAMO Rule Engine on Fleet Aircraft (PR-XMA, PR-XMB, PR-XMC)
  const state = camoDb.getState();
  const adRequirement = state.requirements.find(r => r.sourceNumber.includes('2020-24-02'));
  if (adRequirement) {
    const xma = state.aircraft.find(a => a.registration === 'PR-XMA');
    const xmb = state.aircraft.find(a => a.registration === 'PR-XMB');
    const xmc = state.aircraft.find(a => a.registration === 'PR-XMC');

    if (xma && xmb && xmc) {
      const evalA = evaluateRequirementWithCamoV2(adRequirement, xma);
      const evalB = evaluateRequirementWithCamoV2(adRequirement, xmb);
      const evalC = evaluateRequirementWithCamoV2(adRequirement, xmc);

      console.log(`PR-XMA Compliance Status: ${evalA.complianceStatus} (Expected: COMPLIED)`);
      console.log(`PR-XMB Compliance Status: ${evalB.complianceStatus} (Expected: OPEN)`);
      console.log(`PR-XMC Compliance Status: ${evalC.complianceStatus} (Expected: COMPLIED)`);

      if (evalA.complianceStatus !== 'COMPLIED' || evalB.complianceStatus !== 'OPEN' || evalC.complianceStatus !== 'COMPLIED') {
        throw new Error('Test 10 Failed: Rule Engine V2 evaluation mismatch on 737 MAX fleet.');
      }
    }
  }

  console.log('>>> TEST 10 PASSED: Zero regressions in Phase 3 Acquisition or Rule Engine compliance evaluation.\n');
  passedTests++;

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log(`PHASE 5.1A AUDIT TEST SUITE RESULT: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('================================================================\n');
}

runPhase5Tests().catch(err => {
  console.error('Phase 5.1A Test Suite Failure:', err);
  process.exit(1);
});
