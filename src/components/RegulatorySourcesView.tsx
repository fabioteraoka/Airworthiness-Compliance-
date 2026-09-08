import { useState, useEffect } from 'react';
import { 
  Globe2, 
  Search, 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Filter, 
  Layers, 
  Plane, 
  ArrowRight, 
  Download, 
  Database,
  Building2,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  Radio,
  Sparkles,
  Calendar,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import { 
  RegulatorySource, 
  RegulatorySourceRecord, 
  FleetRegulatoryScreeningReport, 
  SourceReconciliationResult,
  OfficialDocumentRecord,
  RegulatoryDiscoveryRecord,
  RegulatoryDiscoveryScanSummary,
  DiscoveryStatus,
  RegulatoryScreeningAssessment,
  RegulatoryScreeningSummary,
  CompliancePipelineExecution,
  BatchPipelineExecutionSummary,
  PipelineExecutionStatus
} from '../types';
import { DatabaseState } from '../../server/dataStore';
import PipelineExecutionModal from './PipelineExecutionModal';
import PipelineMonitoringTab from './PipelineMonitoringTab';

interface RegulatorySourcesViewProps {
  state: DatabaseState | null;
  onRefreshState: (newState: DatabaseState) => void;
  onSelectAd?: (id: string) => void;
}

export default function RegulatorySourcesView({
  state,
  onRefreshState,
  onSelectAd
}: RegulatorySourcesViewProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'DISCOVERY' | 'PIPELINE' | 'SEARCH' | 'VAULT'>('DISCOVERY');

  // Discovery Engine State (Phase 5.1 & 5.2)
  const [discoveries, setDiscoveries] = useState<RegulatoryDiscoveryRecord[]>([]);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string | null>(null);
  const [incrementalStartDate, setIncrementalStartDate] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessSummary, setScanSuccessSummary] = useState<RegulatoryDiscoveryScanSummary | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isIncremental, setIsIncremental] = useState<boolean>(false);
  const [maxPages, setMaxPages] = useState<number>(5);
  const [discoveryFilter, setDiscoveryFilter] = useState<'ALL' | 'NEW' | 'ALREADY_KNOWN'>('ALL');
  const [discoverySearchQuery, setDiscoverySearchQuery] = useState<string>('');
  const [selectedDiscovery, setSelectedDiscovery] = useState<RegulatoryDiscoveryRecord | null>(null);

  // Fleet Screening State (Phase 5.2)
  const [screeningAssessments, setScreeningAssessments] = useState<RegulatoryScreeningAssessment[]>([]);
  const [isScreeningDiscovery, setIsScreeningDiscovery] = useState<boolean>(false);
  const [discoveryScreeningSummary, setDiscoveryScreeningSummary] = useState<RegulatoryScreeningSummary | null>(null);
  const [isBatchScreening, setIsBatchScreening] = useState<boolean>(false);
  const [batchScreeningMessage, setBatchScreeningMessage] = useState<string | null>(null);

  // Phase 5.3: Automated End-to-End Pipeline State
  const [pipelineExecutions, setPipelineExecutions] = useState<CompliancePipelineExecution[]>([]);
  const [activeExecutionModal, setActiveExecutionModal] = useState<CompliancePipelineExecution | null>(null);
  const [isExecutingPipeline, setIsExecutingPipeline] = useState<boolean>(false);
  const [isRetryingPipeline, setIsRetryingPipeline] = useState<boolean>(false);
  const [isBatchPipelineRunning, setIsBatchPipelineRunning] = useState<boolean>(false);
  const [pipelineFilter, setPipelineFilter] = useState<'ALL' | 'COMPLETED' | 'COMPLETED_NO_MATCH' | 'REVIEW_REQUIRED' | 'FAILED'>('ALL');
  const [pipelineSearchQuery, setPipelineSearchQuery] = useState<string>('');
  const [batchPipelineSummary, setBatchPipelineSummary] = useState<BatchPipelineExecutionSummary | null>(null);

  // Search & Acquisition State (Phase 3 & 4)
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('2020-24-02');
  const [searchResults, setSearchResults] = useState<RegulatorySourceRecord[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RegulatorySourceRecord | null>(null);
  const [screeningReport, setScreeningReport] = useState<FleetRegulatoryScreeningReport | null>(null);
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [reconciliationResult, setReconciliationResult] = useState<SourceReconciliationResult | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [importingDocNumber, setImportingDocNumber] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [acquiredDocs, setAcquiredDocs] = useState<OfficialDocumentRecord[]>([]);
  const [isAcquiring, setIsAcquiring] = useState<boolean>(false);
  const [isAnalyzingAcquired, setIsAnalyzingAcquired] = useState<boolean>(false);
  const [acquisitionFeedback, setAcquisitionFeedback] = useState<{
    type: 'success' | 'duplicate' | 'error';
    message: string;
    doc?: OfficialDocumentRecord;
  } | null>(null);

  // Load initial data on mount
  useEffect(() => {
    fetchSources();
    fetchAcquiredDocs();
    fetchDiscoveries();
    fetchScreenings();
    fetchPipelineExecutions();

    // Default dates for scan (last 14 days)
    const today = new Date().toISOString().split('T')[0];
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];
    setStartDate(twoWeeksAgoStr);
    setEndDate(today);
  }, []);

  const fetchPipelineExecutions = async () => {
    try {
      const res = await fetch('/api/pipeline/executions');
      if (res.ok) {
        const data = await res.json();
        setPipelineExecutions(data.executions || []);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline executions:', err);
    }
  };

  const fetchScreenings = async () => {
    try {
      const res = await fetch('/api/regulatory/screenings/all');
      if (res.ok) {
        const data = await res.json();
        setScreeningAssessments(data.assessments || []);
      }
    } catch (err) {
      console.error('Failed to fetch screening assessments:', err);
    }
  };

  const fetchDiscoveries = async () => {
    try {
      const res = await fetch('/api/regulatory/discovery');
      if (res.ok) {
        const data = await res.json();
        setDiscoveries(data.discoveries || []);
        setLastScanTimestamp(data.lastSuccessfulScan || null);
        if (data.incrementalStartDate) {
          setIncrementalStartDate(data.incrementalStartDate);
        }
      }
    } catch (err) {
      console.error('Failed to fetch regulatory discoveries:', err);
    }
  };

  // Phase 5.2: Screen Single Discovery against Fleet
  const handleScreenDiscovery = async (discovery: RegulatoryDiscoveryRecord) => {
    setIsScreeningDiscovery(true);
    setDiscoveryScreeningSummary(null);
    try {
      const res = await fetch(`/api/regulatory/discovery/${discovery.id}/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to screen discovery against fleet.');
      }

      setDiscoveryScreeningSummary(data.summary);
      if (data.state) {
        onRefreshState(data.state);
      }
      await fetchScreenings();
    } catch (err: any) {
      console.error('Screening execution error:', err);
      alert(`Screening Error: ${err.message}`);
    } finally {
      setIsScreeningDiscovery(false);
    }
  };

  // Phase 5.3: Execute End-to-End Pipeline for a Single Discovery Record
  const handleExecutePipeline = async (
    discovery: RegulatoryDiscoveryRecord,
    options: { forceFreshDownload?: boolean; forceFullRun?: boolean } = {}
  ) => {
    setIsExecutingPipeline(true);
    try {
      const res = await fetch(`/api/pipeline/execute-discovery/${discovery.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            ...options,
            triggeredBy: 'MANUAL_TRIGGER'
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pipeline execution failed.');
      }

      if (data.execution) {
        setActiveExecutionModal(data.execution);
      }

      if (data.state) {
        onRefreshState(data.state);
      }

      await fetchPipelineExecutions();
      await fetchScreenings();
      await fetchAcquiredDocs();
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      alert(`Pipeline Execution Error: ${err.message}`);
    } finally {
      setIsExecutingPipeline(false);
    }
  };

  // Phase 5.3: Execute Batch Pipeline for all potential matches
  const handleBatchPipelineAll = async (onlyMatches: boolean = true) => {
    setIsBatchPipelineRunning(true);
    setBatchPipelineSummary(null);
    try {
      let targetIds: string[] = [];
      if (onlyMatches) {
        // Collect discoveries with POTENTIAL_MATCH or INSUFFICIENT_METADATA or unscreened
        targetIds = discoveries.filter(d => {
          const screenings = screeningAssessments.filter(a => a.discoveryRecordId === d.id || a.discoveryRecordId === d.documentNumber);
          const hasPotentialMatch = screenings.some(a => a.screeningResult === 'POTENTIAL_MATCH');
          const hasInsufficient = screenings.some(a => a.screeningResult === 'INSUFFICIENT_METADATA');
          return screenings.length === 0 || hasPotentialMatch || hasInsufficient;
        }).map(d => d.id);
      } else {
        targetIds = discoveries.map(d => d.id);
      }

      if (targetIds.length === 0) {
        alert('No target discovery records found for pipeline execution.');
        return;
      }

      const res = await fetch('/api/pipeline/execute-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoveryIds: targetIds,
          options: {
            triggeredBy: 'BATCH_RUNNER'
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Batch pipeline execution failed.');
      }

      setBatchPipelineSummary(data.summary);
      if (data.state) {
        onRefreshState(data.state);
      }

      await fetchPipelineExecutions();
      await fetchScreenings();
      await fetchAcquiredDocs();
    } catch (err: any) {
      console.error('Batch pipeline execution error:', err);
      alert(`Batch Pipeline Error: ${err.message}`);
    } finally {
      setIsBatchPipelineRunning(false);
    }
  };

  // Phase 5.3: Scan Federal Register + Run End-to-End Pipeline
  const handleScanAndPipeline = async () => {
    setIsScanning(true);
    setIsBatchPipelineRunning(true);
    try {
      const res = await fetch('/api/pipeline/execute-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          incremental: isIncremental,
          maxPages
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Scan and pipeline execution failed.');
      }

      setScanSuccessSummary(data.scanSummary);
      setBatchPipelineSummary(data.pipelineSummary);

      if (data.state) {
        onRefreshState(data.state);
      }

      await fetchDiscoveries();
      await fetchPipelineExecutions();
      await fetchScreenings();
      await fetchAcquiredDocs();
    } catch (err: any) {
      console.error('Scan & Pipeline error:', err);
      alert(`Scan & Pipeline Error: ${err.message}`);
    } finally {
      setIsScanning(false);
      setIsBatchPipelineRunning(false);
    }
  };

  // Phase 5.3: Retry a Failed / Review-Required Pipeline Execution
  const handleRetryPipeline = async (
    executionId: string,
    options: { forceFreshDownload?: boolean; forceFullRun?: boolean } = {}
  ) => {
    setIsRetryingPipeline(true);
    try {
      const res = await fetch(`/api/pipeline/executions/${executionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pipeline retry failed.');
      }

      if (data.execution) {
        setActiveExecutionModal(data.execution);
      }

      if (data.state) {
        onRefreshState(data.state);
      }

      await fetchPipelineExecutions();
      await fetchScreenings();
      await fetchAcquiredDocs();
    } catch (err: any) {
      console.error('Pipeline retry error:', err);
      alert(`Retry Error: ${err.message}`);
    } finally {
      setIsRetryingPipeline(false);
    }
  };

  // Phase 5.2: Batch Screen All Discoveries against Fleet
  const handleBatchScreenAll = async () => {
    setIsBatchScreening(true);
    setBatchScreeningMessage(null);
    try {
      const res = await fetch('/api/regulatory/discovery/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Batch screening failed.');
      }

      setBatchScreeningMessage(
        `Batch screening complete: ${data.totalPotentialMatches} Potential Match(es), ${data.totalNoMatches} No Match, ${data.totalInsufficientMetadata} Insufficient Metadata across ${data.count} discovery record(s).`
      );
      if (data.state) {
        onRefreshState(data.state);
      }
      await fetchScreenings();
    } catch (err: any) {
      console.error('Batch screening error:', err);
      alert(`Batch Screening Error: ${err.message}`);
    } finally {
      setIsBatchScreening(false);
    }
  };

  const fetchAcquiredDocs = async () => {
    try {
      const res = await fetch('/api/regulatory/acquired-documents');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setAcquiredDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch acquired documents:', err);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/regulatory/sources');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to fetch regulatory sources:', err);
    }
  };

  // Phase 5.1: Trigger Regulatory Discovery Scan
  const handleExecuteScan = async (useIncremental: boolean = false) => {
    setIsScanning(true);
    setScanError(null);
    setScanSuccessSummary(null);

    try {
      const payload: any = {
        maxPages: Number(maxPages) || 5,
        perPage: 20
      };

      if (useIncremental || isIncremental) {
        payload.incremental = true;
      } else {
        if (!startDate || !endDate) {
          throw new Error('Please specify both Start Date and End Date for the scan.');
        }
        if (startDate > endDate) {
          throw new Error(`Start Date (${startDate}) cannot be after End Date (${endDate}).`);
        }
        payload.startDate = startDate;
        payload.endDate = endDate;
        payload.incremental = false;
      }

      const res = await fetch('/api/regulatory/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Discovery scan failed with HTTP ${res.status}`);
      }

      setScanSuccessSummary(data.summary);
      if (data.state) {
        onRefreshState(data.state);
      }
      await fetchDiscoveries();
    } catch (err: any) {
      console.error('Scan execution error:', err);
      setScanError(err.message || 'Discovery scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearch = async (queryToUse?: string) => {
    const q = queryToUse !== undefined ? queryToUse : searchQuery;
    if (!q.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setScreeningReport(null);
    setReconciliationResult(null);

    try {
      const isAdNumberFormat = /(\d{4}-\d{2}-\d{2})/.test(q);
      const url = isAdNumberFormat 
        ? `/api/regulatory/search?adNumber=${encodeURIComponent(q.trim())}`
        : `/api/regulatory/search?q=${encodeURIComponent(q.trim())}&perPage=12`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Regulatory query returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setSearchResults(data.results || []);
      if (data.results && data.results.length > 0) {
        setSelectedRecord(data.results[0]);
      } else {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Failed to communicate with Federal Register API.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScreenFleet = async (record: RegulatorySourceRecord) => {
    setIsScreening(true);
    try {
      const res = await fetch('/api/regulatory/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: record })
      });
      if (res.ok) {
        const data = await res.json();
        setScreeningReport(data.screeningReport);
      }
    } catch (err) {
      console.error('Screening error:', err);
    } finally {
      setIsScreening(false);
    }
  };

  const handleReconcile = async (record: RegulatorySourceRecord) => {
    setIsReconciling(true);
    try {
      const matchingReq = state?.requirements.find(r => 
        (record.adNumber && r.sourceNumber.includes(record.adNumber)) ||
        (record.models && record.models.some(m => r.applicabilityRule?.aircraftModels.includes(m)))
      ) || state?.requirements[0];

      if (matchingReq) {
        const res = await fetch('/api/regulatory/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceA: record,
            requirementId: matchingReq.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          setReconciliationResult(data.reconciliation);
        }
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleImportToCamo = async (record: RegulatorySourceRecord) => {
    setImportingDocNumber(record.documentNumber);
    setImportSuccessMessage(null);
    try {
      const res = await fetch('/api/regulatory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceRecord: record })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to import AD');
      }

      const data = await res.json();
      if (data.state) {
        onRefreshState(data.state);
      }
      setImportSuccessMessage(`Successfully imported ${record.adNumber || record.documentNumber} into CAMO Inventory!`);
      setTimeout(() => setImportSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImportingDocNumber(null);
    }
  };

  const handleAcquire = async (record: RegulatorySourceRecord | RegulatoryDiscoveryRecord, analyze: boolean = false) => {
    setIsAcquiring(true);
    setAcquisitionFeedback(null);
    try {
      const res = await fetch('/api/regulatory/acquire-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceRecord: record,
          options: { analyze }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to acquire official document.');
      }

      await fetchAcquiredDocs();

      if (analyze) {
        const stateRes = await fetch('/api/state');
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          onRefreshState(stateData);
        }
      }

      if (data.isDuplicate) {
        setAcquisitionFeedback({
          type: 'duplicate',
          message: `Document already acquired (SHA-256 match). Status: ${data.record.validationStatus}. Re-using verified record.`,
          doc: data.record
        });
      } else {
        setAcquisitionFeedback({
          type: 'success',
          message: analyze 
            ? `Successfully acquired official document, computed SHA-256 hash, and analyzed in Document Intelligence pipeline!`
            : `Successfully acquired official document from GovInfo/FR and verified %PDF- signature and SHA-256.`,
          doc: data.record
        });
      }
    } catch (err: any) {
      setAcquisitionFeedback({
        type: 'error',
        message: err.message || 'Acquisition error'
      });
    } finally {
      setIsAcquiring(false);
    }
  };

  const handleAnalyzeAcquired = async (documentId: string) => {
    setIsAnalyzingAcquired(true);
    setAcquisitionFeedback(null);
    try {
      const res = await fetch('/api/regulatory/analyze-acquired-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze acquired document.');
      }

      await fetchAcquiredDocs();

      const stateRes = await fetch('/api/state');
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        onRefreshState(stateData);
      }

      setAcquisitionFeedback({
        type: 'success',
        message: `Official document successfully analyzed and integrated into CAMO Compliance Requirements!`,
        doc: data.record
      });
    } catch (err: any) {
      setAcquisitionFeedback({
        type: 'error',
        message: err.message || 'Analysis error'
      });
    } finally {
      setIsAnalyzingAcquired(false);
    }
  };

  // Filter discoveries
  const filteredDiscoveries = discoveries.filter(d => {
    if (discoveryFilter !== 'ALL' && d.discoveryStatus !== discoveryFilter) {
      return false;
    }
    if (discoverySearchQuery.trim()) {
      const q = discoverySearchQuery.toLowerCase().trim();
      const matchDoc = d.documentNumber.toLowerCase().includes(q);
      const matchAd = d.adNumber?.toLowerCase().includes(q);
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchMake = d.make?.toLowerCase().includes(q);
      return matchDoc || matchAd || matchTitle || matchMake;
    }
    return true;
  });

  const newDiscoveriesTotal = discoveries.filter(d => d.discoveryStatus === 'NEW').length;
  const alreadyKnownTotal = discoveries.filter(d => d.discoveryStatus === 'ALREADY_KNOWN').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Phase 5.1 — Regulatory Discovery & Continuous Monitoring Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Federal Register AD Discovery Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Directly scans FAA 14 CFR Part 39 Airworthiness Directives via Federal Register API v1, with deterministic deduplication and provenance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Tab Selectors */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('DISCOVERY')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                activeTab === 'DISCOVERY'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Discovery Monitor</span>
              {discoveries.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-800 text-indigo-300 rounded">
                  {discoveries.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('PIPELINE')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                activeTab === 'PIPELINE'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>End-to-End Pipeline</span>
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] rounded font-bold">
                v5.3
              </span>
              {pipelineExecutions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-800 text-slate-300 rounded">
                  {pipelineExecutions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('SEARCH')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                activeTab === 'SEARCH'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>AD Lookup & Screening</span>
            </button>
            <button
              onClick={() => setActiveTab('VAULT')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                activeTab === 'VAULT'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Acquired Vault</span>
              {acquiredDocs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30">
                  {acquiredDocs.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              fetchSources();
              fetchDiscoveries();
              fetchAcquiredDocs();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
            title="Refresh All"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {acquisitionFeedback && (
        <div className={`p-4 rounded-xl border font-mono text-xs animate-fadeIn ${
          acquisitionFeedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
            : acquisitionFeedback.type === 'duplicate'
            ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
            : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              {acquisitionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : acquisitionFeedback.type === 'duplicate' ? (
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-sm block">
                  {acquisitionFeedback.type === 'success' ? 'Official Document Acquisition Completed' :
                   acquisitionFeedback.type === 'duplicate' ? 'Idempotent Match — Document Already Verified' :
                   'Acquisition Error'}
                </span>
                <p className="mt-1 text-slate-300">{acquisitionFeedback.message}</p>
                {acquisitionFeedback.doc && (
                  <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                    <div>SHA-256: <code className="text-white select-all">{acquisitionFeedback.doc.sha256}</code></div>
                    <div>Source: <span className="text-slate-200">{acquisitionFeedback.doc.sourceUrl}</span></div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setAcquisitionFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800/80 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 1: REGULATORY DISCOVERY MONITOR (PHASE 5.1 ENGINE) */}
      {/* ============================================================================ */}
      {activeTab === 'DISCOVERY' && (
        <div className="space-y-6">
          {/* Scan Control Panel */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Scan Federal Register (14 CFR Part 39 ADs)
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Filter:</span>
                <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-indigo-500/30 text-[10px]">
                  FAA · 14 CFR Part 39 (RULE)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Publication Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setIsIncremental(false);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Publication End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setIsIncremental(false);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
                  Max Pages to Scan
                </label>
                <select
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 Page (up to 20 ADs)</option>
                  <option value={3}>3 Pages (up to 60 ADs)</option>
                  <option value={5}>5 Pages (up to 100 ADs)</option>
                  <option value={10}>10 Pages (up to 200 ADs)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleExecuteScan(false)}
                  disabled={isScanning}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 font-mono shadow-lg shadow-indigo-900/30"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Scanning FR API...</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4 text-emerald-300" />
                      <span>Scan Range</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleExecuteScan(true)}
                  disabled={isScanning}
                  title="Scan since last successful scan date (with 1-day safety margin)"
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-indigo-500/30 text-indigo-300 text-xs font-mono rounded-lg transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Incremental</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {scanError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-300 font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Success Summary Banner */}
            {scanSuccessSummary && (
              <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 font-mono space-y-1 animate-fadeIn">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Scan Completed in {scanSuccessSummary.executionTimeMs}ms</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Period: {scanSuccessSummary.startDate} → {scanSuccessSummary.endDate}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-300">
                  <div>Scanned: <strong className="text-white">{scanSuccessSummary.totalDocumentsScanned}</strong> docs ({scanSuccessSummary.pagesScanned} pages)</div>
                  <div>New Discoveries: <strong className="text-emerald-400">{scanSuccessSummary.newDiscoveriesCount}</strong></div>
                  <div>Already Known: <strong className="text-indigo-300">{scanSuccessSummary.alreadyKnownCount}</strong></div>
                  <div>Errors: <strong className={scanSuccessSummary.errorsCount > 0 ? 'text-rose-400' : 'text-slate-400'}>{scanSuccessSummary.errorsCount}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Metric Overview Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Total Tracked ADs</span>
              <div className="text-xl font-bold font-mono text-white">{discoveries.length}</div>
              <span className="text-[10px] text-slate-500">14 CFR Part 39 Publications</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase">New Discoveries</span>
              <div className="text-xl font-bold font-mono text-emerald-300">{newDiscoveriesTotal}</div>
              <span className="text-[10px] text-slate-500">First time seen</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-indigo-500/20 space-y-1">
              <span className="text-[10px] font-mono text-indigo-400 uppercase">Screened Assessments</span>
              <div className="text-xl font-bold font-mono text-indigo-300">{screeningAssessments.length}</div>
              <span className="text-[10px] text-slate-500">Fleet Evaluation Engine v5.2.0</span>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Last Scan Timestamp</span>
              <div className="text-xs font-mono text-slate-300 font-bold truncate">
                {lastScanTimestamp ? new Date(lastScanTimestamp).toLocaleString() : 'Never'}
              </div>
              <span className="text-[10px] text-slate-500">Auto-stored in CAMO DB</span>
            </div>
          </div>

          {/* Batch Screening Banner (if any) */}
          {batchScreeningMessage && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 text-xs font-mono text-indigo-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{batchScreeningMessage}</span>
              </div>
              <button 
                onClick={() => setBatchScreeningMessage(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Discoveries List & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Discoveries Table */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-mono text-slate-400">Filter:</span>
                  {(['ALL', 'NEW', 'ALREADY_KNOWN'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setDiscoveryFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                        discoveryFilter === st
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st === 'NEW' ? 'New Only' : 'Already Known'}
                    </button>
                  ))}

                  <button
                    onClick={handleBatchScreenAll}
                    disabled={isBatchScreening || discoveries.length === 0}
                    className="ml-1 px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 hover:text-white rounded text-[11px] font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
                    title="Screen all discovered ADs against registered fleet aircraft"
                  >
                    {isBatchScreening ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                    ) : (
                      <Plane className="w-3 h-3 text-indigo-400" />
                    )}
                    <span>Batch Screen Fleet</span>
                  </button>

                  <button
                    onClick={() => handleBatchPipelineAll(true)}
                    disabled={isBatchPipelineRunning || discoveries.length === 0}
                    className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-white rounded text-[11px] font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
                    title="Execute end-to-end 8-stage compliance pipeline for all potential matches"
                  >
                    {isBatchPipelineRunning ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>Batch Run Pipeline (v5.3)</span>
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={discoverySearchQuery}
                    onChange={(e) => setDiscoverySearchQuery(e.target.value)}
                    placeholder="Search in discoveries..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {filteredDiscoveries.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-xl border border-white/10 text-slate-400 text-xs font-mono space-y-2">
                  <Radio className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No regulatory discoveries found matching criteria.</p>
                  <p className="text-[11px] text-slate-500">
                    Execute a range scan or incremental scan above to query the Federal Register API.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {filteredDiscoveries.map((disc) => {
                    const isSelected = selectedDiscovery?.id === disc.id;
                    const discScreenings = screeningAssessments.filter(
                      a => a.discoveryRecordId === disc.id || a.discoveryRecordId === disc.documentNumber
                    );
                    const matchCount = discScreenings.filter(a => a.screeningResult === 'POTENTIAL_MATCH').length;
                    const noMatchCount = discScreenings.filter(a => a.screeningResult === 'NO_MATCH').length;
                    const insufficientCount = discScreenings.filter(a => a.screeningResult === 'INSUFFICIENT_METADATA').length;

                    return (
                      <div
                        key={disc.id}
                        onClick={() => setSelectedDiscovery(disc)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/50'
                            : 'bg-slate-900/70 border-white/5 hover:border-white/20 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-white font-mono">
                                {disc.adNumber || `FR Doc. ${disc.documentNumber}`}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                disc.discoveryStatus === 'NEW'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-white/10'
                              }`}>
                                {disc.discoveryStatus}
                              </span>
                              {disc.make && (
                                <span className="px-1.5 py-0.2 bg-slate-800 text-indigo-300 text-[10px] font-mono rounded">
                                  {disc.make}
                                </span>
                              )}

                              {/* Fleet Screening Status Badge */}
                              {discScreenings.length > 0 ? (
                                <div className="flex items-center gap-1 font-mono text-[9px]">
                                  {matchCount > 0 && (
                                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">
                                      {matchCount} Match{matchCount > 1 ? 'es' : ''}
                                    </span>
                                  )}
                                  {insufficientCount > 0 && (
                                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold">
                                      {insufficientCount} Insufficient Meta
                                    </span>
                                  )}
                                  {matchCount === 0 && insufficientCount === 0 && (
                                    <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-white/10 rounded">
                                      {noMatchCount} No Match
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="px-1.5 py-0.2 bg-slate-800/80 text-slate-500 border border-white/5 rounded text-[9px] font-mono">
                                  Unscreened
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                              {disc.title}
                            </p>
                          </div>

                          <ChevronRight className={`w-4 h-4 shrink-0 transition ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
                          <div className="flex items-center gap-3">
                            <span>FR Doc: <strong className="text-slate-300">{disc.documentNumber}</strong></span>
                            {disc.publicationDate && (
                              <span>Pub: <strong className="text-slate-300">{disc.publicationDate}</strong></span>
                            )}
                            {disc.effectiveDate && (
                              <span>Eff: <strong className="text-slate-300">{disc.effectiveDate}</strong></span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500">
                            Discovered: {new Date(disc.firstDiscoveredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discovery Provenance & Details Panel */}
            <div className="lg:col-span-5">
              {selectedDiscovery ? (
                <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4 sticky top-6 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-start justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">
                          {selectedDiscovery.adNumber || `FR Doc. ${selectedDiscovery.documentNumber}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          selectedDiscovery.discoveryStatus === 'NEW'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}>
                          {selectedDiscovery.discoveryStatus}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                        Authority: FAA · 14 CFR Part 39 (Airworthiness Directives)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {selectedDiscovery.htmlUrl && (
                        <a
                          href={selectedDiscovery.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-xs transition"
                          title="Open Federal Register Webpage"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {selectedDiscovery.pdfUrl && (
                        <a
                          href={selectedDiscovery.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-xs transition"
                          title="Open Official GovInfo PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Title & Abstract */}
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Official Title</span>
                    <h3 className="text-xs text-white font-bold leading-relaxed">
                      {selectedDiscovery.title}
                    </h3>
                  </div>

                  {/* Phase 5.2: Dedicated Fleet Regulatory Screening Section */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                        <Plane className="w-4 h-4 text-indigo-400" />
                        <span>Automated Fleet Screening</span>
                        <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] rounded">
                          v5.2.0
                        </span>
                      </div>

                      <button
                        onClick={() => handleScreenDiscovery(selectedDiscovery)}
                        disabled={isScreeningDiscovery}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-mono font-bold transition flex items-center gap-1 shadow"
                      >
                        {isScreeningDiscovery ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        <span>Screen Fleet</span>
                      </button>
                    </div>

                    {/* Screening Results List */}
                    {(() => {
                      const curScreenings = screeningAssessments.filter(
                        a => a.discoveryRecordId === selectedDiscovery.id || a.discoveryRecordId === selectedDiscovery.documentNumber
                      );

                      if (curScreenings.length === 0) {
                        return (
                          <div className="p-3 rounded bg-slate-900 border border-white/5 text-[11px] font-mono text-slate-400 text-center">
                            No fleet screening executed yet for this discovery record. Click "Screen Fleet" above to evaluate against registered fleet aircraft.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                            <span>Evaluated Aircraft: <strong className="text-white">{curScreenings.length}</strong></span>
                            <span className="text-[9px] text-slate-500">Derived CAMO Decision</span>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {curScreenings.map((ass) => (
                              <div
                                key={ass.id}
                                className={`p-2.5 rounded-lg border text-[11px] font-mono space-y-1.5 ${
                                  ass.screeningResult === 'POTENTIAL_MATCH'
                                    ? 'bg-emerald-950/30 border-emerald-500/30'
                                    : ass.screeningResult === 'INSUFFICIENT_METADATA'
                                    ? 'bg-amber-950/30 border-amber-500/30'
                                    : 'bg-slate-900 border-white/5'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-xs">{ass.aircraftRegistration}</span>
                                    <span className="text-[10px] text-slate-400">MSN {ass.aircraftMsn}</span>
                                    <span className="px-1.5 py-0.2 bg-slate-800 text-indigo-300 text-[9px] rounded">
                                      {ass.fleetModel}
                                    </span>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    ass.screeningResult === 'POTENTIAL_MATCH'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : ass.screeningResult === 'INSUFFICIENT_METADATA'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-slate-800 text-slate-400 border border-white/10'
                                  }`}>
                                    {ass.screeningResult}
                                  </span>
                                </div>

                                <p className="text-[10px] text-slate-300 leading-relaxed">
                                  {ass.reason}
                                </p>

                                {/* Provenance Details */}
                                <div className="pt-1 border-t border-white/5 flex flex-wrap items-center justify-between text-[9px] text-slate-400 gap-1">
                                  <span>Canonical Family: <strong className="text-slate-300">{ass.canonicalFamily || 'N/A'}</strong></span>
                                  <span>Confidence: <strong className="text-slate-300">{Math.round((ass.confidence || 0.95) * 100)}%</strong></span>
                                  <span className="text-slate-500">v{ass.engineVersion}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-lg border border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-500 block">DOCUMENT NUMBER:</span>
                      <span className="text-slate-200 font-bold">{selectedDiscovery.documentNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">CITATION:</span>
                      <span className="text-slate-200">{selectedDiscovery.citation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">PUBLICATION DATE:</span>
                      <span className="text-slate-200">{selectedDiscovery.publicationDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">EFFECTIVE DATE:</span>
                      <span className="text-slate-200">{selectedDiscovery.effectiveDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">DOCKET NUMBER:</span>
                      <span className="text-slate-200 truncate block">{selectedDiscovery.docketNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">PRODUCT TYPE:</span>
                      <span className="text-slate-200">{selectedDiscovery.productType || 'AIRCRAFT'}</span>
                    </div>
                  </div>

                  {/* Field Provenance Table */}
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Field-Level Provenance Map</span>
                    </span>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {Object.entries(selectedDiscovery.provenanceMap || {}).map(([key, prov]: [string, any]) => (
                        <div key={key} className="p-2 rounded bg-slate-950/80 border border-white/5 text-[11px] font-mono">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300">{key}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              prov.originType === 'SOURCE_METADATA'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {prov.originType}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            Value: <span className="text-white">{typeof prov.value === 'object' ? JSON.stringify(prov.value) : String(prov.value)}</span>
                          </div>
                          {prov.derivationRule && (
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              Rule: {prov.derivationRule}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                    <button
                      onClick={() => handleExecutePipeline(selectedDiscovery)}
                      disabled={isExecutingPipeline}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50"
                    >
                      {isExecutingPipeline ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-indigo-200" />
                      )}
                      <span>Run Full End-to-End Pipeline (Phase 5.3)</span>
                    </button>

                    <button
                      onClick={() => handleAcquire(selectedDiscovery as any, false)}
                      disabled={isAcquiring}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-2 border border-white/10"
                    >
                      {isAcquiring ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Acquire Official GovInfo PDF Only</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center glass-panel rounded-xl border border-white/10 text-slate-400 text-xs font-mono">
                  Select a discovery record from the left list to view field-level provenance, Federal Register metadata, and fleet screening results.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 2: PHASE 5.3 END-TO-END PIPELINE MONITOR */}
      {/* ============================================================================ */}
      {activeTab === 'PIPELINE' && (
        <PipelineMonitoringTab
          executions={pipelineExecutions}
          discoveries={discoveries}
          screenings={screeningAssessments}
          isExecutingPipeline={isExecutingPipeline}
          isBatchRunning={isBatchPipelineRunning}
          isScanning={isScanning}
          batchSummary={batchPipelineSummary}
          onExecuteDiscovery={handleExecutePipeline}
          onBatchRun={handleBatchPipelineAll}
          onScanAndRun={handleScanAndPipeline}
          onInspectExecution={(exec) => setActiveExecutionModal(exec)}
          onRetryExecution={(id) => handleRetryPipeline(id)}
          onSelectAd={onSelectAd}
          onRefreshAll={() => {
            fetchPipelineExecutions();
            fetchDiscoveries();
            fetchScreenings();
            fetchAcquiredDocs();
          }}
        />
      )}

      {/* ============================================================================ */}
      {/* TAB 3: INTERACTIVE AD SEARCH & FLEET SCREENING (PHASE 3 & 4) */}
      {/* ============================================================================ */}
      {activeTab === 'SEARCH' && (
        <div className="space-y-6">
          {/* Authority Sources Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <div 
                key={src.sourceId}
                className={`p-4 rounded-xl border transition-all ${
                  src.isActive 
                    ? 'bg-slate-900/90 border-indigo-500/30 shadow-lg shadow-indigo-950/20' 
                    : 'bg-slate-900/50 border-white/5 opacity-85'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${src.isActive ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {src.sourceName}
                        {src.isOfficial && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-mono border border-emerald-500/30">
                            OFFICIAL
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">{src.baseUrl}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    {src.apiConfirmed ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                        API ONLINE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        API NOT CONFIRMED
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {src.statusMessage || src.notes}
                </p>
              </div>
            ))}
          </div>

          {/* Search Box */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Federal Register Live Search & Lookup
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span>Samples:</span>
                <button
                  onClick={() => { setSearchQuery('2020-24-02'); handleSearch('2020-24-02'); }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded border border-indigo-500/30 text-[10px]"
                >
                  737 MAX (2020-24-02)
                </button>
                <button
                  onClick={() => { setSearchQuery('2025-07-03'); handleSearch('2025-07-03'); }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded border border-indigo-500/30 text-[10px]"
                >
                  737 NG (2025-07-03)
                </button>
              </div>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by AD Number (e.g. 2020-24-02) or keywords (e.g. Boeing 737, CFM LEAP-1B)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-2 transition"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Query API</span>
              </button>
            </form>

            {searchError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-300 font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-3">
              <span className="text-xs font-mono text-slate-400">Search Results ({searchResults.length})</span>
              {searchResults.map((rec) => (
                <div
                  key={rec.documentNumber}
                  onClick={() => { setSelectedRecord(rec); setScreeningReport(null); setReconciliationResult(null); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedRecord?.documentNumber === rec.documentNumber
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/50'
                      : 'bg-slate-900/70 border-white/5 hover:border-white/20 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-white">{rec.adNumber || `Doc #${rec.documentNumber}`}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {rec.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">{rec.title}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-6">
              {selectedRecord ? (
                <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
                  <div className="flex items-start justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-white font-mono">{selectedRecord.adNumber || selectedRecord.documentNumber}</h3>
                      <span className="text-xs text-slate-400">{selectedRecord.title}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleScreenFleet(selectedRecord)}
                      disabled={isScreening}
                      className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-mono flex items-center gap-1.5"
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>{isScreening ? 'Screening...' : 'Screen Fleet'}</span>
                    </button>
                    <button
                      onClick={() => handleReconcile(selectedRecord)}
                      disabled={isReconciling}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isReconciling ? 'Reconciling...' : 'Reconcile'}</span>
                    </button>
                    <button
                      onClick={() => handleAcquire(selectedRecord, false)}
                      disabled={isAcquiring}
                      className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-mono flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isAcquiring ? 'Acquiring...' : 'Acquire PDF'}</span>
                    </button>
                  </div>

                  {/* Screening Report Matrix */}
                  {screeningReport && (
                    <div className="p-4 bg-slate-950/90 rounded-xl border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-white font-mono">Fleet Regulatory Screening</span>
                        <span className="text-[10px] font-mono text-indigo-300">
                          {screeningReport.potentialMatches} Matches / {screeningReport.totalScreened} Total
                        </span>
                      </div>
                      <div className="space-y-2">
                        {screeningReport.assessments.map((ass) => (
                          <div key={ass.aircraftId} className="p-2 bg-slate-900 rounded border border-white/5 text-xs flex items-center justify-between">
                            <div>
                              <strong className="text-white">{ass.registration}</strong> ({ass.aircraftModel})
                              <p className="text-[11px] text-slate-400">{ass.reason}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              ass.status === 'POTENTIAL_MATCH' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {ass.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center glass-panel rounded-xl border border-white/10 text-slate-400 text-xs font-mono">
                  Select a search result on the left to view details and execute screening.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 3: ACQUIRED OFFICIAL DOCUMENTS VAULT (PHASE 4) */}
      {/* ============================================================================ */}
      {activeTab === 'VAULT' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Acquired Official Documents ({acquiredDocs.length})
            </span>
          </div>

          {acquiredDocs.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-xl border border-white/10 text-slate-400 text-xs font-mono space-y-2">
              <Database className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No official documents have been downloaded into the vault yet.</p>
              <p className="text-[11px] text-slate-500">
                Acquire documents from the Discovery Monitor or Search tab to store them here with cryptographic verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acquiredDocs.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3 font-mono">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-xs text-white">{doc.adNumber || doc.fileName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {doc.validationStatus}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div>Size: <strong className="text-slate-200">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</strong></div>
                    <div>Source: <span className="text-slate-300 truncate block">{doc.sourceAuthority}</span></div>
                    <div>SHA-256: <div className="p-1 bg-slate-950 rounded text-[10px] text-indigo-300 break-all select-all">{doc.sha256}</div></div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Pipeline: <strong className="text-slate-300">{doc.pipelineIntegrationStatus || 'NOT_SUBMITTED'}</strong></span>
                    {doc.pipelineIntegrationStatus !== 'ANALYZED' ? (
                      <button
                        onClick={() => handleAnalyzeAcquired(doc.id)}
                        disabled={isAnalyzingAcquired}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition"
                      >
                        {isAnalyzingAcquired ? 'Analyzing...' : 'Analyze'}
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Analyzed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 5.3: Pipeline Execution Modal */}
      {activeExecutionModal && (
        <PipelineExecutionModal
          execution={activeExecutionModal}
          onClose={() => setActiveExecutionModal(null)}
          onRetry={(id, opts) => handleRetryPipeline(id, opts)}
          onSelectAd={onSelectAd}
          isRetrying={isRetryingPipeline}
        />
      )}
    </div>
  );
}
