import { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileText, 
  UserCheck, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';

interface AuditTrailViewProps {
  state: DatabaseState;
}

export default function AuditTrailView({ state }: AuditTrailViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredLogs = state.auditTrail.filter((log) => {
    const matchesSearch = 
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Airworthiness Traceability & Audit Logs</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            CAMO Event History & Decision Log
          </h1>
          <p className="text-xs text-slate-400">
            Immutable chronological audit record of AI extractions, deterministic rule runs, engineer input, and Chief CAMO authorizations.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by user, action, detail..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Event Actions</option>
            <option value="AI_EXTRACTION">AI Extraction</option>
            <option value="RULE_EVALUATION">Rule Evaluation</option>
            <option value="QUESTION_ANSWERED">Question Answered</option>
            <option value="APPROVAL">CAMO Approval / Sign-off</option>
            <option value="FACT_RECORDED">Knowledge Fact Recorded</option>
            <option value="DELETE">AD Deletion Event</option>
            <option value="SYSTEM_RESET">System Reset</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm space-y-2 hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  {log.action}
                </span>
                <span className="font-semibold text-white font-mono">{log.entityType} ({log.entityId})</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">{log.details}</p>

            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
              <span>Actor: {log.user} ({log.role})</span>
              <span className="text-slate-400">ID: {log.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
