/**
 * CAMO — DUE DATE & THRESHOLD ENGINE (Release 6.2.0)
 * Deterministic Compliance Limit Calculation Engine
 * 
 * Implements strict, reproducible, auditable and fail-safe calculation of
 * airworthiness compliance limits:
 * - Calendar (Days, Weeks, Months, Years, Fixed Dates)
 * - Flight Hours (FH) & Flight Cycles (FC)
 * - Temporal Operators: WITHIN, BEFORE, AFTER, NO_LATER_THAN, AT, UPON, FOLLOWING, SINCE, UNTIL
 * - Composition: AND, OR, WHICHEVER_OCCURS_FIRST, WHICHEVER_OCCURS_LATER, NO_LATER_THAN
 * - Strict Separation: Regulatory Limit vs Operational Alert Window (DUE_SOON)
 * - Non-fabricated References: Missing reference -> INSUFFICIENT_DATA / REVIEW_REQUIRED
 * - Data Integrity: Rollback / negative counters -> DATA_INTEGRITY_REVIEW
 * - Explainability & Cryptographic Input Hashing
 */

import crypto from 'crypto';
import {
  ComplianceObligation,
  ObligationThresholdConfig,
  ObligationIntervalConfig,
  ObligationTemporalCounters,
  TemporalOperator,
  CompositionOperator,
  TemporalReferenceEvent,
  ControllingLimitType,
  DueDateCalculationStatus,
  DueDateCalculationResult,
  DueDateCalculationExplanation,
  OperationalAlertWindowConfig,
  CalendarLimitConfig
} from '../../src/types';

export interface DueDateCalculationInput {
  obligationId?: string;
  threshold?: ObligationThresholdConfig;
  interval?: ObligationIntervalConfig;
  effectiveDate?: string | null;
  currentAirframeFH?: number;
  currentAirframeFC?: number;
  currentDate?: string; // Format YYYY-MM-DD (defaults to UTC today)
  lastComplianceDate?: string;
  lastComplianceFH?: number;
  lastComplianceFC?: number;
  aircraftDeliveryDate?: string;
  aircraftManufactureDate?: string;
  componentInstallationDate?: string;
  componentInstallationFH?: number;
  componentInstallationFC?: number;
  eventDate?: string;
  cycleCount?: number;
  isTerminated?: boolean;
  isSuperseded?: boolean;
  alertWindow?: OperationalAlertWindowConfig;
  customReferenceDate?: string;
  customReferenceFH?: number;
  customReferenceFC?: number;
  averageUtilizationRateFHPerDay?: number; // e.g. 5.0 FH/day for projection comparison
  averageUtilizationRateFCPerDay?: number; // e.g. 2.0 FC/day
}

export const DEFAULT_ALERT_WINDOW: OperationalAlertWindowConfig = {
  alertWindowDays: 30,
  alertWindowFH: 100,
  alertWindowFC: 50
};

export const DUE_DATE_ENGINE_VERSION = '6.2.0';

export class DueDateThresholdEngine {
  private static instance: DueDateThresholdEngine;

  private constructor() {}

  public static getInstance(): DueDateThresholdEngine {
    if (!DueDateThresholdEngine.instance) {
      DueDateThresholdEngine.instance = new DueDateThresholdEngine();
    }
    return DueDateThresholdEngine.instance;
  }

  // =========================================================================
  // 1. CALENDAR ARITHMETIC (Deterministic UTC & Exact Calendar Semantics)
  // =========================================================================

