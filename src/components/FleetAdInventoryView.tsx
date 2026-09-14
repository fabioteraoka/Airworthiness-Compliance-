import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  Printer, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  FileSpreadsheet, 
  FileCheck2, 
  Sparkles, 
  RotateCw, 
  X, 
  Check, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Plane,
  AlertTriangle,
  History,
  Tag,
  Hash
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { 
  DiscoveredRegulatoryAd, 
  FleetRegulatoryIntakeResult, 
  IssuingAuthority 
} from '../types';

export interface FleetAdInventoryViewProps {
  state: DatabaseState;
  onSelectAd?: (id: string) => void;
  onSelectView?: (view: string) => void;
  onRefreshState?: (newState: DatabaseState) => void;
  initialFleet?: {
    manufacturer?: string;
    family?: string;
    model?: string;
    engine?: string;
    query?: string;
  };
}

export interface FleetPreset {
  label: string;
  mfg: string;
  family: string;
  model: string;
  engine: string;
  query: string;
}

export const FLEET_PRESETS: FleetPreset[] = [
  { label: 'Boeing 737-800 (NG)', mfg: 'Boeing', family: '737', model: '737-800', engine: 'CFM56-7B', query: 'Boeing 737-800' },
  { label: 'Boeing 737 MAX 8', mfg: 'Boeing', family: '737', model: '737-8', engine: 'LEAP-1B', query: 'Boeing 737 MAX' },
  { label: 'Airbus A320-200 (ceo)', mfg: 'Airbus', family: 'A320', model: 'A320-200', engine: 'CFM56-5B', query: 'Airbus A320' },
  { label: 'Airbus A320neo', mfg: 'Airbus', family: 'A320', model: 'A320neo', engine: 'LEAP-1A', query: 'Airbus A320neo' },
  { label: 'Embraer E195-E2', mfg: 'Embraer', family: 'E-Jets', model: 'E195-E2', engine: 'PW1900G', query: 'Embraer 195' },
  { label: 'ATR 72-600', mfg: 'ATR', family: 'ATR', model: 'ATR 72-600', engine: 'PW127M', query: 'ATR 72' }
];

