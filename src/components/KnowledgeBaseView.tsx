import { useState } from 'react';
import { 
  BrainCircuit, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  Calendar, 
  UserCheck, 
  Paperclip,
  Check,
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { KnowledgeFact } from '../types';

interface KnowledgeBaseViewProps {
  state: DatabaseState;
  onRefreshState: (newState: DatabaseState) => void;
  onSelectAd: (id: string) => void;
}

export default function KnowledgeBaseView({ state, onRefreshState, onSelectAd }: KnowledgeBaseViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'facts' | 'questions'>('facts');

  const pendingQuestions = state.questions.filter(q => q.status === 'PENDING');
  const allFacts = state.knowledgeFacts;

  const filteredFacts = allFacts.filter((fact) => {
    const matchesSearch = 
      fact.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fact.subjectLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fact.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fact.details?.partNumber && fact.details.partNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || fact.factType === filterType;
    return matchesSearch && matchesType;
  });

  const handleFactAction = async (factId: string, action: 'CONFIRM' | 'REJECT') => {
    try {
      const res = await fetch(`/api/knowledge-facts/${factId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: `Action ${action} taken by CAMO Engineer` })
      });
      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
      }
    } catch (err) {
      console.error('Fact action error:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
            <BrainCircuit className="w-4 h-4" />
            <span>Continuous Airworthiness Memory</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            Reusable Knowledge Base & Evidence Repository
          </h1>
          <p className="text-xs text-slate-400">
            Confirmed engineering facts are permanently retained and automatically reused across future AD assessments to avoid repetitive questions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300 text-xs font-mono font-bold">
            {allFacts.filter(f => !f.isRejected).length} Verified Facts Active
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab('facts')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'facts'
              ? 'border-purple-500 text-purple-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Confirmed Facts ({allFacts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'questions'
              ? 'border-indigo-400 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            Pending Questions
            {pendingQuestions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-bold animate-pulse">
                {pendingQuestions.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Tab 1: Confirmed Facts */}
      {activeTab === 'facts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 glass-panel p-4 rounded-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search facts by P/N, aircraft, title..."
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="ALL">All Fact Types</option>
                <option value="COMPONENT_INSTALLED">Component Installed</option>
                <option value="COMPONENT_NOT_INSTALLED">Component NOT Installed</option>
                <option value="SB_INCORPORATED">Service Bulletin Incorporation</option>
                <option value="MODIFICATION_APPLIED">Modification / STC Applied</option>
              </select>
            </div>
          </div>

          {/* Facts List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFacts.map((fact) => {
              const isRejected = fact.isRejected;

              return (
                <div
                  key={fact.id}
                  className={`p-5 rounded-xl border transition space-y-3 ${
                    isRejected 
                      ? 'glass-panel opacity-50 border-rose-900/30' 
                      : 'glass-panel hover:border-purple-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          {fact.subjectLabel}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {fact.factType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight">{fact.title}</h4>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 font-bold shrink-0">
                      {fact.confidence}% Conf.
                    </span>
                  </div>

                  {/* Fact Details */}
                  {fact.details && (
                    <div className="bg-slate-950/60 p-2.5 rounded-lg text-xs font-mono grid grid-cols-2 gap-2 text-slate-300 border border-white/5">
                      {fact.details.partNumber && (
                        <div>
                          <span className="text-slate-400 text-[10px] block">P/N:</span>
                          <span className="text-indigo-300 font-bold">{fact.details.partNumber}</span>
                        </div>
                      )}
                      {fact.details.serialNumber && (
                        <div>
                          <span className="text-slate-400 text-[10px] block">S/N:</span>
                          <span className="text-amber-300 font-bold">{fact.details.serialNumber}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evidence Provenance */}
                  <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-white/10">
                    <p className="line-clamp-2">
                      <strong className="text-slate-300">Evidence Provenance:</strong> {fact.source}
                    </p>
                    {fact.evidenceSummary && (
                      <p className="text-[11px] text-slate-400 italic">"{fact.evidenceSummary}"</p>
                    )}
                  </div>

                  {/* Footer & Controls */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5">
                    <span className="font-mono">
                      Verified by {fact.verifiedBy} ({new Date(fact.lastVerified).toLocaleDateString()})
                    </span>

                    <div className="flex items-center space-x-2 font-mono">
                      {isRejected ? (
                        <button
                          onClick={() => handleFactAction(fact.id, 'CONFIRM')}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2 py-1 rounded border border-white/10"
                        >
                          Re-activate Fact
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFactAction(fact.id, 'REJECT')}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-rose-300 px-2 py-1 rounded border border-white/10"
                        >
                          Reject / Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Pending Questions Inbox */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {pendingQuestions.length === 0 ? (
            <div className="glass-panel rounded-xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">All Questions Answered</h3>
              <p className="text-xs text-slate-400">
                There are currently no unresolved airworthiness queries. All AD effectivity assessments are determined.
              </p>
            </div>
          ) : (
            pendingQuestions.map((q) => {
              const req = state.requirements.find(r => r.id === q.complianceRequirementId);
              return (
                <div key={q.id} className="glass-panel border-indigo-500/40 rounded-xl p-5 shadow-sm space-y-3 bg-indigo-950/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-indigo-600 text-white border border-indigo-400/30">
                          PENDING REVIEW
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          AD: {req?.sourceNumber || 'Airworthiness Directive'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{q.question}</h4>
                      <p className="text-xs text-slate-400">{q.reason}</p>
                    </div>

                    <button
                      onClick={() => onSelectAd(q.complianceRequirementId)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shrink-0 uppercase font-mono tracking-wider shadow"
                    >
                      Resolve in AD #{req?.sourceNumber}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
