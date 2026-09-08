/**
 * CAMO PHASE 6.2 — DUE DATE & THRESHOLD ENGINE TEST SUITE
 * Comprehensive, Deterministic, and Adversarial Validation
 */

import { dueDateThresholdEngine } from './camoEngine/dueDateThresholdEngine';
import { complianceObligationService } from './camoEngine/complianceObligationService';
import { camoDb } from './dataStore';

export async function runPhase62ValidationSuite() {
  console.log('========================================================================');
  console.log('CAMO PHASE 6.2 — DETERMINISTIC DUE DATE & THRESHOLD ENGINE VALIDATION');
  console.log('========================================================================\n');

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
  // GROUP 1: CALENDAR ARITHMETIC & LEAP YEAR CORNER CASES
  // ==========================================================================
  console.log('--- TEST GROUP 1: EXACT CALENDAR ARITHMETIC ---');

  // Test 1.1: Exact month addition on 31-day months (Jan 31 + 1 month in non-leap year)
  const feb2025 = dueDateThresholdEngine.addMonths('2025-01-31', 1);
  assert(feb2025 === '2025-02-28', 'T1.1 Month Addition Cap Non-Leap', `Jan 31 + 1 mo = ${feb2025} (expected 2025-02-28)`);

  // Test 1.2: Leap year month addition (Jan 31 + 1 month in 2024 leap year)
  const feb2024 = dueDateThresholdEngine.addMonths('2024-01-31', 1);
  assert(feb2024 === '2024-02-29', 'T1.2 Month Addition Cap Leap Year', `Jan 31 2024 + 1 mo = ${feb2024} (expected 2024-02-29)`);

  // Test 1.3: 31st to 30th day month addition (Mar 31 + 1 month -> Apr 30)
  const apr30 = dueDateThresholdEngine.addMonths('2026-03-31', 1);
  assert(apr30 === '2026-04-30', 'T1.3 Month Addition to 30-Day Month', `Mar 31 + 1 mo = ${apr30} (expected 2026-04-30)`);

  // Test 1.4: Leap year addition (Feb 29 2024 + 1 year -> Feb 28 2025)
  const feb28_2025 = dueDateThresholdEngine.addYears('2024-02-29', 1);
  assert(feb28_2025 === '2025-02-28', 'T1.4 Leap Day + 1 Year', `Feb 29 2024 + 1 yr = ${feb28_2025} (expected 2025-02-28)`);

  // Test 1.5: Difference in days
  const diffDays = dueDateThresholdEngine.diffInDays('2026-09-10', '2026-09-03');
  assert(diffDays === 7, 'T1.5 Calendar Day Difference', `Diff 2026-09-10 to 2026-09-03 = ${diffDays} days (expected 7)`);

  // ==========================================================================
  // GROUP 2: CALENDAR-BASED COMPLIANCE LIMITS
  // ==========================================================================
  console.log('\n--- TEST GROUP 2: CALENDAR COMPLIANCE LIMITS ---');

  // Test 2.1: Within 30 days after effective date
  const res21 = dueDateThresholdEngine.calculateDue({
    effectiveDate: '2026-08-01',
    currentDate: '2026-08-15',
    threshold: {
      calendarLimit: { value: 30, unit: 'DAYS', operator: 'WITHIN' },
      referenceEvent: 'EFFECTIVE_DATE'
    }
  });
  assert(res21.calendarLimit?.dueDate === '2026-08-31', 'T2.1 30 Days Due Date', `Due: ${res21.calendarLimit?.dueDate}`);
  assert(res21.calendarLimit?.remainingDays === 16, 'T2.1 Remaining Days', `Remaining: ${res21.calendarLimit?.remainingDays}`);
  assert(res21.counters.isDueSoon === true, 'T2.1 Due Soon in 30d Window', `DueSoon: ${res21.counters.isDueSoon}`);
  assert(res21.counters.isOverdue === false, 'T2.1 Not Overdue', `Overdue: ${res21.counters.isOverdue}`);

  // Test 2.2: Within 6 months after effective date
  const res22 = dueDateThresholdEngine.calculateDue({
    effectiveDate: '2026-01-15',
    currentDate: '2026-09-03',
    threshold: {
      calendarLimit: { value: 6, unit: 'MONTHS', operator: 'WITHIN' },
      referenceEvent: 'EFFECTIVE_DATE'
    }
  });
  assert(res22.calendarLimit?.dueDate === '2026-07-15', 'T2.2 6 Months Due Date', `Due: ${res22.calendarLimit?.dueDate}`);
  assert(res22.counters.isOverdue === true, 'T2.2 Overdue Detection', `Overdue: ${res22.counters.isOverdue}`);
  assert(res22.calendarLimit?.remainingDays! < 0, 'T2.2 Negative Remaining Days', `Remaining: ${res22.calendarLimit?.remainingDays}`);

  // ==========================================================================
  // GROUP 3: FLIGHT HOURS & FLIGHT CYCLES LIMITS
  // ==========================================================================
  console.log('\n--- TEST GROUP 3: FLIGHT HOURS & FLIGHT CYCLES LIMITS ---');

  // Test 3.1: Before accumulating 5,000 flight hours (accumulated airframe)
  const res31 = dueDateThresholdEngine.calculateDue({
    currentAirframeFH: 4850,
    currentAirframeFC: 2100,
    threshold: {
      fhLimit: { value: 5000, isAccumulatedAirframe: true, operator: 'BEFORE' }
    }
  });
  assert(res31.flightHoursLimit?.dueFH === 5000, 'T3.1 Accumulated FH Limit', `Due FH: ${res31.flightHoursLimit?.dueFH}`);
  assert(res31.flightHoursLimit?.remainingFH === 150, 'T3.1 Remaining FH', `Remaining FH: ${res31.flightHoursLimit?.remainingFH}`);
  assert(res31.controllingLimit === 'FLIGHT_HOURS', 'T3.1 Controlling Limit', `Controlling: ${res31.controllingLimit}`);

  // Test 3.2: Within 300 flight cycles after effective date (delta from installation/reference)
  const res32 = dueDateThresholdEngine.calculateDue({
    currentAirframeFC: 1650,
    threshold: {
      fcLimit: { value: 300, isAccumulatedAirframe: false, operator: 'WITHIN' },
      referenceEvent: 'COMPONENT_INSTALLATION'
    },
    componentInstallationFC: 1400
  });
  assert(res32.flightCyclesLimit?.dueFC === 1700, 'T3.2 FC Delta Limit', `Due FC: 1400 + 300 = ${res32.flightCyclesLimit?.dueFC}`);
  assert(res32.flightCyclesLimit?.remainingFC === 50, 'T3.2 Remaining FC', `Remaining FC: ${res32.flightCyclesLimit?.remainingFC}`);
  assert(res32.counters.isDueSoon === true, 'T3.2 FC Due Soon Flag', `DueSoon: ${res32.counters.isDueSoon}`);

  // ==========================================================================
  // GROUP 4: COMPOSITION OPERATORS (WHICHEVER OCCURS FIRST, AND, NO LATER THAN)
  // ==========================================================================
  console.log('\n--- TEST GROUP 4: COMPOSITION OPERATORS ---');

  // Test 4.1: 500 FH or 12 months, whichever occurs first (Calendar occurs first)
  const res41 = dueDateThresholdEngine.calculateDue({
    effectiveDate: '2026-01-01',
    currentDate: '2026-11-01',
    currentAirframeFH: 5100,
    threshold: {
      fhLimit: { value: 500, isAccumulatedAirframe: false },
      calendarLimit: { value: 12, unit: 'MONTHS' },
      compositionOperator: 'WHICHEVER_OCCURS_FIRST',
      referenceEvent: 'EFFECTIVE_DATE'
    },
    customReferenceFH: 5000, // so due FH = 5500, rem = 400 FH (~80 days at 5 FH/day)
    averageUtilizationRateFHPerDay: 2.0 // at 2 FH/day, 400 FH takes 200 days. Calendar due is 2027-01-01 (61 days).
  });
  assert(res41.composition.operator === 'WHICHEVER_OCCURS_FIRST', 'T4.1 Operator Recorded', `Op: ${res41.composition.operator}`);
  assert(res41.controllingLimit === 'CALENDAR_DAYS', 'T4.1 Controlling Limit Calendar First', `Controlling: ${res41.controllingLimit}`);
  assert(res41.composition.earliestLimit?.parameter === 'CALENDAR_DAYS', 'T4.1 Earliest Parameter', `Earliest: ${res41.composition.earliestLimit?.parameter}`);

  // Test 4.2: 500 FH or 12 months, whichever occurs first (FH occurs first / overdue)
  const res42 = dueDateThresholdEngine.calculateDue({
    effectiveDate: '2026-01-01',
    currentDate: '2026-04-01', // Calendar remaining is 9 months (~270 days)
    currentAirframeFH: 5550,   // reference was 5000, limit was 500 FH -> due at 5500 FH -> OVERDUE by 50 FH
    threshold: {
      fhLimit: { value: 500, isAccumulatedAirframe: false },
      calendarLimit: { value: 12, unit: 'MONTHS' },
      compositionOperator: 'WHICHEVER_OCCURS_FIRST',
      referenceEvent: 'EFFECTIVE_DATE'
    },
    customReferenceFH: 5000
  });
  assert(res42.flightHoursLimit?.isOverdue === true, 'T4.2 FH Overdue', `FH Overdue: ${res42.flightHoursLimit?.isOverdue}`);
  assert(res42.counters.isOverdue === true, 'T4.2 Obligation Overdue Under First Rule', `Obligation Overdue: ${res42.counters.isOverdue}`);

  // Test 4.3: NO_LATER_THAN upper ceiling (Within 600 FH, but no later than 24 months)
  const res43 = dueDateThresholdEngine.calculateDue({
    effectiveDate: '2025-01-01',
    currentDate: '2026-09-03',
    currentAirframeFH: 2200,
    threshold: {
      fhLimit: { value: 600, isAccumulatedAirframe: false },
      noLaterThanCalendar: { value: 24, unit: 'MONTHS', operator: 'NO_LATER_THAN' },
      compositionOperator: 'NO_LATER_THAN',
      referenceEvent: 'EFFECTIVE_DATE'
    },
    customReferenceFH: 2000
  });
  assert(res43.calendarLimit?.dueDate === '2027-01-01', 'T4.3 No Later Than Ceiling', `Ceiling: ${res43.calendarLimit?.dueDate}`);
  assert(res43.flightHoursLimit?.dueFH === 2600, 'T4.3 Flight Hours Due', `Due FH: ${res43.flightHoursLimit?.dueFH}`);

  // ==========================================================================
  // GROUP 5: REPETITIVE INTERVALS & TERMINATING ACTIONS
  // ==========================================================================
  console.log('\n--- TEST GROUP 5: REPETITIVE INTERVALS & TERMINATING ACTION ---');

  // Test 5.1: Repetitive interval of 500 FH
  const res51 = dueDateThresholdEngine.calculateDue({
    currentAirframeFH: 6200,
    lastComplianceDate: '2026-03-01',
    lastComplianceFH: 6000,
    lastComplianceFC: 2500,
    interval: {
      isRepetitive: true,
      intervalType: 'FLIGHT_HOURS',
      intervalFH: 500
    }
  });
  assert(res51.flightHoursLimit?.dueFH === 6500, 'T5.1 Repetitive FH Due', `6000 + 500 = ${res51.flightHoursLimit?.dueFH}`);
  assert(res51.flightHoursLimit?.remainingFH === 300, 'T5.1 Repetitive Remaining FH', `Remaining: ${res51.flightHoursLimit?.remainingFH}`);
  assert(res51.reference.event === 'LAST_COMPLIANCE', 'T5.1 Reference Event Last Compliance', `Ref: ${res51.reference.event}`);

  // Test 5.2: Terminating Action Accomplished
  const res52 = dueDateThresholdEngine.calculateDue({
    isTerminated: true,
    interval: { isRepetitive: true, intervalFH: 500 }
  });
  assert(res52.calculationStatus === 'TERMINATED', 'T5.2 Status Terminated', `Status: ${res52.calculationStatus}`);
  assert(res52.controllingLimit === 'NONE', 'T5.2 Controlling Limit None', `Controlling: ${res52.controllingLimit}`);
  assert(res52.counters.isOverdue === false, 'T5.2 Terminated is never overdue', `Overdue: ${res52.counters.isOverdue}`);

  // ==========================================================================
  // GROUP 6: DATA INTEGRITY & AUDIT GUARDRAILS (NO SILENT GUESSING)
  // ==========================================================================
  console.log('\n--- TEST GROUP 6: DATA INTEGRITY & AUDIT GUARDRAILS ---');

  // Test 6.1: Counter rollback detection (currentFH < lastComplianceFH)
  const res61 = dueDateThresholdEngine.calculateDue({
    currentAirframeFH: 4500,
    lastComplianceFH: 4800,
    interval: { isRepetitive: true, intervalFH: 500 }
  });
  assert(res61.calculationStatus === 'DATA_INTEGRITY_REVIEW', 'T6.1 Counter Rollback Status', `Status: ${res61.calculationStatus}`);
  assert(res61.reviewRequired === true, 'T6.1 Review Required Flag', `ReviewRequired: ${res61.reviewRequired}`);
  assert(res61.reviewReason?.includes('Rollback de horímetro') === true, 'T6.1 Rollback Reason Stated', `Reason: ${res61.reviewReason}`);

  // Test 6.2: Negative airframe counters
  const res62 = dueDateThresholdEngine.calculateDue({
    currentAirframeFH: -10,
    threshold: { thresholdValue: 500, thresholdType: 'FLIGHT_HOURS' }
  });
  assert(res62.calculationStatus === 'DATA_INTEGRITY_REVIEW', 'T6.2 Negative Counter Status', `Status: ${res62.calculationStatus}`);

  // Test 6.3: Zero or negative repetitive interval
  const res63 = dueDateThresholdEngine.calculateDue({
    lastComplianceFH: 3000,
    currentAirframeFH: 3100,
    interval: { isRepetitive: true, intervalFH: -50 }
  });
  assert(res63.calculationStatus === 'DATA_INTEGRITY_REVIEW', 'T6.3 Negative Interval Status', `Status: ${res63.calculationStatus}`);

  // Test 6.4: Missing mandatory reference date (Zero fabrication)
  const res64 = dueDateThresholdEngine.calculateDue({
    threshold: {
      calendarLimit: { value: 60, unit: 'DAYS' },
      referenceEvent: 'EFFECTIVE_DATE'
    },
    effectiveDate: null // missing!
  });
  assert(res64.calculationStatus === 'INSUFFICIENT_DATA', 'T6.4 Missing Reference Status', `Status: ${res64.calculationStatus}`);
  assert(res64.reviewRequired === true, 'T6.4 Missing Reference Requires Review', `ReviewRequired: ${res64.reviewRequired}`);

  // Test 6.5: Cryptographic audit hash generation
  const hash1 = dueDateThresholdEngine.generateCalculationHash({ currentAirframeFH: 5000, effectiveDate: '2026-01-01' });
  const hash2 = dueDateThresholdEngine.generateCalculationHash({ currentAirframeFH: 5000, effectiveDate: '2026-01-01' });
  const hash3 = dueDateThresholdEngine.generateCalculationHash({ currentAirframeFH: 5001, effectiveDate: '2026-01-01' });
  assert(hash1 === hash2, 'T6.5 Deterministic Hash Reproducibility', `Hash1 == Hash2: ${hash1}`);
  assert(hash1 !== hash3, 'T6.5 Hash Sensitivity to Changes', `Hash1 != Hash3 (${hash1} vs ${hash3})`);

  // ==========================================================================
  // GROUP 7: REGULATORY DIRECTIVE TEXT PARSER
  // ==========================================================================
  console.log('\n--- TEST GROUP 7: AD REGULATORY TEXT PARSER ---');

  // Test 7.1: Parse "Within 500 flight hours or 12 months after the effective date, whichever occurs first"
  const parse71 = dueDateThresholdEngine.parseAdRequirementText(
    'Within 500 flight hours or 12 months after the effective date, whichever occurs first'
  );
  assert(parse71.threshold.compositionOperator === 'WHICHEVER_OCCURS_FIRST', 'T7.1 Parsed Composition Operator', `Op: ${parse71.threshold.compositionOperator}`);
  assert(parse71.threshold.fhLimit?.value === 500, 'T7.1 Parsed FH', `FH: ${parse71.threshold.fhLimit?.value}`);
  assert(parse71.threshold.calendarLimit?.value === 12 && parse71.threshold.calendarLimit.unit === 'MONTHS', 'T7.1 Parsed Calendar', `Cal: ${parse71.threshold.calendarLimit?.value} ${parse71.threshold.calendarLimit?.unit}`);
  assert(parse71.threshold.referenceEvent === 'EFFECTIVE_DATE', 'T7.1 Parsed Reference', `Ref: ${parse71.threshold.referenceEvent}`);

  // Test 7.2: Parse "Before accumulating 5,000 flight hours, and repeat every 500 FH"
  const parse72 = dueDateThresholdEngine.parseAdRequirementText(
    'Before accumulating 5,000 flight hours, and repeat every 500 flight hours thereafter'
  );
  assert(parse72.threshold.fhLimit?.isAccumulatedAirframe === true, 'T7.2 Accumulated Airframe', `Accumulated: ${parse72.threshold.fhLimit?.isAccumulatedAirframe}`);
  assert(parse72.interval?.isRepetitive === true, 'T7.2 Repetitive Flag', `Repetitive: ${parse72.interval?.isRepetitive}`);
  assert(parse72.interval?.fhInterval?.value === 500, 'T7.2 Repetitive Interval FH', `Interval FH: ${parse72.interval?.fhInterval?.value}`);

  // Test 7.3: Parse "Prior to further flight"
  const parse73 = dueDateThresholdEngine.parseAdRequirementText('Prior to further flight, inspect the rudder pedal mechanism');
  assert(parse73.threshold.thresholdType === 'BEFORE_FURTHER_FLIGHT', 'T7.3 Before Further Flight', `Type: ${parse73.threshold.thresholdType}`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('========================================================================');

  return { totalTests, passedTests, failedTests, success: failedTests === 0 };
}

// Auto-run if executed directly via tsx
if (process.argv[1]?.includes('testPhase62DueDateEngine')) {
  runPhase62ValidationSuite().then(res => {
    if (!res.success) {
      process.exit(1);
    }
  });
}
