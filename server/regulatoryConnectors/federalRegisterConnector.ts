import {
  RegulatorySourceType,
  RegulatorySource,
  RegulatorySourceRecord,
  IssuingAuthority
} from '../../src/types';
import { 
  IRegulatoryConnector, 
  RegulatorySearchOptions, 
  RegulatorySearchResponse,
  FederalRegisterDiscoveryResponse
} from './types';

export class FederalRegisterConnector implements IRegulatoryConnector {
  readonly sourceId = 'federal-register-v1';
  readonly sourceType: RegulatorySourceType = 'FEDERAL_REGISTER';
  readonly authority: IssuingAuthority = 'FAA';
  readonly isOfficial = true;
  readonly apiConfirmed = true;
  private readonly baseUrl = 'https://www.federalregister.gov/api/v1';

  getSourceInfo(): RegulatorySource {
    return {
      sourceId: this.sourceId,
      sourceName: 'Federal Register Public API (v1)',
      authority: 'FAA',
      sourceType: 'FEDERAL_REGISTER',
      baseUrl: this.baseUrl,
      isOfficial: true,
      isActive: true,
      apiConfirmed: true,
      statusMessage: 'Official US Government Public REST API active. No API key required.',
      capabilities: ['SEARCH', 'DOCUMENT_LOOKUP', 'METADATA', 'DOCUMENT_REFERENCE'],
      notes: 'Direct queries to Federal Register REST API v1. Provides published Final Rules, CFR references, docket numbers, and official GovInfo PDFs.'
    };
  }

