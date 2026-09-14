import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Upload, 
  Layers, 
  RefreshCw, 
  ChevronRight, 
  FileSpreadsheet, 
  ExternalLink, 
  Lock, 
  Check, 
  X, 
  AlertCircle,
  FileCheck2,
  Calendar,
  Building2,
  Hash,
  Shield,
  UserCheck
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { 
  AircraftDeliveryAssessment, 
  DeliveryAdItem, 
  LessorConfrontationStatus, 
  DeliveryAssessmentStatus,
  DeliveryAircraftConfig,
  EvidenceType
} from '../types';

interface AircraftDeliveryViewProps {
  state: DatabaseState | null;
  onRefreshState: (newState: DatabaseState) => void;
  onSelectAd?: (adId: string) => void;
}

export default function AircraftDeliveryView({ state, onRefreshState, onSelectAd }: AircraftDeliveryViewProps) {
  const [assessments, setAssessments] = useState<AircraftDeliveryAssessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<AircraftDeliveryAssessment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showReconcileModal, setShowReconcileModal] = useState<DeliveryAdItem | null>(null);
  const [showAttachEvidenceModal, setShowAttachEvidenceModal] = useState<DeliveryAdItem | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState<any | null>(null);

  // Form states for New Assessment
  const [newRegistration, setNewRegistration] = useState('PR-DELIV');
  const [newMsn, setNewMsn] = useState('39812');
  const [newManufacturer, setNewManufacturer] = useState('Boeing');
  const [newModel, setNewModel] = useState('737-800');
  const [newLessor, setNewLessor] = useState('AeroCap Global Aviation');
  const [newOperator, setNewOperator] = useState('SkyAir CAMO');
  const [newType, setNewType] = useState<'DELIVERY' | 'ACQUISITION' | 'LEASE_RETURN' | 'PRE_PURCHASE'>('DELIVERY');
  const [newHours, setNewHours] = useState<number>(18500);
  const [newCycles, setNewCycles] = useState<number>(9400);

  // Reconcile Form State
  const [reconcileStatus, setReconcileStatus] = useState<'COMPLIED' | 'NOT_APPLICABLE' | 'OPEN' | 'NOT_RECORDED'>('COMPLIED');
  const [reconcileDate, setReconcileDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconcileDocs, setReconcileDocs] = useState('LESSOR-CRS-2024-991, SB-REPORT-101');
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Evidence Form State
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('CERTIFICATE_OF_RELEASE_TO_SERVICE');
  const [docRef, setDocRef] = useState('EASA-FORM-1-98214');
  const [docDescription, setDocDescription] = useState('Authorized Release Certificate / Form 1 for AD task accomplishment');
  const [accomplishmentDate, setAccomplishmentDate] = useState(new Date().toISOString().split('T')[0]);

  // Load Assessments
  const loadAssessments = async (preferredId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/delivery-assessments');
      if (!res.ok) throw new Error(`HTTP ${res.status} loading assessments`);
      const data: AircraftDeliveryAssessment[] = await res.json();
      setAssessments(data);
      if (data.length > 0) {
        const idToSelect = preferredId || selectedAssessmentId || data[0].id;
        setSelectedAssessmentId(idToSelect);
        const match = data.find(a => a.id === idToSelect) || data[0];
        setActiveAssessment(match);
      } else {
        setSelectedAssessmentId(null);
        setActiveAssessment(null);
      }
    } catch (err: any) {
      console.error('Failed to load delivery assessments:', err);
      setError(err.message || 'Error loading delivery assessments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleSelectAssessment = (id: string) => {
    setSelectedAssessmentId(id);
    const match = assessments.find(a => a.id === id);
    if (match) {
      setActiveAssessment(match);
    }
  };

  // Trigger Regulatory Discovery
  const handleExecuteDiscovery = async () => {
    if (!activeAssessment) return;
    try {
      setActionLoading('discovery');
      setError(null);
      const res = await fetch(`/api/delivery-assessments/${activeAssessment.id}/discover`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Discovery execution failed');
      const data = await res.json();
      setSuccessMessage(`Discovery complete: Discovered ${data.totalDiscovered} Airworthiness Directives for candidate aircraft.`);
      await loadAssessments(activeAssessment.id);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error executing regulatory discovery');
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger Batch Rule Engine Analysis
  const handleBatchAnalyze = async () => {
    if (!activeAssessment) return;
    try {
      setActionLoading('batch');
      setError(null);
      const res = await fetch(`/api/delivery-assessments/${activeAssessment.id}/batch-analyze`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Batch evaluation failed');
      const data = await res.json();
      setSuccessMessage(`Compliance analysis complete: Evaluated ${data.analyzedCount} AD obligations against CAMO Rule Engine V2.`);
      await loadAssessments(activeAssessment.id);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error executing batch analysis');
    } finally {
      setActionLoading(null);
    }
  };

  // Reconcile Lessor Declaration
  const handleSubmitReconcile = async () => {
    if (!activeAssessment || !showReconcileModal) return;
    try {
      setActionLoading('reconcile');
      setError(null);
      const res = await fetch(`/api/delivery-assessments/${activeAssessment.id}/reconcile-lessor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adNumber: showReconcileModal.adNumber,
          declaration: {
            complianceStatus: reconcileStatus,
            accomplishmentDate: reconcileDate,
            documentReferences: reconcileDocs.split(',').map(s => s.trim()).filter(Boolean),
            notes: reconcileNotes
          }
        })
      });
      if (!res.ok) throw new Error('Failed to record lessor declaration');
      setShowReconcileModal(null);
      await loadAssessments(activeAssessment.id);
      setSuccessMessage(`Lessor declaration updated for ${showReconcileModal.adNumber}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error reconciling lessor declaration');
    } finally {
      setActionLoading(null);
    }
  };

  // Attach Lessor Evidence
  const handleSubmitEvidence = async () => {
    if (!activeAssessment || !showAttachEvidenceModal) return;
    try {
      setActionLoading('evidence');
      setError(null);
      const res = await fetch(`/api/delivery-assessments/${activeAssessment.id}/attach-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adNumber: showAttachEvidenceModal.adNumber,
          evidenceType,
          documentReference: docRef,
          description: docDescription,
          accomplishmentDate
        })
      });
      if (!res.ok) throw new Error('Failed to attach maintenance evidence');
      setShowAttachEvidenceModal(null);
      await loadAssessments(activeAssessment.id);
      setSuccessMessage(`Verified maintenance evidence attached to aircraft.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error attaching evidence');
    } finally {
      setActionLoading(null);
    }
  };

  // Finalize Delivery Assessment
  const handleFinalize = async (overrideDiscrepancies = false) => {
    if (!activeAssessment) return;
    try {
      setActionLoading('finalize');
      setError(null);
      const res = await fetch(`/api/delivery-assessments/${activeAssessment.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideDiscrepancies,
          justification: overrideDiscrepancies ? 'Chief CAMO Engineer approved conditional delivery acceptance under authorized CAMO deviation.' : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to finalize delivery assessment');
      }
      setShowFinalizeModal(false);
      setShowSnapshotModal(data.snapshot);
      await loadAssessments(activeAssessment.id);
      setSuccessMessage(`Assessment finalized. SHA-256 seal: ${data.snapshot?.auditHash?.substring(0, 16)}...`);
    } catch (err: any) {
      setError(err.message || 'Error finalizing assessment');
    } finally {
      setActionLoading(null);
    }
  };

  // Create New Delivery Assessment
  const handleCreateAssessment = async () => {
    try {
      setActionLoading('create');
      setError(null);
      const aircraftConfig: DeliveryAircraftConfig = {
        registration: newRegistration.trim(),
        msn: newMsn.trim(),
        manufacturer: newManufacturer.trim(),
        model: newModel.trim(),
        family: newModel.startsWith('737') ? 'Boeing 737' : 'Airbus A320',
        totalFlightHours: Number(newHours),
        totalCycles: Number(newCycles),
        lessor: newLessor.trim(),
        currentOperator: newOperator.trim(),
        engines: [
          {
            position: 'Pos 1',
            manufacturer: 'CFM International',
            model: 'CFM56-7B26',
            serialNumber: `ENG-01-${newMsn}`,
            totalHours: Number(newHours),
            totalCycles: Number(newCycles)
          },
          {
            position: 'Pos 2',
            manufacturer: 'CFM International',
            model: 'CFM56-7B26',
            serialNumber: `ENG-02-${newMsn}`,
            totalHours: Number(newHours),
            totalCycles: Number(newCycles)
          }
        ],
        components: [
          {
            position: 'Elevator Tab Control',
            description: 'Elevator Tab Control Pushrod & Bushing Assembly',
            partNumber: '12345-01',
            serialNumber: `SN-${newMsn}-45`
          }
        ]
      };

      const res = await fetch('/api/delivery-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aircraftConfig,
          assessmentType: newType,
          lessor: newLessor.trim(),
          operator: newOperator.trim(),
          targetDeliveryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      });

      if (!res.ok) throw new Error('Failed to create assessment');
      const created: AircraftDeliveryAssessment = await res.json();
      setShowCreateModal(false);
      await loadAssessments(created.id);
      const reg = created.aircraftConfig?.registration || created.aircraftRegistration || 'Aircraft';
      const msn = created.aircraftConfig?.msn || created.aircraftMsn || '';
      setSuccessMessage(`Assessment created for ${reg} (MSN ${msn}).`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error creating assessment');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter Items
  const items = activeAssessment?.adItems || [];
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.adNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.issuingAuthority && item.issuingAuthority.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'MATCH' && item.confrontationStatus === 'MATCH') ||
      (statusFilter === 'DISCREPANCY' && item.confrontationStatus === 'DISCREPANCY') ||
      (statusFilter === 'PENDING_DOCS' && item.confrontationStatus === 'PENDING_DOCUMENTATION') ||
      (statusFilter === 'UNVERIFIED' && item.confrontationStatus === 'UNVERIFIED') ||
      (statusFilter === 'PENDING_ANALYSIS' && (item.registerAnalysisStatus === 'PENDING_ANALYSIS' || item.confrontationStatus === 'PENDING_ANALYSIS' || item.applicabilityStatus === 'NOT_DETERMINED'));

    const matchesPriority = 
      priorityFilter === 'ALL' || item.operationalPriority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const matchCount = items.filter(i => i.confrontationStatus === 'MATCH').length;
  const discrepancyCount = items.filter(i => i.confrontationStatus === 'DISCREPANCY').length;
  const pendingDocsCount = items.filter(i => i.confrontationStatus === 'PENDING_DOCUMENTATION').length;
  const unverifiedCount = items.filter(i => i.confrontationStatus === 'UNVERIFIED').length;
  const pendingAnalysisCount = items.filter(i => 
    i.registerAnalysisStatus === 'PENDING_ANALYSIS' || 
    i.confrontationStatus === 'PENDING_ANALYSIS' || 
    i.applicabilityStatus === 'NOT_DETERMINED'
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: CAMO Engine Phase 7 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Aircraft Acquisition & Delivery Compliance
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                FASE 7 — CAMO v7.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive AD baseline discovery, lessor statement confrontation, and cryptographic pre-induction acceptance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery Assessment</span>
          </button>
          <button
            onClick={() => loadAssessments(activeAssessment?.id)}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh Assessments"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Aircraft Selector & Key Specs */}
      {assessments.length > 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate Aircraft:</label>
              <select
                value={selectedAssessmentId || ''}
                onChange={(e) => handleSelectAssessment(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-500"
              >
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.aircraftRegistration} ({a.aircraftModel} • MSN {a.aircraftMsn}) — {a.assessmentType}
                  </option>
                ))}
              </select>
            </div>

            {activeAssessment && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  activeAssessment.status === 'ACCEPTED'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : activeAssessment.status === 'REJECTED'
                    ? 'bg-red-500/10 text-red-300 border-red-500/30'
                    : activeAssessment.status === 'CONFRONTATION_REVIEW'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}>
                  Status: {activeAssessment.status}
                </span>

                <button
                  onClick={handleExecuteDiscovery}
                  disabled={actionLoading === 'discovery'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold rounded-lg transition"
                >
                  <Search className={`w-3.5 h-3.5 ${actionLoading === 'discovery' ? 'animate-spin' : ''}`} />
                  <span>Run AD Discovery</span>
                </button>

                <button
                  onClick={handleBatchAnalyze}
                  disabled={actionLoading === 'batch' || items.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-lg transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'batch' ? 'animate-spin' : ''}`} />
                  <span>Evaluate Compliance</span>
                </button>

                <button
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={activeAssessment.status === 'ACCEPTED' || actionLoading === 'finalize'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Accept / Finalize</span>
                </button>
              </div>
            )}
          </div>

          {/* Aircraft Configuration Metrics Strip */}
          {activeAssessment && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Registration</span>
                <span className="font-bold text-white text-sm">{activeAssessment.aircraftRegistration}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">MSN / Serial</span>
                <span className="font-bold text-white text-sm">{activeAssessment.aircraftMsn}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Model / Type</span>
                <span className="font-bold text-white text-sm">{activeAssessment.aircraftModel}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Lessor Owner</span>
                <span className="font-bold text-cyan-300 text-sm truncate block">{activeAssessment.lessor}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Total TT / Cycles</span>
                <span className="font-bold text-slate-200 text-sm">
                  {activeAssessment.aircraftConfig?.totalFlightHours?.toLocaleString()} FH / {activeAssessment.aircraftConfig?.totalCycles?.toLocaleString()} FC
                </span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Digital Hash</span>
                <span className="font-mono text-indigo-300 text-[11px] truncate block" title={activeAssessment.finalSnapshot?.auditHash || 'Pending acceptance'}>
                  {activeAssessment.finalSnapshot?.auditHash ? `${activeAssessment.finalSnapshot.auditHash.substring(0, 8)}...` : 'UNSEALED'}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-12 text-center">
          <Plane className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Aircraft Delivery Assessment Active</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Initialize an assessment for an incoming aircraft, lease transition, or fleet acquisition to discover and verify all mandatory airworthiness obligations.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Assessment</span>
          </button>
        </div>
      )}

      {/* 5 Confrontation & Status Metric Cards */}
      {activeAssessment && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Matches */}
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Lessor Matches</span>
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{matchCount}</span>
              <span className="text-[11px] text-emerald-400 font-medium">ADs Verified</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Lessor claim matches verified CAMO compliance</p>
          </div>

          {/* Card 2: Discrepancies */}
          <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Discrepancies</span>
              <span className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{discrepancyCount}</span>
              <span className="text-[11px] text-red-400 font-medium">Blocking Conflicts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Contradiction between Lessor and CAMO</p>
          </div>

          {/* Card 3: Pending Documentation */}
          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Missing Evidence</span>
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{pendingDocsCount}</span>
              <span className="text-[11px] text-amber-400 font-medium">Awaiting Docs</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Lessor claimed COMPLIED without valid CRS</p>
          </div>

          {/* Card 4: Pendentes de Análise */}
          <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-300">Pendente de Análise</span>
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{pendingAnalysisCount}</span>
              <span className="text-[11px] text-amber-300 font-medium">No Register</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">ADs aguardando análise técnica no CAMO</p>
          </div>

          {/* Card 5: Total Baseline ADs */}
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Discovered Baseline</span>
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{items.length}</span>
              <span className="text-[11px] text-indigo-400 font-medium">AD Mandates</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{unverifiedCount} pending initial reconciliation</p>
          </div>
        </div>
      )}

      {/* AD Confrontation Matrix Table */}
      {activeAssessment && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm overflow-hidden shadow-xl">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>AD Confrontation Matrix (Lessor vs CAMO Engine)</span>
              </h2>
              <span className="text-xs text-slate-400">
                ({filteredItems.length} of {items.length} items)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by AD # or Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Confrontation Statuses</option>
                <option value="PENDING_ANALYSIS">PENDENTE DE ANÁLISE (CAMO Register)</option>
                <option value="MATCH">MATCH (Consistent)</option>
                <option value="DISCREPANCY">DISCREPANCY (Conflict)</option>
                <option value="PENDING_DOCS">PENDING_DOCUMENTATION</option>
                <option value="UNVERIFIED">UNVERIFIED (Not recorded)</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/70 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">AD Number & Title</th>
                  <th className="py-3 px-3">Applicability</th>
                  <th className="py-3 px-3">Lessor Claim</th>
                  <th className="py-3 px-3">CAMO Engine</th>
                  <th className="py-3 px-3">Evidence</th>
                  <th className="py-3 px-3">Confrontation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      No Airworthiness Directives match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{item.adNumber}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {item.issuingAuthority}
                          </span>
                          {item.ataChapter && (
                            <span className="text-[9px] font-mono px-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                              ATA {item.ataChapter}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5" title={item.title}>
                          {item.title}
                        </p>
                      </td>

                      <td className="py-3 px-3">
                        {item.registerAnalysisStatus === 'PENDING_ANALYSIS' || item.applicabilityStatus === 'NOT_DETERMINED' ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              PENDENTE ANÁLISE
                            </span>
                            <span className="block text-[10px] text-amber-400/80 font-mono mt-0.5">
                              Pendente no Register
                            </span>
                          </div>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.applicabilityStatus === 'APPLICABILITY_CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : item.applicabilityStatus === 'NOT_APPLICABLE'
                              ? 'bg-slate-700/50 text-slate-400'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.applicabilityStatus}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.lessorDeclaration ? (
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.lessorDeclaration.complianceStatus === 'COMPLIED'
                                ? 'bg-indigo-500/10 text-indigo-300'
                                : item.lessorDeclaration.complianceStatus === 'NOT_APPLICABLE'
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-red-500/10 text-red-300'
                            }`}>
                              {item.lessorDeclaration.complianceStatus}
                            </span>
                            {item.lessorDeclaration.accomplishmentDate && (
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                                {item.lessorDeclaration.accomplishmentDate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Not recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.registerAnalysisStatus === 'PENDING_ANALYSIS' ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              PENDENTE DE ANÁLISE
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              Sem regra CAMO
                            </span>
                          </div>
                        ) : item.regulatoryComplianceStatus ? (
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.regulatoryComplianceStatus === 'COMPLIED'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : item.regulatoryComplianceStatus === 'NOT_APPLICABLE'
                                ? 'bg-slate-700 text-slate-300'
                                : item.regulatoryComplianceStatus === 'OVERDUE'
                                ? 'bg-red-500/20 text-red-300 font-bold animate-pulse'
                                : 'bg-amber-500/10 text-amber-300'
                            }`}>
                              {item.regulatoryComplianceStatus}
                            </span>
                            {item.controllingDueDate && (
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                Due: {item.controllingDueDate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Pending rule evaluation</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-emerald-400 font-semibold">{item.evidenceSummary.valid} valid</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-400">{item.evidenceSummary.total} total</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.confrontationStatus === 'MATCH'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : item.confrontationStatus === 'DISCREPANCY'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : item.confrontationStatus === 'PENDING_DOCUMENTATION'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {item.confrontationStatus === 'MATCH' && <Check className="w-3 h-3 text-emerald-400" />}
                          {item.confrontationStatus === 'DISCREPANCY' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                          {item.confrontationStatus === 'PENDING_DOCUMENTATION' && <Clock className="w-3 h-3 text-amber-400" />}
                          <span>{item.confrontationStatus}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setShowReconcileModal(item);
                              if (item.lessorDeclaration) {
                                setReconcileStatus(item.lessorDeclaration.complianceStatus);
                                setReconcileDate(item.lessorDeclaration.accomplishmentDate || '');
                                setReconcileDocs((item.lessorDeclaration.documentReferences || []).join(', '));
                              }
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded text-[11px] font-semibold transition"
                            title="Reconcile Lessor Declaration"
                          >
                            Claim
                          </button>
                          <button
                            onClick={() => setShowAttachEvidenceModal(item)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded text-[11px] font-semibold transition"
                            title="Attach Maintenance Evidence"
                          >
                            Evidence
                          </button>
                          {item.camoRequirementId && onSelectAd && (
                            <button
                              onClick={() => onSelectAd(item.camoRequirementId!)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="View Full CAMO Obligation"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-indigo-400" />
                <span>New Aircraft Delivery Assessment</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Registration</label>
                <input
                  type="text"
                  value={newRegistration}
                  onChange={(e) => setNewRegistration(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">MSN (Serial Number)</label>
                <input
                  type="text"
                  value={newMsn}
                  onChange={(e) => setNewMsn(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={newManufacturer}
                  onChange={(e) => setNewManufacturer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Model / Variant</label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Lessor / Owner</label>
                <input
                  type="text"
                  value={newLessor}
                  onChange={(e) => setNewLessor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Operating Airline</label>
                <input
                  type="text"
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Total Flight Hours</label>
                <input
                  type="number"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Total Flight Cycles</label>
                <input
                  type="number"
                  value={newCycles}
                  onChange={(e) => setNewCycles(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Assessment Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="DELIVERY">DELIVERY (New delivery acceptance)</option>
                  <option value="ACQUISITION">ACQUISITION (Fleet acquisition)</option>
                  <option value="LEASE_RETURN">LEASE_RETURN (Redelivery transition)</option>
                  <option value="PRE_PURCHASE">PRE_PURCHASE (Pre-purchase inspection)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssessment}
                disabled={actionLoading === 'create'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs"
              >
                {actionLoading === 'create' ? 'Creating...' : 'Initialize Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reconcile Lessor Declaration Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Record Lessor Statement</h3>
                <span className="text-xs font-mono text-indigo-300">{showReconcileModal.adNumber}</span>
              </div>
              <button onClick={() => setShowReconcileModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Lessor Compliance Claim</label>
                <select
                  value={reconcileStatus}
                  onChange={(e) => setReconcileStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="COMPLIED">COMPLIED (Lessor states AD performed)</option>
                  <option value="NOT_APPLICABLE">NOT APPLICABLE (Claimed not affected)</option>
                  <option value="OPEN">OPEN (Not yet accomplished)</option>
                  <option value="NOT_RECORDED">NOT RECORDED (Unverified)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Accomplishment Date</label>
                <input
                  type="date"
                  value={reconcileDate}
                  onChange={(e) => setReconcileDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Document References (comma-separated)</label>
                <input
                  type="text"
                  value={reconcileDocs}
                  onChange={(e) => setReconcileDocs(e.target.value)}
                  placeholder="e.g. CRS-2024-01, LOGBOOK-PG-42"
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notes / Lessor Comments</label>
                <textarea
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowReconcileModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReconcile}
                disabled={actionLoading === 'reconcile'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs"
              >
                {actionLoading === 'reconcile' ? 'Saving...' : 'Reconcile Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Attach Lessor Maintenance Evidence Modal */}
      {showAttachEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Attach Maintenance Evidence</h3>
                <span className="text-xs font-mono text-emerald-400">{showAttachEvidenceModal.adNumber}</span>
              </div>
              <button onClick={() => setShowAttachEvidenceModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Evidence Document Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono text-xs"
                >
                  <option value="CERTIFICATE_OF_RELEASE_TO_SERVICE">CERTIFICATE_OF_RELEASE_TO_SERVICE (CRS / Release)</option>
                  <option value="LOGBOOK_ENTRY">LOGBOOK_ENTRY (Aircraft Tech Log / Maintenance Record)</option>
                  <option value="WORK_ORDER_PACKAGE">WORK_ORDER_PACKAGE (MRO Job Card / Accomplishment)</option>
                  <option value="ARC_AIRWORTHINESS_REVIEW_CERTIFICATE">ARC_AIRWORTHINESS_REVIEW_CERTIFICATE (Form 15b/15c)</option>
                  <option value="EASA_FORM_ONE">EASA_FORM_ONE (Authorized Release Certificate)</option>
                  <option value="FAA_FORM_8130_3">FAA_FORM_8130_3 (Authorized Release Tag)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Document Reference / Number</label>
                <input
                  type="text"
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Accomplishment Date</label>
                <input
                  type="date"
                  value={accomplishmentDate}
                  onChange={(e) => setAccomplishmentDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description / Scope of Work</label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAttachEvidenceModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEvidence}
                disabled={actionLoading === 'evidence'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
              >
                {actionLoading === 'evidence' ? 'Verifying...' : 'Attach & Verify Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Finalize & Generate Digital Seal Modal */}
      {showFinalizeModal && activeAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Finalize Delivery Acceptance Seal</span>
              </h3>
              <button onClick={() => setShowFinalizeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Finalizing the delivery assessment seals the candidate aircraft baseline in the CAMO registry and calculates a tamper-evident SHA-256 cryptographic audit seal.
              </p>

              <div className="bg-slate-800/60 rounded-lg p-3 space-y-1.5 border border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Aircraft:</span>
                  <span className="font-bold text-white">{activeAssessment.aircraftRegistration} (MSN {activeAssessment.aircraftMsn})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Mandatory ADs:</span>
                  <span className="font-mono text-white">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lessor Matches:</span>
                  <span className="font-mono text-emerald-400 font-bold">{matchCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Discrepancies:</span>
                  <span className={`font-mono font-bold ${discrepancyCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {discrepancyCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pending Documentation:</span>
                  <span className={`font-mono font-bold ${pendingDocsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {pendingDocsCount}
                  </span>
                </div>
              </div>

              {discrepancyCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Warning: There are {discrepancyCount} active discrepancies between lessor declarations and CAMO calculations. Proceeding requires Chief CAMO Engineer authorized override.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              {discrepancyCount > 0 ? (
                <button
                  onClick={() => handleFinalize(true)}
                  disabled={actionLoading === 'finalize'}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs"
                >
                  {actionLoading === 'finalize' ? 'Sealing...' : 'Approve with CAMO Override'}
                </button>
              ) : (
                <button
                  onClick={() => handleFinalize(false)}
                  disabled={actionLoading === 'finalize'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-lg"
                >
                  {actionLoading === 'finalize' ? 'Sealing...' : 'Accept & Issue SHA-256 Seal'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Digital Seal Snapshot Details */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cryptographic Delivery Seal</h3>
                  <span className="text-xs text-emerald-400 font-mono">ACCEPTANCE VERIFIED</span>
                </div>
              </div>
              <button onClick={() => setShowSnapshotModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                <span className="text-slate-500 block text-[10px] uppercase">SHA-256 Integrity Hash</span>
                <span className="text-emerald-300 font-bold break-all text-[11px] block mt-1">
                  {showSnapshotModal.auditHash}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300 bg-slate-800/40 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500 block text-[10px]">Snapshot ID</span>
                  <span className="font-mono text-white text-xs">{showSnapshotModal.snapshotId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Aircraft Registration</span>
                  <span className="font-bold text-white text-xs">{showSnapshotModal.aircraftRegistration}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Acceptance Status</span>
                  <span className="font-bold text-emerald-400 text-xs">{showSnapshotModal.finalStatus}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Timestamp</span>
                  <span className="font-mono text-slate-300 text-xs">{showSnapshotModal.sealedAt}</span>
                </div>

                {showSnapshotModal.complianceSummary?.pendingAnalysis !== undefined && (
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/30 p-2 rounded text-amber-300 text-[11px] flex items-center justify-between">
                    <span>ADs Pendentes de Análise Técnica no Register:</span>
                    <span className="font-bold font-mono text-amber-400">{showSnapshotModal.complianceSummary.pendingAnalysis}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSnapshotModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