  /**
   * Returns true if the year is a leap year
   */
  public isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Returns the exact number of days in a given year and month (1-based month: 1=Jan, 12=Dec)
   */
  public getDaysInMonth(year: number, month: number): number {
    const daysInMonths = [31, this.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonths[month - 1] || 30;
  }

  /**
   * Adds calendar days to an ISO date string (YYYY-MM-DD) deterministically
   */
  public addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid calendar date string: ${dateStr}`);
    }
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  /**
   * Adds calendar weeks to an ISO date string
   */
  public addWeeks(dateStr: string, weeks: number): string {
    return this.addDays(dateStr, weeks * 7);
  }

  /**
   * Adds calendar months with strict boundary preservation:
   * e.g. Jan 31 + 1 month -> Feb 28 (or Feb 29 in leap year), NOT March 2/3!
   * e.g. Mar 31 + 1 month -> Apr 30
   */
  public addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid calendar date string: ${dateStr}`);
    }

    const curYear = d.getUTCFullYear();
    const curMonth = d.getUTCMonth() + 1; // 1-indexed
    const curDay = d.getUTCDate();

    const totalMonths = (curYear * 12) + (curMonth - 1) + months;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = (totalMonths % 12) + 1;

    const maxDaysInTargetMonth = this.getDaysInMonth(targetYear, targetMonth);
    const targetDay = Math.min(curDay, maxDaysInTargetMonth);

    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
  }

  /**
   * Adds calendar years, properly handling leap day (Feb 29 + 1 yr -> Feb 28)
   */
  public addYears(dateStr: string, years: number): string {
    return this.addMonths(dateStr, years * 12);
  }

  /**
   * Computes integer difference in calendar days: (targetDate - baseDate)
   */
  public diffInDays(targetDateStr: string, baseDateStr: string): number {
    const t = new Date(targetDateStr + 'T00:00:00Z').getTime();
    const b = new Date(baseDateStr + 'T00:00:00Z').getTime();
    if (isNaN(t) || isNaN(b)) {
      return 0;
    }
    return Math.round((t - b) / (1000 * 60 * 60 * 24));
  }

  // =========================================================================
  // 2. INPUT HASHING & INTEGRITY AUDITING
  // =========================================================================

  /**
   * Generates a deterministic SHA-256 hash from calculation inputs
   */
  public generateCalculationHash(input: DueDateCalculationInput): string {
    const normalized = {
      obligationId: input.obligationId || '',
      effectiveDate: input.effectiveDate || '',
      currentAirframeFH: input.currentAirframeFH ?? null,
      currentAirframeFC: input.currentAirframeFC ?? null,
      currentDate: input.currentDate || '',
      lastComplianceDate: input.lastComplianceDate || '',
      lastComplianceFH: input.lastComplianceFH ?? null,
      lastComplianceFC: input.lastComplianceFC ?? null,
      cycleCount: input.cycleCount ?? 0,
      isTerminated: Boolean(input.isTerminated),
      isSuperseded: Boolean(input.isSuperseded),
      threshold: input.threshold ? JSON.stringify(input.threshold) : '',
      interval: input.interval ? JSON.stringify(input.interval) : ''
    };
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').substring(0, 16);
  }

  // =========================================================================
  // 3. CORE CALCULATION ENGINE
  // =========================================================================

  /**
   * Main deterministic compliance limit calculation
   */
  public calculateDue(input: DueDateCalculationInput): DueDateCalculationResult {
    const nowIso = new Date().toISOString();
    const todayStr = input.currentDate || nowIso.split('T')[0];
    const alertWindow: OperationalAlertWindowConfig = {
      alertWindowDays: input.alertWindow?.alertWindowDays ?? DEFAULT_ALERT_WINDOW.alertWindowDays,
      alertWindowFH: input.alertWindow?.alertWindowFH ?? DEFAULT_ALERT_WINDOW.alertWindowFH,
      alertWindowFC: input.alertWindow?.alertWindowFC ?? DEFAULT_ALERT_WINDOW.alertWindowFC
    };

    const inputHash = this.generateCalculationHash(input);

    // Initial base template
    const result: DueDateCalculationResult = {
      obligationId: input.obligationId,
      calculationStatus: 'SUCCESS',
      controllingLimit: 'NONE',
      controllingReason: 'No temporal constraints defined.',
      composition: {
        operator: 'NONE',
        alternativeLimits: []
      },
      reference: {
        event: 'UNKNOWN',
        description: 'No reference event defined.'
      },
      counters: {
        effectiveDate: input.effectiveDate || null,
        currentAirframeFH: input.currentAirframeFH,
        currentAirframeFC: input.currentAirframeFC,
        cycleCount: input.cycleCount || 0,
        isOverdue: false,
        isDueSoon: false,
        alertWindow: alertWindow,
        calculationInputHash: inputHash,
        lastCalculatedAt: nowIso
      },
      explanation: '',
      structuredExplanation: {
        referenceDescription: 'N/A',
        requirementDescription: 'N/A',
        currentStatusDescription: `Current Date: ${todayStr}, Airframe FH: ${input.currentAirframeFH ?? 'N/A'}, FC: ${input.currentAirframeFC ?? 'N/A'}`,
        calculatedDueDescription: 'N/A',
        remainingDescription: 'N/A',
        controllingRule: 'NONE',
        summary: ''
      },
      audit: {
        engineVersion: DUE_DATE_ENGINE_VERSION,
        calculationTimestamp: nowIso,
        calculationInputHash: inputHash,
        ruleApplied: 'DEFAULT_EVALUATION'
      },
      reviewRequired: false
    };

    // -----------------------------------------------------------------------
    // CHECK 1: TERMINATING ACTION
    // -----------------------------------------------------------------------
    if (input.isTerminated) {
      result.calculationStatus = 'TERMINATED';
      result.controllingLimit = 'NONE';
      result.controllingReason = 'Terminating action has been accomplished. Recurring obligation is permanently terminated.';
      result.explanation = 'Obrigação de aeronavegabilidade permanentemente encerrada por ação terminatória validada.';
      result.structuredExplanation.summary = result.explanation;
      result.structuredExplanation.controllingRule = 'TERMINATING_ACTION_ACCOMPLISHED';
      result.counters.calculationStatus = 'TERMINATED';
      result.counters.controllingLimit = 'NONE';
      return result;
    }

    // -----------------------------------------------------------------------
    // CHECK 2: SUPERSEDED OBLIGATION
    // -----------------------------------------------------------------------
    if (input.isSuperseded) {
      result.calculationStatus = 'SUPERSEDED';
      result.controllingLimit = 'NONE';
      result.controllingReason = 'Obligation is superseded by a newer regulatory revision. Operational calculation is halted.';
      result.explanation = 'Obrigação superada por revisão regulatória mais recente. Recálculo operacional descontinuado.';
      result.structuredExplanation.summary = result.explanation;
      result.structuredExplanation.controllingRule = 'SUPERSEDED_BY_NEW_DIRECTIVE';
      result.counters.calculationStatus = 'SUPERSEDED';
      result.counters.controllingLimit = 'NONE';
      return result;
    }

    // -----------------------------------------------------------------------
    // CHECK 3: DATA INTEGRITY VALIDATION (Strict Fail-Safe Guardrails)
    // -----------------------------------------------------------------------
    // 3.1 Negative current counters
    if (input.currentAirframeFH !== undefined && input.currentAirframeFH < 0) {
      return this.failWithDataIntegrity(
        result,
        `Contador de horas de voo negativo detectado (currentFH: ${input.currentAirframeFH}).`,
        'NEGATIVE_AIRFRAME_FH'
      );
    }
    if (input.currentAirframeFC !== undefined && input.currentAirframeFC < 0) {
      return this.failWithDataIntegrity(
        result,
        `Contador de ciclos de voo negativo detectado (currentFC: ${input.currentAirframeFC}).`,
        'NEGATIVE_AIRFRAME_FC'
      );
    }

    // 3.2 Counter rollback
    if (
      input.lastComplianceFH !== undefined &&
      input.currentAirframeFH !== undefined &&
      input.currentAirframeFH < input.lastComplianceFH
    ) {
      return this.failWithDataIntegrity(
        result,
        `Rollback de horímetro detectado: horas atuais (${input.currentAirframeFH} FH) inferiores ao último cumprimento (${input.lastComplianceFH} FH).`,
        'FH_COUNTER_ROLLBACK'
      );
    }
    if (
      input.lastComplianceFC !== undefined &&
      input.currentAirframeFC !== undefined &&
      input.currentAirframeFC < input.lastComplianceFC
    ) {
      return this.failWithDataIntegrity(
        result,
        `Rollback de ciclos detectado: ciclos atuais (${input.currentAirframeFC} FC) inferiores ao último cumprimento (${input.lastComplianceFC} FC).`,
        'FC_COUNTER_ROLLBACK'
      );
    }

    // 3.3 Zero or negative intervals
    const interval = input.interval;
    if (interval && interval.isRepetitive) {
      if (interval.intervalValue !== undefined && interval.intervalValue <= 0) {
        return this.failWithDataIntegrity(
          result,
          `Intervalo de repetição inválido: ${interval.intervalValue}. O intervalo deve ser estritamente positivo (> 0).`,
          'ZERO_OR_NEGATIVE_INTERVAL'
        );
      }
      if (interval.intervalFH !== undefined && interval.intervalFH <= 0) {
        return this.failWithDataIntegrity(
          result,
          `Intervalo de horas (intervalFH) inválido: ${interval.intervalFH}. Deve ser estritamente positivo.`,
          'ZERO_OR_NEGATIVE_INTERVAL_FH'
        );
      }
      if (interval.intervalFC !== undefined && interval.intervalFC <= 0) {
        return this.failWithDataIntegrity(
          result,
          `Intervalo de ciclos (intervalFC) inválido: ${interval.intervalFC}. Deve ser estritamente positivo.`,
          'ZERO_OR_NEGATIVE_INTERVAL_FC'
        );
      }
      if (interval.intervalDays !== undefined && interval.intervalDays <= 0) {
        return this.failWithDataIntegrity(
          result,
          `Intervalo de dias (intervalDays) inválido: ${interval.intervalDays}. Deve ser estritamente positivo.`,
          'ZERO_OR_NEGATIVE_INTERVAL_DAYS'
        );
      }
    }

    // 3.4 Invalid calendar date strings
    if (input.effectiveDate && isNaN(new Date(input.effectiveDate + 'T00:00:00Z').getTime())) {
      return this.failWithDataIntegrity(
        result,
        `Data efetiva com formato inválido: '${input.effectiveDate}'.`,
        'INVALID_EFFECTIVE_DATE_FORMAT'
      );
    }
    if (input.lastComplianceDate && isNaN(new Date(input.lastComplianceDate + 'T00:00:00Z').getTime())) {
      return this.failWithDataIntegrity(
        result,
        `Data do último cumprimento com formato inválido: '${input.lastComplianceDate}'.`,
        'INVALID_LAST_COMPLIANCE_DATE_FORMAT'
      );
    }

    // -----------------------------------------------------------------------
    // CHECK 4: IDENTIFY REFERENCE EVENT
    // -----------------------------------------------------------------------
    const isRepetitiveCycle = Boolean(
      input.lastComplianceDate || 
      input.lastComplianceFH !== undefined || 
      input.lastComplianceFC !== undefined ||
      (input.cycleCount && input.cycleCount > 0) ||
      (Boolean(interval?.isRepetitive) && !input.threshold)
    ) && Boolean(interval?.isRepetitive);

    let referenceEvent: TemporalReferenceEvent = 'UNKNOWN';
    let referenceDate: string | undefined = undefined;
    let referenceFH: number | undefined = undefined;
    let referenceFC: number | undefined = undefined;
    let referenceDescription = '';

    if (isRepetitiveCycle) {
      referenceEvent = 'LAST_COMPLIANCE';
      referenceDate = input.lastComplianceDate;
      referenceFH = input.lastComplianceFH;
      referenceFC = input.lastComplianceFC;
      referenceDescription = `Last compliance accomplished on ${referenceDate || 'undated'} at ${referenceFH ?? 'N/A'} FH, ${referenceFC ?? 'N/A'} FC`;
    } else if (input.threshold?.referenceEvent) {
      referenceEvent = input.threshold.referenceEvent;
      if (referenceEvent === 'EFFECTIVE_DATE') {
        referenceDate = input.effectiveDate || undefined;
        referenceFH = input.customReferenceFH;
        referenceFC = input.customReferenceFC;
        referenceDescription = `Effective Date of AD (${referenceDate || 'MISSING'})`;
      } else if (referenceEvent === 'COMPONENT_INSTALLATION') {
        referenceDate = input.componentInstallationDate || input.customReferenceDate;
        referenceFH = input.componentInstallationFH ?? input.customReferenceFH;
        referenceFC = input.componentInstallationFC ?? input.customReferenceFC;
        referenceDescription = `Component Installation Date (${referenceDate || 'MISSING'})`;
      } else if (referenceEvent === 'AIRCRAFT_DELIVERY' || referenceEvent === 'MANUFACTURE_DATE') {
        referenceDate = input.aircraftDeliveryDate || input.aircraftManufactureDate || input.customReferenceDate;
        referenceFH = input.customReferenceFH;
        referenceFC = input.customReferenceFC;
        referenceDescription = `Aircraft Delivery/Manufacture Date (${referenceDate || 'MISSING'})`;
      } else if (referenceEvent === 'EVENT_DATE') {
        referenceDate = input.eventDate || input.customReferenceDate;
        referenceFH = input.customReferenceFH;
        referenceFC = input.customReferenceFC;
        referenceDescription = `Special Event Date (${referenceDate || 'MISSING'})`;
      } else if (referenceEvent === 'SPECIFIC_DATE') {
        referenceDate = input.threshold.thresholdDate || input.customReferenceDate;
        referenceDescription = `Fixed Calendar Target Date (${referenceDate || 'MISSING'})`;
      } else if (referenceEvent === 'LAST_COMPLIANCE') {
        referenceDate = input.lastComplianceDate;
        referenceFH = input.lastComplianceFH;
        referenceFC = input.lastComplianceFC;
        referenceDescription = `Last Compliance Event`;
      }
    } else if (input.effectiveDate) {
      referenceEvent = 'EFFECTIVE_DATE';
      referenceDate = input.effectiveDate;
      referenceFH = input.customReferenceFH;
      referenceFC = input.customReferenceFC;
      referenceDescription = `Effective Date of AD (${input.effectiveDate})`;
    }

    if (referenceDate === undefined && input.customReferenceDate !== undefined) {
      referenceDate = input.customReferenceDate;
    }
    if (referenceFH === undefined && input.customReferenceFH !== undefined) {
      referenceFH = input.customReferenceFH;
    }
    if (referenceFC === undefined && input.customReferenceFC !== undefined) {
      referenceFC = input.customReferenceFC;
    }

    result.reference = {
      event: referenceEvent,
      referenceDate,
      referenceFH,
      referenceFC,
      description: referenceDescription
    };
    result.structuredExplanation.referenceDescription = referenceDescription;

    // Record last compliance counters in result
    if (input.lastComplianceDate) result.counters.lastComplianceDate = input.lastComplianceDate;
    if (input.lastComplianceFH !== undefined) result.counters.lastComplianceFH = input.lastComplianceFH;
    if (input.lastComplianceFC !== undefined) result.counters.lastComplianceFC = input.lastComplianceFC;

    // -----------------------------------------------------------------------
    // CHECK 5: COMPUTE INDIVIDUAL LIMITS (Calendar, FH, FC, Fixed Date)
    // -----------------------------------------------------------------------
    const threshold = input.threshold;

    // 5.1 BEFORE FURTHER FLIGHT operator
    const thresholdTypeStr = (threshold?.thresholdType || '') as string;
    const isBff = thresholdTypeStr === 'BEFORE_FURTHER_FLIGHT' || 
                  Boolean(threshold?.description?.toLowerCase().includes('before further flight')) ||
                  (threshold?.operator === 'BEFORE' && thresholdTypeStr === 'BEFORE_FURTHER_FLIGHT');

    if (isBff && !input.lastComplianceDate && input.lastComplianceFH === undefined) {
      result.controllingLimit = 'FIXED_DATE';
      result.controllingReason = 'Mandatory action required before further flight (zero flight tolerance).';
      result.fixedDateLimit = {
        dueDate: input.effectiveDate || todayStr,
        remainingDays: 0,
        isOverdue: false,
        isDueSoon: true
      };
      result.counters.complianceDueDate = input.effectiveDate || todayStr;
      result.counters.nextDueDate = input.effectiveDate || todayStr;
      result.counters.remainingDays = 0;
      result.counters.remainingFH = 0;
      result.counters.remainingFC = 0;
      result.counters.isDueSoon = true;

      // If aircraft flew after effective date without compliance -> OVERDUE
      if (input.effectiveDate && todayStr > input.effectiveDate) {
        result.counters.isOverdue = true;
        result.fixedDateLimit.isOverdue = true;
        result.fixedDateLimit.remainingDays = this.diffInDays(input.effectiveDate, todayStr);
        result.counters.remainingDays = result.fixedDateLimit.remainingDays;
      }

      result.explanation = 'Exigência mandatória de cumprimento antes do próximo voo (Before Further Flight).';
      result.structuredExplanation.requirementDescription = 'Before Further Flight';
      result.structuredExplanation.calculatedDueDescription = 'Immediate (0 FH / 0 FC / 0 Days)';
      result.structuredExplanation.controllingRule = 'BEFORE_FURTHER_FLIGHT';
      result.counters.controllingLimit = 'FIXED_DATE';
      result.counters.controllingReason = result.controllingReason;
      return result;
    }

    // 5.2 Calendar Calculation
    let calculatedDueDate: string | undefined = undefined;
    let calLimitValue: number | undefined = undefined;
    let calUnit: string | undefined = undefined;

    // Check interval calendar (repetitive)
    if (isRepetitiveCycle && interval) {
      if (interval.calendarInterval) {
        calLimitValue = interval.calendarInterval.value;
        calUnit = interval.calendarInterval.unit;
      } else if (interval.intervalDays) {
        calLimitValue = interval.intervalDays;
        calUnit = 'DAYS';
      } else if (interval.intervalWeeks) {
        calLimitValue = interval.intervalWeeks;
        calUnit = 'WEEKS';
      } else if (interval.intervalMonths) {
        calLimitValue = interval.intervalMonths;
        calUnit = 'MONTHS';
      } else if (interval.intervalYears) {
        calLimitValue = interval.intervalYears;
        calUnit = 'YEARS';
      } else if (interval.intervalType === 'CALENDAR_DAYS' && interval.intervalValue) {
        calLimitValue = interval.intervalValue;
        calUnit = 'DAYS';
      }

      if (calLimitValue && calUnit) {
        if (!referenceDate) {
          return this.failWithInsufficientData(
            result,
            'Missing reference date for repetitive calendar interval calculation (last compliance date not recorded).',
            'REPETITIVE_CALENDAR_MISSING_LAST_COMPLIANCE'
          );
        }
        calculatedDueDate = this.applyCalendarOffset(referenceDate, calLimitValue, calUnit);
      }
    } else if (threshold) {
      // Threshold calendar (initial)
      if (threshold.calendarLimit) {
        calLimitValue = threshold.calendarLimit.value;
        calUnit = threshold.calendarLimit.unit;
      } else if (threshold.thresholdType === 'CALENDAR_DAYS' && threshold.thresholdValue) {
        calLimitValue = threshold.thresholdValue;
        calUnit = 'DAYS';
      }

      if (calLimitValue && calUnit) {
        const baseDate = referenceDate || input.effectiveDate;
        if (!baseDate) {
          return this.failWithInsufficientData(
            result,
            'Missing reference date for threshold calendar calculation (effectiveDate or referenceEvent date required).',
            'THRESHOLD_CALENDAR_MISSING_REFERENCE_DATE'
          );
        }
        calculatedDueDate = this.applyCalendarOffset(baseDate, calLimitValue, calUnit);
      } else if (threshold.thresholdType === 'SPECIFIC_DATE' && threshold.thresholdDate) {
        calculatedDueDate = threshold.thresholdDate;
        calUnit = 'FIXED_DATE';
      }
    }

    if (calculatedDueDate) {
      const remDays = this.diffInDays(calculatedDueDate, todayStr);
      const isOverdue = remDays < 0;
      const isDueSoon = !isOverdue && remDays <= alertWindow.alertWindowDays!;

      result.calendarLimit = {
        dueDate: calculatedDueDate,
        remainingDays: remDays,
        isOverdue,
        isDueSoon,
        referenceDate,
        limitValue: calLimitValue,
        unit: calUnit
      };
      result.counters.complianceDueDate = calculatedDueDate;
      result.counters.nextDueDate = calculatedDueDate;
      result.counters.remainingDays = remDays;
      if (isOverdue) result.counters.isOverdue = true;
      if (isDueSoon) result.counters.isDueSoon = true;
    }

    // 5.3 Flight Hours (FH) Calculation
    let calculatedDueFH: number | undefined = undefined;
    let fhIntervalVal: number | undefined = undefined;

    if (isRepetitiveCycle && interval) {
      fhIntervalVal = interval.fhInterval?.value ?? interval.intervalFH ?? (interval.intervalType === 'FLIGHT_HOURS' ? interval.intervalValue : undefined);
      if (fhIntervalVal !== undefined) {
        if (referenceFH === undefined) {
          return this.failWithInsufficientData(
            result,
            'Missing reference flight hours for repetitive FH interval calculation (last compliance FH not recorded).',
            'REPETITIVE_FH_MISSING_LAST_COMPLIANCE'
          );
        }
        calculatedDueFH = referenceFH + fhIntervalVal;
      }
    } else if (threshold) {
      if (threshold.fhLimit) {
        if (threshold.fhLimit.isAccumulatedAirframe) {
          // Accumulated airframe hours: "before accumulating X flight hours"
          calculatedDueFH = threshold.fhLimit.value;
        } else {
          // Delta hours from reference: "within X flight hours after effective date / installation"
          const baseFH = referenceFH ?? 0;
          calculatedDueFH = baseFH + threshold.fhLimit.value;
        }
      } else if (threshold.thresholdType === 'FLIGHT_HOURS' && threshold.thresholdValue) {
        if (threshold.operator === 'BEFORE') {
          calculatedDueFH = threshold.thresholdValue; // total accumulated
        } else {
          const baseFH = referenceFH ?? 0;
          calculatedDueFH = baseFH + threshold.thresholdValue;
        }
      }
    }

    if (calculatedDueFH !== undefined) {
      const currentFH = input.currentAirframeFH;
      const remFH = currentFH !== undefined ? calculatedDueFH - currentFH : undefined;
      const isOverdue = remFH !== undefined && remFH < 0;
      const isDueSoon = remFH !== undefined && !isOverdue && remFH <= alertWindow.alertWindowFH!;

      result.flightHoursLimit = {
        dueFH: calculatedDueFH,
        remainingFH: remFH,
        isOverdue,
        isDueSoon,
        referenceFH,
        intervalFH: fhIntervalVal
      };
      result.counters.nextDueFH = calculatedDueFH;
      result.counters.remainingFH = remFH;
      if (isOverdue) result.counters.isOverdue = true;
      if (isDueSoon) result.counters.isDueSoon = true;
    }

    // 5.4 Flight Cycles (FC) Calculation
    let calculatedDueFC: number | undefined = undefined;
    let fcIntervalVal: number | undefined = undefined;

    if (isRepetitiveCycle && interval) {
      fcIntervalVal = interval.fcInterval?.value ?? interval.intervalFC ?? (interval.intervalType === 'FLIGHT_CYCLES' ? interval.intervalValue : undefined);
      if (fcIntervalVal !== undefined) {
        if (referenceFC === undefined) {
          return this.failWithInsufficientData(
            result,
            'Missing reference flight cycles for repetitive FC interval calculation (last compliance FC not recorded).',
            'REPETITIVE_FC_MISSING_LAST_COMPLIANCE'
          );
        }
        calculatedDueFC = referenceFC + fcIntervalVal;
      }
    } else if (threshold) {
      if (threshold.fcLimit) {
        if (threshold.fcLimit.isAccumulatedAirframe) {
          calculatedDueFC = threshold.fcLimit.value;
        } else {
          const baseFC = referenceFC ?? 0;
          calculatedDueFC = baseFC + threshold.fcLimit.value;
        }
      } else if (threshold.thresholdType === 'FLIGHT_CYCLES' && threshold.thresholdValue) {
        if (threshold.operator === 'BEFORE') {
          calculatedDueFC = threshold.thresholdValue;
        } else {
          const baseFC = referenceFC ?? 0;
          calculatedDueFC = baseFC + threshold.thresholdValue;
        }
      }
    }

    if (calculatedDueFC !== undefined) {
      const currentFC = input.currentAirframeFC;
      const remFC = currentFC !== undefined ? calculatedDueFC - currentFC : undefined;
      const isOverdue = remFC !== undefined && remFC < 0;
      const isDueSoon = remFC !== undefined && !isOverdue && remFC <= alertWindow.alertWindowFC!;

      result.flightCyclesLimit = {
        dueFC: calculatedDueFC,
        remainingFC: remFC,
        isOverdue,
        isDueSoon,
        referenceFC,
        intervalFC: fcIntervalVal
      };
      result.counters.nextDueFC = calculatedDueFC;
      result.counters.remainingFC = remFC;
      if (isOverdue) result.counters.isOverdue = true;
      if (isDueSoon) result.counters.isDueSoon = true;
    }

    // 5.5 No Later Than Upper Cap
    let noLaterThanDueDate: string | undefined = undefined;
    const nlt = threshold?.noLaterThanCalendar;
    if (nlt && referenceDate) {
      noLaterThanDueDate = this.applyCalendarOffset(referenceDate, nlt.value, nlt.unit);
      if (!calculatedDueDate || calculatedDueDate > noLaterThanDueDate) {
        calculatedDueDate = noLaterThanDueDate;
        const remDays = this.diffInDays(calculatedDueDate, todayStr);
        result.calendarLimit = {
          dueDate: calculatedDueDate,
          remainingDays: remDays,
          isOverdue: remDays < 0,
          isDueSoon: remDays >= 0 && remDays <= alertWindow.alertWindowDays!,
          referenceDate,
          limitValue: nlt.value,
          unit: nlt.unit
        };
        result.counters.complianceDueDate = calculatedDueDate;
        result.counters.nextDueDate = calculatedDueDate;
        result.counters.remainingDays = remDays;
      }
    }

    // -----------------------------------------------------------------------
    // CHECK 6: COMPOSITION & CONTROLLING LIMIT DETERMINATION
    // -----------------------------------------------------------------------
    const compositionOp: CompositionOperator = 
      threshold?.compositionOperator ?? 
      interval?.compositionOperator ?? 
      (threshold?.noLaterThanCalendar ? 'NO_LATER_THAN' : 'NONE');

    result.composition.operator = compositionOp;

    const availableLimits: Array<{ parameter: ControllingLimitType; due: string | number; remaining: number }> = [];
    if (result.calendarLimit?.remainingDays !== undefined) {
      availableLimits.push({ parameter: 'CALENDAR_DAYS', due: result.calendarLimit.dueDate!, remaining: result.calendarLimit.remainingDays });
    }
    if (result.flightHoursLimit?.remainingFH !== undefined) {
      availableLimits.push({ parameter: 'FLIGHT_HOURS', due: result.flightHoursLimit.dueFH!, remaining: result.flightHoursLimit.remainingFH });
    }
    if (result.flightCyclesLimit?.remainingFC !== undefined) {
      availableLimits.push({ parameter: 'FLIGHT_CYCLES', due: result.flightCyclesLimit.dueFC!, remaining: result.flightCyclesLimit.remainingFC });
    }

    result.composition.alternativeLimits = availableLimits.map(l => ({ parameter: l.parameter, due: l.due, remaining: l.remaining }));

    // Estimate remaining in normalized days for comparison when mixing FH/FC and Calendar
    const dailyFH = input.averageUtilizationRateFHPerDay || 5.0; // standard commercial narrowbody default: ~150 FH/mo
    const dailyFC = input.averageUtilizationRateFCPerDay || 2.0;

    const normalizedDaysList = availableLimits.map(l => {
      let normDays = 0;
      if (l.parameter === 'CALENDAR_DAYS') {
        normDays = l.remaining;
      } else if (l.parameter === 'FLIGHT_HOURS') {
        normDays = l.remaining / dailyFH;
      } else if (l.parameter === 'FLIGHT_CYCLES') {
        normDays = l.remaining / dailyFC;
      }
      return { parameter: l.parameter, due: l.due, remaining: l.remaining, normDays };
    });

    // Sort by projected occurrence
    normalizedDaysList.sort((a, b) => a.normDays - b.normDays);

    if (normalizedDaysList.length > 0) {
      const earliest = normalizedDaysList[0];
      const latest = normalizedDaysList[normalizedDaysList.length - 1];

      result.composition.earliestLimit = { parameter: earliest.parameter, value: earliest.due, remaining: earliest.remaining };
      result.composition.latestLimit = { parameter: latest.parameter, value: latest.due, remaining: latest.remaining };
      result.counters.earliestDue = { parameter: earliest.parameter, value: earliest.due };
      result.counters.latestDue = { parameter: latest.parameter, value: latest.due };

      if (compositionOp === 'WHICHEVER_OCCURS_FIRST' || compositionOp === 'OR') {
        result.controllingLimit = earliest.parameter;
        result.composition.triggeredBy = earliest.parameter;
        result.controllingReason = `Rule: '${compositionOp}'. Parameter '${earliest.parameter}' is the most restrictive/earliest limit (${earliest.due}).`;
      } else if (compositionOp === 'WHICHEVER_OCCURS_LATER' || compositionOp === 'AND') {
        result.controllingLimit = latest.parameter;
        result.composition.triggeredBy = latest.parameter;
        result.controllingReason = `Rule: '${compositionOp}'. Parameter '${latest.parameter}' is the latest limit (${latest.due}). Both conditions must be satisfied.`;
      } else if (compositionOp === 'NO_LATER_THAN') {
        // Upper bound calendar limit
        if (result.calendarLimit && result.flightHoursLimit) {
          if (result.calendarLimit.remainingDays <= (result.flightHoursLimit.remainingFH || 0) / dailyFH) {
            result.controllingLimit = 'CALENDAR_DAYS';
            result.controllingReason = `Rule: NO_LATER_THAN. Calendar upper ceiling (${result.calendarLimit.dueDate}) controls.`;
          } else {
            result.controllingLimit = 'FLIGHT_HOURS';
            result.controllingReason = `Rule: NO_LATER_THAN. Flight Hours (${result.flightHoursLimit.dueFH} FH) controls before calendar ceiling.`;
          }
        } else if (result.calendarLimit) {
          result.controllingLimit = 'CALENDAR_DAYS';
          result.controllingReason = `Calendar ceiling: ${result.calendarLimit.dueDate}`;
        } else if (result.flightHoursLimit) {
          result.controllingLimit = 'FLIGHT_HOURS';
          result.controllingReason = `Flight Hours: ${result.flightHoursLimit.dueFH} FH`;
        }
      } else {
        // Single limit fallback
        if (result.flightHoursLimit && !result.calendarLimit && !result.flightCyclesLimit) {
          result.controllingLimit = 'FLIGHT_HOURS';
          result.controllingReason = `Single constraint: ${result.flightHoursLimit.dueFH} FH`;
        } else if (result.calendarLimit && !result.flightHoursLimit && !result.flightCyclesLimit) {
          result.controllingLimit = 'CALENDAR_DAYS';
          result.controllingReason = `Single constraint: ${result.calendarLimit.dueDate}`;
        } else if (result.flightCyclesLimit && !result.calendarLimit && !result.flightHoursLimit) {
          result.controllingLimit = 'FLIGHT_CYCLES';
          result.controllingReason = `Single constraint: ${result.flightCyclesLimit.dueFC} FC`;
        } else {
          // Default to whichever occurs first when multiple limits exist without explicit operator
          result.controllingLimit = earliest.parameter;
          result.controllingReason = `Default conservative CAMO rule (Whichever Occurs First): '${earliest.parameter}' is earliest.`;
        }
      }
    }

    // -----------------------------------------------------------------------
    // CHECK 7: OVERDUE / DUE_SOON STATUS SYNCHRONIZATION
    // -----------------------------------------------------------------------
    // OVERDUE occurs if controlling limit is overdue, or under WHICHEVER_OCCURS_FIRST if ANY limit is overdue!
    if (compositionOp === 'WHICHEVER_OCCURS_FIRST' || compositionOp === 'OR') {
      const anyOverdue = (result.calendarLimit?.isOverdue ?? false) || 
                         (result.flightHoursLimit?.isOverdue ?? false) || 
                         (result.flightCyclesLimit?.isOverdue ?? false);
      result.counters.isOverdue = anyOverdue;
      if (anyOverdue) {
        result.counters.isDueSoon = false;
      }
    } else if (compositionOp === 'WHICHEVER_OCCURS_LATER' || compositionOp === 'AND') {
      const allOverdue = (!result.calendarLimit || result.calendarLimit.isOverdue) &&
                         (!result.flightHoursLimit || result.flightHoursLimit.isOverdue) &&
                         (!result.flightCyclesLimit || result.flightCyclesLimit.isOverdue);
      result.counters.isOverdue = allOverdue;
    }

    // -----------------------------------------------------------------------
    // CHECK 8: STRUCTURED EXPLAINABILITY
    // -----------------------------------------------------------------------
    result.counters.controllingLimit = result.controllingLimit;
    result.counters.controllingReason = result.controllingReason;

    let reqDesc = '';
    if (threshold?.description) reqDesc += `Threshold: ${threshold.description}. `;
    if (interval?.description) reqDesc += `Interval: ${interval.description}. `;
    if (!reqDesc) reqDesc = `Threshold: ${calLimitValue ?? ''} ${calUnit ?? ''} ${fhIntervalVal ? fhIntervalVal + ' FH' : ''} ${fcIntervalVal ? fcIntervalVal + ' FC' : ''}`;

    let dueDesc = '';
    if (result.calendarLimit) dueDesc += `Date Due: ${result.calendarLimit.dueDate}. `;
    if (result.flightHoursLimit) dueDesc += `FH Due: ${result.flightHoursLimit.dueFH} FH. `;
    if (result.flightCyclesLimit) dueDesc += `FC Due: ${result.flightCyclesLimit.dueFC} FC. `;

    let remDesc = '';
    if (result.calendarLimit) remDesc += `Remaining: ${result.calendarLimit.remainingDays} days. `;
    if (result.flightHoursLimit) remDesc += `Remaining: ${result.flightHoursLimit.remainingFH} FH. `;
    if (result.flightCyclesLimit) remDesc += `Remaining: ${result.flightCyclesLimit.remainingFC} FC. `;

    result.structuredExplanation = {
      referenceDescription: referenceDescription || 'Default Reference',
      requirementDescription: reqDesc.trim(),
      currentStatusDescription: `Airframe as of ${todayStr}: ${input.currentAirframeFH ?? 'N/A'} FH, ${input.currentAirframeFC ?? 'N/A'} FC`,
      calculatedDueDescription: dueDesc.trim(),
      remainingDescription: remDesc.trim(),
      controllingRule: result.controllingReason,
      summary: `Controlling Limit: ${result.controllingLimit} (${result.controllingReason}). Overdue: ${result.counters.isOverdue ? 'YES' : 'NO'}, Due Soon: ${result.counters.isDueSoon ? 'YES' : 'NO'}.`
    };

    result.explanation = result.structuredExplanation.summary;
    result.counters.calculationExplanation = result.structuredExplanation;
    result.audit.ruleApplied = result.controllingReason;

    return result;
  }

  // =========================================================================
  // 4. NATURAL LANGUAGE AD THRESHOLD & INTERVAL PARSER (Adversarial Engine)
  // =========================================================================

  /**
   * Parses standard and complex FAA / EASA AD compliance text into structured configurations
   */
  public parseAdRequirementText(text: string): {
    threshold: ObligationThresholdConfig;
    interval?: ObligationIntervalConfig;
    canBeRepresentedSafely: boolean;
    unsupportedReason?: string;
  } {
    const lower = text.toLowerCase().trim();
    const threshold: ObligationThresholdConfig = {
      description: text
    };
    let interval: ObligationIntervalConfig | undefined = undefined;
    let canBeRepresentedSafely = true;
    let unsupportedReason: string | undefined = undefined;

    // 1. Detect Composition Operators
    if (lower.includes('whichever occurs first') || lower.includes('whichever occurs earlier')) {
      threshold.compositionOperator = 'WHICHEVER_OCCURS_FIRST';
    } else if (lower.includes('whichever occurs later')) {
      threshold.compositionOperator = 'WHICHEVER_OCCURS_LATER';
    } else if (lower.includes(', but no later than') || lower.includes('no later than')) {
      threshold.compositionOperator = 'NO_LATER_THAN';
    } else if (lower.includes(' and ')) {
      threshold.compositionOperator = 'AND';
    } else if (lower.includes(' or ')) {
      threshold.compositionOperator = 'OR';
    }

    // 2. Detect Reference Event
    if (lower.includes('after the effective date') || lower.includes('from the effective date')) {
      threshold.referenceEvent = 'EFFECTIVE_DATE';
      threshold.operator = 'AFTER';
    } else if (lower.includes('after the last inspection') || lower.includes('since last inspection') || lower.includes('since the last')) {
      threshold.referenceEvent = 'LAST_COMPLIANCE';
      threshold.operator = 'AFTER';
    } else if (lower.includes('after installation') || lower.includes('following installation')) {
      threshold.referenceEvent = 'COMPONENT_INSTALLATION';
      threshold.operator = 'AFTER';
    } else if (lower.includes('following the event') || lower.includes('after the event')) {
      threshold.referenceEvent = 'EVENT_DATE';
      threshold.operator = 'FOLLOWING';
    } else if (lower.includes('at the next scheduled inspection') || lower.includes('at the next maintenance check')) {
      threshold.referenceEvent = 'NEXT_SCHEDULED_INSPECTION';
      threshold.operator = 'AT';
    }

    // 3. Detect "Before Further Flight"
    if (lower.includes('before further flight') || lower.includes('prior to further flight')) {
      threshold.thresholdType = 'BEFORE_FURTHER_FLIGHT';
      threshold.operator = 'BEFORE';
      return { threshold, canBeRepresentedSafely: true };
    }

    // 4. Extract Flight Hours
    const fhMatch = lower.match(/(?:within|accumulating|exceeding)?\s*([0-9,.]+)\s*(?:flight\s*hours|fh|hours\s*time-in-service|tis)/);
    if (fhMatch) {
      const val = parseFloat(fhMatch[1].replace(/,/g, ''));
      const isAccumulated = lower.includes('before accumulating') || lower.includes('prior to accumulating');
      threshold.fhLimit = {
        value: val,
        operator: isAccumulated ? 'BEFORE' : 'WITHIN',
        isAccumulatedAirframe: isAccumulated
      };
      if (!threshold.thresholdType) {
        threshold.thresholdType = 'FLIGHT_HOURS';
        threshold.thresholdValue = val;
      }
    }

    // 5. Extract Flight Cycles
    const fcMatch = lower.match(/(?:within|accumulating|exceeding)?\s*([0-9,.]+)\s*(?:flight\s*cycles|fc|cycles)/);
    if (fcMatch) {
      const val = parseFloat(fcMatch[1].replace(/,/g, ''));
      const isAccumulated = lower.includes('before accumulating') || lower.includes('prior to accumulating');
      threshold.fcLimit = {
        value: val,
        operator: isAccumulated ? 'BEFORE' : 'WITHIN',
        isAccumulatedAirframe: isAccumulated
      };
      if (!threshold.thresholdType) {
        threshold.thresholdType = 'FLIGHT_CYCLES';
        threshold.thresholdValue = val;
      }
    }

    // 6. Extract Calendar Days / Weeks / Months / Years
    const calMatch = lower.match(/(?:within|prior to|before)?\s*([0-9,.]+)\s*(calendar\s*days|days|weeks|months|years)/);
    if (calMatch) {
      const val = parseFloat(calMatch[1].replace(/,/g, ''));
      const rawUnit = calMatch[2];
      let unit: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS' = 'DAYS';
      if (rawUnit.includes('week')) unit = 'WEEKS';
      else if (rawUnit.includes('month')) unit = 'MONTHS';
      else if (rawUnit.includes('year')) unit = 'YEARS';

      threshold.calendarLimit = {
        value: val,
        unit: unit,
        operator: 'WITHIN'
      };
      if (!threshold.thresholdType) {
        threshold.thresholdType = 'CALENDAR_DAYS';
        threshold.thresholdValue = unit === 'DAYS' ? val : (unit === 'WEEKS' ? val * 7 : val * 30);
      }
    }

    // 7. Extract Fixed Dates e.g. "before 31 December 2027" or "before 2027-12-31"
    const fixedIsoMatch = lower.match(/(?:before|no later than|by)\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    if (fixedIsoMatch) {
      threshold.thresholdType = 'SPECIFIC_DATE';
      threshold.thresholdDate = fixedIsoMatch[1];
      threshold.operator = 'BEFORE';
    } else {
      const fixedTextMatch = lower.match(/(?:before|no later than|by)\s*([0-9]{1,2})\s+([a-z]+)\s+([0-9]{4})/);
      if (fixedTextMatch) {
        const monthsMap: Record<string, string> = {
          january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
          july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
        };
        const day = fixedTextMatch[1].padStart(2, '0');
        const month = monthsMap[fixedTextMatch[2]];
        const year = fixedTextMatch[3];
        if (month) {
          threshold.thresholdType = 'SPECIFIC_DATE';
          threshold.thresholdDate = `${year}-${month}-${day}`;
          threshold.operator = 'BEFORE';
        }
      }
    }

    // 8. Extract "No Later Than" Upper Bound
    const nltMatch = lower.match(/no later than\s*([0-9]+)\s*(months|years|days)/);
    if (nltMatch) {
      const val = parseInt(nltMatch[1], 10);
      const rawUnit = nltMatch[2];
      let unit: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS' = 'MONTHS';
      if (rawUnit.includes('day')) unit = 'DAYS';
      else if (rawUnit.includes('year')) unit = 'YEARS';

      threshold.noLaterThanCalendar = {
        value: val,
        unit: unit,
        operator: 'NO_LATER_THAN'
      };
      threshold.compositionOperator = 'NO_LATER_THAN';
    }

    // 9. Extract Repetitive Intervals (e.g. "repeat every 500 FH", "at intervals not to exceed 12 months")
    if (lower.includes('repeat') || lower.includes('repetitive') || lower.includes('intervals not to exceed') || lower.includes('every ')) {
      interval = {
        isRepetitive: true,
        description: text
      };
      const repFh = lower.match(/(?:every|not to exceed|interval of)\s*([0-9,.]+)\s*(?:flight\s*hours|fh)/);
      if (repFh) {
        const val = parseFloat(repFh[1].replace(/,/g, ''));
        interval.intervalType = 'FLIGHT_HOURS';
        interval.intervalValue = val;
        interval.fhInterval = { value: val };
      }
      const repCal = lower.match(/(?:every|not to exceed|interval of)\s*([0-9,.]+)\s*(calendar\s*days|days|weeks|months|years)/);
      if (repCal) {
        const val = parseFloat(repCal[1].replace(/,/g, ''));
        const rawUnit = repCal[2];
        let unit: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS' = 'DAYS';
        if (rawUnit.includes('week')) unit = 'WEEKS';
        else if (rawUnit.includes('month')) unit = 'MONTHS';
        else if (rawUnit.includes('year')) unit = 'YEARS';
        interval.calendarInterval = { value: val, unit, operator: 'WITHIN' };
        if (!interval.intervalType) {
          interval.intervalType = 'CALENDAR_DAYS';
          interval.intervalValue = unit === 'DAYS' ? val : (unit === 'WEEKS' ? val * 7 : val * 30);
        }
      }
      if (threshold.compositionOperator) {
        interval.compositionOperator = threshold.compositionOperator;
      }
    }

    // 10. Check if ambiguous or un-representable safely
    if (lower.includes('next scheduled inspection') && !threshold.referenceEvent) {
      canBeRepresentedSafely = false;
      unsupportedReason = "Requisito 'at the next scheduled inspection' exige data de inspeção futura que não está programada no sistema.";
    }

    return {
      threshold,
      interval,
      canBeRepresentedSafely,
      unsupportedReason
    };
  }

  // =========================================================================
  // 5. HELPER METHODS FOR FAIL-SAFE RETURNS
  // =========================================================================

  private applyCalendarOffset(baseDate: string, value: number, unit: string): string {
    switch (unit) {
      case 'DAYS':
        return this.addDays(baseDate, value);
      case 'WEEKS':
        return this.addWeeks(baseDate, value);
      case 'MONTHS':
        return this.addMonths(baseDate, value);
      case 'YEARS':
        return this.addYears(baseDate, value);
      case 'FIXED_DATE':
        return baseDate;
      default:
        return this.addDays(baseDate, value);
    }
  }

  private failWithDataIntegrity(
    result: DueDateCalculationResult,
    reason: string,
    rule: string
  ): DueDateCalculationResult {
    result.calculationStatus = 'DATA_INTEGRITY_REVIEW';
    result.controllingLimit = 'NONE';
    result.controllingReason = `Data Integrity Violation: ${reason}`;
    result.reviewRequired = true;
    result.reviewReason = reason;
    result.explanation = `FALHA DE INTEGRIDADE DE DADOS: ${reason}. Ação manual de revisão exigida.`;
    result.structuredExplanation.controllingRule = rule;
    result.structuredExplanation.summary = result.explanation;
    result.counters.calculationStatus = 'DATA_INTEGRITY_REVIEW';
    result.counters.controllingLimit = 'NONE';
    result.counters.controllingReason = result.controllingReason;
    result.audit.ruleApplied = rule;
    return result;
  }

  private failWithInsufficientData(
    result: DueDateCalculationResult,
    reason: string,
    rule: string
  ): DueDateCalculationResult {
    result.calculationStatus = 'INSUFFICIENT_DATA';
    result.controllingLimit = 'NONE';
    result.controllingReason = `Insufficient Data: ${reason}`;
    result.reviewRequired = true;
    result.reviewReason = reason;
    result.explanation = `DADOS INSUFICIENTES: ${reason}. O sistema não infere dados regulatórios ausentes.`;
    result.structuredExplanation.controllingRule = rule;
    result.structuredExplanation.summary = result.explanation;
    result.counters.calculationStatus = 'INSUFFICIENT_DATA';
    result.counters.controllingLimit = 'NONE';
    result.counters.controllingReason = result.controllingReason;
    result.audit.ruleApplied = rule;
    return result;
  }
}

export const dueDateThresholdEngine = DueDateThresholdEngine.getInstance();
