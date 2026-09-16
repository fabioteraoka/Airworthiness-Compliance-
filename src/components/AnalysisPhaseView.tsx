import { useState, useEffect, useMemo } from 'react';
import { DatabaseState } from '../../server/dataStore';
import { 
  CamoRegulatoryRecord, 
  IssuingAuthority 
} from '../types';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  XCircle,
  RotateCw, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  ShieldAlert, 
  ShieldCheck,
  Eye, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  Hash, 
  Plane,
  BrainCircuit,
  Info,
  ArrowRight
} from 'lucide-react';
import AnalysisCompletenessModal from './AnalysisCompletenessModal';

interface AnalysisPhaseViewProps {
  state: DatabaseState | null;
  onRefreshState: (newState: DatabaseState) => void;
  onSelectAd?: (id: string) => void;
  onSelectView?: (view: string) => void;
}

export default function AnalysisPhaseView({
  state,
  onRefreshState,
  onSelectAd,
  onSelectView
}: AnalysisPhaseViewProps) {
  const [records, setRecords] = useState<CamoRegulatoryRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [analyzingRecordId, setAnalyzingRecordId] = useState<string | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<CamoRegulatoryRecord | null>(null);

  // Operational Filters
  const [onlyPending, setOnlyPending] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [authorityFilter, setAuthorityFilter] = useState<string>('ALL');
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [ataFilter, setAtaFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Notification / Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Fetch register records from API
  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const params = new URLSearchParams();
      if (onlyPending) {
        params.set('analysisStatus', 'PENDING_ANALYSIS');
      } else if (statusFilter !== 'ALL') {
        params.set('analysisStatus', statusFilter);
      }
      if (authorityFilter !== 'ALL') params.set('authority', authorityFilter);
      if (familyFilter !== 'ALL') params.set('family', familyFilter);
      if (ataFilter !== 'ALL') params.set('ataChapter', ataFilter);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/intel/register?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch records in AnalysisPhaseView:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [onlyPending, statusFilter, authorityFilter, familyFilter, ataFilter, searchTerm]);

  // Completeness Audit Modal
  const [completenessModalRecord, setCompletenessModalRecord] = useState<{ id: string; adNumber?: string } | null>(null);
  const [isSanitizing, setIsSanitizing] = useState<boolean>(false);

  // Derive global metrics from state
  const globalRegister = useMemo(() => state?.camoRegulatoryRegister || [], [state?.camoRegulatoryRegister]);
  const metrics = useMemo(() => {
    const total = globalRegister.length;
    const pendingCount = globalRegister.filter(r => r.analysisStatus === 'PENDING_ANALYSIS').length;
    const analyzedCount = globalRegister.filter(r => r.analysisStatus === 'ANALYZED').length;
    const failedCount = globalRegister.filter(r => r.analysisStatus === 'ANALYSIS_FAILED').length;
    const inProgressCount = globalRegister.filter(r => r.analysisStatus === 'ANALYSIS_IN_PROGRESS').length;
    const reviewRequiredCount = globalRegister.filter(r => r.analysisStatus === 'REVIEW_REQUIRED').length;
    const updatedCount = globalRegister.filter(r => r.deltaStatus === 'UPDATED').length;
    return { total, pendingCount, analyzedCount, failedCount, inProgressCount, reviewRequiredCount, updatedCount };
  }, [globalRegister]);

  // Unique families and ATAs for filters
  const availableFamilies = useMemo(() => {
    const set = new Set<string>();
    globalRegister.forEach(r => { if (r.family) set.add(r.family.trim()); });
    return Array.from(set).sort();
  }, [globalRegister]);

  const availableAtas = useMemo(() => {
    const set = new Set<string>();
    globalRegister.forEach(r => { if (r.ataChapter) set.add(r.ataChapter.trim()); });
    return Array.from(set).sort();
  }, [globalRegister]);

  // Pagination calculation
  const totalItems = records.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (pageSize >= 99999) return records;
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  // Execute Individual Analysis
  const handleAnalyzeRecord = async (record: CamoRegulatoryRecord) => {
    const recId = typeof record === 'string' ? record : (record?.id ? String(record.id) : '');
    if (!recId) return;

    setAnalyzingRecordId(recId);
    setFeedback(null);
    try {
      const actorName = typeof state?.currentUser?.name === 'string' ? state.currentUser.name : 'Chief CAMO Engineer';
      const res = await fetch('/api/intel/register/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: recId,
          actor: actorName
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onRefreshState(data.state);
        }
        
        const effectiveStatus = data.record?.analysisStatus || 'ANALYZED';
        if (effectiveStatus === 'ANALYZED') {
          setFeedback({
            type: 'success',
            message: `Diretriz ${record.adNumber} (${record.authority}) analisada com sucesso e 100% validada! Requisito ${data.record?.analyzedRequirementId || 'gerado'} cadastrado.`
          });
        } else if (effectiveStatus === 'REVIEW_REQUIRED') {
          setFeedback({
            type: 'info',
            message: `Diretriz ${record.adNumber} processada, porém requer revisão técnica de engenharia antes de aprovação final.`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Análise da diretriz ${record.adNumber} falhou ou está incompleta. Status retido: ${effectiveStatus}. Verifique os detalhes técnicos.`
          });
        }
        await fetchRecords();
      } else {
        const errData = await res.json();
        setFeedback({
          type: 'error',
          message: `Falha ao analisar diretriz ${record.adNumber}: ${errData.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro na comunicação com a API: ${err?.message || String(err)}`
      });
    } finally {
      setAnalyzingRecordId(null);
    }
  };

  // Run Master Integrity Sanitization
  const handleSanitizeRegister = async () => {
    setIsSanitizing(true);
    setFeedback(null);
    try {
      const actorName = typeof state?.currentUser?.name === 'string' ? state.currentUser.name : 'Chief CAMO Engineer';
      const res = await fetch('/api/intel/register/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: actorName })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.state) onRefreshState(data.state);
        await fetchRecords();
        setFeedback({
          type: 'success',
          message: `Auditoria de Integridade Concluída: ${data.totalInspected || 0} registros auditados. ${data.correctedCount || 0} registros corrigidos, ${data.alreadyValidCount || 0} confirmados em conformidade.`
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Falha na auditoria de integridade: ${data.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro na comunicação com a API: ${err?.message || String(err)}`
      });
    } finally {
      setIsSanitizing(false);
    }
  };

  // Authority badge helper
  const renderAuthorityBadge = (authority: string) => {
    const auth = (authority || 'FAA').toUpperCase();
    if (auth.includes('FAA')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">FAA</span>;
    }
    if (auth.includes('EASA')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">EASA</span>;
    }
    if (auth.includes('ANAC')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ANAC</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">{auth}</span>;
  };

  // Status badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ANALISADA
          </span>
        );
      case 'ANALYSIS_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            PROCESSANDO
          </span>
        );
      case 'ANALYSIS_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            FALHA NA ANÁLISE
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            REVISÃO OBRIGATÓRIA
          </span>
        );
      case 'PENDING_ANALYSIS':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            PENDENTE
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Fase de Análise</h1>
              <p className="text-sm text-slate-400">
                Ambiente operacional do engenheiro CAMO para análise técnica individual de Diretrizes de Aeronavegabilidade.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSanitizeRegister()}
            disabled={isSanitizing || isLoadingRecords}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/40 transition disabled:opacity-50"
            title="Executar auditoria e saneamento determinístico de completude em todo o CAMO Register"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isSanitizing ? 'animate-spin' : ''}`} />
            <span>{isSanitizing ? 'Auditando Integridade...' : 'Auditar Integridade'}</span>
          </button>
          <button
            onClick={() => fetchRecords()}
            disabled={isLoadingRecords}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            title="Atualizar lista"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          {onSelectView && (
            <button
              onClick={() => onSelectView('regulatory-intel')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Descobrir Novas ADs
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-lg flex items-center justify-between gap-3 text-sm border ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : feedback.type === 'error'
            ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            : 'bg-blue-950/60 border-blue-500/40 text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {feedback.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards (Derived from real CAMO register) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total no CAMO */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total no CAMO</p>
            <p className="text-3xl font-bold text-white mt-1">{metrics.total}</p>
            <p className="text-xs text-slate-500 mt-1">Diretrizes catalogadas</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Não Analisadas (Pendentes) */}
        <div 
          onClick={() => { setOnlyPending(true); setStatusFilter('PENDING_ANALYSIS'); }}
          className={`cursor-pointer bg-slate-900/80 border rounded-xl p-4 flex items-center justify-between transition hover:border-amber-500/50 ${
            onlyPending || statusFilter === 'PENDING_ANALYSIS' 
              ? 'border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-950/20' 
              : 'border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Não Analisadas</p>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <p className="text-3xl font-bold text-amber-300 mt-1">{metrics.pendingCount}</p>
            <p className="text-xs text-amber-400/80 mt-1">Aguardando análise do engenheiro</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Analisadas */}
        <div 
          onClick={() => { setOnlyPending(false); setStatusFilter('ANALYZED'); }}
          className={`cursor-pointer bg-slate-900/80 border rounded-xl p-4 flex items-center justify-between transition hover:border-emerald-500/50 ${
            statusFilter === 'ANALYZED' 
              ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-950/20' 
              : 'border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Analisadas</p>
            <p className="text-3xl font-bold text-emerald-300 mt-1">{metrics.analyzedCount}</p>
            <p className="text-xs text-emerald-400/80 mt-1">Requisitos & regras gerados</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Em Revisão */}
        <div 
          onClick={() => { setOnlyPending(false); setStatusFilter('REVIEW_REQUIRED'); }}
          className={`cursor-pointer bg-slate-900/80 border rounded-xl p-4 flex items-center justify-between transition hover:border-rose-500/50 ${
            statusFilter === 'REVIEW_REQUIRED' 
              ? 'border-rose-500/60 ring-1 ring-rose-500/30 bg-rose-950/20' 
              : 'border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">Em Revisão</p>
            <p className="text-3xl font-bold text-rose-300 mt-1">{metrics.reviewRequiredCount}</p>
            <p className="text-xs text-rose-400/80 mt-1">Requerem triagem sênior</p>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick toggle: Mostrar somente pendentes */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !onlyPending;
                setOnlyPending(next);
                if (next) setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                onlyPending 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mostrar somente pendentes</span>
              {onlyPending && <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">ATIVO</span>}
            </button>

            <span className="text-slate-600">|</span>

            {/* Reset filters button */}
            {(onlyPending || statusFilter !== 'ALL' || authorityFilter !== 'ALL' || familyFilter !== 'ALL' || ataFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setOnlyPending(false);
                  setStatusFilter('ALL');
                  setAuthorityFilter('ALL');
                  setFamilyFilter('ALL');
                  setAtaFilter('ALL');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por AD, título ou ATA..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Status na Fila</label>
            <select
              disabled={onlyPending}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING_ANALYSIS">Pendente ({metrics.pendingCount})</option>
              <option value="ANALYSIS_IN_PROGRESS">Em Andamento ({metrics.inProgressCount})</option>
              <option value="ANALYSIS_FAILED">Falha na Análise ({metrics.failedCount})</option>
              <option value="REVIEW_REQUIRED">Revisão Requerida ({metrics.reviewRequiredCount})</option>
              <option value="ANALYZED">Analisada ({metrics.analyzedCount})</option>
            </select>
          </div>

          {/* Authority Filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Autoridade</label>
            <select
              value={authorityFilter}
              onChange={(e) => {
                setAuthorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todas as Autoridades</option>
              <option value="FAA">FAA (EUA)</option>
              <option value="EASA">EASA (Europa)</option>
              <option value="ANAC">ANAC (Brasil)</option>
            </select>
          </div>

          {/* Family Filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Família Aeronave</label>
            <select
              value={familyFilter}
              onChange={(e) => {
                setFamilyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todas as Famílias</option>
              {availableFamilies.map(fam => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          {/* ATA Chapter Filter */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Capítulo ATA</label>
            <select
              value={ataFilter}
              onChange={(e) => {
                setAtaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todos os Capítulos</option>
              {availableAtas.map(ata => (
                <option key={ata} value={ata}>ATA {ata}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operational Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Lista de Diretrizes para Análise</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {totalItems} encontrada{totalItems !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={99999}>Todas ({totalItems})</option>
            </select>
          </div>
        </div>

        {isLoadingRecords ? (
          <div className="py-16 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Carregando fila de análise do CAMO...</p>
          </div>
        ) : paginatedRecords.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-medium text-slate-300">Nenhuma diretriz encontrada com os filtros selecionados</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {metrics.total === 0 
                  ? 'O CAMO Regulatory Register ainda não possui diretrizes importadas. Acesse a tela de Inteligência & Lacunas para buscar e importar ADs.'
                  : 'Experimente limpar os filtros operacionais acima para visualizar outras diretrizes.'}
              </p>
            </div>
            {metrics.total === 0 && onSelectView && (
              <button
                onClick={() => onSelectView('regulatory-intel')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
              >
                <Sparkles className="w-4 h-4" />
                Ir para Inteligência & Lacunas
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Diretriz (AD)</th>
                  <th className="py-3 px-3">Autoridade</th>
                  <th className="py-3 px-4">Título Oficial & Escopo</th>
                  <th className="py-3 px-3">ATA</th>
                  <th className="py-3 px-3">Data Efetiva</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Ação Operacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedRecords.map(record => {
                  const isAnalyzing = analyzingRecordId === record.id;
                  const isPending = record.analysisStatus === 'PENDING_ANALYSIS';
                  const isAnalyzed = record.analysisStatus === 'ANALYZED';
                  const isReviewRequired = record.analysisStatus === 'REVIEW_REQUIRED';

                  return (
                    <tr 
                      key={record.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isPending ? 'bg-amber-950/5' : ''
                      }`}
                    >
                      {/* AD Number */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {record.adNumber}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {record.canonicalAdId || record.id}
                        </div>
                      </td>

                      {/* Authority */}
                      <td className="py-3 px-3">
                        {renderAuthorityBadge(record.authority)}
                      </td>

                      {/* Title and Aircraft Scope */}
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-slate-200 font-medium line-clamp-2" title={record.title}>
                          {record.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {record.manufacturer} {record.family}
                          </span>
                          {record.modelScope && record.modelScope.length > 0 && (
                            <span className="text-slate-500">
                              [{record.modelScope.slice(0, 3).join(', ')}{record.modelScope.length > 3 ? ` +${record.modelScope.length - 3}` : ''}]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ATA Chapter */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {record.ataChapter ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-medium">
                            ATA {record.ataChapter}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Effective Date */}
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {record.effectiveDate || record.issueDate || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderStatusBadge(record.analysisStatus)}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Details Modal Trigger */}
                          <button
                            onClick={() => setSelectedRecordForDetail(record)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Ver detalhes técnicos e rastreabilidade"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Deterministic Audit Modal Trigger */}
                          <button
                            onClick={() => setCompletenessModalRecord({ id: record.id, adNumber: record.adNumber })}
                            className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 hover:text-white transition"
                            title="Auditar completude determinística das 8 etapas obrigatórias"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Primary Action Button */}
                          {isPending && (
                            <button
                              onClick={() => handleAnalyzeRecord(record)}
                              disabled={isAnalyzing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition disabled:opacity-50"
                            >
                              {isAnalyzing ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Analisando...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>ANALISAR</span>
                                </>
                              )}
                            </button>
                          )}

                          {record.analysisStatus === 'ANALYSIS_IN_PROGRESS' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium rounded-lg text-xs">
                              <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                              <span>Em Análise</span>
                            </span>
                          )}

                          {record.analysisStatus === 'ANALYSIS_FAILED' && (
                            <button
                              onClick={() => handleAnalyzeRecord(record)}
                              disabled={isAnalyzing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50"
                              title="Tentar novamente análise técnica completa"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                              <span>RETRY</span>
                            </button>
                          )}

                          {isAnalyzed && (
                            <button
                              onClick={() => {
                                if (record.analyzedRequirementId && onSelectAd) {
                                  onSelectAd(record.analyzedRequirementId);
                                } else {
                                  setSelectedRecordForDetail(record);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-medium rounded-lg text-xs transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ver Requisito</span>
                            </button>
                          )}

                          {isReviewRequired && (
                            <button
                              onClick={() => handleAnalyzeRecord(record)}
                              disabled={isAnalyzing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-medium rounded-lg text-xs transition"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Revisar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Pagination */}
        {totalItems > 0 && pageSize < 99999 && (
          <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/30">
            <div>
              Mostrando <span className="font-semibold text-white">{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</span> a{' '}
              <span className="font-semibold text-white">{Math.min(totalItems, currentPage * pageSize)}</span> de{' '}
              <span className="font-semibold text-white">{totalItems}</span> diretrizes
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 text-xs font-mono font-medium text-slate-300">
                Página {currentPage} de {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Technical Detail & Traceability Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  {renderAuthorityBadge(selectedRecordForDetail.authority)}
                  <h3 className="text-lg font-bold text-white font-mono">
                    {selectedRecordForDetail.adNumber}
                  </h3>
                  {renderStatusBadge(selectedRecordForDetail.analysisStatus)}
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedRecordForDetail.title}</p>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">ID Canônico</span>
                  <span className="font-mono text-slate-300">{selectedRecordForDetail.canonicalAdId || selectedRecordForDetail.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Capítulo ATA</span>
                  <span className="font-mono text-slate-300">ATA {selectedRecordForDetail.ataChapter || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Data de Importação</span>
                  <span className="text-slate-300">{selectedRecordForDetail.createdAt ? new Date(selectedRecordForDetail.createdAt).toLocaleString('pt-BR') : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Importado Por</span>
                  <span className="text-slate-300">{selectedRecordForDetail.importedBy || 'Engenheiro CAMO'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Hash SHA-256</span>
                  <span className="font-mono text-[11px] text-slate-400 break-all">{selectedRecordForDetail.sha256 || '—'}</span>
                </div>
              </div>

              {selectedRecordForDetail.rawApplicabilityText && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Texto Bruto de Aplicabilidade</span>
                  <p className="text-slate-300 text-xs leading-relaxed max-h-36 overflow-y-auto">
                    {selectedRecordForDetail.rawApplicabilityText}
                  </p>
                </div>
              )}

              {selectedRecordForDetail.analyzedRequirementId && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-emerald-400 font-semibold block text-xs">Requisito Técnico Criado</span>
                    <span className="font-mono text-emerald-300 text-xs">{selectedRecordForDetail.analyzedRequirementId}</span>
                  </div>
                  {onSelectAd && (
                    <button
                      onClick={() => {
                        const reqId = selectedRecordForDetail.analyzedRequirementId!;
                        setSelectedRecordForDetail(null);
                        onSelectAd(reqId);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                    >
                      Abrir Diretriz <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const rec = selectedRecordForDetail;
                  setSelectedRecordForDetail(null);
                  setCompletenessModalRecord({ id: rec.id, adNumber: rec.adNumber });
                }}
                className="px-3.5 py-2 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Auditar 8 Etapas
              </button>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Fechar
              </button>
              {selectedRecordForDetail.analysisStatus === 'PENDING_ANALYSIS' && (
                <button
                  onClick={() => {
                    const rec = selectedRecordForDetail;
                    setSelectedRecordForDetail(null);
                    handleAnalyzeRecord(rec);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ANALISAR AGORA
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Completeness & Integrity Audit Modal */}
      {completenessModalRecord && (
        <AnalysisCompletenessModal
          recordId={completenessModalRecord.id}
          adNumber={completenessModalRecord.adNumber}
          isOpen={true}
          onClose={() => setCompletenessModalRecord(null)}
          onStatusUpdated={() => {
            fetchRecords();
          }}
        />
      )}
    </div>
  );
}
