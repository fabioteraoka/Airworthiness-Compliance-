import { useState, useEffect, type FormEvent } from 'react';
import { 
  Plane, 
  Plus, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sliders, 
  Wrench, 
  Check, 
  X,
  Sparkles,
  Edit3,
  Trash2,
  PowerOff,
  AlertTriangle,
  Search,
  FileText,
  Ban,
  Filter,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { Aircraft, Component, ComponentInstallation, AircraftOperationalStatus } from '../types';
import FleetAdSearchView from './FleetAdSearchView';

interface FleetViewProps {
  state: DatabaseState;
  onRefreshState: (newState: DatabaseState) => void;
  initialTab?: 'aircraft' | 'engines' | 'components' | 'fleet-matrix';
  onSelectAd?: (adId: string) => void;
  onSelectView?: (view: string, subTab?: string, entityId?: string | null) => void;
}

export default function FleetView({ 
  state, 
  onRefreshState,
  initialTab = 'aircraft',
  onSelectAd,
  onSelectView
}: FleetViewProps) {
  const [activeTab, setActiveTab] = useState<'aircraft' | 'engines' | 'components' | 'fleet-matrix'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [showAddAircraftModal, setShowAddAircraftModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPERATIONAL' | 'MAINTENANCE' | 'STORED' | 'DECOMMISSIONED'>('ALL');

  // New Aircraft Form State
  const [newReg, setNewReg] = useState('');
  const [newMsn, setNewMsn] = useState('');
  const [newModel, setNewModel] = useState('737-800');
  const [newManufacturer, setNewManufacturer] = useState('Boeing');
  const [newHours, setNewHours] = useState('12000');
  const [newCycles, setNewCycles] = useState('8500');

  // Edit Aircraft Modal State
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [editReg, setEditReg] = useState('');
  const [editMsn, setEditMsn] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editSeries, setEditSeries] = useState('');
  const [editType, setEditType] = useState('Commercial Transport');
  const [editHours, setEditHours] = useState('');
  const [editCycles, setEditCycles] = useState('');
  const [editLandings, setEditLandings] = useState('');
  const [editManufactureDate, setEditManufactureDate] = useState('');
  const [editStatus, setEditStatus] = useState<AircraftOperationalStatus>('OPERATIONAL');
  const [editStatusReason, setEditStatusReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Status Change / Decommission Modal State
  const [statusModalAircraft, setStatusModalAircraft] = useState<Aircraft | null>(null);
  const [targetStatus, setTargetStatus] = useState<AircraftOperationalStatus>('DECOMMISSIONED');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Delete Aircraft Modal State
  const [deletingAircraft, setDeletingAircraft] = useState<Aircraft | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // New Component Form State
  const [newPartNum, setNewPartNum] = useState('');
  const [newSerialNum, setNewSerialNum] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [selectedAircraftForInstall, setSelectedAircraftForInstall] = useState(state.aircraft[0]?.id || '');
  const [newInstallPosition, setNewInstallPosition] = useState('Empennage / Elevator Control Bay');

  // Open Edit Modal
  const handleOpenEdit = (ac: Aircraft) => {
    setEditingAircraft(ac);
    setEditReg(ac.registration);
    setEditMsn(ac.msn);
    setEditManufacturer(ac.manufacturer);
    setEditModel(ac.model);
    setEditSeries(ac.series || '');
    setEditType(ac.aircraftType || 'Commercial Transport');
    setEditHours(ac.totalFlightHours.toString());
    setEditCycles(ac.totalCycles.toString());
    setEditLandings(ac.totalLandings?.toString() || ac.totalCycles.toString());
    setEditManufactureDate(ac.manufactureDate || '');
    setEditStatus(ac.status);
    setEditStatusReason(ac.statusReason || '');
    setEditNotes(ac.notes || '');
  };

  // Submit Edit
  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAircraft) return;

    setIsSubmittingEdit(true);
    try {
      const payload: Partial<Aircraft> = {
        registration: editReg.toUpperCase().trim(),
        msn: editMsn.trim(),
        manufacturer: editManufacturer.trim(),
        model: editModel.trim(),
        series: editSeries.trim() || undefined,
        aircraftType: editType,
        totalFlightHours: Number(editHours) || 0,
        totalCycles: Number(editCycles) || 0,
        totalLandings: Number(editLandings) || Number(editCycles) || 0,
        manufactureDate: editManufactureDate || undefined,
        status: editStatus,
        statusReason: editStatusReason || undefined,
        notes: editNotes || undefined
      };

      const res = await fetch(`/api/fleet/aircraft/${editingAircraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setEditingAircraft(null);
      } else {
        const err = await res.json();
        alert(`Erro ao atualizar aeronave: ${err.error || 'Falha na requisição'}`);
      }
    } catch (err) {
      console.error('Failed to update aircraft:', err);
      alert('Erro de conexão ao salvar alterações da aeronave.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Status Modal
  const handleOpenStatusModal = (ac: Aircraft) => {
    setStatusModalAircraft(ac);
    setTargetStatus(ac.status === 'DECOMMISSIONED' ? 'OPERATIONAL' : 'DECOMMISSIONED');
    setStatusChangeReason('');
  };

  // Submit Status Change / Decommission
  const handleSaveStatus = async (e: FormEvent) => {
    e.preventDefault();
    if (!statusModalAircraft) return;

    setIsSubmittingStatus(true);
    try {
      const res = await fetch(`/api/fleet/aircraft/${statusModalAircraft.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          statusReason: statusChangeReason.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setStatusModalAircraft(null);
      } else {
        const err = await res.json();
        alert(`Erro ao alterar status: ${err.error || 'Falha na requisição'}`);
      }
    } catch (err) {
      console.error('Failed to change status:', err);
      alert('Erro de conexão ao alterar status da aeronave.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (ac: Aircraft) => {
    setDeletingAircraft(ac);
    setDeleteReason('');
  };

  // Submit Delete
  const handleConfirmDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!deletingAircraft) return;

    setIsSubmittingDelete(true);
    try {
      const res = await fetch(`/api/fleet/aircraft/${deletingAircraft.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason.trim() || undefined })
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setDeletingAircraft(null);
      } else {
        const err = await res.json();
        alert(`Erro ao excluir aeronave: ${err.error || 'Falha na requisição'}`);
      }
    } catch (err) {
      console.error('Failed to delete aircraft:', err);
      alert('Erro de conexão ao excluir aeronave.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleCreateAircraft = async (e: FormEvent) => {
    e.preventDefault();
    if (!newReg || !newMsn) return;

    try {
      const payload: Partial<Aircraft> = {
        registration: newReg.toUpperCase().trim(),
        msn: newMsn.trim(),
        manufacturer: newManufacturer.trim(),
        model: newModel.trim(),
        series: newModel.trim(),
        manufactureDate: '2016-04-10',
        totalFlightHours: Number(newHours) || 0,
        totalCycles: Number(newCycles) || 0,
        totalLandings: Number(newCycles) || 0,
        aircraftType: 'Commercial Transport',
        status: 'OPERATIONAL'
      };

      const res = await fetch('/api/fleet/aircraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setShowAddAircraftModal(false);
        setNewReg('');
        setNewMsn('');
      }
    } catch (err) {
      console.error('Failed to create aircraft:', err);
    }
  };

  const handleCreateComponent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPartNum || !newSerialNum) return;

    try {
      const targetAc = state.aircraft.find(a => a.id === selectedAircraftForInstall);
      const newComp: Partial<Component> = {
        manufacturer: 'Approved OEM',
        partNumber: newPartNum,
        serialNumber: newSerialNum,
        componentType: 'FLIGHT_CONTROLS',
        description: newCompDesc || `Component P/N ${newPartNum}`,
        status: 'SERVICEABLE'
      };

      const newInst: Partial<ComponentInstallation> = {
        aircraftId: selectedAircraftForInstall,
        aircraftRegistration: targetAc?.registration || 'Unknown',
        position: newInstallPosition,
        installationDate: new Date().toISOString().split('T')[0],
        installationHours: 0,
        installationCycles: 0,
        currentStatus: 'INSTALLED',
        installedBy: state.currentUser.name,
        workOrderRef: 'WO-MANUAL-INSTALL-' + Date.now().toString().slice(-4)
      };

      const res = await fetch('/api/fleet/component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component: newComp, installation: newInst })
      });

      if (res.ok) {
        const data = await res.json();
        onRefreshState(data.state);
        setShowAddComponentModal(false);
        setNewPartNum('');
        setNewSerialNum('');
      }
    } catch (err) {
      console.error('Failed to create component:', err);
    }
  };

  // Filtered Aircraft List
  const filteredAircraft = state.aircraft.filter((ac) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = 
        ac.registration.toLowerCase().includes(q) ||
        ac.msn.toLowerCase().includes(q) ||
        ac.model.toLowerCase().includes(q) ||
        ac.manufacturer.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter match
    if (statusFilter === 'OPERATIONAL') return ac.status === 'OPERATIONAL';
    if (statusFilter === 'MAINTENANCE') return ac.status === 'MAINTENANCE' || ac.status === 'AOG';
    if (statusFilter === 'STORED') return ac.status === 'STORED';
    if (statusFilter === 'DECOMMISSIONED') return ac.status === 'DECOMMISSIONED' || ac.status === 'RETIRED' || ac.status === 'INACTIVE';
    return true;
  });

  // Counts for status
  const countOperational = state.aircraft.filter(a => a.status === 'OPERATIONAL').length;
  const countMaintenance = state.aircraft.filter(a => a.status === 'MAINTENANCE' || a.status === 'AOG').length;
  const countStored = state.aircraft.filter(a => a.status === 'STORED').length;
  const countDecommissioned = state.aircraft.filter(a => a.status === 'DECOMMISSIONED' || a.status === 'RETIRED' || a.status === 'INACTIVE').length;

  // Helper for Status Badge styling
  const getStatusBadge = (status: AircraftOperationalStatus) => {
    switch (status) {
      case 'OPERATIONAL':
        return {
          label: 'OPERACIONAL',
          className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'MAINTENANCE':
        return {
          label: 'MANUTENÇÃO',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
      case 'AOG':
        return {
          label: 'AOG (GROUNDED)',
          className: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
        };
      case 'STORED':
        return {
          label: 'ESTOCADA / PRESERVADA',
          className: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
        };
      case 'DECOMMISSIONED':
        return {
          label: 'INUTILIZADA / BAIXADA',
          className: 'bg-purple-950/40 text-purple-300 border-purple-800/60'
        };
      case 'RETIRED':
        return {
          label: 'APOSENTADA',
          className: 'bg-slate-800 text-slate-300 border-slate-700'
        };
      case 'INACTIVE':
        return {
          label: 'INATIVA',
          className: 'bg-amber-950/30 text-amber-400 border-amber-800/30'
        };
      default:
        return {
          label: status,
          className: 'bg-slate-800 text-slate-300 border-slate-700'
        };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Plane className="w-4 h-4" />
            <span>Continuing Airworthiness Fleet Records & Control</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            Controle de Frota, Aeronaves & Configurações CAMO
          </h1>
          <p className="text-xs text-slate-400">
            Gerencie matrículas, horas (TSN), ciclos (CSN), status operacional, inutilização / descomissionamento e rastreabilidade de motores e componentes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddComponentModal(true)}
            className="flex items-center space-x-1.5 glass-panel hover:bg-white/10 text-slate-200 border border-white/10 px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition font-mono"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instalar Componente</span>
          </button>

          <button
            onClick={() => setShowAddAircraftModal(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow transition font-mono uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Aeronave</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab('aircraft')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'aircraft'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          <span>Aeronaves da Frota ({state.aircraft.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('engines')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'engines'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Motores & APUs ({state.engines.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'components'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Componentes & P/Ns Rastreados ({state.components.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('fleet-matrix')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'fleet-matrix'
              ? 'border-indigo-500 text-indigo-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Fleet × AD (Matriz de Diretrizes)</span>
        </button>
      </div>

      {/* Tab 1: Aircraft Fleet */}
      {activeTab === 'aircraft' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="glass-panel p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/10">
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 uppercase tracking-wider mr-1">
                <Filter className="w-3 h-3 text-indigo-400" />
                Filtrar:
              </span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Todas ({state.aircraft.length})
              </button>
              <button
                onClick={() => setStatusFilter('OPERATIONAL')}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition ${
                  statusFilter === 'OPERATIONAL'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Operacionais ({countOperational})
              </button>
              <button
                onClick={() => setStatusFilter('MAINTENANCE')}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition ${
                  statusFilter === 'MAINTENANCE'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Manutenção / AOG ({countMaintenance})
              </button>
              <button
                onClick={() => setStatusFilter('STORED')}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition ${
                  statusFilter === 'STORED'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Estocadas ({countStored})
              </button>
              <button
                onClick={() => setStatusFilter('DECOMMISSIONED')}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition ${
                  statusFilter === 'DECOMMISSIONED'
                    ? 'bg-purple-700 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                Inutilizadas / Baixadas ({countDecommissioned})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Matrícula, MSN ou Modelo..."
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {filteredAircraft.length === 0 ? (
            <div className="glass-panel rounded-xl p-8 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Nenhuma aeronave encontrada com os filtros selecionados.</p>
              <p className="text-xs">Tente limpar a busca ou mudar o filtro de status da frota.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredAircraft.map((ac) => {
                const installedComps = state.installations.filter(i => i.aircraftId === ac.id && i.currentStatus === 'INSTALLED');
                const installedEngs = state.engines.filter(e => e.aircraftId === ac.id);
                const acAssessments = state.assessments.filter(a => a.entityId === ac.id);
                const applicableCount = acAssessments.filter(a => a.result === 'APPLICABLE').length;
                const reviewCount = acAssessments.filter(a => a.result === 'REVIEW_REQUIRED').length;
                const statusInfo = getStatusBadge(ac.status);
                const isDecommissioned = ac.status === 'DECOMMISSIONED' || ac.status === 'RETIRED';

                return (
                  <div
                    key={ac.id}
                    className={`glass-panel rounded-xl p-5 shadow-sm space-y-4 transition flex flex-col justify-between ${
                      isDecommissioned 
                        ? 'border-purple-800/40 bg-purple-950/10 opacity-90' 
                        : 'hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Header with Status Badge */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xl font-black text-white font-mono ${isDecommissioned ? 'line-through text-slate-300' : ''}`}>
                              {ac.registration}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            MSN {ac.msn} • {ac.manufacturer} {ac.model} {ac.series ? `(${ac.series})` : ''}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono uppercase tracking-wider ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Decommission / Non-Operational Notice */}
                      {ac.status !== 'OPERATIONAL' && (
                        <div className="bg-slate-950/70 border border-amber-500/30 rounded-lg p-2.5 text-xs space-y-1">
                          <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Condição Fora de Voo Normal</span>
                          </div>
                          {ac.statusReason && (
                            <p className="text-[11px] text-slate-300">
                              <strong className="text-slate-400">Motivo:</strong> {ac.statusReason}
                            </p>
                          )}
                          {ac.decommissionDate && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Data de Descomissionamento: {ac.decommissionDate}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Flight Hours and Cycles Counters */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg text-xs font-mono border border-white/5">
                        <div>
                          <span className="text-slate-400 text-[10px] block uppercase">Horas de Voo (TSN)</span>
                          <span className="text-slate-200 font-bold">{ac.totalFlightHours.toLocaleString()} FH</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block uppercase">Ciclos de Voo (CSN)</span>
                          <span className="text-slate-200 font-bold">{ac.totalCycles.toLocaleString()} FC</span>
                        </div>
                      </div>

                      {/* Powerplants */}
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Motores Instalados:</span>
                        <div className="space-y-1">
                          {installedEngs.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic p-1.5 bg-slate-950/40 rounded">Nenhum motor associado no momento.</p>
                          ) : (
                            installedEngs.map((e) => (
                              <div key={e.id} className="p-2 bg-slate-950/60 rounded border border-white/5 flex items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-200">{e.position}: {e.model}</span>
                                <span className="text-indigo-300">S/N {e.serialNumber}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Tracked Components */}
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Componentes Rastreados:</span>
                        <div className="space-y-1">
                          {installedComps.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic p-1.5 bg-slate-950/40 rounded">Nenhum componente rastreado instalado.</p>
                          ) : (
                            installedComps.map((inst) => {
                              const comp = state.components.find(c => c.id === inst.componentId);
                              return (
                                <div key={inst.id} className="p-2 bg-slate-950/60 rounded border border-white/5 text-[11px] space-y-0.5 font-mono">
                                  <div className="flex justify-between text-indigo-200 font-bold">
                                    <span>P/N {comp?.partNumber}</span>
                                    <span className="text-amber-300">S/N {comp?.serialNumber}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex justify-between font-sans">
                                    <span>{inst.position}</span>
                                    <span>Ref: {inst.workOrderRef}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* AD Compliance Summary */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Diretrizes (ADs):</span>
                        {reviewCount > 0 ? (
                          <span className="text-indigo-300 font-bold">{reviewCount} Revisão Req.</span>
                        ) : applicableCount > 0 ? (
                          <span className="text-amber-400 font-bold">{applicableCount} Ações Pendentes</span>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Conforme</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (onSelectView) {
                            onSelectView('fleet', 'fleet-matrix');
                          } else {
                            setActiveTab('fleet-matrix');
                          }
                        }}
                        className="w-full mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                        title={`Ver Matriz Frota × AD para ${ac.registration}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Ver Diretrizes Aplicáveis (Fleet × AD)</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* ACTION BUTTONS: EDIT, INACTIVATE / STATUS, DELETE */}
                    <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleOpenEdit(ac)}
                        className="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-semibold transition"
                        title="Editar horas, ciclos, modelo ou corrigir dados da aeronave"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleOpenStatusModal(ac)}
                        className={`flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          isDecommissioned
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                            : 'bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 border-purple-800/40'
                        }`}
                        title={isDecommissioned ? 'Reativar aeronave' : 'Inutilizar, estocar ou descomissionar'}
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>{isDecommissioned ? 'Reativar' : 'Inutilizar'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(ac)}
                        className="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold transition"
                        title="Remover aeronave permanentemente (em caso de erro de cadastro)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Engines */}
      {activeTab === 'engines' && (
        <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-white/5">
                <th className="py-2.5 px-3">Fabricante & Modelo</th>
                <th className="py-2.5 px-3">Número de Série (ESN)</th>
                <th className="py-2.5 px-3">Aeronave Instalada</th>
                <th className="py-2.5 px-3">Posição</th>
                <th className="py-2.5 px-3">Horas / Ciclos</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {state.engines.map((e) => {
                const targetAc = state.aircraft.find(a => a.id === e.aircraftId);
                return (
                  <tr key={e.id} className="hover:bg-white/5">
                    <td className="py-3 px-3 font-bold text-white">{e.manufacturer} {e.model}</td>
                    <td className="py-3 px-3 text-indigo-300 font-bold">{e.serialNumber}</td>
                    <td className="py-3 px-3 text-slate-200">{targetAc?.registration || 'Sobressalente / Oficina (Shop)'}</td>
                    <td className="py-3 px-3 text-slate-400">{e.position}</td>
                    <td className="py-3 px-3 text-slate-400">{e.totalHours.toLocaleString()} FH • {e.totalCycles.toLocaleString()} FC</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Components */}
      {activeTab === 'components' && (
        <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-white/5">
                <th className="py-2.5 px-3">Part Number (P/N)</th>
                <th className="py-2.5 px-3">Serial Number (S/N)</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Aeronave Instalada</th>
                <th className="py-2.5 px-3">Posição</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {state.components.map((comp) => {
                const inst = state.installations.find(i => i.componentId === comp.id && i.currentStatus === 'INSTALLED');
                return (
                  <tr key={comp.id} className="hover:bg-white/5">
                    <td className="py-3 px-3 font-bold text-indigo-300">{comp.partNumber}</td>
                    <td className="py-3 px-3 text-amber-300">{comp.serialNumber}</td>
                    <td className="py-3 px-3 text-slate-300 font-sans">{comp.description}</td>
                    <td className="py-3 px-3 text-white font-bold">{inst?.aircraftRegistration || 'Estoque / Almoxarifado'}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans">{inst?.position || 'Warehouse'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                        {comp.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Fleet × AD Matrix (Phase 2 Architectural Integration) */}
      {activeTab === 'fleet-matrix' && (
        <FleetAdSearchView
          state={state}
          onSelectAd={onSelectAd || (() => {})}
          onSelectView={onSelectView || (() => {})}
          onRefreshState={onRefreshState}
        />
      )}

      {/* MODAL: ADD AIRCRAFT */}
      {showAddAircraftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/20 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plane className="w-4 h-4 text-indigo-400" />
                <span>Cadastrar Nova Aeronave na Frota</span>
              </h3>
              <button onClick={() => setShowAddAircraftModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAircraft} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Matrícula (Registration):</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: PR-XYZ"
                    value={newReg}
                    onChange={(e) => setNewReg(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">MSN (Número de Série):</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 41200"
                    value={newMsn}
                    onChange={(e) => setNewMsn(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Fabricante:</label>
                  <input
                    type="text"
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Modelo:</label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Horas de Voo (TSN):</label>
                  <input
                    type="number"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Ciclos de Voo (CSN):</label>
                  <input
                    type="number"
                    value={newCycles}
                    onChange={(e) => setNewCycles(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddAircraftModal(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider"
                >
                  Cadastrar Aeronave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AIRCRAFT */}
      {editingAircraft && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/20 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Editar Registro de Aeronave — <span className="text-indigo-300 font-mono">{editingAircraft.registration}</span>
                </h3>
              </div>
              <button onClick={() => setEditingAircraft(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-slate-300 text-[11px] leading-relaxed">
                Utilize este formulário para retificar dados cadastrais incorretos (matrícula, número de série MSN, modelo, horas e ciclos). As alterações serão registradas no Livro de Auditoria com carimbo temporal.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Matrícula (Registration):</label>
                  <input
                    type="text"
                    required
                    value={editReg}
                    onChange={(e) => setEditReg(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none uppercase font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">MSN (Número de Série):</label>
                  <input
                    type="text"
                    required
                    value={editMsn}
                    onChange={(e) => setEditMsn(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Fabricante:</label>
                  <input
                    type="text"
                    required
                    value={editManufacturer}
                    onChange={(e) => setEditManufacturer(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Modelo:</label>
                  <input
                    type="text"
                    required
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Série / Família:</label>
                  <input
                    type="text"
                    value={editSeries}
                    onChange={(e) => setEditSeries(e.target.value)}
                    placeholder="ex: Next Generation, MAX, ceo"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Data de Fabricação:</label>
                  <input
                    type="date"
                    value={editManufactureDate}
                    onChange={(e) => setEditManufactureDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-lg border border-white/5">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] block font-semibold uppercase">Horas Totais (TSN):</label>
                  <input
                    type="number"
                    required
                    value={editHours}
                    onChange={(e) => setEditHours(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded p-1.5 text-white font-mono font-bold focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] block font-semibold uppercase">Ciclos Totais (CSN):</label>
                  <input
                    type="number"
                    required
                    value={editCycles}
                    onChange={(e) => setEditCycles(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded p-1.5 text-white font-mono font-bold focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] block font-semibold uppercase">Pousos Totais:</label>
                  <input
                    type="number"
                    value={editLandings}
                    onChange={(e) => setEditLandings(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded p-1.5 text-white font-mono font-bold focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Status and Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Status Operacional:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AircraftOperationalStatus)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none font-mono text-xs"
                  >
                    <option value="OPERATIONAL">OPERACIONAL (Em Serviço Ativo)</option>
                    <option value="MAINTENANCE">MANUTENÇÃO (Em Hangar)</option>
                    <option value="AOG">AOG (Aircraft On Ground)</option>
                    <option value="STORED">ESTOCADA / PRESERVADA</option>
                    <option value="DECOMMISSIONED">INUTILIZADA / BAIXADA</option>
                    <option value="RETIRED">APOSENTADA DA FROTA</option>
                    <option value="INACTIVE">INATIVA TEMPORARIAMENTE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Justificativa do Status:</label>
                  <input
                    type="text"
                    value={editStatusReason}
                    onChange={(e) => setEditStatusReason(e.target.value)}
                    placeholder="ex: Check C em andamento / Devolução lessor"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Observações Técnicas CAMO:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notas adicionais sobre a aeronave, programa de manutenção ou histórico..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAircraft(null)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 font-mono"
                  disabled={isSubmittingEdit}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center space-x-1.5"
                >
                  {isSubmittingEdit ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STATUS CHANGE / DECOMMISSION (INUTILIZAR) */}
      {statusModalAircraft && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/20 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <PowerOff className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Transição de Status Operacional — <span className="text-indigo-300 font-mono">{statusModalAircraft.registration}</span>
                </h3>
              </div>
              <button onClick={() => setStatusModalAircraft(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-lg space-y-1 text-slate-300 text-[11px] leading-relaxed">
                <p className="font-semibold text-purple-200">Controle Operacional CAMO:</p>
                <p>
                  Inutilizar ou descomissionar a aeronave a retira da programação ativa de voos e do cálculo de prontidão de decolagem, preservando todo o histórico probatório de manutenções anteriores.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Novo Status Operacional:</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as AircraftOperationalStatus)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white font-mono font-semibold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="DECOMMISSIONED">DECOMMISSIONED — Inutilizada / Baixada Definitivamente</option>
                  <option value="RETIRED">RETIRED — Aposentada da Frota Comercial</option>
                  <option value="STORED">STORED — Preservada / Estocagem de Longo Prazo</option>
                  <option value="MAINTENANCE">MAINTENANCE — Em Manutenção / Check Pesado</option>
                  <option value="AOG">AOG — Aircraft On Ground (Impedimento Operacional)</option>
                  <option value="INACTIVE">INACTIVE — Inativa Temporariamente</option>
                  <option value="OPERATIONAL">OPERATIONAL — Retornar para Serviço Ativo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">
                  Justificativa Técnica / Motivo CAMO <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Devolução ao lessor / Canibalização de peças / Término de vida útil"
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:border-indigo-500 focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStatusModalAircraft(null)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 font-mono"
                  disabled={isSubmittingStatus}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStatus}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center space-x-1.5"
                >
                  {isSubmittingStatus ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar Status</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE AIRCRAFT (REMOVER) */}
      {deletingAircraft && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-rose-500/40 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Remover Aeronave da Frota
                </h3>
              </div>
              <button onClick={() => setDeletingAircraft(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg space-y-2 text-slate-300 text-[11px] leading-relaxed">
                <div className="flex items-center space-x-2 text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Atenção: Ação Destrutiva e Irreversível</span>
                </div>
                <p>
                  Você está prestes a excluir permanentemente a aeronave <strong className="text-white font-mono">{deletingAircraft.registration}</strong> (MSN {deletingAircraft.msn}, Modelo {deletingAircraft.model}).
                </p>
                <p className="text-slate-400">
                  Esta opção é recomendada para <strong>correções de cadastros incorretos ou duplicados</strong>. Caso a aeronave apenas tenha sido retirada de operação, utilize a função <em>"Inutilizar / Descomissionar"</em> para preservar o histórico regulatório.
                </p>
                <div className="text-[10px] text-amber-300/80 bg-black/30 p-2 rounded">
                  • Motores vinculados serão desassociados e movidos para o status de sobressalentes.<br />
                  • A exclusão será formalmente registrada no Livro de Auditoria.
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">
                  Motivo da Remoção <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Matrícula cadastrada incorretamente / Registro duplicado de teste"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-slate-950 border border-rose-500/30 rounded-lg p-2.5 text-white focus:border-rose-500 focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDeletingAircraft(null)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 font-mono"
                  disabled={isSubmittingDelete}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center space-x-1.5"
                >
                  {isSubmittingDelete ? (
                    <span>Excluindo...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmar Exclusão Definitiva</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / INSTALL COMPONENT */}
      {showAddComponentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/20 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-indigo-400" />
                <span>Instalar Componente Rastreado</span>
              </h3>
              <button onClick={() => setShowAddComponentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComponent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Part Number (P/N):</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 12345-01 ou FF-9921"
                    value={newPartNum}
                    onChange={(e) => setNewPartNum(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Serial Number (S/N):</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 456789"
                    value={newSerialNum}
                    onChange={(e) => setNewSerialNum(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Descrição:</label>
                <input
                  type="text"
                  placeholder="ex: Elevator Tab Control Rod"
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Aeronave de Destino:</label>
                <select
                  value={selectedAircraftForInstall}
                  onChange={(e) => setSelectedAircraftForInstall(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                >
                  {state.aircraft.map((ac) => (
                    <option key={ac.id} value={ac.id}>
                      {ac.registration} ({ac.model} - MSN {ac.msn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Posição de Instalação:</label>
                <input
                  type="text"
                  value={newInstallPosition}
                  onChange={(e) => setNewInstallPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddComponentModal(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider"
                >
                  Instalar Componente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
