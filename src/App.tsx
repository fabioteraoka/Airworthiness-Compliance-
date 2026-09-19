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
import RegulatoryIntelligenceView from './components/RegulatoryIntelligenceView';
import CamoRegulatoryRegisterView from './components/CamoRegulatoryRegisterView';
import AnalysisPhaseView from './components/AnalysisPhaseView';
import AdsWorkspaceView from './components/AdsWorkspaceView';
import TechnicalReferencesView from './components/TechnicalReferencesView';
import GovernanceView from './components/GovernanceView';
import BreadcrumbBar from './components/BreadcrumbBar';
import { 
  parseHashRoute, 
  buildHashRoute, 
  generateBreadcrumbs, 
  NavigationState, 
  BreadcrumbItem, 
  PrimaryView 
} from './services/navigationService';
import { Loader2, AlertCircle, HelpCircle, Compass } from 'lucide-react';
import { ComplianceRequirement } from './types';

export default function App() {
  const [state, setState] = useState<DatabaseState | null>(null);
  const [navState, setNavState] = useState<NavigationState>(() => parseHashRoute());
  const [currentView, setCurrentView] = useState<string>(() => {
    const initial = parseHashRoute();
    return initial.view;
  });
  const [selectedAdId, setSelectedAdId] = useState<string | null>(() => {
    const initial = parseHashRoute();
    return initial.view === 'detail' ? initial.entityId || null : null;
  });
  const [showArchitectureDossierModal, setShowArchitectureDossierModal] = useState<boolean>(false);
  const [showContextualDrawer, setShowContextualDrawer] = useState<boolean>(false);
  const [selectedHelpArticleId, setSelectedHelpArticleId] = useState<string | undefined>(() => {
    const initial = parseHashRoute();
    return initial.helpArticleId;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  // Synchronize navState with URL hash and legacy state variables
  useEffect(() => {
    const hash = buildHashRoute(navState);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    if (navState.view === 'detail') {
      setCurrentView('detail');
      setSelectedAdId(navState.entityId || null);
    } else {
      setCurrentView(navState.view);
      setSelectedAdId(null);
    }
  }, [navState]);

  // Listen to external hash changes (browser back/forward & direct URL entry)
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHashRoute(window.location.hash);
      setNavState(parsed);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const navigateTo = (view: string, subTab?: string, entityId?: string | null, context?: any) => {
    setNavState(prev => ({
      view: view as PrimaryView,
      subTab,
      entityId,
      context: context || { fromView: prev.view, fromSubTab: prev.subTab }
    }));
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset the CAMO database to demonstration seed data?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset-seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        navigateTo('dashboard');
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectAd = (id: string, subTab?: string) => {
    setNavState(prev => ({
      view: 'detail',
      entityId: id,
      subTab: subTab || 'matrix',
      context: { fromView: prev.view, fromSubTab: prev.subTab }
    }));
  };

  const handleAdProcessed = (requirement: ComplianceRequirement) => {
    fetchState();
    handleSelectAd(requirement.id);
  };

  const handleBreadcrumbNavigate = (item: BreadcrumbItem) => {
    if (item.view === 'detail' && item.entityId) {
      setNavState(prev => ({
        ...prev,
        view: 'detail',
        entityId: item.entityId,
        subTab: item.subTab
      }));
    } else {
      setNavState(prev => ({
        view: item.view,
        subTab: item.subTab,
        entityId: null,
        context: { fromView: prev.view, fromSubTab: prev.subTab }
      }));
    }
  };

  const handleBreadcrumbBack = () => {
    if (navState.context?.fromView) {
      setNavState({
        view: navState.context.fromView,
        subTab: navState.context.fromSubTab,
        entityId: null
      });
    } else if (navState.view === 'detail') {
      setNavState({
        view: 'ads',
        subTab: 'active'
      });
    } else {
      setNavState({
        view: 'dashboard'
      });
    }
  };

  const breadcrumbs = generateBreadcrumbs(navState, state);

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
        onSelectView={navigateTo}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(view, subTab) => {
            navigateTo(view, subTab);
            if (view === 'ads') setSelectedAdId(null);
          }}
          state={state}
        />

        {/* Content View Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumb Navigation Bar (Phase 1) */}
          <BreadcrumbBar
            breadcrumbs={breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
            onBack={handleBreadcrumbBack}
            canGoBack={breadcrumbs.length > 1}
          />

          <main className="flex-1 overflow-y-auto bg-[#0F172A]/70">
            {currentView === 'dashboard' && (
              <DashboardView
                state={state}
                onSelectView={navigateTo}
                onSelectAd={handleSelectAd}
              />
            )}

            {/* Workspace 1: Frota & Operações */}
            {currentView === 'fleet' && (
              <FleetView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                initialTab={navState.subTab as any}
              />
            )}

            {currentView === 'delivery' && (
              <AircraftDeliveryView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
              />
            )}

            {/* Workspace 2: Engenharia Regulatória */}
            {currentView === 'regulatory-intel' && (
              <RegulatoryIntelligenceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                initialTab={navState.subTab as any}
              />
            )}

            {currentView === 'ads' && (
              <AdsWorkspaceView
                state={state}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                onRefreshState={setState}
                onAdProcessed={handleAdProcessed}
                initialTab={navState.subTab as any}
              />
            )}

            {currentView === 'technical-references' && (
              <TechnicalReferencesView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                initialTab={navState.subTab as any}
              />
            )}

            {/* Workspace 3: Conformidade & Aeronavegabilidade */}
            {currentView === 'obligations' && (
              <ComplianceObligationsView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                initialTab={navState.subTab as any}
              />
            )}

            {/* Workspace 4: Governança, Conhecimento & Sistema */}
            {currentView === 'governance' && (
              <GovernanceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onNavigateView={navigateTo}
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
                onResetSeed={handleResetSeed}
                isResetting={isResetting}
                initialTab={navState.subTab as any}
                initialArticleId={selectedHelpArticleId}
              />
            )}

            {/* Contextual Detail View */}
            {currentView === 'detail' && selectedAdId && (
              <AdDetailView
                requirementId={selectedAdId}
                state={state}
                onBack={handleBreadcrumbBack}
                onRefreshState={setState}
              />
            )}

            {/* Backward-compatibility aliases for direct legacy view rendering */}
            {currentView === 'analysis-phase' && (
              <AdsWorkspaceView
                state={state}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                onRefreshState={setState}
                onAdProcessed={handleAdProcessed}
                initialTab="analysis"
              />
            )}

            {currentView === 'camo-register' && (
              <AdsWorkspaceView
                state={state}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                onRefreshState={setState}
                onAdProcessed={handleAdProcessed}
                initialTab="register"
              />
            )}

            {currentView === 'upload' && (
              <AdsWorkspaceView
                state={state}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                onRefreshState={setState}
                onAdProcessed={handleAdProcessed}
                initialTab="upload"
              />
            )}

            {currentView === 'fleet-ad-search' && (
              <FleetView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                initialTab="fleet-matrix"
              />
            )}

            {currentView === 'regulatory' && (
              <RegulatoryIntelligenceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onSelectView={navigateTo}
                initialTab="connectors"
              />
            )}

            {currentView === 'fapt' && (
              <ComplianceObligationsView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                initialTab="fapt"
              />
            )}

            {currentView === 'audit' && (
              <GovernanceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onNavigateView={navigateTo}
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
                onResetSeed={handleResetSeed}
                isResetting={isResetting}
                initialTab="audit"
              />
            )}

            {currentView === 'architecture' && (
              <GovernanceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onNavigateView={navigateTo}
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
                onResetSeed={handleResetSeed}
                isResetting={isResetting}
                initialTab="dossier"
              />
            )}

            {currentView === 'help' && (
              <GovernanceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onNavigateView={navigateTo}
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
                onResetSeed={handleResetSeed}
                isResetting={isResetting}
                initialTab="manual"
                initialArticleId={selectedHelpArticleId}
              />
            )}

            {currentView === 'knowledge' && (
              <GovernanceView
                state={state}
                onRefreshState={setState}
                onSelectAd={handleSelectAd}
                onNavigateView={navigateTo}
                onOpenDossier={() => setShowArchitectureDossierModal(true)}
                onResetSeed={handleResetSeed}
                isResetting={isResetting}
                initialTab="knowledge"
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
