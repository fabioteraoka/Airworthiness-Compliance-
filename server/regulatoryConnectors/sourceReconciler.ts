import {
  RegulatorySourceRecord,
  ComplianceRequirement,
  SourceReconciliationResult,
  SourceReconciliationFieldComparison,
  SourceConsistencyStatus,
  RegulatorySourceType
} from '../../src/types';

export class SourceReconciler {
  /**
   * Reconcile two RegulatorySourceRecords (e.g. Federal Register vs another source).
   */
  reconcileSourceRecords(
    sourceA: RegulatorySourceRecord,
    sourceB: RegulatorySourceRecord
  ): SourceReconciliationResult {
    const adNumber = sourceA.adNumber || sourceB.adNumber || sourceA.documentNumber || 'UNKNOWN';
    const fieldComparisons: SourceReconciliationFieldComparison[] = [];

    // 1. AD Number
    fieldComparisons.push(this.compareStringField(
      'adNumber',
      sourceA.source, sourceA.adNumber,
      sourceB.source, sourceB.adNumber
    ));

    // 2. Title
    fieldComparisons.push(this.compareTitleField(
      'title',
      sourceA.source, sourceA.title,
      sourceB.source, sourceB.title
    ));

    // 3. Effective Date
    fieldComparisons.push(this.compareDateField(
      'effectiveDate',
      sourceA.source, sourceA.effectiveDate,
      sourceB.source, sourceB.effectiveDate
    ));

    // 4. Publication / Issue Date
    fieldComparisons.push(this.compareDateField(
      'publicationDate',
      sourceA.source, sourceA.publicationDate,
      sourceB.source, sourceB.publicationDate
    ));

    // 5. Make / Manufacturer
    fieldComparisons.push(this.compareMakeField(
      'make',
      sourceA.source, sourceA.make,
      sourceB.source, sourceB.make
    ));

    // 6. Models
    fieldComparisons.push(this.compareModelsField(
      'models',
      sourceA.source, sourceA.models,
      sourceB.source, sourceB.models
    ));

    // 7. Docket Number
    fieldComparisons.push(this.compareDocketField(
      'docketNumber',
      sourceA.source, sourceA.docketNumber,
      sourceB.source, sourceB.docketNumber
    ));

    return this.assembleReconciliationResult(adNumber, fieldComparisons);
  }

  /**
   * Reconcile a Federal Register official record against an extracted ComplianceRequirement.
   */
  reconcileRequirementWithSource(
    req: ComplianceRequirement,
    sourceRec: RegulatorySourceRecord
  ): SourceReconciliationResult {
    const adNumber = req.sourceNumber || sourceRec.adNumber || 'UNKNOWN';
    const fieldComparisons: SourceReconciliationFieldComparison[] = [];

    // 1. AD Number
    fieldComparisons.push(this.compareStringField(
      'sourceNumber / adNumber',
      'INTERNAL_PDF', req.sourceNumber,
      sourceRec.source, sourceRec.adNumber
    ));

    // 2. Title
    fieldComparisons.push(this.compareTitleField(
      'title',
      'INTERNAL_PDF', req.title,
      sourceRec.source, sourceRec.title
    ));

    // 3. Effective Date
    fieldComparisons.push(this.compareDateField(
      'effectiveDate',
      'INTERNAL_PDF', req.effectiveDate,
      sourceRec.source, sourceRec.effectiveDate
    ));

    // 4. Publication / Issue Date
    fieldComparisons.push(this.compareDateField(
      'issueDate / publicationDate',
      'INTERNAL_PDF', req.issueDate,
      sourceRec.source, sourceRec.publicationDate
    ));

    // 5. Make
    const reqMakes = req.applicabilityRule.aircraftManufacturers || req.applicabilityRule.engineManufacturers || [];
    const reqMake = reqMakes.length > 0 ? reqMakes.join(', ') : undefined;
    fieldComparisons.push(this.compareMakeField(
      'make / manufacturer',
      'INTERNAL_PDF', reqMake,
      sourceRec.source, sourceRec.make
    ));

    // 6. Models
    const reqModels = req.applicabilityRule.aircraftModels || req.applicabilityRule.engineModels || [];
    fieldComparisons.push(this.compareModelsField(
      'models',
      'INTERNAL_PDF', reqModels,
      sourceRec.source, sourceRec.models
    ));

    // 7. Docket Number
    fieldComparisons.push(this.compareDocketField(
      'docketNumber',
      'INTERNAL_PDF', req.docketNumber,
      sourceRec.source, sourceRec.docketNumber
    ));

    return this.assembleReconciliationResult(adNumber, fieldComparisons);
  }

