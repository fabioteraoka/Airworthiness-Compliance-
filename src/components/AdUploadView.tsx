import { useState, useRef, type ChangeEvent } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Play, 
  FileCheck,
  ShieldCheck,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { ComplianceRequirement } from '../types';

interface AdUploadViewProps {
  onAdProcessed: (requirement: ComplianceRequirement) => void;
  onSelectView: (view: string) => void;
}

const SAMPLE_ADS = [
  {
    id: 'sample-faa-b737',
    name: 'FAA AD 2024-12-05 (Boeing 737-800 Elevator Tab)',
    authority: 'FAA',
    target: 'Boeing 737-800 / P/N 12345-01 (S/N 400000-500000)',
    scenario: 'Tests immediate APPLICABLE match on PR-GUO & PR-VBC with confirmed installed serial numbers.',
    text: `DEPARTMENT OF TRANSPORTATION
Federal Aviation Administration
14 CFR Part 39
[Docket No. FAA-2024-1205; Project Identifier AD-2024-00412-T; Amendment 39-22741; AD 2024-12-05]
RIN 2120-AA64

Airworthiness Directives; The Boeing Company Airplanes
AGENCY: Federal Aviation Administration (FAA), DOT.
ACTION: Final rule.

SUMMARY: The FAA is adopting a new airworthiness directive (AD) for all The Boeing Company Model 737-700, 737-800, 737-900, and 737-900ER series airplanes. This AD was prompted by reports of fatigue cracking and excessive wear found on elevator tab control pushrods and associated bushing assemblies. This AD requires repetitive detailed visual and ultrasonic inspections of elevator tab control pushrod assemblies having Part Number (P/N) 12345-01 or P/N 12345-02 with serial numbers between 400000 and 500000 inclusive, and replacement with terminating part P/N 98765-02 if wear or cracks are detected.

DATES: This AD is effective July 15, 2024.

APPLICABILITY:
(c) This AD applies to all The Boeing Company Model 737-700, 737-800, 737-900, and 737-900ER series airplanes, certificated in any category, equipped with elevator tab pushrod assembly P/N 12345-01 or P/N 12345-02 with serial numbers from 400000 through 500000 inclusive.

COMPLIANCE:
(g) Required Actions and Compliance Times:
(1) Initial Inspection: Within 500 flight hours or 6 months after the effective date of this AD, whichever occurs first, perform a detailed visual inspection and ultrasonic inspection of the affected pushrod assembly in accordance with Boeing Alert Service Bulletin 737-27A1305.
(2) Repetitive Intervals: Repeat the inspections specified in paragraph (g)(1) of this AD at intervals not to exceed 500 flight hours or 12 calendar months.
(3) Terminating Action: Installation of redesigned pushrod P/N 98765-02 in accordance with paragraph (h) constitutes terminating action for the repetitive inspection requirements of this AD.`
  },
  {
    id: 'sample-easa-a320',
    name: 'EASA AD 2024-0089 (Airbus A320 Fuel Filter Bypass Valve)',
    authority: 'EASA',
    target: 'Airbus A320-214 / P/N FF-9921 (Requires User Query)',
    scenario: 'Tests REVIEW REQUIRED behavior. P/N FF-9921 is unknown in database, prompting engineer for verification and generating Knowledge Fact upon answer.',
    text: `EUROPEAN UNION AVIATION SAFETY AGENCY
AIRWORTHINESS DIRECTIVE
AD No.: 2024-0089
Issued: 14 May 2024

Foreign AD: Not applicable
Effective Date: 28 May 2024
TCDS: EASA.A.064
Subject: Fuel System – Fuel Filter Bypass Valve – Functional Test / Replacement

Applicability:
Airbus A319, A320, and A321 series aeroplanes, all manufacturer serial numbers (MSN), if equipped with Fuel Filter Bypass Valve Assembly Part Number (P/N) FF-9921 or P/N FF-9921-02.

Reason:
Occurrences have been reported where fuel filter bypass valve assemblies P/N FF-9921 failed to open during high differential pressure conditions, potentially leading to fuel starvation under icing conditions.
This condition, if not detected and corrected, could lead to engine uncommanded in-flight shut down (IFSD) or total loss of thrust.

Required Actions and Compliance Times:
Within 750 flight hours or 4 months after the effective date of this AD, whichever occurs first:
(1) Perform a detailed visual inspection and functional test of fuel filter bypass valve P/N FF-9921 in accordance with Airbus Service Bulletin A320-28-1240.
(2) If the valve fails the functional test, before next flight, replace the defective valve with a serviceable valve P/N FF-9930 (terminating part).`
  },
  {
    id: 'sample-faa-cfm56',
    name: 'FAA AD 2024-18-02 (CFM56-7B Fan Blade Inspection)',
    authority: 'FAA',
    target: 'CFM56-7B26 Engines (S/N 894000-894500)',
    scenario: 'Tests Engine effectivity on PR-GUO (Engines 894120 & 894125 match serial effectivity).',
    text: `DEPARTMENT OF TRANSPORTATION
Federal Aviation Administration
14 CFR Part 39
[Docket No. FAA-2024-1802; AD 2024-18-02]

Airworthiness Directives; CFM International, S.A. Turbofan Engines
AGENCY: Federal Aviation Administration (FAA), DOT.
ACTION: Final rule; request for comments.

SUMMARY: The FAA is adopting a new airworthiness directive (AD) for all CFM International, S.A. Model CFM56-7B24, CFM56-7B26, and CFM56-7B27 turbofan engines with engine serial numbers between 894000 and 894500 inclusive. This AD requires an ultrasonic inspection of the fan blade dovetail roots for cracks.

DATES: This AD is effective August 10, 2024.

APPLICABILITY:
This AD applies to CFM International Model CFM56-7B series engines with serial numbers from 894000 through 894500 inclusive installed on Boeing 737 NG series aircraft.

COMPLIANCE:
Perform ultrasonic inspection of fan blades within 250 flight cycles from the effective date of this AD. Repeat at intervals not to exceed 1,600 flight cycles.`
  },
  {
    id: 'sample-faa-max-2020-24-02',
    name: 'FAA AD 2020-24-02 (Boeing 737-8 & 737-9 MAX Flight Control / Wire Routing)',
    authority: 'FAA',
    target: 'Boeing 737-8 and 737-9 (737 MAX) Airplanes',
    scenario: 'Regression Test: Proves strict model matching (737-8 does NOT match 737-800 PR-GUO/PR-VBC; matches only 737-8 PP-SMR) and eliminates fabricated default data.',
    text: `DEPARTMENT OF TRANSPORTATION
Federal Aviation Administration
14 CFR Part 39
[Docket No. FAA-2020-0785; Product Identifier 2020-NM-077-AD; Amendment 39-21335; AD 2020-24-02]
RIN 2120-AA64

Airworthiness Directives; The Boeing Company Airplanes
AGENCY: Federal Aviation Administration (FAA), DOT.
ACTION: Final rule.

SUMMARY: The FAA is adopting a new airworthiness directive (AD) for all The Boeing Company Model 737-8 and 737-9 (737 MAX) airplanes. This AD was prompted by uncommanded Maneuvering Characteristics Augmentation System (MCAS) activation and potential horizontal stabilizer trim wire bundle chafing. This AD requires installing updated flight control computer (FCC) software, installing new display system software, revising AFM limitations and procedures, and verifying horizontal stabilizer trim wire bundle routing.

DATES: This AD is effective January 4, 2021.

APPLICABILITY:
(c) This AD applies to all The Boeing Company Model 737-8 and 737-9 airplanes, certificated in any category.

COMPLIANCE:
(g) Required Actions and Compliance Times:
Before further flight after the effective date of this AD, accomplish the following:
(1) Install updated FCC operational program software in accordance with Boeing Alert Requirements Bulletin 737-22A1011.
(2) Install updated Max Display System (MDS) software in accordance with Boeing Alert Requirements Bulletin 737-31A1030.
(3) Revise the Airplane Flight Manual (AFM) to include non-normal procedures for flight control system anomalies.
(4) Perform horizontal stabilizer trim wire bundle routing verification and change in accordance with Boeing Alert Requirements Bulletin 737-24A1005.`
  }
];

