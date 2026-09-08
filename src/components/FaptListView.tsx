import { 
  FileCheck2, 
  Search, 
  Printer, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  UserCheck,
  ShieldCheck,
  Download
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface FaptListViewProps {
  state: DatabaseState;
  onSelectAd: (id: string) => void;
}

export default function FaptListView({ state, onSelectAd }: FaptListViewProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <FileCheck2 className="w-4 h-4" />
            <span>Official CAMO Compliance Records</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            AD Review Sheets (FAPT) Repository
          </h1>
          <p className="text-xs text-slate-400">
            Formally structured Folhas de Análise e Parecer Técnico with applicability matrices, action plans, and digital engineering approvals.
          </p>
        </div>
      </div>

      {/* FAPT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.fapts.map((fapt) => {
          const req = state.requirements.find(r => r.id === fapt.complianceRequirementId);
          const isApproved = fapt.status === 'APPROVED';

          return (
            <div
              key={fapt.id}
              className="glass-panel rounded-xl p-5 shadow-sm space-y-4 hover:border-indigo-500/40 transition group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {fapt.documentNumber}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1 font-mono">{fapt.adNumber}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{fapt.title}</p>
                </div>

                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono ${
                  isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300 border border-white/10'
                }`}>
                  {fapt.status}
                </span>
              </div>

              {/* Matrix summary */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-lg text-center font-mono text-xs border border-white/5">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Applicable</span>
                  <span className="text-amber-400 font-bold text-sm">{fapt.affectedFleetCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Review Req.</span>
                  <span className="text-indigo-300 font-bold text-sm">{fapt.reviewRequiredCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase">Not App.</span>
                  <span className="text-emerald-400 font-bold text-sm">{fapt.notApplicableCount}</span>
                </div>
              </div>

              {/* Authorization status */}
              <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-white/10 font-mono">
                <div>
                  <span>Prepared: {fapt.preparedBy}</span>
                </div>
                <div>
                  {isApproved ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Approved</span>
                    </span>
                  ) : (
                    <span className="text-indigo-300 font-medium">Pending CAMO Sign-off</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => onSelectAd(fapt.complianceRequirementId)}
                  className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-lg border border-white/10 transition font-mono"
                >
                  <span>View Full FAPT & Sign</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
