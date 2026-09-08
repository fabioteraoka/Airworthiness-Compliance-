import { 
  RegulatoryDiscoveryRecord, 
  RegulatoryDiscoveryScanOptions, 
  RegulatoryDiscoveryScanSummary, 
  DiscoveryStatus, 
  RegulatorySourceRecord,
  IssuingAuthority,
  RegulatoryFieldProvenanceMap
} from '../../src/types';
import { regulatorySourceRegistry } from './sourceRegistry';
import { FederalRegisterConnector } from './federalRegisterConnector';
import { camoDb } from '../dataStore';

export class RegulatoryDiscoveryEngine {
  private frConnector: FederalRegisterConnector;

  constructor(customConnector?: FederalRegisterConnector) {
    this.frConnector = customConnector || regulatorySourceRegistry.getFederalRegisterConnector();
  }

  /**
   * Validate ISO date string (YYYY-MM-DD).
   */
  private isValidDateString(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr + 'T00:00:00Z');
    return !isNaN(d.getTime());
  }

  /**
   * Compute safe incremental start date based on last successful scan with 1-day safety margin.
   */
  public getIncrementalStartDate(): string {
    const state = camoDb.getState();
    const lastScan = state.lastSuccessfulScan;
    if (lastScan) {
      const lastDate = new Date(lastScan);
      if (!isNaN(lastDate.getTime())) {
        // Subtract 1 day for timezone and publication buffer
        lastDate.setDate(lastDate.getDate() - 1);
        return lastDate.toISOString().split('T')[0];
      }
    }
    // Default fallback: 14 days ago
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() - 14);
    return fallbackDate.toISOString().split('T')[0];
  }

  /**
   * Execute Regulatory Discovery Scan for FAA 14 CFR Part 39 Airworthiness Directives.
   */
  async scanRegulatorySources(
    options?: RegulatoryDiscoveryScanOptions
  ): Promise<{
    summary: RegulatoryDiscoveryScanSummary;
    discoveries: RegulatoryDiscoveryRecord[];
  }> {
    const startTime = Date.now();
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    let isIncremental = Boolean(options?.incremental);
    let startDate = options?.startDate;
    let endDate = options?.endDate;

    // If incremental requested or no dates supplied, resolve incremental dates
    if (isIncremental || (!startDate && !endDate)) {
      isIncremental = true;
      startDate = startDate || this.getIncrementalStartDate();
      endDate = endDate || todayStr;
    } else {
      startDate = startDate || this.getIncrementalStartDate();
      endDate = endDate || todayStr;
    }

    // Strict validation of date format
    if (!this.isValidDateString(startDate)) {
      throw new Error(`Validation Error: Invalid startDate format '${startDate}'. Expected YYYY-MM-DD.`);
    }
    if (!this.isValidDateString(endDate)) {
      throw new Error(`Validation Error: Invalid endDate format '${endDate}'. Expected YYYY-MM-DD.`);
    }

    // Strict range validation before any network request
    if (startDate > endDate) {
      throw new Error(
        `Validation Error: Invalid date range. startDate '${startDate}' cannot be greater than endDate '${endDate}'.`
      );
    }

    const maxPages = Math.min(Math.max(Number(options?.maxPages) || 5, 1), 20);
    const perPage = Math.min(Math.max(Number(options?.perPage) || 20, 5), 100);

    let totalDocumentsScanned = 0;
    let newDiscoveriesCount = 0;
    let alreadyKnownCount = 0;
    let errorsCount = 0;
    let pagesScanned = 0;

    const collectedRawRecords: RegulatorySourceRecord[] = [];
    const scannedDocNumbers = new Set<string>();

    let currentPage = options?.page || 1;
    let totalPages = 1;

    try {
      while (currentPage <= totalPages && pagesScanned < maxPages) {
        const pageResponse = await this.frConnector.discoverFAAPart39Publications(
          startDate,
          endDate,
          {
            page: currentPage,
            perPage,
            order: 'newest',
            agency: 'federal-aviation-administration',
            cfrTitle: 14,
            cfrPart: '39',
            type: 'RULE'
          }
        );

        pagesScanned++;
        totalPages = pageResponse.totalPages || 1;

        for (const record of pageResponse.results) {
          if (!record.documentNumber) continue;
          if (!scannedDocNumbers.has(record.documentNumber)) {
            scannedDocNumbers.add(record.documentNumber);
            collectedRawRecords.push(record);
          }
        }

        if (!pageResponse.nextPageUrl || currentPage >= totalPages) {
          break;
        }
        currentPage++;
      }
    } catch (err: any) {
      errorsCount++;
      console.error('RegulatoryDiscoveryEngine scan error:', err);
      throw new Error(`Regulatory Discovery Scan failed: ${err.message || 'API Communication Error'}`);
    }

    totalDocumentsScanned = collectedRawRecords.length;

    // Normalization & Deduplication Phase
    const currentState = camoDb.getState();
    const existingDiscoveriesMap = new Map<string, RegulatoryDiscoveryRecord>();
    for (const d of currentState.discoveryRecords || []) {
      const key = `${d.authority}_${d.documentNumber}`.toUpperCase();
      existingDiscoveriesMap.set(key, d);
    }

    const scanBatchDiscoveries: RegulatoryDiscoveryRecord[] = [];
    const newRecordsToPersist: RegulatoryDiscoveryRecord[] = [];
    const updatedRecordsMap = new Map<string, RegulatoryDiscoveryRecord>();

    for (const raw of collectedRawRecords) {
      try {
        const authority: IssuingAuthority = raw.authority || 'FAA';
        const docNum = raw.documentNumber;
        const dedupKey = `${authority}_${docNum}`.toUpperCase();

        const existingRecord = existingDiscoveriesMap.get(dedupKey);

        if (existingRecord) {
          // ALREADY_KNOWN: Update last seen timestamp and any newly enriched fields
          alreadyKnownCount++;
          const updated: RegulatoryDiscoveryRecord = {
            ...existingRecord,
            lastSeenAt: nowIso,
            discoveryStatus: 'ALREADY_KNOWN',
            effectiveDate: raw.effectiveDate || existingRecord.effectiveDate,
            pdfUrl: raw.pdfUrl || existingRecord.pdfUrl,
            htmlUrl: raw.htmlUrl || existingRecord.htmlUrl,
            citation: raw.citation || existingRecord.citation,
            adNumber: raw.adNumber || existingRecord.adNumber,
            make: raw.make || existingRecord.make,
            models: raw.models || existingRecord.models,
            productType: raw.productType || existingRecord.productType,
            cfrReferences: raw.cfrReferences || existingRecord.cfrReferences
          };
          updatedRecordsMap.set(existingRecord.id, updated);
          scanBatchDiscoveries.push(updated);
        } else {
          // NEW Discovery
          newDiscoveriesCount++;
          const discoveryRecord = this.normalizeToDiscoveryRecord(raw, nowIso, 'NEW');
          newRecordsToPersist.push(discoveryRecord);
          scanBatchDiscoveries.push(discoveryRecord);
          existingDiscoveriesMap.set(dedupKey, discoveryRecord);
        }
      } catch (normErr) {
        errorsCount++;
        console.error('Error normalizing discovery record:', normErr);
      }
    }

    // Persist to CAMO DataStore
    camoDb.update((draft) => {
      if (!Array.isArray(draft.discoveryRecords)) {
        draft.discoveryRecords = [];
      }

      // Update existing records with updated lastSeenAt
      for (let i = 0; i < draft.discoveryRecords.length; i++) {
        const item = draft.discoveryRecords[i];
        if (updatedRecordsMap.has(item.id)) {
          draft.discoveryRecords[i] = updatedRecordsMap.get(item.id)!;
        }
      }

      // Prepend new discoveries
      for (const newRec of newRecordsToPersist) {
        draft.discoveryRecords.unshift(newRec);
      }

      // Record last successful scan
      draft.lastSuccessfulScan = nowIso;
    });

    const executionTimeMs = Date.now() - startTime;

    const summary: RegulatoryDiscoveryScanSummary = {
      scanId,
      scannedAt: nowIso,
      startDate,
      endDate,
      isIncremental,
      totalDocumentsScanned,
      newDiscoveriesCount,
      alreadyKnownCount,
      errorsCount,
      executionTimeMs,
      authority: 'FAA',
      cfrTitle: 14,
      cfrPart: '39',
      pagesScanned
    };

    // Log Audit Trail Entry
    camoDb.logAudit({
      user: currentState.currentUser?.name || 'System Automated Discovery',
      role: currentState.currentUser?.role || 'SYSTEM_MONITOR',
      action: 'DISCOVERY_SCAN',
      entityType: 'RegulatoryDiscoveryScan',
      entityId: scanId,
      details: `Executed Regulatory Discovery Scan for FAA 14 CFR Part 39 (${startDate} to ${endDate}). Scanned: ${totalDocumentsScanned} docs (${pagesScanned} pages). New: ${newDiscoveriesCount}, Already Known: ${alreadyKnownCount}, Errors: ${errorsCount}.`
    });

    return {
      summary,
      discoveries: scanBatchDiscoveries
    };
  }

  /**
   * Normalizes a RegulatorySourceRecord into a strict RegulatoryDiscoveryRecord.
   */
  public normalizeToDiscoveryRecord(
    raw: RegulatorySourceRecord,
    timestamp: string,
    initialStatus: DiscoveryStatus = 'NEW'
  ): RegulatoryDiscoveryRecord {
    const authority: IssuingAuthority = raw.authority || 'FAA';
    const docNumber = raw.documentNumber;
    const id = `disc-${authority.toLowerCase()}-${docNumber}`;
    const sourceRef = `Federal Register API v1 (FR Doc. ${docNumber}${raw.citation ? `, Citation: ${raw.citation}` : ''})`;

    // Preserve and guarantee accurate field-level provenance
    const provenanceMap: RegulatoryFieldProvenanceMap = {
      documentNumber: {
        value: docNumber,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt: timestamp
      }
    };

    if (raw.publicationDate) {
      provenanceMap.publicationDate = {
        value: raw.publicationDate,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt: timestamp
      };
    }

    if (raw.effectiveDate) {
      provenanceMap.effectiveDate = {
        value: raw.effectiveDate,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt: timestamp
      };
    }

    if (raw.docketNumber) {
      provenanceMap.docketNumber = {
        value: raw.docketNumber,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 95,
        retrievedAt: timestamp
      };
    }

    if (raw.citation) {
      provenanceMap.citation = {
        value: raw.citation,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt: timestamp
      };
    }

    if (raw.pdfUrl) {
      provenanceMap.pdfUrl = {
        value: raw.pdfUrl,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt: timestamp
      };
    }

    if (raw.htmlUrl) {
      provenanceMap.htmlUrl = {
        value: raw.htmlUrl,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt: timestamp
      };
    }

    // Derived metadata fields (strictly marked DERIVED_METADATA)
    if (raw.adNumber) {
      const rawAdProv = raw.provenanceMap?.adNumber;
      provenanceMap.adNumber = {
        value: raw.adNumber,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: rawAdProv?.derivationRule || 'DOCKET_IDS_EXPLICIT_IDENTIFIER',
        confidence: rawAdProv?.confidence || 98,
        retrievedAt: timestamp
      };
    }

    if (raw.make) {
      provenanceMap.make = {
        value: raw.make,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: 'REGEXP_TEXT_PARSING_TITLE_ABSTRACT',
        confidence: 90,
        retrievedAt: timestamp
      };
    }

    if (raw.models && raw.models.length > 0) {
      provenanceMap.models = {
        value: raw.models,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: 'REGEXP_SERIES_PARSING_TITLE_ABSTRACT',
        confidence: raw.isPartialModelExtraction ? 75 : 90,
        retrievedAt: timestamp
      };
    }

    if (raw.productType) {
      provenanceMap.productType = {
        value: raw.productType,
        source: 'FEDERAL_REGISTER',
        sourceReference: raw.rawSourceReference || sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: 'MANUFACTURER_PRODUCT_TYPE_INFERENCE',
        confidence: 85,
        retrievedAt: timestamp
      };
    }

    return {
      id,
      authority,
      source: 'FEDERAL_REGISTER',
      documentNumber: docNumber,
      adNumber: raw.adNumber || null,
      title: raw.title || `Airworthiness Directive FR Doc. ${docNumber}`,
      publicationDate: raw.publicationDate || null,
      effectiveDate: raw.effectiveDate || null,
      docketNumber: raw.docketNumber || null,
      citation: raw.citation || null,
      htmlUrl: raw.htmlUrl || null,
      pdfUrl: raw.pdfUrl || null,
      cfrReferences: raw.cfrReferences,
      make: raw.make || null,
      models: raw.models || null,
      productType: raw.productType || null,
      firstDiscoveredAt: timestamp,
      lastSeenAt: timestamp,
      discoveryStatus: initialStatus,
      provenanceMap,
      sourcePayloadReference: sourceRef,
      topics: raw.topics,
      abstract: raw.abstract,
      action: raw.action
    };
  }

  /**
   * Retrieve all discovery records from DataStore with optional filters.
   */
  public getDiscoveries(filter?: {
    status?: DiscoveryStatus;
    startDate?: string;
    endDate?: string;
    query?: string;
  }): RegulatoryDiscoveryRecord[] {
    const state = camoDb.getState();
    let records = state.discoveryRecords || [];

    if (!filter) return records;

    if (filter.status) {
      records = records.filter(r => r.discoveryStatus === filter.status);
    }
    if (filter.startDate) {
      records = records.filter(r => (r.publicationDate || '') >= filter.startDate!);
    }
    if (filter.endDate) {
      records = records.filter(r => (r.publicationDate || '') <= filter.endDate!);
    }
    if (filter.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      records = records.filter(r => 
        r.documentNumber.toLowerCase().includes(q) ||
        (r.adNumber && r.adNumber.toLowerCase().includes(q)) ||
        r.title.toLowerCase().includes(q) ||
        (r.docketNumber && r.docketNumber.toLowerCase().includes(q)) ||
        (r.make && r.make.toLowerCase().includes(q))
      );
    }

    return records;
  }

  /**
   * Retrieve a specific discovery record by ID.
   */
  public getDiscoveryById(id: string): RegulatoryDiscoveryRecord | null {
    const state = camoDb.getState();
    return (state.discoveryRecords || []).find(r => r.id === id) || null;
  }
}

export const regulatoryDiscoveryEngine = new RegulatoryDiscoveryEngine();