  // --------------------------------------------------------------------------
  // FIELD COMPARISON LOGIC
  // --------------------------------------------------------------------------

  private compareStringField(
    fieldName: string,
    sourceA: RegulatorySourceType, valA: any,
    sourceB: RegulatorySourceType, valB: any
  ): SourceReconciliationFieldComparison {
    const normA = valA ? String(valA).trim().toLowerCase() : '';
    const normB = valB ? String(valB).trim().toLowerCase() : '';

    if (!normA && !normB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA || 'NOT_AVAILABLE_FROM_SOURCE' },
        sourceB: { source: sourceB, value: valB || 'NOT_AVAILABLE_FROM_SOURCE' },
        status: 'INSUFFICIENT_DATA',
        reason: 'Both sources lack information for this field.'
      };
    }

    if (!normA || !normB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA || 'NOT_AVAILABLE_FROM_SOURCE' },
        sourceB: { source: sourceB, value: valB || 'NOT_AVAILABLE_FROM_SOURCE' },
        status: 'INSUFFICIENT_DATA',
        reason: `Value present in ${normA ? sourceA : sourceB}, but not available from ${normA ? sourceB : sourceA}.`
      };
    }

    // Clean comparison: e.g. "FAA AD 2020-24-02" vs "2020-24-02"
    const cleanA = normA.replace(/^(faa|easa|anac)\s*(ad)?\s*/i, '');
    const cleanB = normB.replace(/^(faa|easa|anac)\s*(ad)?\s*/i, '');

    if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA },
        sourceB: { source: sourceB, value: valB },
        status: 'CONSISTENT',
        reason: 'Values match across both sources.'
      };
    }

    return {
      fieldName,
      sourceA: { source: sourceA, value: valA },
      sourceB: { source: sourceB, value: valB },
      status: 'SOURCE_CONFLICT',
      reason: `Direct contradiction: '${valA}' (${sourceA}) vs '${valB}' (${sourceB}).`
    };
  }

  private compareTitleField(
    fieldName: string,
    sourceA: RegulatorySourceType, valA: string | undefined,
    sourceB: RegulatorySourceType, valB: string | undefined
  ): SourceReconciliationFieldComparison {
    if (!valA || !valB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA || 'NOT_AVAILABLE_FROM_SOURCE' },
        sourceB: { source: sourceB, value: valB || 'NOT_AVAILABLE_FROM_SOURCE' },
        status: 'INSUFFICIENT_DATA',
        reason: 'Title information incomplete in one or both sources.'
      };
    }

    const normA = valA.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const normB = valB.toLowerCase().replace(/[^a-z0-9]/g, ' ');

    // Jaccard word similarity
    const wordsA = new Set(normA.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(normB.split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = union.size > 0 ? intersection.size / union.size : 0;

    if (similarity > 0.4 || normA.includes(normB) || normB.includes(normA)) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA },
        sourceB: { source: sourceB, value: valB },
        status: 'CONSISTENT',
        reason: `Titles are semantically aligned (${Math.round(similarity * 100)}% vocabulary overlap).`
      };
    }

    return {
      fieldName,
      sourceA: { source: sourceA, value: valA },
      sourceB: { source: sourceB, value: valB },
      status: 'PARTIALLY_CONSISTENT',
      reason: `Titles describe related subject matter but differ in phrasing (${Math.round(similarity * 100)}% overlap).`
    };
  }

  private compareDateField(
    fieldName: string,
    sourceA: RegulatorySourceType, valA: string | undefined,
    sourceB: RegulatorySourceType, valB: string | undefined
  ): SourceReconciliationFieldComparison {
    if (!valA || !valB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA || 'NOT_AVAILABLE_FROM_SOURCE' },
        sourceB: { source: sourceB, value: valB || 'NOT_AVAILABLE_FROM_SOURCE' },
        status: 'INSUFFICIENT_DATA',
        reason: 'Date not available in both sources.'
      };
    }

    const dA = valA.substring(0, 10);
    const dB = valB.substring(0, 10);

    if (dA === dB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA },
        sourceB: { source: sourceB, value: valB },
        status: 'CONSISTENT',
        reason: `Dates match exactly: ${dA}.`
      };
    }

    return {
      fieldName,
      sourceA: { source: sourceA, value: valA },
      sourceB: { source: sourceB, value: valB },
      status: 'SOURCE_CONFLICT',
      reason: `Date discrepancy: ${dA} (${sourceA}) vs ${dB} (${sourceB}).`
    };
  }

  private compareMakeField(
    fieldName: string,
    sourceA: RegulatorySourceType, valA: string | undefined,
    sourceB: RegulatorySourceType, valB: string | undefined
  ): SourceReconciliationFieldComparison {
    if (!valA || !valB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA || 'NOT_AVAILABLE_FROM_SOURCE' },
        sourceB: { source: sourceB, value: valB || 'NOT_AVAILABLE_FROM_SOURCE' },
        status: 'INSUFFICIENT_DATA',
        reason: 'Manufacturer information incomplete in one source.'
      };
    }

    const nA = valA.toLowerCase().replace(/the\s+|company|corporation|inc|sas/gi, '').trim();
    const nB = valB.toLowerCase().replace(/the\s+|company|corporation|inc|sas/gi, '').trim();

    if (nA === nB || nA.includes(nB) || nB.includes(nA)) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA },
        sourceB: { source: sourceB, value: valB },
        status: 'CONSISTENT',
        reason: `Manufacturer is consistent (${valA} / ${valB}).`
      };
    }

    return {
      fieldName,
      sourceA: { source: sourceA, value: valA },
      sourceB: { source: sourceB, value: valB },
      status: 'SOURCE_CONFLICT',
      reason: `Manufacturer conflict: '${valA}' (${sourceA}) vs '${valB}' (${sourceB}).`
    };
  }

  private compareModelsField(
    fieldName: string,
    sourceA: RegulatorySourceType, valA: string[] | undefined,
    sourceB: RegulatorySourceType, valB: string[] | undefined
  ): SourceReconciliationFieldComparison {
    const listA = (valA || []).map(m => m.toUpperCase().trim()).filter(Boolean);
    const listB = (valB || []).map(m => m.toUpperCase().trim()).filter(Boolean);

    if (listA.length === 0 && listB.length === 0) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: listA },
        sourceB: { source: sourceB, value: listB },
        status: 'INSUFFICIENT_DATA',
        reason: 'No models extracted from either source.'
      };
    }

    if (listA.length === 0 || listB.length === 0) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: listA },
        sourceB: { source: sourceB, value: listB },
        status: 'INSUFFICIENT_DATA',
        reason: `Model list provided by ${listA.length > 0 ? sourceA : sourceB}, but missing in ${listA.length > 0 ? sourceB : sourceA}.`
      };
    }

    const setA = new Set(listA);
    const setB = new Set(listB);
    const inBoth = listA.filter(x => setB.has(x));

    if (listA.length === listB.length && inBoth.length === listA.length) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: listA },
        sourceB: { source: sourceB, value: listB },
        status: 'CONSISTENT',
        reason: `Model lists match identically: [${listA.join(', ')}].`
      };
    }

    // Check canonical model equivalence (e.g. 737-8 and 737-8 MAX)
    const normListA = listA.map(m => m.replace(/\s*MAX/i, ''));
    const normListB = listB.map(m => m.replace(/\s*MAX/i, ''));
    const normInBoth = normListA.filter(x => normListB.includes(x));

    if (normInBoth.length > 0) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: listA },
        sourceB: { source: sourceB, value: listB },
        status: (normInBoth.length === normListA.length && normInBoth.length === normListB.length) ? 'CONSISTENT' : 'PARTIALLY_CONSISTENT',
        reason: `Overlapping canonical models found [${normInBoth.join(', ')}].`
      };
    }

    return {
      fieldName,
      sourceA: { source: sourceA, value: listA },
      sourceB: { source: sourceB, value: listB },
      status: 'SOURCE_CONFLICT',
      reason: `No common models found between [${listA.join(', ')}] (${sourceA}) and [${listB.join(', ')}] (${sourceB}).`
    };
  }

  private compareDocketField(
    fieldName: string,
    sourceA: RegulatorySourceType, valA: string | undefined,
    sourceB: RegulatorySourceType, valB: string | undefined
  ): SourceReconciliationFieldComparison {
    if (!valA || !valB) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA || 'NOT_AVAILABLE_FROM_SOURCE' },
        sourceB: { source: sourceB, value: valB || 'NOT_AVAILABLE_FROM_SOURCE' },
        status: 'INSUFFICIENT_DATA',
        reason: 'Docket number not available in one or both sources.'
      };
    }

    const normA = valA.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const normB = valB.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
      return {
        fieldName,
        sourceA: { source: sourceA, value: valA },
        sourceB: { source: sourceB, value: valB },
        status: 'CONSISTENT',
        reason: `Docket references match: '${valA}' / '${valB}'.`
      };
    }

    return {
      fieldName,
      sourceA: { source: sourceA, value: valA },
      sourceB: { source: sourceB, value: valB },
      status: 'SOURCE_CONFLICT',
      reason: `Different docket references: '${valA}' (${sourceA}) vs '${valB}' (${sourceB}).`
    };
  }

  private assembleReconciliationResult(
    adNumber: string,
    comparisons: SourceReconciliationFieldComparison[]
  ): SourceReconciliationResult {
    const hasConflict = comparisons.some(c => c.status === 'SOURCE_CONFLICT');
    const hasPartial = comparisons.some(c => c.status === 'PARTIALLY_CONSISTENT');
    const consistentCount = comparisons.filter(c => c.status === 'CONSISTENT').length;
    const insufficientCount = comparisons.filter(c => c.status === 'INSUFFICIENT_DATA').length;

    let overallStatus: SourceConsistencyStatus = 'CONSISTENT';
    let summary = 'Regulatory metadata is consistent across sources.';

    if (hasConflict) {
      overallStatus = 'SOURCE_CONFLICT';
      const conflictFields = comparisons.filter(c => c.status === 'SOURCE_CONFLICT').map(c => c.fieldName).join(', ');
      summary = `Source conflict detected in fields: ${conflictFields}. Technical review required before regulatory adoption.`;
    } else if (hasPartial) {
      overallStatus = 'PARTIALLY_CONSISTENT';
      summary = 'Sources are partially consistent with minor phrasing or model list differences.';
    } else if (consistentCount === 0 && insufficientCount > 0) {
      overallStatus = 'INSUFFICIENT_DATA';
      summary = 'Insufficient overlapping data available to establish cross-source consistency.';
    }

    return {
      adNumber,
      overallStatus,
      summary,
      fieldComparisons: comparisons,
      reconciledAt: new Date().toISOString()
    };
  }
}

export const sourceReconciler = new SourceReconciler();
