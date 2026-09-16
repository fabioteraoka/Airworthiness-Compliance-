import { useState, useEffect, useMemo } from 'react';
import { DatabaseState } from '../../server/dataStore';
import { 
  CamoRegulatoryRecord, 
  IssuingAuthority 
} from '../types';
import AnalysisCompletenessModal from './AnalysisCompletenessModal';
import { 
  Layers, 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  ExternalLink, 
  Sparkles, 
  FileCheck2, 
  Eye, 
  Download, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Hash, 
  Plane,
  ArrowRight,
  Database,
  History
} from 'lucide-react';

interface CamoRegulatoryRegisterViewProps {
  state: DatabaseState | null;
  onRefreshState: (newState: DatabaseState) => void;
  onSelectAd?: (id: string) => void;
  onSelectView?: (view: string) => void;
}

export default function CamoRegulatoryRegisterView({
  state,
  onRefreshState,
  onSelectAd,
  onSelectView
}: CamoRegulatoryRegisterViewProps) {
  const [records, setRecords] = useState<CamoRegulatoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<CamoRegulatoryRecord | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [authorityFilter, setAuthorityFilter] = useState<string>('ALL');
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [officialStatusFilter, setOfficialStatusFilter] = useState<string>('ALL');
  const [analysisStatusFilter, setAnalysisStatusFilter] = useState<string>('ALL');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [completenessModalRecord, setCompletenessModalRecord] = useState<{ id: string; adNumber: string } | null>(null);

  // Fetch register records
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (authorityFilter !== 'ALL') params.set('authority', authorityFilter);
      if (familyFilter !== 'ALL') params.set('family', familyFilter);
      if (analysisStatusFilter !== 'ALL') params.set('analysisStatus', analysisStatusFilter);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/intel/register?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch CAMO Register records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [authorityFilter, familyFilter, analysisStatusFilter, searchTerm]);

  // Global Register from state
  const globalRegister = useMemo(() => state?.camoRegulatoryRegister || [], [state?.camoRegulatoryRegister]);

  // Metrics
  const registerMetrics = useMemo(() => {
    const total = globalRegister.length;
    const pendingCount = globalRegister.filter(r => r.analysisStatus === 'PENDING_ANALYSIS').length;
    const analyzedCount = globalRegister.filter(r => r.analysisStatus === 'ANALYZED').length;
    const updatedCount = globalRegister.filter(r => (r.version || 1) > 1 || r.deltaStatus === 'UPDATED').length;
    return { total, pendingCount, analyzedCount, updatedCount };
  }, [globalRegister]);

  // Unique families
  const availableFamilies = useMemo(() => {
    const set = new Set<string>();
    globalRegister.forEach(r => { if (r.family) set.add(r.family.trim()); });
    return Array.from(set).sort();
  }, [globalRegister]);

  // Filter records by official status locally if needed
  const filteredRecords = useMemo(() => {
    if (officialStatusFilter === 'ALL') return records;
    return records.filter(r => r.officialStatus === officialStatusFilter);
  }, [records, officialStatusFilter]);

  // Pagination
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (pageSize >= 99999) return filteredRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Canonical ID', 'AD Number', 'Authority', 'Manufacturer', 'Family', 'Model Scope', 'ATA', 'Issue Date', 'Effective Date', 'Analysis Status', 'Official Status', 'Version', 'SHA-256'];
    const rows = records.map(r => [
      r.canonicalAdId || r.id,
      r.adNumber,
      r.authority,
      r.manufacturer,
      r.family,
      `"${(r.modelScope || []).join('; ')}"`,
      r.ataChapter || '',
      r.issueDate || '',
      r.effectiveDate || '',
      r.analysisStatus,
      r.officialStatus || 'CURRENT',
      `v${r.version || 1}`,
      r.sha256 || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `camo_regulatory_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Authority badge helper
  const renderAuthorityBadge = (auth: string) => {
    const a = (auth || 'FAA').toUpperCase();
    if (a.includes('FAA')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">FAA</span>;
    }
    if (a.includes('EASA')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">EASA</span>;
    }
    if (a.includes('ANAC')) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ANAC</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">{a}</span>;
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>CAMO Regulatory Register</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                  Repositório Mestre & Versionamento
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Repositório persistente, histórico e auditável de todas as Diretrizes de Aeronavegabilidade catalogadas pelo operador.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchRecords()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Role Differentiation & Workflow Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Este é o repositório mestre permanente de governança.</strong> As ADs cadastradas aqui permanecem no Register mesmo após analisadas. Para executar a análise técnica individual, utilize a <strong className="text-amber-300">Fase de Análise</strong>. Para descobrir novas diretrizes, use <strong className="text-blue-300">Inteligência & Lacunas</strong>.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSelectView && (
            <>
              <button
                onClick={() => onSelectView('analysis-phase')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Ir para Fase de Análise</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onSelectView('regulatory-intel')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Descobrir Novas</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Register Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de ADs no Register</p>
            <p className="text-3xl font-bold text-white mt-1">{registerMetrics.total}</p>
            <p className="text-xs text-slate-500 mt-1">Registros persistidos</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Pendentes na Fase de Análise */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pendentes de Análise</p>
            <p className="text-3xl font-bold text-amber-300 mt-1">{registerMetrics.pendingCount}</p>
            <p className="text-xs text-slate-500 mt-1">Aguardando na Fase de Análise</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Analisadas no Register */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Analisadas no Register</p>
            <p className="text-3xl font-bold text-emerald-300 mt-1">{registerMetrics.analyzedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Com requisitos técnicos gerados</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Versionadas / Atualizadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Com Histórico / Versões</p>
            <p className="text-3xl font-bold text-indigo-300 mt-1">{registerMetrics.updatedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Deltas e revisões rastreadas</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por AD, ID canônico, modelo ou hash..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Authority */}
            <select
              value={authorityFilter}
              onChange={(e) => { setAuthorityFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none"
            >
              <option value="ALL">Todas Autoridades</option>
              <option value="FAA">FAA (EUA)</option>
              <option value="EASA">EASA (Europa)</option>
              <option value="ANAC">ANAC (Brasil)</option>
            </select>

            {/* Family */}
            <select
              value={familyFilter}
              onChange={(e) => { setFamilyFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none"
            >
              <option value="ALL">Todas as Famílias</option>
              {availableFamilies.map(fam => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>

            {/* Status na Análise */}
            <select
              value={analysisStatusFilter}
              onChange={(e) => { setAnalysisStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none"
            >
              <option value="ALL">Todos os Status CAMO</option>
              <option value="PENDING_ANALYSIS">Pendente ({registerMetrics.pendingCount})</option>
              <option value="ANALYSIS_IN_PROGRESS">Em Andamento</option>
              <option value="ANALYSIS_FAILED">Falha na Análise</option>
              <option value="REVIEW_REQUIRED">Revisão Requerida</option>
              <option value="ANALYZED">Analisada ({registerMetrics.analyzedCount})</option>
            </select>

            {/* Official Status */}
            <select
              value={officialStatusFilter}
              onChange={(e) => { setOfficialStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none"
            >
              <option value="ALL">Status Regulatório: Todos</option>
              <option value="CURRENT">CURRENT</option>
              <option value="SUPERSEDED">SUPERSEDED</option>
              <option value="REVOKED">REVOKED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Livro-Razão Regulatório CAMO</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {totalItems} diretrizes registradas
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={99999}>Todas ({totalItems})</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Carregando livro-razão regulatório...</p>
          </div>
        ) : paginatedRecords.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <Layers className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <p className="text-base font-medium text-slate-300">Nenhum registro encontrado no CAMO Register</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Acesse a tela de Inteligência & Lacunas para descobrir diretrizes emitidas pela FAA, EASA e ANAC e importá-las para o Register.
              </p>
            </div>
            {onSelectView && (
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
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">ID Canônico & Diretriz</th>
                  <th className="py-3 px-3">Autoridade</th>
                  <th className="py-3 px-4">Título Oficial</th>
                  <th className="py-3 px-3">Frota & Modelo</th>
                  <th className="py-3 px-3">ATA</th>
                  <th className="py-3 px-3">Versão</th>
                  <th className="py-3 px-3">Status Regulatória</th>
                  <th className="py-3 px-3">Status Análise</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition">
                    {/* Canonical ID & AD */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white text-sm">
                        {record.adNumber}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                        {record.canonicalAdId || record.id}
                      </div>
                    </td>

                    {/* Authority */}
                    <td className="py-3 px-3">
                      {renderAuthorityBadge(record.authority)}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-200 font-medium line-clamp-2" title={record.title}>
                        {record.title}
                      </p>
                    </td>

                    {/* Fleet / Model */}
                    <td className="py-3 px-3 text-slate-300 font-medium whitespace-nowrap">
                      <div>{record.manufacturer} {record.family}</div>
                      {record.modelScope && record.modelScope.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {record.modelScope.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </td>

                    {/* ATA */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {record.ataChapter ? `ATA ${record.ataChapter}` : '—'}
                    </td>

                    {/* Version */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] font-semibold">
                        v{record.version || 1}
                      </span>
                    </td>

                    {/* Official Regulatory Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {record.officialStatus || 'CURRENT'}
                      </span>
                    </td>

                    {/* Status na Fase de Análise */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {record.analysisStatus === 'ANALYZED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          ANALISADA
                        </span>
                      ) : record.analysisStatus === 'PENDING_ANALYSIS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          PENDENTE
                        </span>
                      ) : record.analysisStatus === 'ANALYSIS_IN_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                          <RotateCw className="w-3 h-3 animate-spin" />
                          EM ANDAMENTO
                        </span>
                      ) : record.analysisStatus === 'ANALYSIS_FAILED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          FALHA
                        </span>
                      ) : record.analysisStatus === 'REVIEW_REQUIRED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          REVISÃO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                          {record.analysisStatus}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setCompletenessModalRecord({ id: record.id, adNumber: record.adNumber })}
                          className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 hover:text-white transition"
                          title="Auditar completude determinística das 8 etapas"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedRecordForDetail(record)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-medium border border-slate-700 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ficha</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && pageSize < 99999 && (
          <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
            <div>
              Mostrando <span className="font-semibold text-white">{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</span> a{' '}
              <span className="font-semibold text-white">{Math.min(totalItems, currentPage * pageSize)}</span> de{' '}
              <span className="font-semibold text-white">{totalItems}</span> diretrizes no Register
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

      {/* Record Inspection Modal */}
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
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold">
                    v{selectedRecordForDetail.version || 1}
                  </span>
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
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Identificador Canônico</span>
                  <span className="font-mono text-slate-300">{selectedRecordForDetail.canonicalAdId || selectedRecordForDetail.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Capítulo ATA</span>
                  <span className="font-mono text-slate-300">ATA {selectedRecordForDetail.ataChapter || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Status no Register</span>
                  <span className="font-semibold text-slate-200">{selectedRecordForDetail.officialStatus || 'CURRENT'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Situação na Fase de Análise</span>
                  <span className="font-semibold text-slate-200">{selectedRecordForDetail.analysisStatus}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Hash Criptográfico SHA-256</span>
                  <span className="font-mono text-[11px] text-slate-400 break-all">{selectedRecordForDetail.sha256 || '—'}</span>
                </div>
              </div>

              {selectedRecordForDetail.rawApplicabilityText && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Texto de Aplicabilidade da Autoridade</span>
                  <p className="text-slate-300 text-xs leading-relaxed max-h-36 overflow-y-auto">
                    {selectedRecordForDetail.rawApplicabilityText}
                  </p>
                </div>
              )}

              {selectedRecordForDetail.versionHistory && selectedRecordForDetail.versionHistory.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Histórico de Versões & Auditoria</span>
                  <div className="space-y-1.5">
                    {selectedRecordForDetail.versionHistory.map((vh, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300 border-b border-slate-800/60 pb-1">
                        <span>v{vh.version} ({vh.deltaClassification}) — {vh.details}</span>
                        <span className="text-slate-500 font-mono">{new Date(vh.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const rec = selectedRecordForDetail;
                    setSelectedRecordForDetail(null);
                    setCompletenessModalRecord({ id: rec.id, adNumber: rec.adNumber });
                  }}
                  className="px-3.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Auditar 8 Etapas</span>
                </button>

                {selectedRecordForDetail.analysisStatus === 'PENDING_ANALYSIS' && onSelectView && (
                  <button
                    onClick={() => {
                      setSelectedRecordForDetail(null);
                      onSelectView('analysis-phase');
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analisar na Fase de Análise</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Fechar
              </button>
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
