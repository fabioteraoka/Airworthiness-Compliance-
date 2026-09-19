import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  BrainCircuit, 
  BookCheck, 
  UploadCloud, 
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ComplianceRequirement } from '../types';
import AdListView from './AdListView';
import AnalysisPhaseView from './AnalysisPhaseView';
import CamoRegulatoryRegisterView from './CamoRegulatoryRegisterView';
import AdUploadView from './AdUploadView';

export type AdsSubTab = 'library' | 'analysis' | 'register' | 'upload';

interface AdsWorkspaceViewProps {
  state: DatabaseState;
  onSelectAd: (id: string, subTab?: string) => void;
  onSelectView: (view: string, subTab?: string) => void;
  onRefreshState: (newState: DatabaseState) => void;
  onAdProcessed: (requirement: ComplianceRequirement) => void;
  initialTab?: AdsSubTab | string;
}

export default function AdsWorkspaceView({
  state,
  onSelectAd,
  onSelectView,
  onRefreshState,
  onAdProcessed,
  initialTab = 'library'
}: AdsWorkspaceViewProps) {
  const normalizeTab = (t?: string): AdsSubTab => {
    if (t === 'analysis' || t === 'analysis-phase') return 'analysis';
    if (t === 'register' || t === 'camo-register') return 'register';
    if (t === 'upload') return 'upload';
    return 'library';
  };

  const [activeTab, setActiveTab] = useState<AdsSubTab>(normalizeTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  // Operational metrics for badges
  const totalAds = state.requirements.length;
  const pendingAnalysis = state.camoRegulatoryRegister?.filter(r => r.analysisStatus === 'PENDING_ANALYSIS').length || 0;
  const registerCount = state.camoRegulatoryRegister?.length || 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Workspace Sub-Navigation Bar */}
      <div className="glass-panel border-b border-white/10 px-6 py-2.5 shrink-0 flex items-center justify-between flex-wrap gap-3 bg-slate-900/80">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'library'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Acervo Ativo ({totalAds})</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'analysis'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Mesa de Análise Técnica IA</span>
            {pendingAnalysis > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold animate-pulse">
                {pendingAnalysis}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookCheck className="w-3.5 h-3.5" />
            <span>Registro Regulatório CAMO ({registerCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload & Ingestão de AD</span>
          </button>
        </div>

        {/* Quick action button when on library */}
        {activeTab === 'library' && (
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 px-3 py-1 rounded-lg border border-indigo-500/40 transition font-mono shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-300" />
            <span>Fazer Upload de Nova AD</span>
          </button>
        )}
      </div>

      {/* Main Tab Renderers */}
      <div className="flex-1">
        {activeTab === 'library' && (
          <AdListView
            state={state}
            onSelectAd={onSelectAd}
            onSelectView={onSelectView}
            onRefreshState={onRefreshState}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisPhaseView
            state={state}
            onRefreshState={onRefreshState}
            onSelectAd={onSelectAd}
            onSelectView={onSelectView}
          />
        )}

        {activeTab === 'register' && (
          <CamoRegulatoryRegisterView
            state={state}
            onRefreshState={onRefreshState}
            onSelectAd={onSelectAd}
            onSelectView={onSelectView}
          />
        )}

        {activeTab === 'upload' && (
          <AdUploadView
            onAdProcessed={onAdProcessed}
            onSelectView={onSelectView}
          />
        )}
      </div>
    </div>
  );
}
