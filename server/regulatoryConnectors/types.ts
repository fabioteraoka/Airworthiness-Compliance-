import {
  RegulatorySourceType,
  RegulatorySourceCapability,
  RegulatorySource,
  RegulatorySourceRecord,
  RegulatoryDocumentMetadata,
  SourceReconciliationResult,
  FleetRegulatoryScreeningReport,
  IssuingAuthority
} from '../../src/types';

export interface RegulatorySearchOptions {
  page?: number;
  perPage?: number;
  type?: 'RULE' | 'PROPOSED_RULE' | 'ALL';
  order?: 'relevance' | 'newest' | 'oldest';
  agency?: string;
  fields?: string[];
  cfrTitle?: number;
  cfrPart?: string;
}

export interface RegulatorySearchResponse {
  source: RegulatorySourceType;
  query: string;
  totalCount: number;
  totalPages?: number;
  page: number;
  perPage: number;
  results: RegulatorySourceRecord[];
  retrievedAt: string;
  executionTimeMs: number;
  sourceDisclaimer?: string;
}

export interface FederalRegisterDiscoveryResponse {
  count: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  nextPageUrl?: string | null;
  results: RegulatorySourceRecord[];
  retrievedAt: string;
  executionTimeMs: number;
}

export interface IRegulatoryConnector {
  readonly sourceId: string;
  readonly sourceType: RegulatorySourceType;
  readonly authority: IssuingAuthority;
  readonly isOfficial: boolean;
  readonly apiConfirmed: boolean;
  
  getSourceInfo(): RegulatorySource;
  searchByADNumber(adNumber: string): Promise<RegulatorySourceRecord[]>;
  searchByDateRange(startDate: string, endDate: string, options?: RegulatorySearchOptions): Promise<RegulatorySourceRecord[]>;
  getDocument(documentNumber: string): Promise<RegulatorySourceRecord | null>;
  searchFAARegulatoryDocuments(query: string, options?: RegulatorySearchOptions): Promise<RegulatorySearchResponse>;
}
