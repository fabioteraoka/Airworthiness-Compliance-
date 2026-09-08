import { FleetScreeningEngine, FleetInventoryInput } from './regulatoryConnectors/fleetScreeningEngine';
import { CompliancePipelineOrchestrator } from './regulatoryConnectors/compliancePipelineOrchestrator';
import { camoDb } from './dataStore';
import { RegulatoryDiscoveryRecord, OfficialDocumentRecord, CompliancePipelineExecution } from '../src/types';

export async function runHardeningAdversarialValidationSuite() {
  console.log('========================================================================');
  console.log('CAMO PHASE 5.3.1 — ADVERSARIAL HARDENING & VALIDATION TEST SUITE');
  console.log('========================================================================\n');

  const screeningEngine = new FleetScreeningEngine();
  const orchestrator = new CompliancePipelineOrchestrator();
  const state = camoDb.getState();

  const fleetInventory: FleetInventoryInput = {
    aircraft: state.aircraft,
    engines: state.engines,
    components: state.components,
    installations: state.installations
  };

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}: ${detail}`);
    } else {
      failedTests++;
      console.error(`[FAIL] ${testName}: ${detail}`);
    }
  }

  // ==========================================================================
  // ADVERSARIAL CASE A: GENERIC & TRANSPORT CATEGORY ADS
  // ==========================================================================
  console.log('--- TEST GROUP 1: GENERIC & APPLIANCE / TRANSPORT CATEGORY SCOPE ---');
  
  const genericAdDiscovery: RegulatoryDiscoveryRecord = {
    id: 'disc-adv-gen-01',
    source: 'FEDERAL_REGISTER',
    documentNumber: '2025-00101',
    adNumber: '2025-01-01',
    title: 'Airworthiness Directives; Various Transport Category Airplanes Equipped With Collins Aerospace Flight Display Systems',
    action: 'Final Rule',
    publicationDate: '2025-02-10',
    authority: 'FAA',
    make: undefined,
    models: [],
    abstract: 'FAA is adopting a new airworthiness directive for all transport category airplanes equipped with certain flight display units modified by STC ST01234LA.',
    firstDiscoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    discoveryStatus: 'NEW',
    provenanceMap: { documentNumber: { origin: 'SOURCE_FIELD', confidence: 100 } } as any,
    sourcePayloadReference: 'test-gen-01'
  };

  const screeningGen = screeningEngine.screenDiscoveryRecordAgainstFleet(genericAdDiscovery, fleetInventory);
  
  assert(
    screeningGen.insufficientMetadata > 0 || screeningGen.potentialMatches > 0,
    'ADVERSARIAL_1.1_GENERIC_AD_PREVENTS_FALSE_NO_MATCH',
    `Screening produced ${screeningGen.insufficientMetadata} INSUFFICIENT_METADATA and ${screeningGen.potentialMatches} POTENTIAL_MATCH (Total aircraft: ${screeningGen.totalScreened}). Short-circuit is safely blocked.`
  );

  assert(
    screeningGen.noMatches === 0,
    'ADVERSARIAL_1.2_GENERIC_AD_ZERO_UNWARRANTED_EXCLUSIONS',
    `Unwarranted exclusions: ${screeningGen.noMatches} (Expected: 0 because AD applies broadly to transport category airplanes).`
  );

  // ==========================================================================
  // ADVERSARIAL CASE B: STC & MODIFIED CONFIGURATION KEYWORDS
  // ==========================================================================
  console.log('\n--- TEST GROUP 2: STC & CONFIGURATION MODIFICATION ADVERSARIAL CASES ---');

  const stcAdDiscovery: RegulatoryDiscoveryRecord = {
    id: 'disc-adv-stc-02',
    source: 'FEDERAL_REGISTER',
    documentNumber: '2025-00202',
    adNumber: '2025-02-02',
    title: 'Airworthiness Directives; Boeing Model 737-700 Airplanes Modified by Supplemental Type Certificate ST00830SE',
    action: 'Final Rule',
    publicationDate: '2025-02-15',
    authority: 'FAA',
    make: 'Boeing',
    models: ['737-700'],
    abstract: 'Prompted by reports of fatigue cracking on aircraft modified by STC. This AD applies to Model 737-700 airplanes and other 737 Next Generation series incorporating STC ST00830SE.',
    firstDiscoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    discoveryStatus: 'NEW',
    provenanceMap: { documentNumber: { origin: 'SOURCE_FIELD', confidence: 100 } } as any,
    sourcePayloadReference: 'test-stc-02'
  };

  const screeningStc = screeningEngine.screenDiscoveryRecordAgainstFleet(stcAdDiscovery, fleetInventory);
  const prGuoAssessment = screeningStc.assessments.find(a => a.registration === 'PR-GUO');

  assert(
    prGuoAssessment?.result === 'INSUFFICIENT_METADATA',
    'ADVERSARIAL_2.1_STC_KEYWORD_FORCES_INSUFFICIENT_METADATA_FOR_SERIES',
    `PR-GUO (737-800) evaluated as ${prGuoAssessment?.result} with reason: "${prGuoAssessment?.reason}". STC ambiguity prevented false negative NO_MATCH.`
  );

  // ==========================================================================
  // ADVERSARIAL CASE C: ENGINE NATURAL PAIRING & MISSING INVENTORY ATTRIBUTES
  // ==========================================================================
  console.log('\n--- TEST GROUP 3: ENGINE PAIRING & INVENTORY RESILIENCE ---');

  const engineAdDiscovery: RegulatoryDiscoveryRecord = {
    id: 'disc-adv-eng-03',
    source: 'FEDERAL_REGISTER',
    documentNumber: '2025-00303',
    adNumber: '2025-03-03',
    title: 'Airworthiness Directives; CFM International, S.A. Model LEAP-1B21, LEAP-1B25, LEAP-1B27 Turbofan Engines',
    action: 'Final Rule',
    publicationDate: '2025-02-20',
    authority: 'FAA',
    make: 'CFM International',
    models: ['LEAP-1B21', 'LEAP-1B25', 'LEAP-1B27'],
    abstract: 'AD prompted by high pressure turbine disk cracks on LEAP-1B engines installed on Boeing 737 MAX series airplanes.',
    firstDiscoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    discoveryStatus: 'NEW',
    provenanceMap: { documentNumber: { origin: 'SOURCE_FIELD', confidence: 100 } } as any,
    sourcePayloadReference: 'test-eng-03'
  };

  const screeningEng = screeningEngine.screenDiscoveryRecordAgainstFleet(engineAdDiscovery, fleetInventory);
  const ppSmrAssessment = screeningEng.assessments.find(a => a.registration === 'PP-SMR'); // 737-8 MAX
  const prGuoEngAssessment = screeningEng.assessments.find(a => a.registration === 'PR-GUO'); // 737-800 NG (CFM56-7B)

  assert(
    ppSmrAssessment?.result === 'POTENTIAL_MATCH' || ppSmrAssessment?.result === 'INSUFFICIENT_METADATA',
    'ADVERSARIAL_3.1_ENGINE_MATCH_ON_LEAP1B',
    `PP-SMR (737 MAX with LEAP-1B28) evaluated as ${ppSmrAssessment?.result} based on LEAP-1B family match.`
  );

  assert(
    prGuoEngAssessment?.result === 'NO_MATCH',
    'ADVERSARIAL_3.2_ENGINE_ISOLATION_CFM56_VS_LEAP1B',
    `PR-GUO (737 NG with CFM56-7B) safely excluded as ${prGuoEngAssessment?.result} without false positive.`
  );

  // ==========================================================================
  // ADVERSARIAL CASE D: VERSIONING & METADATA TRACEABILITY IN ORCHESTRATOR
  // ==========================================================================
  console.log('\n--- TEST GROUP 4: ORCHESTRATOR VERSIONING & SAFETY ENVARIANTS ---');

  const mockDiscovery: RegulatoryDiscoveryRecord = {
    id: 'disc-test-orch-01',
    source: 'FEDERAL_REGISTER',
    documentNumber: '2025-09999',
    adNumber: '2025-99-99',
    title: 'Airworthiness Directives; The Boeing Company Model 737-8 Airplanes',
    action: 'Final Rule',
    publicationDate: '2025-03-01',
    effectiveDate: '2027-04-15', // Future effective date
    authority: 'FAA',
    htmlUrl: 'https://www.federalregister.gov/documents/2025-09999',
    make: 'Boeing',
    models: ['737-8'],
    abstract: 'This AD supersedes AD 2020-24-02 for Model 737-8 airplanes.',
    firstDiscoveredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    discoveryStatus: 'NEW',
    provenanceMap: { documentNumber: { origin: 'SOURCE_FIELD', confidence: 100 } } as any,
    sourcePayloadReference: 'test-orch-01'
  };

  // Add mock discovery and mock acquired document to database for test execution
  camoDb.update(draft => {
    if (!draft.discoveryRecords) draft.discoveryRecords = [];
    const idx = draft.discoveryRecords.findIndex(d => d.id === mockDiscovery.id);
    if (idx >= 0) draft.discoveryRecords[idx] = mockDiscovery;
    else draft.discoveryRecords.push(mockDiscovery);

    if (!draft.acquiredDocuments) draft.acquiredDocuments = [];
    const docIdx = draft.acquiredDocuments.findIndex(d => d.documentNumber === mockDiscovery.documentNumber);
    const mockDoc: OfficialDocumentRecord = {
      id: 'acq-mock-2025-09999',
      sourceReference: mockDiscovery.documentNumber,
      source: 'FEDERAL_REGISTER',
      authority: 'FAA',
      documentNumber: mockDiscovery.documentNumber,
      adNumber: mockDiscovery.adNumber || undefined,
      fileName: '2025-09999.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      originalUrl: mockDiscovery.htmlUrl || undefined,
      finalUrl: mockDiscovery.htmlUrl || undefined,
      retrievedAt: new Date().toISOString(),
      retrievalStatus: 'DOWNLOADED',
      isOfficialSource: true,
      validationStatus: 'VALID',
      createdAt: new Date().toISOString()
    };
    if (docIdx >= 0) draft.acquiredDocuments[docIdx] = mockDoc;
    else draft.acquiredDocuments.push(mockDoc);
  });

  // Run pipeline orchestrator
  const pipelineExec = await orchestrator.executeDiscoveryPipeline(mockDiscovery, {
    forceFreshDownload: false,
    forceFullRun: true
  });

  assert(
    pipelineExec.pipelineVersion === '5.3.1',
    'ORCHESTRATOR_4.1_PIPELINE_VERSION_STAMP',
    `Pipeline Version: ${pipelineExec.pipelineVersion} (Expected: 5.3.1)`
  );

  assert(
    pipelineExec.ruleEngineVersion === '2.1.0' && pipelineExec.screeningEngineVersion === '5.2.1',
    'ORCHESTRATOR_4.2_SUB_ENGINE_VERSION_STAMPS',
    `Rule Engine: v${pipelineExec.ruleEngineVersion}, Screening Engine: v${pipelineExec.screeningEngineVersion}`
  );

  assert(
    pipelineExec.supersedesAdNumbers?.includes('2020-24-02') === true,
    'ORCHESTRATOR_4.3_SUPERSEDENCE_TRACKING',
    `Superseded ADs tracked: ${JSON.stringify(pipelineExec.supersedesAdNumbers)}`
  );

  assert(
    pipelineExec.effectiveDateStatus === 'FUTURE_EFFECTIVE',
    'ORCHESTRATOR_4.4_FUTURE_EFFECTIVE_DATE_DETECTION',
    `Effective date status: ${pipelineExec.effectiveDateStatus} for date ${mockDiscovery.effectiveDate}`
  );

  // ==========================================================================
  // ADVERSARIAL CASE E: RECOVERY FROM INTERRUPTED / STUCK RUNNING STATE
  // ==========================================================================
  console.log('\n--- TEST GROUP 5: STUCK EXECUTION RECOVERY ---');

  // Insert a mock stuck execution from 10 minutes ago
  const stuckExecId = `stuck-exec-${Date.now()}`;
  camoDb.update(draft => {
    if (!draft.pipelineExecutions) draft.pipelineExecutions = [];
    const stuckExec: CompliancePipelineExecution = {
      id: stuckExecId,
      discoveryRecordId: 'disc-stuck-01',
      documentNumber: '2025-STUCK',
      title: 'Stuck Execution Mock',
      authority: 'FAA',
      status: 'RUNNING',
      currentStage: 'OFFICIAL_ACQUISITION',
      triggeredBy: 'MANUAL_TRIGGER',
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      stages: {} as any,
      humanReviewRequired: false,
      humanReviewReasons: [],
      retryCount: 0,
      maxRetries: 2,
      auditTrail: [],
      pipelineVersion: '5.3.1',
      acquisitionEngineVersion: '4.0.0',
      extractorVersion: '4.0.0',
      ruleEngineVersion: '2.1.0',
      screeningEngineVersion: '5.2.1'
    };
    draft.pipelineExecutions.push(stuckExec);
  });

  const recoveredCount = orchestrator.recoverStuckExecutions(5);
  const recoveredExec = orchestrator.getExecutionById(stuckExecId);

  assert(
    recoveredCount >= 1 && recoveredExec?.status === 'FAILED',
    'RECOVERY_5.1_STUCK_RUNNING_EXECUTION_RECOVERED',
    `Recovered ${recoveredCount} stuck executions. Status of ${stuckExecId}: ${recoveredExec?.status}`
  );

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: Total=${totalTests} | Passed=${passedTests} | Failed=${failedTests}`);
  console.log('========================================================================\n');

  return { totalTests, passedTests, failedTests };
}

runHardeningAdversarialValidationSuite().then((res) => {
  process.exit(res.failedTests > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
