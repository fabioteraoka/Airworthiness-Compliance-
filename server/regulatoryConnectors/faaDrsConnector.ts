import {
  RegulatorySourceType,
  RegulatorySource,
  RegulatorySourceRecord,
  IssuingAuthority
} from '../../src/types';
import { IRegulatoryConnector, RegulatorySearchOptions, RegulatorySearchResponse } from './types';

export class FaaDrsConnector implements IRegulatoryConnector {
  readonly sourceId = 'faa-drs-v1';
  readonly sourceType: RegulatorySourceType = 'FAA_DRS';
  readonly authority: IssuingAuthority = 'FAA';
  readonly isOfficial = true;
  readonly apiConfirmed = false; // FAA DRS does NOT provide an official documented public REST API
  private readonly portalUrl = 'https://drs.faa.gov';

  getSourceInfo(): RegulatorySource {
    return {
      sourceId: this.sourceId,
      sourceName: 'FAA Dynamic Regulatory System (DRS)',
      authority: 'FAA',
      sourceType: 'FAA_DRS',
      baseUrl: this.portalUrl,
      isOfficial: true,
      isActive: false, // Architecture prepared, marked inactive until FAA opens public developer API
      apiConfirmed: false,
      statusMessage: 'API NOT OFFICIALLY CONFIRMED. The FAA Dynamic Regulatory System operates via web portal without a published public REST developer API. Fragile frontend scraping is intentionally bypassed to ensure regulatory safety.',
      capabilities: ['SEARCH', 'METADATA', 'DOCUMENT_REFERENCE'],
      notes: 'FAA DRS is the official portal for FAA regulatory documents. Because DRS uses enterprise session authentication and lacks a versioned public developer API, direct API integration is staged for future official API availability.'
    };
  }

  async searchByADNumber(adNumber: string): Promise<RegulatorySourceRecord[]> {
    console.info(`[FaaDrsConnector] Query for '${adNumber}' skipped: FAA DRS public REST API is not officially confirmed.`);
    return [];
  }

  async searchByDateRange(startDate: string, endDate: string, options?: RegulatorySearchOptions): Promise<RegulatorySourceRecord[]> {
    console.info(`[FaaDrsConnector] Date range query skipped: FAA DRS public REST API is not officially confirmed.`);
    return [];
  }

  async getDocument(documentNumber: string): Promise<RegulatorySourceRecord | null> {
    console.info(`[FaaDrsConnector] Document lookup '${documentNumber}' skipped: FAA DRS public REST API is not officially confirmed.`);
    return null;
  }

  async searchFAARegulatoryDocuments(query: string, options?: RegulatorySearchOptions): Promise<RegulatorySearchResponse> {
    return {
      source: this.sourceType,
      query,
      totalCount: 0,
      page: options?.page || 1,
      perPage: options?.perPage || 15,
      results: [],
      retrievedAt: new Date().toISOString(),
      executionTimeMs: 0,
      sourceDisclaimer: 'FAA DRS: API_NOT_OFFICIALLY_CONFIRMED. Direct public REST API not available.'
    };
  }
}
