import { 
  Plane, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  BrainCircuit, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  UploadCloud,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ComplianceRequirement, ComplianceAssessment } from '../types';

interface DashboardViewProps {
  state: DatabaseState;
  onSelectView: (view: string) => void;
  onSelectAd: (reqId: string) => void;
}

export default function DashboardView({ state, onSelectView, onSelectAd }: DashboardViewProps) {
  const totalFleet = state.aircraft.length;
  const totalEngines = state.engines.length;
  const totalComponents = state.components.length;
  
  const totalAds = state.requirements.length;
  const applicableAssessments = state.assessments.filter(a => a.result === 'APPLICABLE');
  const notApplicableAssessments = state.assessments.filter(a => a.result === 'NOT_APPLICABLE');
  const reviewRequiredAssessments = state.assessments.filter(a => a.result === 'REVIEW_REQUIRED');

  const pendingQuestions = state.questions.filter(q => q.status === 'PENDING');
  const confirmedFacts = state.knowledgeFacts.filter(f => !f.isRejected);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / CAMO Mission statement */}
      <div className="glass-panel-highlight rounded-xl p-6 border border-indigo-500/30 text-slate-100 relative overflow-hidden shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Continuing Airworthiness Management System</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white uppercase">
              Airworthiness Compliance Intelligence
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              Deterministic CAMO Rule Engine coupled with Gemini 3.7 Flash document intelligence. 
              Objective fleet effectivity verification, interactive missing data questions, traceable knowledge retention, and automated FAPT compliance sheets.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onSelectView('regulatory-intel')}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fase 9.4: Inteligência Regulatória</span>
            </button>
            <button
              onClick={() => onSelectView('delivery')}
              className="flex items-center space-x-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 px-4 py-2.5 rounded-lg text-xs font-semibold transition"
            >
              <Plane className="w-4 h-4 text-indigo-400" />
              <span>Delivery & Pré-Compra</span>
            </button>
            <button
              onClick={() => onSelectView('upload')}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition uppercase tracking-wider font-mono"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload New AD (PDF)</span>
            </button>
            <button
              onClick={() => onSelectView('architecture')}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-white/10 px-4 py-2.5 rounded-lg text-xs font-semibold transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Architecture & Principles</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Bar if Pending Questions exist */}
      {pendingQuestions.length > 0 && (
        <div className="glass-panel border-indigo-500/40 rounded-xl p-4 flex items-center justify-between shadow-sm bg-indigo-950/30">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wide">
                {pendingQuestions.length} Pending Engineering Clarification{pendingQuestions.length > 1 ? 's' : ''} (ACTION REQUIRED)
              </h4>
              <p className="text-xs text-slate-300">
                The Rule Engine identified ADs with missing fleet configuration records. Safety standard forbids assuming non-applicability without evidence.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectView('knowledge')}
            className="flex items-center space-x-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition shrink-0 ml-4 shadow-sm uppercase font-mono tracking-wider"
          >
            <span>Resolve Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fleet Card */}
        <div 
          onClick={() => onSelectView('fleet')}
          className="glass-panel hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Assets</span>
            <Plane className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalFleet}</span>
            <span className="text-xs text-slate-400">Aircraft ({state.aircraft.map(a => a.registration).join(', ')})</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[11px] text-slate-400 font-mono">
            <span>{totalEngines} Engines</span>
            <span>{totalComponents} Components</span>
          </div>
        </div>

        {/* Total ADs Card */}
        <div 
          onClick={() => onSelectView('ads')}
          className="glass-panel hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AD Directives</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalAds}</span>
            <span className="text-xs text-slate-400">Under Management</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[11px] text-slate-400">
            <span className="font-mono">FAA, EASA & ANAC</span>
            <span className="text-indigo-400 font-medium group-hover:underline flex items-center">
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Applicability Assessment Card */}
        <div 
          onClick={() => onSelectView('ads')}
          className="glass-panel hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effectivity Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase font-mono">App</div>
              <div className="text-xl font-extrabold text-amber-300 font-mono">{applicableAssessments.length}</div>
            </div>
            <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-lg p-2">
              <div className="text-[10px] text-indigo-300 font-bold uppercase font-mono">Rev</div>
              <div className="text-xl font-extrabold text-indigo-200 font-mono">{reviewRequiredAssessments.length}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
              <div className="text-[10px] text-emerald-400 font-bold uppercase font-mono">N/A</div>
              <div className="text-xl font-extrabold text-emerald-300 font-mono">{notApplicableAssessments.length}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Deterministic Rules</span>
            <span className="text-emerald-400 font-mono font-medium">100% Traceable</span>
          </div>
        </div>

        {/* Knowledge Base Card */}
        <div 
          onClick={() => onSelectView('knowledge')}
          className="glass-panel hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Knowledge Memory</span>
            <BrainCircuit className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">{confirmedFacts.length}</span>
            <span className="text-xs text-purple-300">Verified Facts</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[11px] text-slate-400">
            <span>Eliminates rework</span>
            <span className="text-purple-400 font-medium group-hover:underline flex items-center">
              Explore <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Fleet Status & Recent ADs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Airworthiness Directives Table */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Active Airworthiness Directives</span>
              </h3>
              <p className="text-xs text-slate-400">
                Controlled Technical Data with Deterministic Fleet Evaluation
              </p>
            </div>
            <button
              onClick={() => onSelectView('ads')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
            >
              <span>Manage ADs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">AD Number</th>
                  <th className="py-2.5 px-3">Authority</th>
                  <th className="py-2.5 px-3">Title & Subject</th>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3">Fleet Result</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {state.requirements.map((req) => {
                  const reqAssessments = state.assessments.filter(a => a.complianceRequirementId === req.id);
                  const hasApp = reqAssessments.some(a => a.result === 'APPLICABLE');
                  const hasRev = reqAssessments.some(a => a.result === 'REVIEW_REQUIRED');

                  return (
                    <tr 
                      key={req.id}
                      onClick={() => onSelectAd(req.id)}
                      className="hover:bg-white/5 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                        {req.sourceNumber}
                        {req.emergencyAd && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                            Emergency
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-white/10">
                          {req.issuingAuthority}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={req.title}>
                        {req.title}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {req.effectiveDate}
                      </td>
                      <td className="py-3 px-3">
                        {hasRev ? (
                          <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-indigo-600 text-white border border-indigo-400/30">
                            Review Req.
                          </span>
                        ) : hasApp ? (
                          <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-amber-500 text-slate-950 border border-amber-400/40">
                            Applicable
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-emerald-500 text-white border border-emerald-400/40">
                            Not App.
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded border border-white/10 transition font-mono">
                          View FAPT
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Fleet Assets Quick View */}
        <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Plane className="w-4 h-4 text-indigo-400" />
              <span>Fleet Configuration</span>
            </h3>
            <button
              onClick={() => onSelectView('fleet')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Manage Fleet
            </button>
          </div>

          <div className="space-y-3">
            {state.aircraft.map((ac) => {
              const installedComps = state.installations.filter(i => i.aircraftId === ac.id && i.currentStatus === 'INSTALLED');
              const installedEngs = state.engines.filter(e => e.aircraftId === ac.id);
              const acAssessments = state.assessments.filter(a => a.entityId === ac.id);
              const applicableToAc = acAssessments.filter(a => a.result === 'APPLICABLE');
              const reviewToAc = acAssessments.filter(a => a.result === 'REVIEW_REQUIRED');

              return (
                <div 
                  key={ac.id}
                  className="p-3.5 bg-slate-950/60 rounded-lg border border-white/10 space-y-2 hover:border-indigo-500/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-mono">{ac.registration}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-medium">
                        {ac.manufacturer} {ac.model}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">MSN {ac.msn}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>{ac.totalFlightHours.toLocaleString()} FH • {ac.totalCycles.toLocaleString()} FC</span>
                    {reviewToAc.length > 0 ? (
                      <span className="text-indigo-300 font-semibold">{reviewToAc.length} Review Req.</span>
                    ) : applicableToAc.length > 0 ? (
                      <span className="text-amber-400 font-semibold">{applicableToAc.length} Applicable AD</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Compliant</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[10px] text-slate-400 flex flex-wrap gap-1 font-mono">
                    <span className="text-slate-500">Engines:</span>
                    {installedEngs.map(e => (
                      <span key={e.id} className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-white/5">
                        {e.model} ({e.serialNumber})
                      </span>
                    ))}
                    <span className="text-slate-500 ml-1">Comps:</span>
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-white/5">
                      {installedComps.length} installed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reusable Knowledge Base Spotlight */}
      <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Traceable Knowledge Base — Continuous Airworthiness Memory
              </h3>
              <p className="text-xs text-slate-400">
                Confirmed facts are stored with evidence provenance and automatically reused in future AD analyses to eliminate repetitive questions.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectView('knowledge')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
          >
            <span>View All {confirmedFacts.length} Facts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {confirmedFacts.slice(0, 4).map((fact) => (
            <div 
              key={fact.id}
              className="p-3 bg-slate-950/60 rounded-lg border border-purple-900/30 hover:border-purple-500/40 transition space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-purple-200 truncate pr-2">{fact.title}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                  {fact.confidence}% Confidence
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                <strong className="text-slate-300">Evidence Source:</strong> {fact.source}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
                <span>Verified by {fact.verifiedBy}</span>
                <span>{new Date(fact.lastVerified).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
