import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  OfficialDocumentRecord, 
  RegulatorySourceRecord, 
  DocumentRetrievalStatus, 
  DocumentValidationStatus,
  OfficialDocumentProvenance,
  ComplianceRequirement,
  IssuingAuthority
} from '../../src/types';
import { camoDb } from '../dataStore';
import { extractAdWithGemini } from '../geminiService';
import { evaluateRequirementWithCamoV2 } from '../complianceOrchestrator';

/**
 * Storage directory for acquired official regulatory documents
 */
const ACQUIRED_DOCS_DIR = path.join(process.cwd(), 'data', 'acquired_documents');

/**
 * Approved domain whitelist for Official Regulatory Document Downloads (SSRF Protection)
 */
const APPROVED_BASE_DOMAINS = [
  'govinfo.gov',
  'federalregister.gov',
  'gpo.gov',
  'faa.gov'
];

const EXACT_APPROVED_HOSTS = new Set([
  'govinfo.gov',
  'www.govinfo.gov',
  'federalregister.gov',
  'www.federalregister.gov',
  'api.federalregister.gov',
  'gpo.gov',
  'www.gpo.gov',
  'faa.gov',
  'drs.faa.gov',
  'rgl.faa.gov'
]);

/**
 * Disallowed private / internal IP ranges and special hosts for SSRF prevention
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  const cleanHost = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');

  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.internal') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.corp') ||
    cleanHost.endsWith('.onion') ||
    cleanHost === '::1' ||
    cleanHost === '0.0.0.0' ||
    cleanHost === '255.255.255.255'
  ) {
    return true;
  }

  // Check numeric integer/dword IP (e.g. 2130706433 = 127.0.0.1, 2852039166 = 169.254.169.254)
  if (/^\d+$/.test(cleanHost)) {
    return true;
  }

  // Check hex or octal IP notation (e.g. 0x7f000001, 0177.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(cleanHost) || /0\d+\.\d+/.test(cleanHost)) {
    return true;
  }

  // Check IPv4 standard dot-decimal patterns
  const ipv4Match = cleanHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = [
      parseInt(ipv4Match[1], 10),
      parseInt(ipv4Match[2], 10),
      parseInt(ipv4Match[3], 10),
      parseInt(ipv4Match[4], 10)
    ];

    if (octets.some(o => o < 0 || o > 255)) {
      return true; // Invalid IPv4
    }

    // 127.0.0.0/8 (Loopback)
    if (octets[0] === 127) return true;

    // 10.0.0.0/8 (Private)
    if (octets[0] === 10) return true;

    // 169.254.0.0/16 (Link-local & AWS/GCP metadata service 169.254.169.254)
    if (octets[0] === 169 && octets[1] === 254) return true;

    // 172.16.0.0/12 (Private)
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (octets[0] === 192 && octets[1] === 168) return true;

    // 0.0.0.0/8 (Current network)
    if (octets[0] === 0) return true;

    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Test-Net)
    if (
      (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) ||
      (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
      (octets[0] === 203 && octets[1] === 0 && octets[2] === 113)
    ) {
      return true;
    }

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (octets[0] >= 224) return true;

    // Any other raw IPv4 is not a government regulatory FQDN
    return true;
  }

  // Check IPv6 patterns (e.g. ::1, fe80::, fc00::, ::ffff:127.0.0.1)
  if (cleanHost.includes(':')) {
    if (
      cleanHost === '::1' ||
      cleanHost.startsWith('fe80:') ||
      cleanHost.startsWith('fc') ||
      cleanHost.startsWith('fd') ||
      cleanHost.includes('::ffff:') ||
      cleanHost.includes('127.0.0.1')
    ) {
      return true;
    }
    // Any raw IPv6 is not a government regulatory FQDN
    return true;
  }

  return false;
}

export interface AcquisitionOptions {
  analyze?: boolean; // Mode 1 (false) vs Mode 2 (true)
  forceFreshDownload?: boolean;
  testBufferOverride?: Buffer; // Used exclusively for test fixtures
  testUrlOverride?: string;
}

export interface AcquisitionResult {
  success: boolean;
  record: OfficialDocumentRecord;
  requirement?: ComplianceRequirement;
  isDuplicate: boolean;
  error?: string;
}

export class OfficialDocumentAcquisitionService {
  public static readonly SERVICE_VERSION = '4.0.0';
  public readonly SERVICE_VERSION = '4.0.0';

  constructor() {
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(ACQUIRED_DOCS_DIR)) {
        fs.mkdirSync(ACQUIRED_DOCS_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create acquired documents storage directory:', err);
    }
  }

  /**
   * SSRF Protection & URL Validation
   */
  public validateOfficialUrl(urlString: string): { isValid: boolean; reason?: string; urlObj?: URL } {
    if (!urlString || typeof urlString !== 'string') {
      return { isValid: false, reason: 'URL must be a non-empty string.' };
    }

    let urlObj: URL;
    try {
      urlObj = new URL(urlString);
    } catch {
      return { isValid: false, reason: 'Malformed URL format.' };
    }

    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return { isValid: false, reason: `Disallowed URL protocol: ${urlObj.protocol}. Only HTTPS is permitted for official documents.` };
    }

    const hostname = urlObj.hostname.toLowerCase();

    // Check private / internal network addresses and alternate IP notations
    if (isPrivateOrReservedHost(hostname)) {
      return { isValid: false, reason: `SSRF Prevention: Access to private or local network host '${hostname}' is strictly blocked.` };
    }

    // Check approved domain whitelist with strict hostname comparison (no loose substring matching)
    const isApprovedHost = EXACT_APPROVED_HOSTS.has(hostname) || 
      APPROVED_BASE_DOMAINS.some(base => hostname === base || hostname.endsWith(`.${base}`));

    if (!isApprovedHost) {
      return { 
        isValid: false, 
        reason: `SSRF Prevention: Host '${hostname}' is not in the approved official regulatory sources whitelist (${Array.from(EXACT_APPROVED_HOSTS).join(', ')}).` 
      };
    }

    return { isValid: true, urlObj };
  }

  /**
   * Validates file signature (Magic Bytes)
   * PDF files must start with %PDF- (0x25 0x50 0x44 0x46 0x2D)
   */
  public validatePdfSignature(buffer: Buffer): { isValid: boolean; signatureFound: string; reason?: string } {
    if (buffer.length < 5) {
      return { isValid: false, signatureFound: 'EMPTY_OR_TRUNCATED', reason: 'Buffer is too small to contain a valid file header.' };
    }

    const header = buffer.subarray(0, 5).toString('latin1');
    if (header === '%PDF-') {
      return { isValid: true, signatureFound: '%PDF-' };
    }

    // Check if it looks like HTML
    const first50 = buffer.subarray(0, 50).toString('utf-8').trim().toLowerCase();
    if (first50.includes('<!doctype html') || first50.includes('<html')) {
      return { 
        isValid: false, 
        signatureFound: 'HTML_DOCUMENT', 
        reason: 'Received HTML document payload instead of binary PDF (%PDF- signature missing).' 
      };
    }

    return { 
      isValid: false, 
      signatureFound: header, 
      reason: `Invalid file signature: Expected '%PDF-' header, found '${header}'.` 
    };
  }

  /**
   * Main acquisition method: Safely acquires an official regulatory document
   */
  public async acquireOfficialDocument(
    sourceRecord: RegulatorySourceRecord,
    options: AcquisitionOptions = {}
  ): Promise<AcquisitionResult> {
    const rawUrl = options.testUrlOverride || sourceRecord.pdfUrl || sourceRecord.htmlUrl;

    if (!rawUrl) {
      const errorRecord = this.buildFailedRecord(
        sourceRecord,
        'NO_OFFICIAL_URL',
        'FAILED',
        'SOURCE_NOT_OFFICIAL',
        'No official PDF URL or document reference found in regulatory source record.'
      );
      return { success: false, record: errorRecord, isDuplicate: false, error: errorRecord.validationErrors?.[0] };
    }

    // 1. Initial SSRF & Domain Validation
    const urlValidation = this.validateOfficialUrl(rawUrl);
    if (!urlValidation.isValid) {
      const errorRecord = this.buildFailedRecord(
        sourceRecord,
        rawUrl,
        'REJECTED',
        'UNAUTHORIZED_DOMAIN',
        urlValidation.reason || 'Unauthorized domain'
      );
      return { success: false, record: errorRecord, isDuplicate: false, error: urlValidation.reason };
    }

    // 2. Pre-download check: Check if document was already acquired by documentNumber
    const existingDbDocs = camoDb.getState().acquiredDocuments || [];
    if (!options.forceFreshDownload && sourceRecord.documentNumber) {
      const existingByDocNum = existingDbDocs.find(
        d => d.documentNumber === sourceRecord.documentNumber && d.validationStatus === 'VALID'
      );
      if (existingByDocNum) {
        camoDb.logAudit({
          user: camoDb.getState().currentUser.name,
          role: camoDb.getState().currentUser.role,
          action: 'ACCESS',
          entityType: 'OfficialDocumentRecord',
          entityId: existingByDocNum.id,
          details: `Deduplication pre-check: Reusing existing validated official document '${existingByDocNum.id}' for doc #${sourceRecord.documentNumber}. No duplicate entity created.`
        });

        // If analyze requested and not yet analyzed, trigger pipeline
        if (options.analyze && existingByDocNum.pipelineIntegrationStatus !== 'ANALYZED') {
          const analysisResult = await this.sendToExistingDocumentIntelligence(existingByDocNum.id);
          return {
            success: true,
            record: analysisResult.record,
            requirement: analysisResult.requirement,
            isDuplicate: true
          };
        }

        return {
          success: true,
          record: {
            ...existingByDocNum,
            retrievalStatus: 'DUPLICATE'
          },
          isDuplicate: true
        };
      }
    }

    // 3. Perform Download with per-hop redirect re-validation
    let buffer: Buffer;
    let finalUrl = rawUrl;
    let httpStatus = 200;
    let contentType = 'application/pdf';
    let contentDisposition: string | undefined;

    try {
      if (options.testBufferOverride) {
        buffer = options.testBufferOverride;
      } else {
        const MAX_REDIRECTS = 5;
        let currentUrl = rawUrl;
        let redirectCount = 0;
        let response: Response | null = null;

        while (redirectCount <= MAX_REDIRECTS) {
          // Re-validate current URL before every hop (SSRF redirect protection)
          const hopValidation = this.validateOfficialUrl(currentUrl);
          if (!hopValidation.isValid) {
            const errorRecord = this.buildFailedRecord(
              sourceRecord,
              currentUrl,
              'REJECTED',
              'UNAUTHORIZED_DOMAIN',
              `SSRF Block on ${redirectCount > 0 ? `redirect hop #${redirectCount}` : 'initial URL'}: ${hopValidation.reason}`
            );
            errorRecord.finalUrl = currentUrl;
            errorRecord.httpStatus = response ? response.status : 0;
            return { 
              success: false, 
              record: errorRecord, 
              isDuplicate: false, 
              error: `SSRF Block on redirect: ${hopValidation.reason}` 
            };
          }

          response = await fetch(currentUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CAMO-AeroAirworthiness/1.0',
              'Accept': 'application/pdf, application/octet-stream, */*'
            },
            redirect: 'manual'
          });

          const status = response.status;

          // Check if response is a redirect
          if ([301, 302, 303, 307, 308].includes(status)) {
            redirectCount++;
            if (redirectCount > MAX_REDIRECTS) {
              const errorRecord = this.buildFailedRecord(
                sourceRecord,
                currentUrl,
                'FAILED',
                'DOWNLOAD_FAILED',
                `Exceeded maximum allowed redirects (${MAX_REDIRECTS}).`
              );
              errorRecord.finalUrl = currentUrl;
              errorRecord.httpStatus = status;
              return { success: false, record: errorRecord, isDuplicate: false, error: 'MAX_REDIRECTS_EXCEEDED' };
            }

            const locationHeader = response.headers.get('location');
            if (!locationHeader) {
              const errorRecord = this.buildFailedRecord(
                sourceRecord,
                currentUrl,
                'FAILED',
                'DOWNLOAD_FAILED',
                `HTTP ${status} redirect received without Location header.`
              );
              errorRecord.finalUrl = currentUrl;
              errorRecord.httpStatus = status;
              return { success: false, record: errorRecord, isDuplicate: false, error: 'REDIRECT_WITHOUT_LOCATION' };
            }

            // Resolve target URL relative to currentUrl
            try {
              const targetUrlObj = new URL(locationHeader, currentUrl);
              currentUrl = targetUrlObj.toString();
            } catch (err: any) {
              const errorRecord = this.buildFailedRecord(
                sourceRecord,
                currentUrl,
                'FAILED',
                'DOWNLOAD_FAILED',
                `Invalid redirect location header: '${locationHeader}'.`
              );
              errorRecord.finalUrl = currentUrl;
              errorRecord.httpStatus = status;
              return { success: false, record: errorRecord, isDuplicate: false, error: 'INVALID_REDIRECT_LOCATION' };
            }

            // Loop continues -> hopValidation will validate currentUrl on the next iteration
            continue;
          }

          // Not a redirect -> successful response reached or final error
          break;
        }

        if (!response) {
          throw new Error('No HTTP response received.');
        }

        finalUrl = currentUrl;
        httpStatus = response.status;
        contentType = response.headers.get('content-type') || 'application/octet-stream';
        contentDisposition = response.headers.get('content-disposition') || undefined;

        if (!response.ok) {
          const errorRecord = this.buildFailedRecord(
            sourceRecord,
            rawUrl,
            'FAILED',
            'DOWNLOAD_FAILED',
            `HTTP error ${response.status} (${response.statusText}) when downloading from official source.`
          );
          errorRecord.finalUrl = finalUrl;
          errorRecord.httpStatus = httpStatus;
          return { success: false, record: errorRecord, isDuplicate: false, error: `HTTP ${httpStatus}` };
        }

        const arrayBuf = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }
    } catch (err: any) {
      const errorRecord = this.buildFailedRecord(
        sourceRecord,
        rawUrl,
        'FAILED',
        'DOWNLOAD_FAILED',
        `Network download failure: ${err.message}`
      );
      return { success: false, record: errorRecord, isDuplicate: false, error: err.message };
    }

    // 4. File Size & Integrity Validation
    const fileSizeBytes = buffer.length;
    if (fileSizeBytes === 0) {
      const errorRecord = this.buildFailedRecord(
        sourceRecord,
        rawUrl,
        'REJECTED',
        'EMPTY_DOCUMENT',
        'Acquired document is completely empty (0 bytes).'
      );
      errorRecord.finalUrl = finalUrl;
      errorRecord.httpStatus = httpStatus;
      errorRecord.fileSizeBytes = fileSizeBytes;
      return { success: false, record: errorRecord, isDuplicate: false, error: 'EMPTY_DOCUMENT' };
    }

    // 5. File Signature Validation (%PDF-)
    const signatureCheck = this.validatePdfSignature(buffer);
    if (!signatureCheck.isValid) {
      const errorRecord = this.buildFailedRecord(
        sourceRecord,
        rawUrl,
        'REJECTED',
        'INVALID_SIGNATURE',
        signatureCheck.reason || 'Invalid PDF signature'
      );
      errorRecord.finalUrl = finalUrl;
      errorRecord.httpStatus = httpStatus;
      errorRecord.fileSizeBytes = fileSizeBytes;
      return { success: false, record: errorRecord, isDuplicate: false, error: signatureCheck.reason };
    }

    // 6. Cryptographic SHA-256 Calculation
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // 7. Deduplication Check via SHA-256 Content Hash (query fresh DB state)
    const freshDbDocs = camoDb.getState().acquiredDocuments || [];
    const duplicateDoc = freshDbDocs.find(d => d.sha256 === sha256);
    if (duplicateDoc && !options.forceFreshDownload) {
      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'ACCESS',
        entityType: 'OfficialDocumentRecord',
        entityId: duplicateDoc.id,
        details: `Deduplication match on SHA-256 (${sha256.substring(0, 12)}...). Reused existing OfficialDocumentRecord '${duplicateDoc.id}' without creating duplicate entity.`
      });

      // Re-use existing valid record
      if (options.analyze && duplicateDoc.pipelineIntegrationStatus !== 'ANALYZED') {
        const analysis = await this.sendToExistingDocumentIntelligence(duplicateDoc.id);
        return {
          success: true,
          record: analysis.record,
          requirement: analysis.requirement,
          isDuplicate: true
        };
      }

      return {
        success: true,
        record: {
          ...duplicateDoc,
          retrievalStatus: 'DUPLICATE',
          previousDocumentId: duplicateDoc.id
        },
        isDuplicate: true
      };
    }

    // 8. Save Document to Disk Storage
    const cleanDocNum = (sourceRecord.documentNumber || sourceRecord.adNumber || 'DOC').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${cleanDocNum}_${sha256.substring(0, 8)}.pdf`;
    const storagePath = path.join(ACQUIRED_DOCS_DIR, fileName);

    try {
      fs.writeFileSync(storagePath, buffer);
    } catch (err: any) {
      console.error('Failed to write acquired document to disk:', err);
    }

    // 9. Construct Document Provenance Record
    const retrievedAt = new Date().toISOString();
    const docId = `doc-acq-${Date.now()}-${sha256.substring(0, 6)}`;

    const documentProvenance: OfficialDocumentProvenance = {
      authority: sourceRecord.authority || 'FAA',
      source: sourceRecord.source,
      sourceReference: sourceRecord.rawSourceReference || `FR Doc. ${sourceRecord.documentNumber || cleanDocNum}`,
      originalUrl: rawUrl,
      finalUrl,
      retrievedAt,
      sha256,
      validationStatus: 'VALID',
      originType: 'SOURCE_METADATA'
    };

    const officialDocRecord: OfficialDocumentRecord = {
      id: docId,
      regulatoryDocumentId: sourceRecord.documentNumber,
      adNumber: sourceRecord.adNumber,
      documentNumber: sourceRecord.documentNumber,
      source: sourceRecord.source,
      authority: sourceRecord.authority || 'FAA',
      sourceReference: sourceRecord.rawSourceReference || `FR Doc. ${sourceRecord.documentNumber}`,
      originalUrl: rawUrl,
      finalUrl,
      fileName,
      mimeType: contentType.includes('pdf') ? 'application/pdf' : contentType,
      fileSizeBytes,
      sha256,
      retrievedAt,
      retrievalStatus: 'DOWNLOADED',
      validationStatus: 'VALID',
      httpStatus,
      contentDisposition,
      isOfficialSource: true,
      storagePath,
      fileData: buffer.toString('base64'),
      documentProvenance,
      pipelineIntegrationStatus: 'NOT_SUBMITTED',
      createdAt: retrievedAt
    };

    // 10. Persist in CAMO DataStore
    camoDb.update(state => {
      if (!Array.isArray(state.acquiredDocuments)) {
        state.acquiredDocuments = [];
      }
      state.acquiredDocuments.unshift(officialDocRecord);
    });

    camoDb.logAudit({
      user: camoDb.getState().currentUser.name,
      role: camoDb.getState().currentUser.role,
      action: 'CREATE',
      entityType: 'OfficialDocumentRecord',
      entityId: docId,
      details: `Acquired and validated official document for ${sourceRecord.adNumber || sourceRecord.documentNumber} from ${sourceRecord.source} (SHA-256: ${sha256.substring(0, 12)}...)`
    });

    // 11. Mode 2: If analyze requested, send to Document Intelligence
    if (options.analyze) {
      const analysisResult = await this.sendToExistingDocumentIntelligence(docId);
      return {
        success: true,
        record: analysisResult.record,
        requirement: analysisResult.requirement,
        isDuplicate: false
      };
    }

    return {
      success: true,
      record: officialDocRecord,
      isDuplicate: false
    };
  }

  /**
   * Mode 2 Pipeline Integration: Sends an acquired official document directly
   * into the EXISTING Document Intelligence -> Validation Gate -> Rule Engine
   */
  public async sendToExistingDocumentIntelligence(
    officialDocumentId: string
  ): Promise<{ record: OfficialDocumentRecord; requirement?: ComplianceRequirement; error?: string }> {
    const state = camoDb.getState();
    const docRecord = (state.acquiredDocuments || []).find(d => d.id === officialDocumentId);

    if (!docRecord) {
      throw new Error(`OfficialDocumentRecord with ID '${officialDocumentId}' not found.`);
    }

    if (docRecord.validationStatus !== 'VALID' || !docRecord.fileData) {
      throw new Error(`Cannot analyze document ${officialDocumentId}: Validation status is ${docRecord.validationStatus}.`);
    }

    // Set status to PROCESSING
    camoDb.update(s => {
      const found = (s.acquiredDocuments || []).find(d => d.id === officialDocumentId);
      if (found) {
        found.pipelineIntegrationStatus = 'PROCESSING';
      }
    });

    try {
      // 1. REUSE EXISTING DOCUMENT INTELLIGENCE (Gemini Extraction & Diagnostics)
      const extracted = await extractAdWithGemini({
        pdfBase64: docRecord.fileData,
        fileName: docRecord.fileName
      });

      const reqId = `req-acq-${Date.now()}`;
      const ruleId = `rule-acq-${Date.now()}`;
      const adNumber = extracted.sourceNumber || docRecord.adNumber || `FAA AD ${docRecord.documentNumber}`;

      // 2. Construct ComplianceRequirement referencing the official acquired document
      const requirement: ComplianceRequirement = {
        id: reqId,
        sourceType: 'AD',
        sourceNumber: adNumber.startsWith('FAA AD') ? adNumber : `FAA AD ${adNumber}`,
        revision: extracted.revision || 'Original',
        title: extracted.title || `Airworthiness Directive ${adNumber}`,
        issuingAuthority: (extracted.issuingAuthority as IssuingAuthority) || docRecord.authority || 'FAA',
        issueDate: extracted.issueDate || docRecord.retrievedAt.substring(0, 10),
        effectiveDate: extracted.effectiveDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        emergencyAd: Boolean(extracted.emergencyAd),
        supersedes: extracted.supersedes,
        status: extracted.documentProcessingStatus === 'EXTRACTION_FAILED' ? 'DRAFT' : 'EXTRACTED',
        sourceDocument: {
          fileName: docRecord.fileName,
          fileSize: docRecord.fileSizeBytes,
          mimeType: docRecord.mimeType,
          fileData: docRecord.fileData,
          rawExtractedText: extracted.technicalSummary,
          documentHash: docRecord.sha256
        },
        applicabilityRule: {
          id: ruleId,
          complianceRequirementId: reqId,
          aircraftManufacturers: extracted.aircraftManufacturers || [],
          aircraftModels: extracted.aircraftModels || [],
          aircraftSerialRanges: extracted.aircraftSerialRangesFrom ? {
            from: extracted.aircraftSerialRangesFrom,
            to: extracted.aircraftSerialRangesTo,
            list: extracted.aircraftSerialRangesList,
            description: extracted.aircraftSerialRangesDescription || undefined
          } : undefined,
          engineManufacturers: extracted.engineManufacturers,
          engineModels: extracted.engineModels,
          componentPartNumbers: extracted.componentPartNumbers || [],
          componentSerialRanges: (extracted.componentSerialRangesFrom || extracted.componentSerialRangesDescription) ? {
            from: extracted.componentSerialRangesFrom,
            to: extracted.componentSerialRangesTo,
            list: extracted.componentSerialRangesList,
            description: extracted.componentSerialRangesDescription || undefined
          } : undefined,
          affectedConfiguration: extracted.affectedConfiguration || undefined,
          otherEffectivityCriteria: extracted.otherEffectivityCriteria || undefined,
          rawText: extracted.applicabilityRawSummary || ''
        },
        requirementDetails: {
          initialThreshold: extracted.initialThreshold || undefined,
          complianceTime: extracted.complianceTime || undefined,
          repetitiveInterval: extracted.repetitiveInterval || undefined,
          requiredInspection: extracted.requiredInspection || undefined,
          modification: extracted.modification || undefined,
          replacement: extracted.replacement || undefined,
          optionalMethod: extracted.optionalMethod || undefined,
          terminatingAction: extracted.terminatingAction || undefined,
          requiredParts: extracted.requiredParts || [],
          requiredDocumentation: extracted.requiredDocumentation || undefined
        },
        actions: (extracted.actions || []).map((act, idx) => ({
          id: `act-${Date.now()}-${idx}`,
          complianceRequirementId: reqId,
          ...act
        })),
        applicabilityCriteria: extracted.applicabilityCriteria,
        mandatedActions: extracted.mandatedActions || [],
        softwareRequirements: extracted.softwareRequirements || [],
        externalEffectivityReferences: extracted.externalEffectivityReferences || [],
        rawExtraction: extracted.rawExtraction,
        documentProcessingStatus: extracted.documentProcessingStatus || 'EXTRACTED',
        extractionStatus: extracted.extractionStatus || 'SUCCESS',
        missingFields: extracted.missingFields || [],
        diagnostics: extracted.diagnostics,
        pipelineDiagnostics: extracted.pipelineDiagnostics,
        createdAt: new Date().toISOString(),
        createdBy: camoDb.getState().currentUser.name,
        updatedAt: new Date().toISOString(),
        updatedBy: camoDb.getState().currentUser.name
      };

      // 3. PERSIST REQUIREMENT IN CAMO DATABASE
      camoDb.update(s => {
        s.requirements.unshift(requirement);
        const targetDoc = (s.acquiredDocuments || []).find(d => d.id === officialDocumentId);
        if (targetDoc) {
          targetDoc.pipelineIntegrationStatus = 'ANALYZED';
          targetDoc.linkedRequirementId = reqId;
        }
      });

      // 4. RUN CAMO RULE ENGINE V2 ACROSS FLEET
      try {
        for (const ac of state.aircraft) {
          const assessment = evaluateRequirementWithCamoV2(requirement, ac);
          camoDb.update(s => {
            const existingIdx = s.assessments.findIndex(
              a => a.complianceRequirementId === reqId && a.entityRegistration === ac.registration
            );
            if (existingIdx >= 0) {
              s.assessments[existingIdx] = assessment as any;
            } else {
              s.assessments.push(assessment as any);
            }
          });
        }
      } catch (ruleErr) {
        console.warn('Auto rule evaluation error on acquired document:', ruleErr);
      }

      camoDb.logAudit({
        user: camoDb.getState().currentUser.name,
        role: camoDb.getState().currentUser.role,
        action: 'EXTRACT',
        entityType: 'ComplianceRequirement',
        entityId: reqId,
        details: `Processed official document ${docRecord.fileName} into Document Intelligence and evaluated fleet applicability.`
      });

      const updatedDoc = (camoDb.getState().acquiredDocuments || []).find(d => d.id === officialDocumentId)!;
      return { record: updatedDoc, requirement };
    } catch (err: any) {
      console.error('Error sending acquired document to Document Intelligence:', err);
      camoDb.update(s => {
        const targetDoc = (s.acquiredDocuments || []).find(d => d.id === officialDocumentId);
        if (targetDoc) {
          targetDoc.pipelineIntegrationStatus = 'FAILED';
        }
      });
      throw err;
    }
  }

  /**
   * Helper to build a standard failed OfficialDocumentRecord
   */
  private buildFailedRecord(
    sourceRecord: RegulatorySourceRecord,
    url: string,
    retrievalStatus: DocumentRetrievalStatus,
    validationStatus: DocumentValidationStatus,
    errorMessage: string
  ): OfficialDocumentRecord {
    const now = new Date().toISOString();
    return {
      id: `doc-err-${Date.now()}`,
      regulatoryDocumentId: sourceRecord.documentNumber,
      adNumber: sourceRecord.adNumber,
      documentNumber: sourceRecord.documentNumber,
      source: sourceRecord.source,
      authority: sourceRecord.authority || 'FAA',
      sourceReference: sourceRecord.rawSourceReference || `FR Doc. ${sourceRecord.documentNumber}`,
      originalUrl: url,
      finalUrl: url,
      fileName: `${(sourceRecord.documentNumber || 'doc').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
      mimeType: 'application/octet-stream',
      fileSizeBytes: 0,
      sha256: '',
      retrievedAt: now,
      retrievalStatus,
      validationStatus,
      isOfficialSource: false,
      validationErrors: [errorMessage],
      createdAt: now
    };
  }

  /**
   * Retrieves all acquired official documents from state
   */
  public getAcquiredDocuments(): OfficialDocumentRecord[] {
    return camoDb.getState().acquiredDocuments || [];
  }

  /**
   * Retrieves a single acquired official document by ID
   */
  public getAcquiredDocumentById(id: string): OfficialDocumentRecord | undefined {
    return (camoDb.getState().acquiredDocuments || []).find(d => d.id === id);
  }
}

export const officialDocumentAcquisitionService = new OfficialDocumentAcquisitionService();
