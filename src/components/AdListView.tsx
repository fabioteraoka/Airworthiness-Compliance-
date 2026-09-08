import { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  UploadCloud, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  FileCheck2, 
  Calendar, 
  Printer, 
  Trash2, 
  Check,
  Activity,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ComplianceRequirement } from '../types';
import FullTechnicalReportModal from './FullTechnicalReportModal';
import DeleteAdConfirmationModal from './DeleteAdConfirmationModal';
import ExtractionDiagnosticsModal from './ExtractionDiagnosticsModal';

interface AdListViewProps {
  state: DatabaseState;
  onSelectAd: (id: string) => void;
  onSelectView: (view: string) => void;
  onRefreshState?: (newState: DatabaseState) => void;
}

export default function AdListView({ state, onSelectAd, onSelectView, onRefreshState }: AdListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [printModalAdId, setPrintModalAdId] = useState<string | null>(null);
  const [diagnosticsReq, setDiagnosticsReq] = useState<ComplianceRequirement | null>(null);
  const [deletingRequirement, setDeletingRequirement] = useState<ComplianceRequirement | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const filteredRequirements = state.requirements.filter((req) => {
    const matchesSearch = 
      req.sourceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.applicabilityRule?.componentPartNumbers.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAuthority = authorityFilter === 'ALL' || req.issuingAuthority === authorityFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesAuthority && matchesStatus;
  });

  const handleDeletedSuccess = (msg: string) => {
    setDeletingRequirement(null);
    setSuccessBanner(msg);
    // Refresh state from server
    fetch('/api/state')
      .then(res => res.json())
      .then(freshState => {
        if (onRefreshState) onRefreshState(freshState);
      })
      .catch(err => console.error('Failed to refresh state after deletion:', err));
  };

  const handleRetryExtraction = async (reqId: string) => {
    const res = await fetch(`/api/requirements/${reqId}/retry-extraction`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to re-extract directive');
    }
    const data = await res.json();
    if (onRefreshState && data.state) {
      onRefreshState(data.state);
    }
    if (data.requirement) {
      setDiagnosticsReq(data.requirement);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs text-emerald-200 animate-fadeIn shadow-lg">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-white block">AD Deleted Successfully</span>
              <span>{successBanner}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectView('upload')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs font-mono transition"
            >
              Upload New AD
            </button>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-400 hover:text-white px-2 py-1 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Airworthiness Directives Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            AD Technical Records & Compliance Status
          </h1>
          <p className="text-xs text-slate-400">
            Controlled Airworthiness Directives with deterministic fleet applicability evaluations.
          </p>
        </div>

        <button
          onClick={() => onSelectView('upload')}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Ingest New AD</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by AD #, P/N, Title..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={authorityFilter}
            onChange={(e) => setAuthorityFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Authorities (FAA, EASA, ANAC, etc.)</option>
            <option value="FAA">FAA (United States)</option>
            <option value="EASA">EASA (Europe)</option>
            <option value="ANAC">ANAC (Brazil)</option>
            <option value="TCCA">TCCA (Canada)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Requirement Statuses</option>
            <option value="ASSESSED">ASSESSED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="APPROVED">APPROVED</option>
          </select>
        </div>
      </div>

      {/* Directives Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/50">
                <th className="py-3.5 px-4">AD Number & Rev</th>
                <th className="py-3.5 px-4">Authority</th>
                <th className="py-3.5 px-4">Title & Subject</th>
                <th className="py-3.5 px-4">Target P/N & Models</th>
                <th className="py-3.5 px-4">Effective Date</th>
                <th className="py-3.5 px-4">Fleet Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No Airworthiness Directives found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((req) => {
                  const reqAssessments = state.assessments.filter(a => a.complianceRequirementId === req.id);
                  const hasApp = reqAssessments.some(a => a.result === 'APPLICABLE');
                  const hasRev = reqAssessments.some(a => a.result === 'REVIEW_REQUIRED');
                  const appCount = reqAssessments.filter(a => a.result === 'APPLICABLE').length;

                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectAd(req.id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition"
                    >
                      <td className="py-4 px-4 font-mono font-bold text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>{req.sourceNumber}</span>
                          {req.emergencyAd && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                              EMERGENCY
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans font-normal block">
                          Rev: {req.revision || 'Original'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {req.issuingAuthority}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300 max-w-sm">
                        <p className="font-semibold line-clamp-1 text-slate-200">{req.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{req.requirementDetails?.initialThreshold}</p>
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px]">
                        <span className="text-indigo-300 block">
                          {req.applicabilityRule?.componentPartNumbers.length 
                            ? `P/N: ${req.applicabilityRule.componentPartNumbers.join(', ')}`
                            : 'Airframe Level'}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {req.applicabilityRule?.aircraftModels.join(', ') || 'All'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-400">
                        {req.effectiveDate}
                      </td>

                      <td className="py-4 px-4">
                        {hasRev ? (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1">
                            <HelpCircle className="w-3 h-3 text-amber-400" />
                            <span>REVIEW REQUIRED</span>
                          </span>
                        ) : hasApp ? (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>{appCount} APPLICABLE</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>NOT APPLICABLE</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDiagnosticsReq(req);
                            }}
                            title="View 9-Stage Extraction Pipeline Diagnostics"
                            className="p-1.5 bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-mono transition flex items-center space-x-1"
                          >
                            <Activity className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline text-[11px] font-bold">Diagnostics</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintModalAdId(req.id);
                            }}
                            title="Imprimir / Exportar Análise Completa"
                            className="p-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono transition flex items-center space-x-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px] font-bold">Imprimir</span>
                          </button>

                          <button 
                            onClick={() => onSelectAd(req.id)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingRequirement(req);
                            }}
                            title="Delete Airworthiness Directive and cascade analysis records"
                            className="p-1.5 bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/60 rounded-lg text-xs transition flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px] font-bold">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extraction Diagnostics Modal */}
      {diagnosticsReq && (
        <ExtractionDiagnosticsModal
          requirement={diagnosticsReq}
          onClose={() => setDiagnosticsReq(null)}
          onRetryExtraction={handleRetryExtraction}
        />
      )}

      {/* Delete AD Confirmation Modal */}
      {deletingRequirement && (
        <DeleteAdConfirmationModal
          requirement={deletingRequirement}
          onClose={() => setDeletingRequirement(null)}
          onDeleted={handleDeletedSuccess}
        />
      )}

      {/* Full Technical Report Print / Export Modal */}
      {printModalAdId && (
        <FullTechnicalReportModal
          requirementId={printModalAdId}
          state={state}
          onClose={() => setPrintModalAdId(null)}
        />
      )}
    </div>
  );
}
