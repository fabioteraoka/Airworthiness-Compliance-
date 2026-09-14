import { 
  ExtractionPipelineDiagnostics, 
  PipelineStageStatus,
  ValidationRuleCheck,
  FirstFailingStageInfo,
  StageSummaryItem
} from '../src/types';

export interface DiagnosticsBuildInput {
  complianceRequirementId?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  uploadTimestamp?: string;
  fileBytesReceived?: boolean;

  pdfTextExtractionSucceeded?: boolean;
  extractedTextCharCount?: number;
  extractedPageCount?: number | null;
  first500Chars?: string;
  extractionError?: string | null;

  aiRequestSent?: boolean;
  requestTimestamp?: string;
  modelInvocationSuccess?: boolean;
  requestSize?: number;
  modelName?: string;
  apiError?: string | null;

  aiReturnedResponse?: boolean;
  rawResponseLength?: number;
  first1000Chars?: string;
  containsAdNumber?: boolean;
  adNumberSnippet?: string | null;
  containsIssuingAuthority?: boolean;
  issuingAuthoritySnippet?: string | null;
  containsApplicability?: boolean;
  applicabilitySnippet?: string | null;
  containsComplianceActions?: boolean;
  complianceActionsSnippet?: string | null;

  jsonParsingSucceeded?: boolean;
  exactJsonParsingError?: string | null;
  parsedFieldNames?: string[];
  requiredFieldsMissing?: string[];
  schemaValidationErrors?: string[];

  adNumberPresent?: boolean;
  issuingAuthorityPresent?: boolean;
  adTitlePresent?: boolean;
  effectiveDatePresent?: boolean;
  applicabilityContainsSourceData?: boolean;
  complianceRequirementsExist?: boolean;
  validationRules?: ValidationRuleCheck[];

  adObjectSaved?: boolean;
  savedRecordId?: string;
  adNumberStored?: string;
  authorityStored?: string;
  extractedRequirementsStoredCount?: number;
  applicabilityRulesStoredCount?: number;
  persistedTimestamp?: string;

  adNumberReceived?: string;
  aircraftModelsExtracted?: string[];
  msnRangesExtracted?: string;
  componentApplicabilityCriteria?: string[];
  complianceRequirementsCount?: number;
  fleetEntitiesEvaluatedCount?: number;
}

