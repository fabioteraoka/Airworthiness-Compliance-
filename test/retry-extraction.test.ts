import { describe, it, expect, beforeEach } from 'vitest';
import { camoDb } from '../server/dataStore';
import { parseAdSafelyWithoutFabrication } from '../server/geminiService';
import { evaluateComplianceRequirement } from '../server/ruleEngine';
import { ComplianceRequirement } from '../src/types';

describe('CAMO Compliance Requirement — Retry Extraction Pipeline', () => {
  beforeEach(() => {
    // Ensure clean state
    camoDb.getState();
  });

  it('successfully parses and enriches AD 2024-12-05 regulatory text without hallucination', () => {
    const rawAdText = `DEPARTMENT OF TRANSPORTATION
Federal Aviation Administration
14 CFR Part 39 [Docket No. FAA-2024-1205; Project Identifier MCAI-2024-00120-T; Amendment 39-22780; AD 2024-12-05]
RIN 2120-AA64
Airworthiness Directives; The Boeing Company Model 737-700, 737-800, 737-900, and 737-900ER Series Airplanes

Applicability:
This AD applies to The Boeing Company Model 737-700, 737-800, 737-900, and 737-900ER series airplanes, certificated in any category, having elevator tab pushrod P/N 12345-01 or 12345-02 with serial numbers between 400000 and 500000 installed.

Unsafe Condition:
This AD was prompted by reports of excessive play and fatigue cracking in the elevator tab pushrod assembly bushings.

Compliance:
Comply with this AD within the compliance times specified, unless already done.
(g) Repetitive Inspections: Within 500 flight hours or 6 months after the effective date of this AD, whichever occurs first, perform a detailed visual inspection (DVI) and ultrasonic inspection of the elevator tab pushrod assembly for cracking or excessive play in accordance with Boeing Alert Service Bulletin B737-27A1305. Repeat the inspections thereafter at intervals not to exceed 500 flight hours or 12 calendar months.
(h) Corrective Action / Replacement: If any cracking or play exceeding 0.015 inches is found during any inspection required by paragraph (g) of this AD, before further flight, replace the pushrod assembly with approved terminating part P/N 98765-02.
(i) Terminating Action: Installation of redesigned elevator tab pushrod assembly P/N 98765-02 terminating part terminates the repetitive inspection requirements of this AD.`;

    const extracted = parseAdSafelyWithoutFabrication(rawAdText, 'FAA_AD_2024-12-05.pdf');

    expect(extracted).toBeDefined();
    expect(extracted.sourceNumber).toContain('2024-12-05');
    expect(extracted.issuingAuthority).toBe('FAA');
    expect(extracted.aircraftManufacturers).toContain('Boeing');
    expect(extracted.aircraftModels).toContain('737-800');
    expect(extracted.componentPartNumbers).toContain('12345-01');
    expect(extracted.componentPartNumbers).toContain('12345-02');
    expect(extracted.actions.length).toBeGreaterThan(0);
    expect(extracted.documentProcessingStatus).toBe('EXTRACTED');
    expect(extracted.extractionStatus).toBe('SUCCESS');
  });

  it('verifies that state.requirements has sourceDocument populated and ready for re-extraction', () => {
    const state = camoDb.getState();
    const ad2024 = state.requirements.find(r => r.sourceNumber?.includes('2024-12-05'));
    expect(ad2024).toBeDefined();
    expect(ad2024?.sourceDocument).toBeDefined();
    expect(ad2024?.sourceDocument?.rawExtractedText).toBeDefined();
    expect(ad2024?.sourceDocument?.rawExtractedText?.length).toBeGreaterThan(50);
  });

  it('demonstrates that a requirement with no initial bytes can be reconstructed from requirement fields', () => {
    const bareRequirement: ComplianceRequirement = {
      id: 'req-bare-ad-01',
      sourceType: 'AD',
      sourceNumber: 'FAA AD 2024-12-05',
      revision: 'Original',
      title: 'Elevator Tab Pushrod Repetitive Inspection',
      issuingAuthority: 'FAA',
      issueDate: '2024-06-10',
      effectiveDate: '2024-07-15',
      emergencyAd: false,
      status: 'ASSESSED',
      createdAt: new Date().toISOString(),
      createdBy: 'CAMO Engineer',
      updatedAt: new Date().toISOString(),
      updatedBy: 'CAMO Engineer',
      applicabilityRule: {
        id: 'rule-bare-01',
        complianceRequirementId: 'req-bare-ad-01',
        aircraftManufacturers: ['Boeing'],
        aircraftModels: ['737-800', '737-900'],
        componentPartNumbers: ['12345-01'],
        rawText: 'Applies to Boeing 737-800 series airplanes with elevator tab pushrod P/N 12345-01.'
      },
      requirementDetails: {
        initialThreshold: 'Within 500 FH or 6 months',
        repetitiveInterval: 'Every 500 FH',
        requiredInspection: 'Detailed visual and ultrasonic inspection'
      }
    };

    // Server-side fallback resolution simulation
    let text = bareRequirement.sourceDocument?.rawExtractedText;
    if (!text || text.trim().length === 0) {
      const lines = [
        `AIRWORTHINESS DIRECTIVE (REGULATORY OFFICIAL RECORD)`,
        `AD Number: ${bareRequirement.sourceNumber}`,
        `Authority: ${bareRequirement.issuingAuthority}`,
        `Title: ${bareRequirement.title}`,
        `Issue Date: ${bareRequirement.issueDate}`,
        `Effective Date: ${bareRequirement.effectiveDate}`
      ];
      if (bareRequirement.applicabilityRule?.rawText) {
        lines.push(`\nApplicability:\n${bareRequirement.applicabilityRule.rawText}`);
      }
      text = lines.join('\n');
    }

    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);

    const extracted = parseAdSafelyWithoutFabrication(text, `${bareRequirement.sourceNumber}.pdf`);
    expect(extracted.sourceNumber).toBe('FAA AD 2024-12-05');
    expect(extracted.aircraftModels).toContain('737-800');
    expect(extracted.documentProcessingStatus).toBe('EXTRACTED');
  });
});