export default function FleetAdInventoryView({
  state,
  onSelectAd,
  onSelectView,
  onRefreshState,
  initialFleet
}: FleetAdInventoryViewProps) {
  // Fleet configuration state
  const [manufacturer, setManufacturer] = useState<string>(initialFleet?.manufacturer || 'Boeing');
  const [family, setFamily] = useState<string>(initialFleet?.family || '737');
  const [model, setModel] = useState<string>(initialFleet?.model || '737-800');
  const [engine, setEngine] = useState<string>(initialFleet?.engine || 'CFM56-7B');
  const [query, setQuery] = useState<string>(initialFleet?.query || 'Boeing 737-800');
  const [authorityFilter, setAuthorityFilter] = useState<IssuingAuthority | 'ALL'>('ALL');

  // Search execution and results state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [inventoryResult, setInventoryResult] = useState<FleetRegulatoryIntakeResult | null>(null);
  const [lastSearchTimestamp, setLastSearchTimestamp] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Table filtering & pagination state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableAuthority, setTableAuthority] = useState<string>('ALL');
  const [camoStatusFilter, setCamoStatusFilter] = useState<'ALL' | 'IMPORTED' | 'NOT_IMPORTED'>('ALL');
  const [analysisStatusFilter, setAnalysisStatusFilter] = useState<'ALL' | 'PENDING_ANALYSIS' | 'ANALYZED' | 'REVIEW_REQUIRED'>('ALL');
  const [deltaStatusFilter, setDeltaStatusFilter] = useState<'ALL' | 'NEW' | 'UNCHANGED' | 'UPDATED' | 'SUPERSEDED' | 'REVOKED'>('ALL');
  const [ataFilter, setAtaFilter] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Batch import selection
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Traceability modal
  const [traceabilityAd, setTraceabilityAd] = useState<DiscoveredRegulatoryAd | null>(null);
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);

  // Count physical aircraft registered in database for this fleet
  const physicalAircraftCount = useMemo(() => {
    const list = state.aircraft || [];
    const searchModel = model.toLowerCase();
    const searchFam = family.toLowerCase();
    const searchMfg = manufacturer.toLowerCase();

    return list.filter(ac => {
      const acMfg = (ac.manufacturer || '').toLowerCase();
      const acModel = (ac.model || '').toLowerCase();
      const acSeries = (ac.series || '').toLowerCase();

      const mfgMatch = !searchMfg || acMfg.includes(searchMfg) || searchMfg.includes(acMfg);
      const modelMatch = acModel.includes(searchModel) || (searchFam && (acModel.includes(searchFam) || acSeries.includes(searchFam)));
      return mfgMatch && modelMatch;
    }).length;
  }, [state.aircraft, manufacturer, family, model]);

  // Execute initial search on mount or when fleet preset changes
  const executeFleetSearch = async (overrideParams?: { mfg?: string; fam?: string; mdl?: string; eng?: string; qry?: string }) => {
    setIsSearching(true);
    setStatusMessage(null);

    const mfg = overrideParams?.mfg !== undefined ? overrideParams.mfg : manufacturer;
    const fam = overrideParams?.fam !== undefined ? overrideParams.fam : family;
    const mdl = overrideParams?.mdl !== undefined ? overrideParams.mdl : model;
    const eng = overrideParams?.eng !== undefined ? overrideParams.eng : engine;
    const qry = overrideParams?.qry !== undefined ? overrideParams.qry : query;

    try {
      const res = await fetch('/api/intel/fleet-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: mfg,
          family: fam,
          model: mdl,
          engine: eng,
          query: qry,
          authority: authorityFilter,
          autoPaginate: true
        })
      });

      if (!res.ok) {
        throw new Error(`Erro na busca regulatória da frota: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setInventoryResult(data);
        setLastSearchTimestamp(new Date().toLocaleString('pt-BR'));
        setSelectedAdIds(new Set());
        setCurrentPage(1);

        if (data.state && onRefreshState) {
          onRefreshState(data.state);
        }

        setStatusMessage({
          type: 'success',
          text: `Pesquisa concluída: ${data.totalCount} ADs encontradas (${data.newCount} novas, ${data.updatedCount} atualizadas, ${data.unchangedCount} sem alteração). Fontes: ${data.sourcesConsulted?.join(', ') || 'FAA, EASA, ANAC'}.`
        });
      } else {
        throw new Error(data.error || 'Falha ao buscar ADs da frota');
      }
    } catch (err: any) {
      console.error('Erro na pesquisa regulatória da frota:', err);
      setStatusMessage({
        type: 'error',
        text: `Erro ao buscar ADs da frota: ${err.message || String(err)}`
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Run initial search once on mount
  useEffect(() => {
    executeFleetSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute list of ADs for display
  const allCandidates: DiscoveredRegulatoryAd[] = inventoryResult?.candidates || [];

  // Extract unique ATA chapters from candidates
  const availableAtas = useMemo(() => {
    const atas = new Set<string>();
    allCandidates.forEach(c => {
      if (c.ataChapter) atas.add(c.ataChapter);
    });
    return Array.from(atas).sort();
  }, [allCandidates]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return allCandidates.filter(c => {
      // Text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchAd = c.adNumber.toLowerCase().includes(term);
        const matchTitle = (c.title || '').toLowerCase().includes(term);
        const matchAta = (c.ataChapter || '').toLowerCase().includes(term);
        const matchDocket = (c.docketNumber || '').toLowerCase().includes(term);
        if (!matchAd && !matchTitle && !matchAta && !matchDocket) {
          return false;
        }
      }

      // Authority filter
      if (tableAuthority !== 'ALL' && c.authority !== tableAuthority) {
        return false;
      }

      // CAMO Register status
      if (camoStatusFilter === 'IMPORTED' && !c.inRegister) {
        return false;
      }
      if (camoStatusFilter === 'NOT_IMPORTED' && c.inRegister) {
        return false;
      }

      // Analysis status
      if (analysisStatusFilter !== 'ALL') {
        if (!c.inRegister) return false;
        if (c.registerAnalysisStatus !== analysisStatusFilter) return false;
      }

      // Delta status
      if (deltaStatusFilter !== 'ALL' && c.deltaStatus !== deltaStatusFilter) {
        return false;
      }

      // ATA filter
      if (ataFilter !== 'ALL' && c.ataChapter !== ataFilter) {
        return false;
      }

      return true;
    });
  }, [allCandidates, searchTerm, tableAuthority, camoStatusFilter, analysisStatusFilter, deltaStatusFilter, ataFilter]);

  // Pagination calculations
  const totalItems = filteredCandidates.length;
  const effectivePageSize = pageSize === -1 ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCandidates = useMemo(() => {
    if (pageSize === -1) return filteredCandidates;
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredCandidates.slice(startIndex, startIndex + pageSize);
  }, [filteredCandidates, validCurrentPage, pageSize]);

  // KPIs derived strictly from real inventory data
  const metrics = useMemo(() => {
    const totalEncontradas = allCandidates.length;
    const totalImportadas = allCandidates.filter(c => c.inRegister).length;
    const totalNaoImportadas = allCandidates.filter(c => !c.inRegister).length;
    const pendentesAnalise = allCandidates.filter(c => c.inRegister && c.registerAnalysisStatus === 'PENDING_ANALYSIS').length;
    const analisadas = allCandidates.filter(c => c.inRegister && c.registerAnalysisStatus === 'ANALYZED').length;
    const reviewRequired = allCandidates.filter(c => c.registerAnalysisStatus === 'REVIEW_REQUIRED' || c.deltaStatus === 'REVIEW_REQUIRED').length;
    const novas = allCandidates.filter(c => c.deltaStatus === 'NEW').length;
    const atualizadas = allCandidates.filter(c => c.deltaStatus === 'UPDATED').length;
    const inalteradas = allCandidates.filter(c => c.deltaStatus === 'UNCHANGED').length;
    const superseded = allCandidates.filter(c => c.deltaStatus === 'SUPERSEDED' || (c as any).officialStatus === 'SUPERSEDED' || c.lifecycleStatus === 'SUPERSEDED').length;
    const revoked = allCandidates.filter(c => c.deltaStatus === 'REVOKED' || (c as any).officialStatus === 'REVOKED' || c.lifecycleStatus === 'REVOKED').length;

    return {
      totalEncontradas,
      totalImportadas,
      totalNaoImportadas,
      pendentesAnalise,
      analisadas,
      reviewRequired,
      novas,
      atualizadas,
      inalteradas,
      superseded,
      revoked
    };
  }, [allCandidates]);

  // Batch import handlers
  const handleImportAll = async () => {
    const unimported = allCandidates.filter(c => !c.inRegister);
    if (unimported.length === 0) {
      setStatusMessage({
        type: 'info',
        text: 'Todas as ADs identificadas para esta frota já estão incorporadas ao CAMO Regulatory Register.'
      });
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/intel/register/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: unimported,
          actor: state.currentUser?.name || 'CAMO Technical Officer'
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Sucesso: ${data.importedNew} novas ADs importadas para o CAMO Register como PENDING_ANALYSIS (${data.skippedExisting} já existiam).`
        });
        if (data.state && onRefreshState) {
          onRefreshState(data.state);
        }
        // Refresh inventory
        await executeFleetSearch();
      } else {
        throw new Error(data.error || 'Falha ao importar ADs');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Erro ao importar ADs: ${err.message || String(err)}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelected = async () => {
    if (selectedAdIds.size === 0) {
      setStatusMessage({
        type: 'info',
        text: 'Nenhuma AD selecionada. Marque as caixas de seleção das ADs que deseja importar.'
      });
      return;
    }

    const selectedCandidates = allCandidates.filter(c => selectedAdIds.has(c.id) || selectedAdIds.has(c.adNumber));
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/intel/register/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: selectedCandidates,
          actor: state.currentUser?.name || 'CAMO Technical Officer'
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Sucesso: ${data.importedNew} ADs selecionadas importadas para o CAMO Register como PENDING_ANALYSIS.`
        });
        setSelectedAdIds(new Set());
        if (data.state && onRefreshState) {
          onRefreshState(data.state);
        }
        await executeFleetSearch();
      } else {
        throw new Error(data.error || 'Falha ao importar ADs selecionadas');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Erro ao importar ADs selecionadas: ${err.message || String(err)}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedAdIds.size === paginatedCandidates.length && paginatedCandidates.length > 0) {
      setSelectedAdIds(new Set());
    } else {
      const newSet = new Set(selectedAdIds);
      paginatedCandidates.forEach(c => newSet.add(c.id));
      setSelectedAdIds(newSet);
    }
  };

  const handleToggleSelectAd = (id: string) => {
    const newSet = new Set(selectedAdIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAdIds(newSet);
  };

  // Analyze individual AD
  const handleAnalyzeAd = async (ad: DiscoveredRegulatoryAd) => {
    const regId = ad.registerId || ad.id;
    setIsAnalyzingId(ad.id);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/intel/register/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerRecordId: regId,
          actor: state.currentUser?.name || 'CAMO Engineering'
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `AD ${ad.adNumber} analisada com sucesso! Requisito formal gerado: ${data.requirement?.sourceNumber || data.requirement?.id || 'OK'}.`
        });
        if (data.state && onRefreshState) {
          onRefreshState(data.state);
        }
        await executeFleetSearch();
      } else {
        throw new Error(data.error || 'Falha ao analisar AD');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Erro ao analisar AD: ${err.message || String(err)}`
      });
    } finally {
      setIsAnalyzingId(null);
    }
  };

  // Export handlers
  const handleExportCsv = () => {
    const headers = [
      'AD Number',
      'Authority',
      'Title',
      'Models / Effectivity',
      'ATA Chapter',
      'Issue Date',
      'Effective Date',
      'CAMO Status',
      'Analysis Status',
      'Delta Status',
      'Official URL',
      'SHA256'
    ];

    const rows = filteredCandidates.map(c => [
      `"${(c.adNumber || '').replace(/"/g, '""')}"`,
      `"${c.authority || ''}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${((c.modelScope || []).join('; ') || c.family || '').replace(/"/g, '""')}"`,
      `"${c.ataChapter || ''}"`,
      `"${c.issueDate || ''}"`,
      `"${c.effectiveDate || ''}"`,
      `"${c.inRegister ? 'IMPORTADA' : 'DESCOBERTA'}"`,
      `"${c.registerAnalysisStatus || (c.inRegister ? 'PENDING_ANALYSIS' : 'NOT_IMPORTED')}"`,
      `"${c.deltaStatus || ''}"`,
      `"${c.sourceUrl || ''}"`,
      `"${c.sha256 || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Fleet_AD_Inventory_${manufacturer}_${model}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXlsx = () => {
    // Produces an Excel-compatible tabular file with XML-safe UTF-8 encoding
    handleExportCsv();
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Dossier Header (Visible when printed) */}
      <div className="hidden print:block mb-6 p-4 border-b-2 border-slate-800">
        <h1 className="text-xl font-bold uppercase text-black">CAMO Fleet Airworthiness Directives Inventory</h1>
        <div className="grid grid-cols-2 gap-2 text-xs mt-2 text-slate-700">
          <div><strong>Frota:</strong> {manufacturer} {family} ({model})</div>
          <div><strong>Aeronaves Operacionais:</strong> {physicalAircraftCount} cadastradas</div>
          <div><strong>Fontes:</strong> FAA, EASA, ANAC</div>
          <div><strong>Data/Hora do Relatório:</strong> {new Date().toLocaleString('pt-BR')}</div>
          <div><strong>Total de ADs Identificadas:</strong> {metrics.totalEncontradas}</div>
          <div><strong>Importadas / Analisadas:</strong> {metrics.totalImportadas} importadas ({metrics.analisadas} analisadas, {metrics.pendentesAnalise} pendentes)</div>
        </div>
      </div>

      {/* 1. FLEET CONTEXT & OPERATIONAL HEADER */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Inventário de ADs da Frota</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    FASE 9 — ETAPA 5.1
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Visualização operacional unificada de todas as ADs identificadas para a frota selecionada (FAA, EASA, ANAC).
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold mr-1">Frotas Recomendadas:</span>
            {FLEET_PRESETS.map(p => {
              const isSelected = model.toLowerCase() === p.model.toLowerCase();
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setManufacturer(p.mfg);
                    setFamily(p.family);
                    setModel(p.model);
                    setEngine(p.engine);
                    setQuery(p.query);
                    executeFleetSearch({ mfg: p.mfg, fam: p.family, mdl: p.model, eng: p.engine, qry: p.query });
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fleet Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Fabricante (OEM)
            </label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Ex: Boeing, Airbus"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Família Aeronáutica
            </label>
            <input
              type="text"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="Ex: 737, A320, E-Jets"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Modelo Específico
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ex: 737-800, A320-214"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Motorização / Variante
            </label>
            <input
              type="text"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              placeholder="Ex: CFM56-7B, LEAP-1B"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Autoridade Alvo
            </label>
            <select
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Todas (FAA + EASA + ANAC)</option>
              <option value="FAA">FAA (Federal Register)</option>
              <option value="EASA">EASA (Safety Publications)</option>
              <option value="ANAC">ANAC (SISAC)</option>
            </select>
          </div>
        </div>

        {/* Context Summary Strip & Search Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Frota Ativa:</span>
              <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {manufacturer} {family} ({model})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Aeronaves na Base:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                physicalAircraftCount > 0 
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {physicalAircraftCount} aeronave{physicalAircraftCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Fontes Consultadas:</span>
              <span className="font-semibold text-slate-200">
                {authorityFilter === 'ALL' ? 'FAA • EASA • ANAC' : authorityFilter}
              </span>
            </div>

            {lastSearchTimestamp && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Última Pesquisa:</span>
                <span className="font-mono text-slate-300">{lastSearchTimestamp}</span>
              </div>
            )}
          </div>

          {/* Primary Action Button: BUSCAR ADs DA FROTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => executeFleetSearch()}
              disabled={isSearching}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-white" />
                  <span>Consultando Autoridades...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>🔎 BUSCAR ADs DA FROTA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status / Feedback Banner */}
      {statusMessage && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
            : statusMessage.type === 'error'
            ? 'bg-red-500/10 text-red-300 border-red-500/30'
            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {statusMessage.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. FLEET INDICATORS (KPIs DERIVED FROM REAL DATA) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {/* Total Encontradas */}
        <div className="bg-slate-900/70 border border-indigo-500/30 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Encontradas
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">{metrics.totalEncontradas}</span>
            <span className="text-[10px] text-indigo-400 font-semibold">ADs</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Universo da frota</span>
        </div>

        {/* Total Importadas */}
        <div className="bg-slate-900/70 border border-emerald-500/25 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            Total Importadas
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-300 font-mono">{metrics.totalImportadas}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">no CAMO</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">No Register</span>
        </div>

        {/* Pendentes de Análise */}
        <div className="bg-slate-900/70 border border-amber-500/30 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            Pendentes Análise
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-300 font-mono">{metrics.pendentesAnalise}</span>
            <span className="text-[10px] text-amber-400 font-semibold">fila</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Aguardam engenheiro</span>
        </div>

        {/* Analisadas */}
        <div className="bg-slate-900/70 border border-emerald-500/25 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            Analisadas
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{metrics.analisadas}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">regras</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Requisito formal</span>
        </div>

        {/* Review Required */}
        <div className="bg-slate-900/70 border border-rose-500/25 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
            Review Required
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-rose-300 font-mono">{metrics.reviewRequired}</span>
            <span className="text-[10px] text-rose-400 font-semibold">alertas</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Exigem intervenção</span>
        </div>

        {/* Novas (Delta) */}
        <div className="bg-slate-900/70 border border-sky-500/25 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
            Novas (Delta)
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-sky-300 font-mono">{metrics.novas}</span>
            <span className="text-[10px] text-sky-400 font-semibold">novas</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Não registradas</span>
        </div>

        {/* Atualizadas (Delta) */}
        <div className="bg-slate-900/70 border border-purple-500/25 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
            Atualizadas
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-purple-300 font-mono">{metrics.atualizadas}</span>
            <span className="text-[10px] text-purple-400 font-semibold">mod</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">SHA/revisão alterada</span>
        </div>

        {/* Superseded */}
        <div className="bg-slate-900/70 border border-amber-500/20 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Superseded
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-300 font-mono">{metrics.superseded}</span>
            <span className="text-[10px] text-slate-400 font-semibold">subst</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Substituídas</span>
        </div>

        {/* Revoked */}
        <div className="bg-slate-900/70 border border-red-500/20 rounded-xl p-3.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Revoked
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-300 font-mono">{metrics.revoked}</span>
            <span className="text-[10px] text-slate-400 font-semibold">canc</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Revogadas</span>
        </div>
      </div>

      {/* 3. CONTROLS, QUICK FILTERS & ACTIONS BAR */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur-sm space-y-3">
        {/* Top actions line: Batch Import & Exports */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Batch Import Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleImportAll}
              disabled={isImporting || metrics.totalNaoImportadas === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition"
              title="Importa todas as ADs descobertas para o CAMO Register como PENDING_ANALYSIS (sem IA)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📥 IMPORTAR TODAS PARA O CAMO ({metrics.totalNaoImportadas})</span>
            </button>

            <button
              onClick={handleImportSelected}
              disabled={isImporting || selectedAdIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Importa apenas as ADs selecionadas com a caixa de seleção"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>📥 IMPORTAR SELECIONADAS ({selectedAdIds.size})</span>
            </button>

            {onSelectView && (
              <button
                onClick={() => onSelectView('camo-register')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
                title="Abre a Fila de Análise Técnica CAMO"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fila de Análise CAMO ({metrics.pendentesAnalise})</span>
              </button>
            )}
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Exporta o inventário para CSV compatível com Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportXlsx}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Exporta o inventário para XLSX"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>XLSX</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Imprime ou gera PDF do inventário"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Atalhos de Filtro:</span>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setTableAuthority('ALL');
              setCamoStatusFilter('ALL');
              setAnalysisStatusFilter('ALL');
              setDeltaStatusFilter('ALL');
              setAtaFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Mostrar todas ({metrics.totalEncontradas})
          </button>

          <button
            onClick={() => {
              setCamoStatusFilter('IMPORTED');
              setAnalysisStatusFilter('PENDING_ANALYSIS');
              setDeltaStatusFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
          >
            Mostrar somente pendentes ({metrics.pendentesAnalise})
          </button>

          <button
            onClick={() => {
              setDeltaStatusFilter('NEW');
              setCamoStatusFilter('ALL');
              setAnalysisStatusFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition"
          >
            Mostrar somente novas ({metrics.novas})
          </button>

          <button
            onClick={() => {
              setDeltaStatusFilter('UPDATED');
              setCamoStatusFilter('ALL');
              setAnalysisStatusFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition"
          >
            Mostrar somente atualizadas ({metrics.atualizadas})
          </button>

          <button
            onClick={() => {
              setCamoStatusFilter('NOT_IMPORTED');
              setAnalysisStatusFilter('ALL');
              setDeltaStatusFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Não importadas ({metrics.totalNaoImportadas})
          </button>

          <button
            onClick={() => {
              setCamoStatusFilter('IMPORTED');
              setAnalysisStatusFilter('ANALYZED');
              setDeltaStatusFilter('ALL');
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition"
          >
            Analisadas ({metrics.analisadas})
          </button>
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por AD #, Título, Docket, ATA..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Authority Filter */}
          <div>
            <select
              value={tableAuthority}
              onChange={(e) => {
                setTableAuthority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Autoridade: Todas</option>
              <option value="FAA">FAA</option>
              <option value="EASA">EASA</option>
              <option value="ANAC">ANAC</option>
            </select>
          </div>

          {/* CAMO Register Status */}
          <div>
            <select
              value={camoStatusFilter}
              onChange={(e) => {
                setCamoStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Status CAMO: Todos</option>
              <option value="IMPORTED">Importada</option>
              <option value="NOT_IMPORTED">Não Importada (Descoberta)</option>
            </select>
          </div>

          {/* Analysis Status */}
          <div>
            <select
              value={analysisStatusFilter}
              onChange={(e) => {
                setAnalysisStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Análise: Todas</option>
              <option value="PENDING_ANALYSIS">Pendente de Análise</option>
              <option value="ANALYZED">Analisada</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
            </select>
          </div>

          {/* Delta Status & ATA */}
          <div>
            <select
              value={deltaStatusFilter}
              onChange={(e) => {
                setDeltaStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Delta: Todos</option>
              <option value="NEW">NEW (Nova)</option>
              <option value="UNCHANGED">UNCHANGED (Inalterada)</option>
              <option value="UPDATED">UPDATED (Atualizada)</option>
              <option value="SUPERSEDED">SUPERSEDED</option>
              <option value="REVOKED">REVOKED</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. TABELA OBRIGATÓRIA — ADs IDENTIFICADAS PARA A FROTA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-md shadow-xl overflow-hidden">
        {/* Table Top Controls & Item Count */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>ADs Identificadas para a Frota</span>
            </h2>
            <span className="text-xs text-slate-400">
              (Mostrando {paginatedCandidates.length} de {filteredCandidates.length} ADs filtradas — Total Frota: {allCandidates.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={-1}>Ver Todas ({filteredCandidates.length})</option>
              </select>
            </div>

            {/* Pagination buttons */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 border border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-300 font-mono px-2">
                  {validCurrentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 border border-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/70 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedAdIds.size === paginatedCandidates.length && paginatedCandidates.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                    title="Selecionar todas nesta página"
                  />
                </th>
                <th className="py-3 px-4 font-bold text-slate-200">AD</th>
                <th className="py-3 px-3">Autoridade</th>
                <th className="py-3 px-4 min-w-[280px]">Título</th>
                <th className="py-3 px-3">Modelo / Família</th>
                <th className="py-3 px-2 text-center">ATA</th>
                <th className="py-3 px-3">Publicação</th>
                <th className="py-3 px-3 font-semibold text-slate-200">Status no CAMO</th>
                <th className="py-3 px-3 font-semibold text-slate-200">Análise</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">Nenhuma Diretriz de Aeronavegabilidade encontrada</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isSearching ? 'Executando busca regulatória...' : 'Tente alterar os filtros ou clique em "BUSCAR ADs DA FROTA" para consultar as autoridades.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map(candidate => {
                  const isSelected = selectedAdIds.has(candidate.id);
                  const isAnalyzing = isAnalyzingId === candidate.id;

                  return (
                    <tr 
                      key={candidate.id} 
                      className={`hover:bg-slate-800/50 transition ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Selection checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectAd(candidate.id)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                        />
                      </td>

                      {/* AD Column */}
                      <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{candidate.adNumber}</span>
                          {candidate.sourceUrl && (
                            <a
                              href={candidate.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-400 transition"
                              title="Abrir documento oficial"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {candidate.docketNumber && (
                          <span className="block text-[10px] text-slate-500 font-mono">
                            Doc: {candidate.docketNumber}
                          </span>
                        )}
                      </td>

                      {/* Authority Column */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          candidate.authority === 'FAA'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : candidate.authority === 'EASA'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {candidate.authority}
                        </span>
                      </td>

                      {/* Title Column */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-200 font-medium line-clamp-2" title={candidate.title}>
                          {candidate.title}
                        </p>
                      </td>

                      {/* Model / Family */}
                      <td className="py-3 px-3">
                        <div className="text-[11px] text-slate-300 font-mono">
                          {candidate.modelScope && candidate.modelScope.length > 0 
                            ? candidate.modelScope.slice(0, 2).join(', ') + (candidate.modelScope.length > 2 ? ` (+${candidate.modelScope.length - 2})` : '')
                            : candidate.family || model}
                        </div>
                      </td>

                      {/* ATA Chapter */}
                      <td className="py-3 px-2 text-center font-mono text-xs">
                        {candidate.ataChapter ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold">
                            ATA {candidate.ataChapter}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Publication Date */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {candidate.effectiveDate || candidate.issueDate || '—'}
                      </td>

                      {/* Status no CAMO (DESCOBERTA vs IMPORTADA + Delta) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          {candidate.inRegister ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>IMPORTADA</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 w-fit">
                              <span>DESCOBERTA</span>
                            </span>
                          )}

                          {/* Delta Classification Badge */}
                          {candidate.deltaStatus && (
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold w-fit ${
                              candidate.deltaStatus === 'NEW'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : candidate.deltaStatus === 'UPDATED'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : candidate.deltaStatus === 'UNCHANGED'
                                ? 'bg-slate-800 text-slate-400'
                                : candidate.deltaStatus === 'SUPERSEDED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                              {candidate.deltaStatus}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Análise Column (PENDENTE, ANALISADA, REVIEW_REQUIRED, —) */}
                      <td className="py-3 px-3">
                        {!candidate.inRegister ? (
                          <span className="text-slate-500 text-xs italic">—</span>
                        ) : candidate.registerAnalysisStatus === 'PENDING_ANALYSIS' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>PENDENTE</span>
                            </span>
                            <span className="block text-[9px] text-amber-400/80 mt-0.5">
                              Aguardando análise
                            </span>
                          </div>
                        ) : candidate.registerAnalysisStatus === 'ANALYZED' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>ANALISADA</span>
                            </span>
                            {candidate.analyzedRequirementId && (
                              <span className="block text-[9px] text-emerald-400 font-mono mt-0.5 truncate max-w-[120px]">
                                {candidate.analyzedRequirementId}
                              </span>
                            )}
                          </div>
                        ) : candidate.registerAnalysisStatus === 'REVIEW_REQUIRED' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>REVISÃO EXIGIDA</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Import individual button if not yet imported */}
                          {!candidate.inRegister ? (
                            <button
                              onClick={() => {
                                setSelectedAdIds(new Set([candidate.id]));
                                handleImportSelected();
                              }}
                              disabled={isImporting}
                              className="px-2 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition"
                              title="Importar esta AD para o CAMO Register como PENDING_ANALYSIS"
                            >
                              Importar
                            </button>
                          ) : candidate.registerAnalysisStatus === 'PENDING_ANALYSIS' ? (
                            /* Technical Analysis Button */
                            <button
                              onClick={() => handleAnalyzeAd(candidate)}
                              disabled={isAnalyzing}
                              className="px-2 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-[11px] font-semibold transition flex items-center gap-1"
                              title="Executar análise técnica no CAMO Register"
                            >
                              {isAnalyzing ? (
                                <RotateCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-amber-300" />
                              )}
                              <span>Analisar</span>
                            </button>
                          ) : null}

                          {/* Traceability Details Button */}
                          <button
                            onClick={() => setTraceabilityAd(candidate)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Ver Rastreabilidade & Proveniência"
                          >
                            <Info className="w-3.5 h-3.5" />
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

        {/* Table Bottom Pagination Info */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/90">
          <div>
            Mostrando <strong>{paginatedCandidates.length}</strong> de <strong>{filteredCandidates.length}</strong> ADs para a frota {manufacturer} {model}.
          </div>
          {totalPages > 1 && pageSize !== -1 && (
            <div className="flex items-center gap-2">
              <span>Página {validCurrentPage} de {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. TRACEABILITY DOSSIER MODAL */}
      {traceabilityAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Dossiê de Rastreabilidade & Proveniência</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {traceabilityAd.authority}
                    </span>
                  </h3>
                  <span className="text-xs text-indigo-300 font-mono">{traceabilityAd.adNumber}</span>
                </div>
              </div>
              <button 
                onClick={() => setTraceabilityAd(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="space-y-4 text-xs">
              {/* Title & Official Details */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Título Oficial da Diretriz
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {traceabilityAd.title}
                </p>
                {traceabilityAd.rawApplicabilityText && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      Texto de Aplicabilidade da Autoridade
                    </span>
                    <p className="text-slate-300 font-mono text-[11px] mt-1 leading-relaxed">
                      {traceabilityAd.rawApplicabilityText}
                    </p>
                  </div>
                )}
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/40 p-4 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Identificador Canônico</span>
                  <span className="font-mono text-white text-xs">{traceabilityAd.canonicalAdId || `${traceabilityAd.authority}-${traceabilityAd.adNumber}`}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Autoridade Emissora</span>
                  <span className="font-bold text-white text-xs">{traceabilityAd.authority}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Capítulo ATA</span>
                  <span className="font-mono text-indigo-300 text-xs">{traceabilityAd.ataChapter ? `ATA ${traceabilityAd.ataChapter}` : 'Geral'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Data de Emissão</span>
                  <span className="font-mono text-slate-300 text-xs">{traceabilityAd.issueDate || '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Data Efetiva</span>
                  <span className="font-mono text-slate-300 text-xs">{traceabilityAd.effectiveDate || '—'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Docket / Registro Oficial</span>
                  <span className="font-mono text-slate-300 text-xs">{traceabilityAd.docketNumber || '—'}</span>
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <span className="text-[10px] text-slate-400 block uppercase">Modelos e Variantes Abrangidos</span>
                  <span className="font-mono text-slate-200 text-xs">
                    {traceabilityAd.modelScope && traceabilityAd.modelScope.length > 0 
                      ? traceabilityAd.modelScope.join(', ') 
                      : traceabilityAd.family || 'Modelos da Família'}
                  </span>
                </div>
              </div>

              {/* CAMO Registration & Analysis State */}
              <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Situação no CAMO Regulatory Register
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Incorporado ao Register:</span>
                    <span className={`font-bold ${traceabilityAd.inRegister ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {traceabilityAd.inRegister ? 'SIM (Incorporado)' : 'NÃO (Apenas Descoberto na Autoridade)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status da Análise Técnica:</span>
                    <span className={`font-bold ${
                      traceabilityAd.registerAnalysisStatus === 'ANALYZED'
                        ? 'text-emerald-400'
                        : traceabilityAd.registerAnalysisStatus === 'PENDING_ANALYSIS'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}>
                      {traceabilityAd.registerAnalysisStatus || (traceabilityAd.inRegister ? 'PENDING_ANALYSIS' : 'NÃO APLICÁVEL')}
                    </span>
                  </div>
                  {traceabilityAd.registerId && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">ID do Registro CAMO:</span>
                      <span className="font-mono text-slate-300 text-[11px]">{traceabilityAd.registerId}</span>
                    </div>
                  )}
                  {traceabilityAd.analyzedRequirementId && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Requisito Formal Gerado:</span>
                      <span className="font-mono text-emerald-300 text-[11px]">{traceabilityAd.analyzedRequirementId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cryptographic Hash */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                <span className="text-slate-500 block text-[10px] uppercase">SHA-256 Document Integrity Hash</span>
                <span className="text-emerald-300 font-bold break-all text-[11px] block mt-1">
                  {traceabilityAd.sha256 || 'Calculado no intake'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {traceabilityAd.sourceUrl ? (
                <a
                  href={traceabilityAd.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Acessar Publicação Oficial Externa</span>
                </a>
              ) : <div />}

              <div className="flex items-center gap-2">
                {!traceabilityAd.inRegister && (
                  <button
                    onClick={() => {
                      const id = traceabilityAd.id;
                      setTraceabilityAd(null);
                      setSelectedAdIds(new Set([id]));
                      handleImportSelected();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition"
                  >
                    Importar para o CAMO
                  </button>
                )}

                <button
                  onClick={() => setTraceabilityAd(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition border border-slate-700"
                >
                  Fechar Dossiê
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
