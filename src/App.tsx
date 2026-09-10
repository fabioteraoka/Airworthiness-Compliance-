import { useState, useEffect } from 'react';
import { DatabaseState } from '../server/dataStore';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import AdUploadView from './components/AdUploadView';
import AdListView from './components/AdListView';
import AdDetailView from './components/AdDetailView';
import FleetView from './components/FleetView';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import FaptListView from './components/FaptListView';
import AuditTrailView from './components/AuditTrailView';
import ArchitectureView from './components/ArchitectureView';
import ArchitectureDossierModal from './components/ArchitectureDossierModal';
import RegulatorySourcesView from './components/RegulatorySourcesView';
import ComplianceObligationsView from './components/ComplianceObligationsView';
import AircraftDeliveryView from './components/AircraftDeliveryView';
import HelpCenterView from './components/HelpCenterView';
import FleetAdSearchView from './components/FleetAdSearchView';
import ContextualHelpDrawer from './components/ContextualHelpDrawer';
import { Loader2, AlertCircle, HelpCircle, Compass } from 'lucide-react';
import { ComplianceRequirement } from './types';

export default function App() {
  const [state, setState] = useState<DatabaseState | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [showArchitectureDossierModal, setShowArchitectureDossierModal] = useState<boolean>(false);
  const [showContextualDrawer, setShowContextualDrawer] = useState<boolean>(false);
  const [selectedHelpArticleId, setSelectedHelpArticleId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimestamp(now.toISOString().replace('T', ' ').substring(0, 19) + 'Z');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchState = async (retriesLeft = 3, delayMs = 1000) => {
    try {
      setFetchError(null);
      const res = await fetch('/api/state');
      if (!res.ok) {
        throw new Error(`Failed to load CAMO database state (HTTP ${res.status})`);
      }
      const data = await res.json();
      setState(data);
      setIsLoading(false);
    } catch (err: any) {
      console.warn(`Fetch state attempt failed (${retriesLeft} retries left):`, err);
      if (retriesLeft > 0) {
        setTimeout(() => {
          fetchState(retriesLeft - 1, delayMs * 1.5);
        }, delayMs);
      } else {
        setFetchError(
          err.message?.includes('Failed to fetch') 
            ? 'Connection to the CAMO server was interrupted or is still initializing. Please click "Retry Connection".'
            : (err.message || 'Error communicating with server')
        );
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchState(3, 800);
  }, []);

  const handleResetSeed = async () => {
    if (!window.confirm('Reset the CAMO database to demonstration seed data?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset-seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setCurrentView('dashboard');
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectAd = (id: string) => {
    setSelectedAdId(id);
    setCurrentView('detail');
  };

  const handleAdProcessed = (requirement: ComplianceRequirement) => {
    setSelectedAdId(requirement.id);
    fetchState();
    setCurrentView('detail');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center space-y-4 text-slate-100">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-white uppercase tracking-wider">Airworthiness Compliance Intelligence</p>
          <p className="text-xs text-slate-400 font-mono">Initializing CAMO Rule Engine & Fleet Assets...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !state) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full glass-panel border border-rose-500/40 rounded-xl p-6 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">CAMO System Error</h2>
          <p className="text-xs text-slate-300">{fetchError || 'Unable to establish connection to CAMO database.'}</p>
          <button
            onClick={fetchState}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg text-xs transition font-mono"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const factsCount = state?.knowledgeFacts.filter(f => !f.isRejected).length || 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        state={state}
        onResetSeed={handleResetSeed}
        onSelectView={setCurrentView}
        onOpenDossier={() => setShowArchitectureDossierModal(true)}
        isResetting={isResetting}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
            if (view === 'ads') setSelectedAdId(null);
          }}
          state={state}
        />

        {/* Content View Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-[#0F172A]/70">
            {currentView === 'dashboard' && (
              <DashboardView
                state={state}
                onSelectView={setCurrentView}
                onSelectAd={handleSelectAd}
              />
            )}

            {currentView === 'fleet-ad-search' && state && (
              <FleetAdSearchView
                state={state}
                onSelectAd={handleSelectAd}
                onSelectView={setCurrentView}
                onRefreshState={setState}
              />
            )}

            {currentView === 'regulatory' && (
              <RegulatorySourcesView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
              />
            )}

            {currentView === 'obligations' && (
              <ComplianceObligationsView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
              />
            )}

            {currentView === 'delivery' && (
              <AircraftDeliveryView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
              />
            )}

            {currentView === 'upload' && (
              <AdUploadView
                onAdProcessed={handleAdProcessed}
                onSelectView={setCurrentView}
              />
            )}

            {currentView === 'ads' && (
              <AdListView
                state={state}
                onSelectAd={handleSelectAd}
                onSelectView={setCurrentView}
                onRefreshState={setState}
              />
            )}

            {currentView === 'detail' && selectedAdId && (
              <AdDetailView
                requirementId={selectedAdId}
                state={state}
                onBack={() => setCurrentView('ads')}
                onRefreshState={setState}
              />
            )}

            {currentView === 'fleet' && (
              <FleetView
                state={state}
                onRefreshState={setState}
              />
            )}

            {currentView === 'knowledge' && (
              <KnowledgeBaseView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
              />
            )}

            {currentView === 'fapt' && (
              <FaptListView
                state={state}
                onSelectAd={handleSelectAd}
              />
            )}

            {currentView === 'audit' && (
              <AuditTrailView
                state={state}
              />
            )}

            {currentView === 'architecture' && (
              <ArchitectureView
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
              />
            )}

            {currentView === 'help' && (
              <HelpCenterView
                initialArticleId={selectedHelpArticleId}
                onNavigateView={(view) => {
                  setSelectedHelpArticleId(undefined);
                  setCurrentView(view);
                }}
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
              />
            )}
          </main>

          {/* Floating Contextual Guidance Button (CAMO Assistant) */}
          {currentView !== 'help' && (
            <button
              onClick={() => setShowContextualDrawer(true)}
              title="Abrir Orientação Operacional CAMO para esta tela"
              className="fixed bottom-12 right-6 z-40 flex items-center space-x-2 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Compass className="w-4 h-4 animate-spin-slow text-indigo-200" />
              <span>Orientação CAMO (Fase 8)</span>
            </button>
          )}

          {/* Frosted Glass Technical Status Bar */}
          <footer className="h-9 glass-panel border-t border-white/10 flex items-center px-6 justify-between text-[10px] text-slate-400 select-none z-10 shrink-0 font-mono">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <span>AI ENGINE (GEMINI 3.7) ONLINE</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                <span>RULE ENGINE SYNCED</span>
              </span>
            </div>
            <div className="text-slate-400">
              KNOWLEDGE FACTS: <span className="text-indigo-300 font-bold">{factsCount}</span> | TIMESTAMP: <span className="text-slate-300">{currentTimestamp}</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Architecture Dossier & PDF Export Modal */}
      {showArchitectureDossierModal && (
        <ArchitectureDossierModal
          state={state}
          onClose={() => setShowArchitectureDossierModal(false)}
        />
      )}

      {/* Phase 8: Contextual Operational Guidance Drawer */}
      <ContextualHelpDrawer
        moduleId={currentView}
        isOpen={showContextualDrawer}
        onClose={() => setShowContextualDrawer(false)}
        onNavigateToHelpArticle={(articleId) => {
          setSelectedHelpArticleId(articleId);
          setCurrentView('help');
        }}
        onNavigateToWorkflowStep={(stepId) => {
          setCurrentView('help');
        }}
      />
    </div>
  );
}