export default function AdUploadView({ onAdProcessed, onSelectView }: AdUploadViewProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'samples'>('samples');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [adText, setAdText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedRequirement, setExtractedRequirement] = useState<ComplianceRequirement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64Data);
    };
    reader.onerror = () => {
      setError('Failed to read uploaded PDF file.');
    };
    reader.readAsDataURL(file);
  };

  const handleProcessAd = async (overrideText?: string, overrideBase64?: string, overrideFileName?: string) => {
    const payloadText = overrideText || (activeTab === 'text' || activeTab === 'samples' ? adText : undefined);
    const payloadBase64 = overrideBase64 || (activeTab === 'upload' ? fileBase64 : undefined);
    const fileName = overrideFileName || selectedFile?.name || 'Airworthiness_Directive.pdf';

    if (!payloadText && !payloadBase64) {
      setError('Please select a PDF file, paste the AD text, or select one of the sample AD scenarios.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStep(1);

    try {
      // Step 1: AI Gemini Extraction
      setProcessingStep(1);
      const res = await fetch('/api/extract-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payloadText,
          pdfBase64: payloadBase64,
          fileName
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Extraction failed');
      }

      const { requirement } = await res.json();
      setExtractedRequirement(requirement);

      // Step 2: Running Deterministic Rule Engine & FAPT Automation
      setProcessingStep(2);
      await new Promise(r => setTimeout(r, 600));

      setProcessingStep(3);
      const saveRes = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requirement)
      });

      if (!saveRes.ok) {
        const saveData = await saveRes.json();
        throw new Error(saveData.error || 'Failed to evaluate requirement against fleet');
      }

      const finalData = await saveRes.json();
      setProcessingStep(4);
      await new Promise(r => setTimeout(r, 500));

      setIsProcessing(false);
      onAdProcessed(finalData.requirement);
    } catch (err: any) {
      console.error('Processing error:', err);
      const isFetchErr = err.message?.includes('Failed to fetch');
      setError(
        isFetchErr 
          ? 'Network communication error with the CAMO server. Please check your connection and try again.'
          : (err.message || 'An unexpected error occurred during AD analysis')
      );
      setIsProcessing(false);
    }
  };

  const handleLoadSample = (sample: typeof SAMPLE_ADS[0]) => {
    setAdText(sample.text);
    handleProcessAd(sample.text, undefined, `${sample.authority}_AD_Sample.txt`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Automated Airworthiness Directive Ingestion</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
          Upload & Analyze Airworthiness Directive
        </h1>
        <p className="text-xs text-slate-400">
          Upload official PDF or technical notice text. The AI extracts structured effectivity criteria, 
          which are then deterministically checked against the fleet configuration database.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab('samples')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'samples'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Sample AD Scenarios (Instant 1-Click Test)</span>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'upload'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload PDF Document</span>
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'text'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Paste AD Text</span>
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Processing Pipeline Modal / Visualizer */}
      {isProcessing && (
        <div className="glass-panel border-indigo-500/40 rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">CAMO Analysis Pipeline in Progress</h3>
              <p className="text-xs text-slate-400">Applying Continuing Airworthiness engineering standards</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              processingStep >= 1 ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200' : 'bg-slate-950/50 border-white/5 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold">1. Gemini 3.7 Flash</span>
                {processingStep > 1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">Extracting metadata, part numbers, and effectivity rules.</p>
            </div>

            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              processingStep >= 2 ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200' : 'bg-slate-950/50 border-white/5 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold">2. Rule Engine</span>
                {processingStep > 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">Comparing AD criteria against fleet assets & serial ranges.</p>
            </div>

            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              processingStep >= 3 ? 'bg-purple-950/50 border-purple-500/50 text-purple-200' : 'bg-slate-950/50 border-white/5 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold">3. Knowledge Check</span>
                {processingStep > 3 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">Consulting verified Knowledge Base facts and evidence.</p>
            </div>

            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              processingStep >= 4 ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200' : 'bg-slate-950/50 border-white/5 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold">4. FAPT Generation</span>
                {processingStep >= 4 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400">Generating structured CAMO AD Review Sheet.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Sample Scenarios */}
      {activeTab === 'samples' && !isProcessing && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl text-xs text-slate-300 flex items-start space-x-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              These pre-configured aviation scenarios showcase the exact behaviors requested in the specification: 
              <strong> Instant Applicable match</strong>, <strong>Review Required with interactive user questions & knowledge recording</strong>, 
              and <strong>Engine serial effectivity</strong>. Click "Run Test Scenario" to execute the full pipeline!
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {SAMPLE_ADS.map((sample) => (
              <div
                key={sample.id}
                className="glass-panel rounded-xl p-5 shadow-sm space-y-3 hover:border-indigo-500/40 transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                        {sample.authority}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        {sample.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{sample.target}</p>
                  </div>

                  <button
                    onClick={() => handleLoadSample(sample)}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition shrink-0 uppercase font-mono tracking-wider"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Test Scenario</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-lg border border-white/5 text-xs text-slate-300 space-y-1 font-mono">
                  <span className="text-[10px] uppercase font-bold text-amber-400 font-sans">Testing Objective:</span>
                  <p>{sample.scenario}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Upload PDF */}
      {activeTab === 'upload' && !isProcessing && (
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4 ${
              selectedFile 
                ? 'border-indigo-500/80 bg-indigo-950/20' 
                : 'border-white/10 hover:border-indigo-500/40 glass-panel'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf" 
              className="hidden" 
            />

            <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                {selectedFile ? selectedFile.name : 'Drag & drop an Airworthiness Directive PDF, or click to browse'}
              </p>
              <p className="text-xs text-slate-400">
                Supports FAA, EASA, ANAC, TCCA, UK CAA formatted AD PDFs
              </p>
            </div>

            {selectedFile && (
              <div className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/40 rounded-full text-xs text-emerald-300 font-mono">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for Gemini Analysis
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleProcessAd()}
              disabled={!selectedFile || isProcessing}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow transition font-mono uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extract & Evaluate AD with Gemini 3.7 Flash</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Paste Text */}
      {activeTab === 'text' && !isProcessing && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Paste Airworthiness Directive text:
            </label>
            <textarea
              rows={12}
              value={adText}
              onChange={(e) => setAdText(e.target.value)}
              placeholder="Paste the full text or applicability section of the Airworthiness Directive here..."
              className="w-full glass-panel border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleProcessAd()}
              disabled={!adText.trim() || isProcessing}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow transition font-mono uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extract & Evaluate AD with Gemini 3.7 Flash</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