  /**
   * Search for Airworthiness Directives by AD number (e.g., "2020-24-02" or "FAA AD 2020-24-02").
   */
  async searchByADNumber(adNumber: string): Promise<RegulatorySourceRecord[]> {
    const cleanAdNumber = this.normalizeAdNumber(adNumber);
    if (!cleanAdNumber) {
      return [];
    }

    // Query Federal Register API with exact term search in FAA Rules
    const query = `"${cleanAdNumber}"`;
    const response = await this.searchFAARegulatoryDocuments(query, {
      type: 'RULE',
      order: 'newest',
      perPage: 10
    });

    const results = response.results.map(r => {
      // If result was found by searching for specific AD number, ensure AD number is set to cleanAdNumber
      if (!r.adNumber || r.adNumber !== cleanAdNumber) {
        return {
          ...r,
          adNumber: cleanAdNumber,
          provenanceMap: {
            ...r.provenanceMap,
            adNumber: {
              value: cleanAdNumber,
              source: 'FEDERAL_REGISTER' as const,
              sourceReference: r.rawSourceReference,
              originType: 'DERIVED_METADATA' as const,
              confidence: 95,
              retrievedAt: r.retrievedAt
            }
          }
        };
      }
      return r;
    });

    // Post-filter or sort to highlight direct matches
    return results.sort((a, b) => {
      const aMatches = a.adNumber === cleanAdNumber || a.title.includes(cleanAdNumber) || (a.abstract && a.abstract.includes(cleanAdNumber));
      const bMatches = b.adNumber === cleanAdNumber || b.title.includes(cleanAdNumber) || (b.abstract && b.abstract.includes(cleanAdNumber));
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }

  /**
   * Search FAA Airworthiness Directives published within a date range.
   */
  async searchByDateRange(startDate: string, endDate: string, options?: RegulatorySearchOptions): Promise<RegulatorySourceRecord[]> {
    const params = new URLSearchParams();
    params.append('conditions[agencies][]', 'federal-aviation-administration');
    params.append('conditions[type][]', options?.type === 'PROPOSED_RULE' ? 'PRORULE' : 'RULE');
    params.append('conditions[publication_date][gte]', startDate);
    params.append('conditions[publication_date][lte]', endDate);
    params.append('conditions[term]', 'Airworthiness Directives');
    params.append('order', options?.order === 'oldest' ? 'oldest' : 'newest');
    params.append('per_page', String(options?.perPage || 20));
    if (options?.page) {
      params.append('page', String(options.page));
    }

    const url = `${this.baseUrl}/documents.json?${params.toString()}`;
    const rawData = await this.fetchWithTimeout(url);
    if (!rawData || !Array.isArray(rawData.results)) {
      return [];
    }

    return rawData.results.map((item: any) => this.mapFederalRegisterDocumentToRecord(item));
  }

  /**
   * Phase 5.1: Query FAA 14 CFR Part 39 Airworthiness Directives via Federal Register API.
   * Uses canonical regulatory filters:
   *  - Agency: Federal Aviation Administration
   *  - CFR Title: 14
   *  - CFR Part: 39
   *  - Type: RULE
   *  - Publication Date Range: gte startDate, lte endDate
   */
  async discoverFAAPart39Publications(
    startDate: string,
    endDate: string,
    options?: RegulatorySearchOptions
  ): Promise<FederalRegisterDiscoveryResponse> {
    const startTime = Date.now();
    const params = new URLSearchParams();
    
    // Canonical Agency filter
    params.append('conditions[agencies][]', options?.agency || 'federal-aviation-administration');
    
    // Canonical 14 CFR Part 39 filters
    const cfrTitle = options?.cfrTitle !== undefined ? options.cfrTitle : 14;
    const cfrPart = options?.cfrPart !== undefined ? options.cfrPart : '39';
    params.append('conditions[cfr][title]', String(cfrTitle));
    params.append('conditions[cfr][part]', String(cfrPart));
    
    // Canonical Type filter (default: RULE)
    if (options?.type === 'PROPOSED_RULE') {
      params.append('conditions[type][]', 'PRORULE');
    } else if (options?.type === 'ALL') {
      params.append('conditions[type][]', 'RULE');
      params.append('conditions[type][]', 'PRORULE');
    } else {
      params.append('conditions[type][]', 'RULE');
    }
    
    // Date Range filters
    params.append('conditions[publication_date][gte]', startDate);
    params.append('conditions[publication_date][lte]', endDate);
    
    // Sort and pagination
    params.append('order', options?.order === 'oldest' ? 'oldest' : 'newest');
    params.append('per_page', String(options?.perPage || 20));
    const currentPage = options?.page ? Number(options.page) : 1;
    params.append('page', String(currentPage));
    
    // Explicit field selections for accurate metadata and provenance
    const requestedFields = [
      'title', 'document_number', 'publication_date', 'effective_on',
      'dockets', 'docket_ids', 'abstract', 'action', 'citation', 'pdf_url', 'html_url',
      'body_html_url', 'raw_text_url', 'cfr_references', 'topics'
    ];
    for (const f of requestedFields) {
      params.append('fields[]', f);
    }
    
    const url = `${this.baseUrl}/documents.json?${params.toString()}`;
    const rawData = await this.fetchWithTimeout(url);
    const executionTimeMs = Date.now() - startTime;
    
    if (!rawData || !Array.isArray(rawData.results)) {
      return {
        count: 0,
        totalPages: 0,
        currentPage,
        perPage: options?.perPage || 20,
        nextPageUrl: null,
        results: [],
        retrievedAt: new Date().toISOString(),
        executionTimeMs
      };
    }
    
    const results = rawData.results.map((item: any) => this.mapFederalRegisterDocumentToRecord(item));
    
    return {
      count: typeof rawData.count === 'number' ? rawData.count : results.length,
      totalPages: typeof rawData.total_pages === 'number' ? rawData.total_pages : (results.length > 0 ? 1 : 0),
      currentPage,
      perPage: options?.perPage || 20,
      nextPageUrl: rawData.next_page_url || null,
      results,
      retrievedAt: new Date().toISOString(),
      executionTimeMs
    };
  }

  /**
   * Retrieve a specific Federal Register document by document number (e.g. "2020-25844").
   */
  async getDocument(documentNumber: string): Promise<RegulatorySourceRecord | null> {
    if (!documentNumber) return null;
    const cleanDocNum = documentNumber.trim();
    const url = `${this.baseUrl}/documents/${encodeURIComponent(cleanDocNum)}.json`;
    
    try {
      const docData = await this.fetchWithTimeout(url);
      if (!docData || docData.error) {
        return null;
      }
      return this.mapFederalRegisterDocumentToRecord(docData);
    } catch (err) {
      console.warn(`FederalRegisterConnector: Failed to get document ${cleanDocNum}:`, err);
      return null;
    }
  }

  /**
   * Search FAA regulatory documents with custom options.
   */
  async searchFAARegulatoryDocuments(query: string, options?: RegulatorySearchOptions): Promise<RegulatorySearchResponse> {
    const startTime = Date.now();
    const params = new URLSearchParams();
    
    params.append('conditions[agencies][]', 'federal-aviation-administration');

    // Always filter by 14 CFR Part 39 (Airworthiness Directives) unless explicitly overridden
    const cfrTitle = options?.cfrTitle !== undefined ? options.cfrTitle : 14;
    const cfrPart = options?.cfrPart !== undefined ? options.cfrPart : '39';
    if (cfrPart !== 'ALL') {
      params.append('conditions[cfr][title]', String(cfrTitle));
      params.append('conditions[cfr][part]', String(cfrPart));
    }
    
    if (options?.type === 'PROPOSED_RULE') {
      params.append('conditions[type][]', 'PRORULE');
    } else if (options?.type === 'ALL') {
      params.append('conditions[type][]', 'RULE');
      params.append('conditions[type][]', 'PRORULE');
    } else {
      params.append('conditions[type][]', 'RULE');
    }

    const shouldIncludeTerm = options?.includeTerm !== false;
    const term = options?.term ?? query;
    if (shouldIncludeTerm) {
      params.append('conditions[term]', term && term.trim() ? term.trim() : 'Airworthiness Directives');
    }

    params.append('order', options?.order === 'oldest' ? 'oldest' : 'newest');
    params.append('per_page', String(options?.perPage || 15));
    if (options?.page) {
      params.append('page', String(options.page));
    }

    // Explicitly request all relevant metadata fields
    const requestedFields = [
      'title', 'document_number', 'publication_date', 'effective_on',
      'dockets', 'docket_ids', 'abstract', 'action', 'citation', 'pdf_url', 'html_url',
      'body_html_url', 'raw_text_url', 'cfr_references', 'topics'
    ];
    for (const f of requestedFields) {
      params.append('fields[]', f);
    }

    const url = `${this.baseUrl}/documents.json?${params.toString()}`;
    const rawData = await this.fetchWithTimeout(url);
    const executionTimeMs = Date.now() - startTime;

    if (!rawData || !Array.isArray(rawData.results)) {
      return {
        source: this.sourceType,
        query,
        totalCount: 0,
        page: options?.page || 1,
        perPage: options?.perPage || 15,
        results: [],
        retrievedAt: new Date().toISOString(),
        executionTimeMs,
        sourceDisclaimer: 'Federal Register Public API v1. Official US Government record.'
      };
    }

    const results = rawData.results.map((item: any) => this.mapFederalRegisterDocumentToRecord(item));

    return {
      source: this.sourceType,
      query,
      totalCount: typeof rawData.count === 'number' ? rawData.count : results.length,
      totalPages: typeof rawData.total_pages === 'number' ? rawData.total_pages : undefined,
      page: options?.page || 1,
      perPage: options?.perPage || 15,
      results,
      retrievedAt: new Date().toISOString(),
      executionTimeMs,
      sourceDisclaimer: 'Federal Register Public API v1. Official US Government record.'
    };
  }

  // --------------------------------------------------------------------------
  // PARSING & NORMALIZATION HELPERS
  // --------------------------------------------------------------------------

  private normalizeAdNumber(input: string): string {
    if (!input) return '';
    // Extract format like 2020-24-02 or 2024-12-05
    const match = input.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    return input.replace(/^(FAA|EASA|ANAC)\s*(AD)?\s*/i, '').trim();
  }

  private mapFederalRegisterDocumentToRecord(doc: any): RegulatorySourceRecord {
    const textContent = `${doc.title || ''} ${doc.abstract || ''} ${doc.action || ''} ${doc.excerpts || ''}`;
    const retrievedAt = new Date().toISOString();
    const sourceRef = `FR Doc. ${doc.document_number || 'N/A'}${doc.citation ? ` (${doc.citation})` : ''}`;
    
    // Extract AD number using strict derivation rules (docket_ids, title, docket objects)
    const adExtraction = this.extractAdNumberDetails(doc);
    const adNumber = adExtraction.adNumber;
    const { make, models, productType, isPartialExtraction, derivationNote } = this.extractMakeAndModels(doc.title || '', doc.abstract || '');
    const docketNumber = this.extractDocketNumber(doc);
    
    const cfrRefs = Array.isArray(doc.cfr_references) 
      ? doc.cfr_references.map((cfr: any) => ({
          title: cfr.title || 14,
          part: cfr.part || '39',
          chapter: cfr.chapter || null
        }))
      : undefined;

    // Build granular field-level provenance map
    const provenanceMap: any = {
      documentNumber: {
        value: doc.document_number || '',
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt
      }
    };

    if (doc.publication_date) {
      provenanceMap.publicationDate = {
        value: doc.publication_date,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt
      };
    }

    if (doc.effective_on) {
      provenanceMap.effectiveDate = {
        value: doc.effective_on,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt
      };
    }

    if (docketNumber) {
      provenanceMap.docketNumber = {
        value: docketNumber,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 95,
        retrievedAt
      };
    }

    if (doc.citation) {
      provenanceMap.citation = {
        value: doc.citation,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt
      };
    }

    if (doc.pdf_url) {
      provenanceMap.pdfUrl = {
        value: doc.pdf_url,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt
      };
    }

    if (doc.html_url) {
      provenanceMap.htmlUrl = {
        value: doc.html_url,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'SOURCE_METADATA',
        confidence: 100,
        retrievedAt
      };
    }

    if (adNumber) {
      provenanceMap.adNumber = {
        value: adNumber,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: adExtraction.derivationRule,
        confidence: adExtraction.confidence,
        retrievedAt
      };
    }

    if (make) {
      provenanceMap.make = {
        value: make,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: 'REGEXP_TEXT_PARSING_TITLE_ABSTRACT',
        confidence: 90,
        retrievedAt
      };
    }

    if (models && models.length > 0) {
      provenanceMap.models = {
        value: models,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: 'REGEXP_SERIES_PARSING_TITLE_ABSTRACT',
        confidence: isPartialExtraction ? 75 : 90,
        retrievedAt
      };
    }

    if (productType) {
      provenanceMap.productType = {
        value: productType,
        source: 'FEDERAL_REGISTER',
        sourceReference: sourceRef,
        originType: 'DERIVED_METADATA',
        derivationRule: 'MANUFACTURER_PRODUCT_TYPE_INFERENCE',
        confidence: 95,
        retrievedAt
      };
    }

    return {
      source: 'FEDERAL_REGISTER',
      authority: 'FAA',
      documentNumber: doc.document_number || '',
      adNumber: adNumber || undefined,
      title: doc.title || '',
      publicationDate: doc.publication_date || undefined,
      effectiveDate: doc.effective_on || undefined,
      docketNumber: docketNumber || undefined,
      cfrReferences: cfrRefs,
      htmlUrl: doc.html_url || undefined,
      pdfUrl: doc.pdf_url || undefined,
      bodyHtmlUrl: doc.body_html_url || undefined,
      rawTextUrl: doc.raw_text_url || undefined,
      rawSourceReference: sourceRef,
      abstract: doc.abstract || undefined,
      action: doc.action || undefined,
      citation: doc.citation || undefined,
      topics: Array.isArray(doc.topics) ? doc.topics : undefined,
      make: make || undefined,
      models: models && models.length > 0 ? models : undefined,
      productType: productType || undefined,
      provenanceMap,
      isPartialModelExtraction: isPartialExtraction,
      modelDerivationNote: derivationNote,
      retrievedAt
    };
  }

  /**
   * Strictly extracts AD Number with deterministic provenance and confidence scoring.
   * Priority:
   * 1. Structured docket_ids array (Federal Register canonical docket entry) -> DERIVED_METADATA (DOCKET_IDS_EXPLICIT_IDENTIFIER, 98%)
   * 2. Title matching -> DERIVED_METADATA (TITLE_EXPLICIT_IDENTIFIER, 92%)
   * 3. Docket objects list -> DERIVED_METADATA (DOCKET_OBJECT_EXPLICIT_IDENTIFIER, 90%)
   * 4. Unresolved / Ambiguous -> Returns null, does NOT guess from background narrative.
   */
  public extractAdNumberDetails(doc: any): {
    adNumber: string | null;
    derivationRule: string;
    confidence: number;
    rawIdentifier: string | null;
  } {
    // 1. Structured docket_ids array (official Federal Register API indexing)
    if (Array.isArray(doc.docket_ids)) {
      for (const dId of doc.docket_ids) {
        if (typeof dId === 'string') {
          // Explicit pattern: 'AD 2025-07-03' or 'AD 2016-15-01R1'
          const m = dId.match(/\bAD\s*[:#\s\-]?\s*(\d{4}-\d{2}-\d{2}(?:R\d+)?)\b/i);
          if (m) {
            return {
              adNumber: m[1].toUpperCase(),
              derivationRule: 'DOCKET_IDS_EXPLICIT_IDENTIFIER',
              confidence: 98,
              rawIdentifier: dId.trim()
            };
          }
        }
      }
    }

    // 2. Check title specifically for explicit AD number of the current directive
    const title = doc.title || '';
    const titleMatch = title.match(/\bAD\s*[:#\s]?\s*(\d{4}-\d{2}-\d{2}(?:R\d+)?)\b/i);
    if (titleMatch) {
      return {
        adNumber: titleMatch[1].toUpperCase(),
        derivationRule: 'TITLE_EXPLICIT_IDENTIFIER',
        confidence: 92,
        rawIdentifier: titleMatch[0].trim()
      };
    }

    // 3. Check dockets array (supporting documents / docket titles)
    if (Array.isArray(doc.dockets)) {
      for (const d of doc.dockets) {
        const dTitle = typeof d === 'object' && d ? d.title || '' : String(d || '');
        const dm = dTitle.match(/\bAD\s*[:#\s\-]?\s*(\d{4}-\d{2}-\d{2}(?:R\d+)?)\b/i);
        if (dm) {
          return {
            adNumber: dm[1].toUpperCase(),
            derivationRule: 'DOCKET_OBJECT_EXPLICIT_IDENTIFIER',
            confidence: 90,
            rawIdentifier: dm[0].trim()
          };
        }
      }
    }

    // 4. Do NOT fallback to greedy regex parsing of abstract / text, as abstracts routinely
    // mention superseded, related, or referenced historical ADs (e.g. 'superseding AD 2021-09-06').
    // When no unequivocal identifier exists in structured metadata or title, mark as UNRESOLVED_REQUIRES_MANUAL_REVIEW.
    return {
      adNumber: null,
      derivationRule: 'UNRESOLVED_REQUIRES_MANUAL_REVIEW',
      confidence: 0,
      rawIdentifier: null
    };
  }

  private extractMakeAndModels(title: string, abstract: string): { 
    make?: string; 
    models: string[]; 
    productType?: string;
    isPartialExtraction?: boolean;
    derivationNote?: string;
  } {
    const combined = `${title} ${abstract}`;
    const modelsSet = new Set<string>();
    let make: string | undefined;
    let productType: string = 'AIRCRAFT';
    let isPartialExtraction = false;
    let derivationNote: string | undefined;

    // Check Engine Manufacturers
    if (/CFM International/i.test(combined)) {
      make = 'CFM International';
      productType = 'ENGINE';
      const leapMatch = combined.match(/LEAP-1[AB]\d*(?:-\d+)?/gi);
      if (leapMatch) leapMatch.forEach(m => modelsSet.add(m.toUpperCase().trim()));
      const cfm56Match = combined.match(/CFM56-\d[A-Z\d]*(?:-\w+)?/gi);
      if (cfm56Match) cfm56Match.forEach(m => modelsSet.add(m.toUpperCase().trim()));
    } else if (/Pratt & Whitney/i.test(combined)) {
      make = 'Pratt & Whitney';
      productType = 'ENGINE';
      const pwMatch = combined.match(/PW\d{4}[A-Z]?(?:-\w+)?|PW1100G(?:-\w+)?/gi);
      if (pwMatch) pwMatch.forEach(m => modelsSet.add(m.toUpperCase().trim()));
    } else if (/Rolls-Royce/i.test(combined)) {
      make = 'Rolls-Royce';
      productType = 'ENGINE';
      const rrMatch = combined.match(/Trent\s*\d+/gi);
      if (rrMatch) rrMatch.forEach(m => modelsSet.add(m.toUpperCase().trim()));
    } else if (/General Electric/i.test(combined) || /GE Aviation/i.test(combined)) {
      make = 'General Electric';
      productType = 'ENGINE';
      const geMatch = combined.match(/GE90|GEnx|CF6|CF34/gi);
      if (geMatch) geMatch.forEach(m => modelsSet.add(m.toUpperCase().trim()));
    }

    // Check Aircraft Manufacturers if not engine
    if (!make) {
      if (/Boeing/i.test(combined)) {
        make = 'Boeing';
        productType = 'AIRCRAFT';

        // 1. Comprehensive series parsing (e.g. Model 737-600, -700, -700C, -800, -900, and -900ER series)
        const b737SeriesMatch = combined.match(/737[-\s]([0-9]{1,4}[A-Z]*)([\s,andor\-\/0-9A-Z]*?)(?:series|\bairplanes|\baircraft)/i);
        if (b737SeriesMatch) {
          const rawList = b737SeriesMatch[0];
          const itemMatches = rawList.match(/(?:737-|-)([0-9]{1,4}[A-Z]*)|737\s*(MAX\s*\d*)/gi);
          if (itemMatches) {
            itemMatches.forEach(im => {
              let clean = im.replace(/^(?:737-|-)/i, '737-').replace(/\s+/g, ' ').trim().toUpperCase();
              if (/^737\s*MAX/i.test(clean)) clean = clean.replace(/^737\s*MAX/i, '737 MAX');
              modelsSet.add(clean);
            });
          }
        }

        // 2. Direct individual matches
        const directBoeingMatches = combined.match(/737-\d{1,4}[A-Z]*|737\s*MAX(?:\s*-\d+)?|777-\d+[A-Z]*|787-\d+|767-\d+[A-Z]*|747-\d+[A-Z]*/gi);
        if (directBoeingMatches) {
          directBoeingMatches.forEach(m => {
            let clean = m.trim().toUpperCase();
            if (/^737\s*MAX/i.test(clean)) clean = clean.replace(/^737\s*MAX/i, '737 MAX');
            modelsSet.add(clean);
          });
        }
      } else if (/Airbus/i.test(combined)) {
        make = 'Airbus';
        productType = 'AIRCRAFT';
        const airbusSeriesMatch = combined.match(/A3[0-5]\d[-\s]([0-9]{1,4}[A-Z]*)([\s,andor\-\/0-9A-Z]*?)(?:series|\bairplanes|\baircraft)/i);
        if (airbusSeriesMatch) {
          const rawList = airbusSeriesMatch[0];
          const itemMatches = rawList.match(/(?:A3\d\d-|-)([0-9]{1,4}[A-Z]*)/gi);
          if (itemMatches) {
            itemMatches.forEach(im => modelsSet.add(im.replace(/^-/, 'A320-').trim().toUpperCase()));
          }
        }
        const airbusMatches = combined.match(/A320-\d+|A321-\d+|A319-\d+|A318-\d+|A330-\d+|A350-\d+|A380-\d+/gi);
        if (airbusMatches) {
          airbusMatches.forEach(m => modelsSet.add(m.trim().toUpperCase()));
        }
      } else if (/Embraer/i.test(combined)) {
        make = 'Embraer';
        productType = 'AIRCRAFT';
        const embMatches = combined.match(/ERJ[-\s]?\d+|E190|E195|E170|E175/gi);
        if (embMatches) {
          embMatches.forEach(m => modelsSet.add(m.trim().toUpperCase()));
        }
      } else if (/Bombardier|De Havilland/i.test(combined)) {
        make = 'Bombardier';
        productType = 'AIRCRAFT';
        const crjMatches = combined.match(/CRJ\d+|DHC-\d+/gi);
        if (crjMatches) crjMatches.forEach(m => modelsSet.add(m.trim().toUpperCase()));
      }
    }

    const models = Array.from(modelsSet);

    if (models.length === 0 && make) {
      isPartialExtraction = true;
      derivationNote = `Manufacturer (${make}) identified in text, but specific model variants were not explicitly delimited in title/abstract.`;
    } else if (models.length > 0) {
      derivationNote = `Models derived via regex parsing of title and abstract: [${models.join(', ')}].`;
    }

    return { make, models, productType, isPartialExtraction, derivationNote };
  }

  private extractDocketNumber(doc: any): string | null {
    if (Array.isArray(doc.docket_ids) && doc.docket_ids.length > 0) {
      return doc.docket_ids.join(', ');
    }
    if (Array.isArray(doc.dockets)) {
      for (const d of doc.dockets) {
        if (typeof d === 'string') {
          if (d.includes('Docket No.')) return d;
        } else if (d && typeof d === 'object') {
          const val = d.docket_id || d.id || d.title;
          if (val && typeof val === 'string' && val.includes('Docket No.')) return val;
        }
      }
      if (doc.dockets.length > 0) {
        const first = doc.dockets[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object') return first.docket_id || first.id || first.title || null;
      }
    }
    if (doc.regulation_id_number) {
      return `RIN ${doc.regulation_id_number}`;
    }
    return null;
  }

  private async fetchWithTimeout(url: string, timeoutMs = 10000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CAMO-Airworthiness-Compliance-Intelligence/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Federal Register API responded with HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Federal Register request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}