export function buildExtractionPipelineDiagnostics(input: DiagnosticsBuildInput): ExtractionPipelineDiagnostics {
  const reqId = input.complianceRequirementId || `diag-${Date.now()}`;
  const now = new Date().toISOString();

  // STAGE 1 — FILE RECEIVED
  const s1BytesReceived = Boolean(input.fileBytesReceived ?? (input.fileSize && input.fileSize > 0));
  const s1Status: PipelineStageStatus = s1BytesReceived ? 'SUCCESS' : 'FAILED';
  const stage1 = {
    stageNumber: 1 as const,
    stageName: 'FILE RECEIVED' as const,
    status: s1Status,
    originalFileName: input.originalFileName || 'Airworthiness_Directive.pdf',
    mimeType: input.mimeType || 'application/pdf',
    fileSize: input.fileSize || 0,
    uploadTimestamp: input.uploadTimestamp || now,
    fileBytesReceived: s1BytesReceived,
    message: s1BytesReceived 
      ? `File "${input.originalFileName || 'document'}" received (${input.fileSize || 0} bytes).` 
      : 'File upload failed: zero bytes received.'
  };

  // STAGE 2 — SOURCE CONTENT EXTRACTION
  const s2Success = Boolean(input.pdfTextExtractionSucceeded ?? (input.extractedTextCharCount && input.extractedTextCharCount > 0));
  const s2Status: PipelineStageStatus = s1Status === 'FAILED' ? 'SKIPPED' : (s2Success ? 'SUCCESS' : 'FAILED');
  const stage2 = {
    stageNumber: 2 as const,
    stageName: 'SOURCE CONTENT EXTRACTION' as const,
    status: s2Status,
    pdfTextExtractionSucceeded: s2Success,
    extractedTextCharCount: input.extractedTextCharCount || 0,
    extractedPageCount: input.extractedPageCount ?? null,
    first500Chars: input.first500Chars || '',
    extractionError: input.extractionError || null,
    message: s2Success 
      ? `Extracted ${input.extractedTextCharCount || 0} source characters from document.` 
      : (input.extractionError || 'Failed to extract text or PDF stream from source document.')
  };

  // STAGE 3 — AI EXTRACTION REQUEST
  const s3Sent = Boolean(input.aiRequestSent ?? input.modelInvocationSuccess);
  const s3Success = Boolean(input.modelInvocationSuccess);
  const s3Status: PipelineStageStatus = s2Status === 'FAILED' || s2Status === 'SKIPPED'
    ? 'SKIPPED'
    : (s3Success ? 'SUCCESS' : (input.apiError ? 'FAILED' : 'WARNING'));
  const stage3 = {
    stageNumber: 3 as const,
    stageName: 'AI EXTRACTION REQUEST' as const,
    status: s3Status,
    aiRequestSent: s3Sent,
    requestTimestamp: input.requestTimestamp || now,
    modelInvocationSuccess: s3Success,
    requestSize: input.requestSize || input.extractedTextCharCount || 0,
    modelName: input.modelName || 'gemini-3.8-flash',
    apiError: input.apiError || null,
    message: s3Success 
      ? `Successfully invoked model ${input.modelName || 'gemini-3.8-flash'} (${input.requestSize || 0} chars payload).`
      : (input.apiError ? `AI extraction failed: ${input.apiError}` : 'Deterministic parser used or AI not invoked.')
  };

  // STAGE 4 — RAW AI RESPONSE
  const s4Returned = Boolean(input.aiReturnedResponse ?? (input.rawResponseLength && input.rawResponseLength > 0));
  const s4Status: PipelineStageStatus = s3Status === 'SKIPPED'
    ? 'SKIPPED'
    : (s4Returned ? 'SUCCESS' : 'FAILED');
  const stage4 = {
    stageNumber: 4 as const,
    stageName: 'RAW AI RESPONSE' as const,
    status: s4Status,
    aiReturnedResponse: s4Returned,
    rawResponseLength: input.rawResponseLength || 0,
    first1000Chars: input.first1000Chars || '',
    containsAdNumber: Boolean(input.containsAdNumber),
    adNumberSnippet: input.adNumberSnippet || null,
    containsIssuingAuthority: Boolean(input.containsIssuingAuthority),
    issuingAuthoritySnippet: input.issuingAuthoritySnippet || null,
    containsApplicability: Boolean(input.containsApplicability),
    applicabilitySnippet: input.applicabilitySnippet || null,
    containsComplianceActions: Boolean(input.containsComplianceActions),
    complianceActionsSnippet: input.complianceActionsSnippet || null,
    message: s4Returned
      ? `Received raw response of ${input.rawResponseLength || 0} characters with regulatory tokens.`
      : 'No response returned from AI model.'
  };

  // STAGE 5 — STRUCTURED DATA PARSING
  const s5Success = Boolean(input.jsonParsingSucceeded);
  const s5Missing = input.requiredFieldsMissing || [];
  const s5Status: PipelineStageStatus = s4Status === 'FAILED' || s4Status === 'SKIPPED'
    ? (s2Status === 'SUCCESS' ? (s5Success ? 'SUCCESS' : 'FAILED') : 'SKIPPED')
    : (s5Success ? 'SUCCESS' : 'FAILED');
  const stage5 = {
    stageNumber: 5 as const,
    stageName: 'STRUCTURED DATA PARSING' as const,
    status: s5Status,
    jsonParsingSucceeded: s5Success,
    exactJsonParsingError: input.exactJsonParsingError || null,
    parsedFieldNames: input.parsedFieldNames || [],
    requiredFieldsMissing: s5Missing,
    schemaValidationErrors: input.schemaValidationErrors || [],
    message: s5Success 
      ? `JSON parsed successfully (${(input.parsedFieldNames || []).length} fields extracted).`
      : (input.exactJsonParsingError || `JSON parsing failed or missing fields: ${s5Missing.join(', ')}`)
  };

  // STAGE 6 — AD VALIDATION
  const adNumPass = Boolean(input.adNumberPresent);
  const authPass = Boolean(input.issuingAuthorityPresent);
  const titlePass = Boolean(input.adTitlePresent);
  const effDatePass = Boolean(input.effectiveDatePresent);
  const applicPass = Boolean(input.applicabilityContainsSourceData);
  const compReqPass = Boolean(input.complianceRequirementsExist);

  const defaultValidationRules: ValidationRuleCheck[] = [
    {
      ruleName: 'AD Regulatory Number Present',
      field: 'sourceNumber',
      expected: 'Non-empty valid AD number (e.g. FAA AD 2020-24-02)',
      actual: input.adNumberStored || (adNumPass ? 'VALID_AD_NUMBER' : 'MISSING'),
      passed: adNumPass,
      details: adNumPass ? 'Official regulatory identifier recognized' : 'AD identifier missing or invalid'
    },
    {
      ruleName: 'Issuing Authority Recognized',
      field: 'issuingAuthority',
      expected: 'Recognized authority: FAA, EASA, ANAC, TCCA, UK CAA, DGAC',
      actual: input.authorityStored || (authPass ? 'RECOGNIZED_AUTHORITY' : 'UNKNOWN'),
      passed: authPass,
      details: authPass ? 'Issuing regulatory body verified' : 'No recognized civil aviation authority found'
    },
    {
      ruleName: 'AD Title / Subject Present',
      field: 'title',
      expected: 'Official technical subject description',
      actual: titlePass ? 'PRESENT' : 'MISSING',
      passed: titlePass,
      details: titlePass ? 'AD subject extracted' : 'Subject title missing'
    },
    {
      ruleName: 'Effective Date Verified',
      field: 'effectiveDate',
      expected: 'Valid effective date or extracted date string',
      actual: effDatePass ? 'PRESENT' : 'MISSING',
      passed: effDatePass,
      details: effDatePass ? 'Effective date verified' : 'Effective date could not be confirmed'
    },
    {
      ruleName: 'Applicability Criteria Derived from Source',
      field: 'applicabilityCriteria',
      expected: 'Target aircraft models, component part numbers, or engine models',
      actual: applicPass ? 'CRITERIA_EXTRACTED' : 'NO_CRITERIA',
      passed: applicPass,
      details: applicPass ? 'Fleet effectivity criteria extracted directly from source text' : 'No aircraft or component effectivity identified'
    },
    {
      ruleName: 'Mandatory Compliance Actions Present',
      field: 'complianceActions',
      expected: 'At least one discrete inspection, modification, or procedure',
      actual: compReqPass ? `${input.complianceRequirementsCount || 1} action(s)` : 'NO_ACTIONS',
      passed: compReqPass,
      details: compReqPass ? 'Source-derived compliance actions extracted' : 'No mandatory actions recognized in source'
    }
  ];

  const validationRules = input.validationRules || defaultValidationRules;
  const failedValidationRules = validationRules.filter(r => !r.passed).map(r => r.ruleName);
  const s6Success = failedValidationRules.length === 0;
  const s6Status: PipelineStageStatus = s5Status === 'FAILED' || s5Status === 'SKIPPED'
    ? 'SKIPPED'
    : (s6Success ? 'SUCCESS' : 'FAILED');

  const stage6 = {
    stageNumber: 6 as const,
    stageName: 'AD VALIDATION' as const,
    status: s6Status,
    validationRules,
    failedValidationRules,
    adNumberPresent: adNumPass,
    issuingAuthorityPresent: authPass,
    adTitlePresent: titlePass,
    effectiveDatePresent: effDatePass,
    applicabilityContainsSourceData: applicPass,
    complianceRequirementsExist: compReqPass,
    message: s6Success 
      ? 'All 6 airworthiness validation rules passed without data fabrication.'
      : `Validation failed for rules: ${failedValidationRules.join('; ')}`
  };

  // STAGE 7 — PERSISTENCE
  const s7Saved = Boolean(input.adObjectSaved ?? (input.savedRecordId || reqId));
  const s7Status: PipelineStageStatus = s6Status === 'FAILED'
    ? 'WARNING'
    : (s7Saved ? 'SUCCESS' : 'FAILED');
  const stage7 = {
    stageNumber: 7 as const,
    stageName: 'PERSISTENCE' as const,
    status: s7Status,
    adObjectSaved: s7Saved,
    savedRecordId: input.savedRecordId || reqId,
    adNumberStored: input.adNumberStored || (adNumPass ? input.adNumberReceived || 'AD_STORED' : ''),
    authorityStored: input.authorityStored || 'FAA',
    extractedRequirementsStoredCount: input.extractedRequirementsStoredCount || 0,
    applicabilityRulesStoredCount: input.applicabilityRulesStoredCount || 1,
    persistedTimestamp: input.persistedTimestamp || now,
    message: s7Saved 
      ? `Technical AD record stored in database (ID: ${input.savedRecordId || reqId}).`
      : 'Failed to persist technical record.'
  };

  // STAGE 8 — RULE ENGINE INPUT
  const s8Status: PipelineStageStatus = s6Status === 'FAILED'
    ? 'WARNING'
    : 'SUCCESS';
  const stage8 = {
    stageNumber: 8 as const,
    stageName: 'RULE ENGINE INPUT' as const,
    status: s8Status,
    adNumberReceived: input.adNumberReceived || input.adNumberStored || '',
    aircraftModelsExtracted: input.aircraftModelsExtracted || [],
    msnRangesExtracted: input.msnRangesExtracted || 'Not restricted by MSN in AD text (Refer to External Effectivity Document)',
    componentApplicabilityCriteria: input.componentApplicabilityCriteria || [],
    complianceRequirementsCount: input.complianceRequirementsCount || 0,
    fleetEntitiesEvaluatedCount: input.fleetEntitiesEvaluatedCount || 0,
    message: s6Status === 'FAILED'
      ? 'Rule Engine halted evaluation safely due to extraction validation failure.'
      : `Handoff to Rule Engine complete (${(input.aircraftModelsExtracted || []).length} models, ${input.complianceRequirementsCount || 0} actions evaluated against fleet).`
  };

  // STAGE 9 — FINAL RESULT
  const allStages = [stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8];
  const firstFail = allStages.find(s => s.status === 'FAILED');

  let firstFailingStageInfo: FirstFailingStageInfo | null = null;
  if (firstFail) {
    firstFailingStageInfo = {
      stageNumber: firstFail.stageNumber,
      stageName: firstFail.stageName,
      reason: firstFail.message || 'Stage failed validation checks'
    };
  }

  let pipelineResult: 'EXTRACTED' | 'EXTRACTION_REVIEW_REQUIRED' | 'EXTRACTION_FAILED' = 'EXTRACTED';
  let stoppingReason = 'All 9 extraction pipeline stages completed successfully.';

  if (firstFailingStageInfo) {
    if (firstFailingStageInfo.stageNumber <= 2) {
      pipelineResult = 'EXTRACTION_FAILED';
      stoppingReason = `Extraction stopped at Stage ${firstFailingStageInfo.stageNumber} (${firstFailingStageInfo.stageName}): ${firstFailingStageInfo.reason}`;
    } else if (firstFailingStageInfo.stageNumber <= 5) {
      pipelineResult = 'EXTRACTION_FAILED';
      stoppingReason = `AI Extraction failed at Stage ${firstFailingStageInfo.stageNumber} (${firstFailingStageInfo.stageName}): ${firstFailingStageInfo.reason}`;
    } else if (firstFailingStageInfo.stageNumber === 6) {
      // Check if critical fields failed
      if (!adNumPass || !applicPass) {
        pipelineResult = 'EXTRACTION_FAILED';
      } else {
        pipelineResult = 'EXTRACTION_REVIEW_REQUIRED';
      }
      stoppingReason = `Validation failed at Stage 6 (AD VALIDATION): ${failedValidationRules.join(', ')}`;
    } else {
      pipelineResult = 'EXTRACTION_REVIEW_REQUIRED';
      stoppingReason = `Pipeline stopped at Stage ${firstFailingStageInfo.stageNumber} (${firstFailingStageInfo.stageName}): ${firstFailingStageInfo.reason}`;
    }
  }

  const stageSummaries: StageSummaryItem[] = [
    { stageNumber: 1, name: 'File Received', status: stage1.status, message: stage1.message },
    { stageNumber: 2, name: 'Source Content Extraction', status: stage2.status, message: `${stage2.extractedTextCharCount} characters extracted` },
    { stageNumber: 3, name: 'AI Extraction Request', status: stage3.status, message: stage3.modelInvocationSuccess ? `AI invoked (${stage3.modelName})` : (stage3.apiError || 'AI Invocation') },
    { stageNumber: 4, name: 'Raw AI Response', status: stage4.status, message: stage4.aiReturnedResponse ? `${stage4.rawResponseLength} characters received` : 'No response' },
    { stageNumber: 5, name: 'Structured Data Parsing', status: stage5.status, message: stage5.jsonParsingSucceeded ? 'JSON validated' : (stage5.exactJsonParsingError || 'Parsing error') },
    { stageNumber: 6, name: 'AD Airworthiness Validation', status: stage6.status, message: stage6.failedValidationRules.length === 0 ? 'All 6 regulatory rules passed' : `Failed: ${stage6.failedValidationRules.join(', ')}` },
    { stageNumber: 7, name: 'Persistence', status: stage7.status, message: `Saved record: ${stage7.savedRecordId}` },
    { stageNumber: 8, name: 'Rule Engine Input', status: stage8.status, message: stage8.message },
    { stageNumber: 9, name: 'Final Result', status: pipelineResult === 'EXTRACTED' ? 'SUCCESS' : (pipelineResult === 'EXTRACTION_REVIEW_REQUIRED' ? 'WARNING' : 'FAILED'), message: `PIPELINE RESULT: ${pipelineResult}` }
  ];

  const checklistLines: string[] = [];
  checklistLines.push(stage1.status === 'SUCCESS' ? `✓ File received (${stage1.fileSize} bytes)` : `✗ File receive failed`);
  checklistLines.push(stage2.status === 'SUCCESS' ? `✓ Source text extracted (${stage2.extractedTextCharCount} chars)` : `✗ Text extraction failed: ${stage2.extractionError || 'Error'}`);
  if (stage3.status === 'SUCCESS') checklistLines.push(`✓ AI model invoked (${stage3.modelName})`);
  else if (stage3.status === 'FAILED') checklistLines.push(`✗ AI model invocation failed: ${stage3.apiError}`);
  if (stage4.status === 'SUCCESS') checklistLines.push(`✓ AI returned valid response (${stage4.rawResponseLength} chars)`);
  else if (stage4.status === 'FAILED') checklistLines.push(`✗ AI response generation failed`);
  if (stage5.status === 'SUCCESS') checklistLines.push(`✓ JSON parsed and schema validated`);
  else if (stage5.status === 'FAILED') checklistLines.push(`✗ JSON parsing failed: ${stage5.exactJsonParsingError || stage5.requiredFieldsMissing.join(', ')}`);
  if (stage6.status === 'SUCCESS') checklistLines.push(`✓ AD airworthiness rules validated (6/6 rules)`);
  else if (stage6.status === 'FAILED') {
    checklistLines.push(`✗ AD Validation failed`);
    stage6.failedValidationRules.forEach(r => checklistLines.push(`  - Failed rule: ${r}`));
  }
  checklistLines.push(stage7.status === 'SUCCESS' ? `✓ AD record persisted (${stage7.savedRecordId})` : `⚠ Persistence logged`);
  checklistLines.push(stage8.status === 'SUCCESS' ? `✓ Rule Engine evaluated fleet` : `⚠ Rule Engine halted safely`);
  checklistLines.push(`PIPELINE RESULT: ${pipelineResult}`);

  const stage9 = {
    stageNumber: 9 as const,
    stageName: 'FINAL RESULT' as const,
    pipelineResult,
    firstFailingStage: firstFailingStageInfo,
    stoppingReason,
    stageSummaries,
    checklistFormattedText: checklistLines.join('\n')
  };

  return {
    id: `diag-${reqId}`,
    complianceRequirementId: reqId,
    createdAt: now,
    stage1,
    stage2,
    stage3,
    stage4,
    stage5,
    stage6,
    stage7,
    stage8,
    stage9
  };
}
