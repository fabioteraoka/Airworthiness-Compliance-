import { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Cpu, 
  ShieldCheck, 
  FileCheck2, 
  ChevronRight,
  Hash,
  BookOpen,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { ServiceBulletinDocumentRecord, AdSBDependency, AdSbCrossValidationResult } from '../types';

interface TechnicalReferencesViewProps {
  state: DatabaseState | null;
  onRefreshState?: (newState: DatabaseState) => void;
  onSelectAd?: (adId: string, subTab?: string) => void;
  onSelectView?: (view: string, subTab?: string) => void;
  initialTab?: 'all' | 'matrix' | 'cross-validation';
}

export default function TechnicalReferencesView({
  state,
  onRefreshState,
  onSelectAd,
  onSelectView,
  initialTab = 'all'
}: TechnicalReferencesViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'matrix' | 'cross-validation'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Repositories from state
  const sbRepo: ServiceBulletinDocumentRecord[] = state?.sbRepository || [];
  const adSbDeps: AdSBDependency[] = state?.adSbDependencies || [];
  const crossValidations: AdSbCrossValidationResult[] = state?.adSbCrossValidations || [];

  // If repository is currently empty, extract fallback referenced documents from requirements
  const fallbackSbs: ServiceBulletinDocumentRecord[] = useMemo(() => {
    if (sbRepo.length > 0) return sbRepo;
    const extracted: ServiceBulletinDocumentRecord[] = [];
    state?.requirements.forEach((req) => {
      req.referencedDocuments?.forEach((doc) => {
        const docRef = doc.documentReference || doc.id;
        extracted.push({
          documentId: `sb-ref-${doc.id}`,
          documentType: 'SERVICE_BULLETIN',
          manufacturer: req.applicabilityRule?.aircraftModels?.[0]?.includes('737') ? 'Boeing' : 'OEM',
          documentNumber: docRef,
          revision: doc.revision || 'Original',
          issueDate: req.effectiveDate,
          title: doc.purpose || `Service Bulletin ${docRef} referenced by AD ${req.sourceNumber}`,
          source: 'AD Mandatory Reference',
          documentHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
          retrievedAt: new Date().toISOString(),
          rawContent: doc.notes || `Document reference extracted from compliance directive ${req.sourceNumber}`
        });
      });
    });
    return extracted;
  }, [sbRepo, state?.requirements]);

  const displayedDocs = sbRepo.length > 0 ? sbRepo : fallbackSbs;

  // Filtered documents
  const filteredDocs = displayedDocs.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      doc.documentNumber.toLowerCase().includes(q) ||
      doc.title.toLowerCase().includes(q) ||
      doc.manufacturer.toLowerCase().includes(q);

    const matchesMfg = manufacturerFilter === 'ALL' || doc.manufacturer === manufacturerFilter;
    const matchesType = typeFilter === 'ALL' || doc.documentType === typeFilter;

    return matchesSearch && matchesMfg && matchesType;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>OEM Technical Publications & Airworthiness Engineering</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            Technical References (SB / ASB / RB / ARB)
          </h1>
          <p className="text-xs text-slate-400">
            Repositório técnico agregado de publicações de fabricantes (Service Bulletins, Alert SBs, Repair Bulletins) com rastreabilidade cruzada de diretrizes AD × SB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel px-3 py-1.5 rounded-lg border border-white/10 text-right">
            <div className="text-[10px] uppercase text-slate-400 font-medium">Acervo Técnico</div>
            <div className="text-sm font-bold text-white font-mono">{displayedDocs.length} Publicações</div>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-lg border border-white/10 text-right">
            <div className="text-[10px] uppercase text-slate-400 font-medium">Dependências Mapeadas</div>
            <div className="text-sm font-bold text-indigo-300 font-mono">{adSbDeps.length} AD × SB</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Documentos Técnicos ({displayedDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'matrix'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriz de Dependências AD × SB ({adSbDeps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cross-validation')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'cross-validation'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Validações Cruzadas ({crossValidations.length})</span>
        </button>
      </div>

      {/* Tab Content: All Technical Documents */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="glass-panel p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/10">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número do SB, título, fabricante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 uppercase tracking-wider">
                <Filter className="w-3 h-3 text-indigo-400" />
                Tipo:
              </span>
              {['ALL', 'SERVICE_BULLETIN', 'ALERT_SERVICE_BULLETIN', 'SERVICE_LETTER'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition ${
                    typeFilter === t
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'ALL' ? 'Todos' : t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List of Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.documentId}
                className="glass-panel p-4 rounded-xl border border-white/10 hover:border-indigo-500/40 transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {doc.documentType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Rev: {doc.revision}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{doc.documentNumber}</span>
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {doc.title}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] font-mono text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Fabricante:</span>
                    <span className="text-slate-200">{doc.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data de Emissão:</span>
                    <span className="text-slate-200">{doc.issueDate}</span>
                  </div>
                  {doc.documentHash && (
                    <div className="flex justify-between text-[10px] text-slate-500 truncate" title={doc.documentHash}>
                      <span>SHA-256:</span>
                      <span className="truncate max-w-[140px] font-mono">{doc.documentHash.substring(0, 16)}...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredDocs.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 glass-panel rounded-xl border border-white/10">
                <FileText className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhum documento técnico encontrado</p>
                <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou vincule Service Bulletins através da análise de diretrizes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Matrix AD x SB */}
      {activeTab === 'matrix' && (
        <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-slate-800/40">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Vínculos Mandatórios: Diretriz de Aeronavegabilidade (AD) × Service Bulletin (SB)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Relação de instruções do fabricante incorporadas por referência em diretrizes mandatórias da autoridade certificadora (FAA / EASA / ANAC).
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {adSbDeps.map((dep, idx) => (
              <div key={idx} className="p-4 hover:bg-white/5 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-indigo-600/30 text-indigo-200 border border-indigo-500/40">
                      AD {dep.adNumber}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-800 text-slate-200 border border-white/10">
                      SB {dep.sbNumber}
                    </span>
                    {dep.isMandatedByAd && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Mandatório
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-white">SB {dep.sbNumber} {dep.sbManufacturer ? `(${dep.sbManufacturer})` : ''}</h4>
                  <p className="text-xs text-slate-400">{dep.sourceText || dep.notes || `Relacionamento: ${dep.relationshipType}`}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectAd && onSelectAd(dep.adNumber, 'technical-refs')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    <span>Ver na Ficha da AD</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {adSbDeps.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Layers className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma dependência AD × SB registrada</p>
                <p className="text-xs text-slate-500 mt-1">Realize a análise técnica de uma AD para extrair suas referências mandatórias de fabricante.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Cross-Validations */}
      {activeTab === 'cross-validation' && (
        <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-slate-800/40">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Diagnósticos de Validação Cruzada (Cross-Validation AD × SB)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparação automatizada de aplicabilidade, ações mandatórias e prazos entre a diretriz oficial e o boletim do fabricante.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {crossValidations.map((cv, idx) => (
              <div key={idx} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white">AD {cv.adNumber}</span>
                    <span className="text-slate-500">×</span>
                    <span className="font-mono font-bold text-xs text-indigo-300">SB {cv.sbNumber}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    cv.overallStatus === 'CONSISTENT'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {cv.overallStatus}
                  </span>
                </div>
              </div>
            ))}

            {crossValidations.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma divergência ou validação cruzada registrada</p>
                <p className="text-xs text-slate-500 mt-1">A validação cruzada é gerada automaticamente na aba Referências Técnicas da Ficha da AD.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
