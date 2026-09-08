import { useState, type FormEvent } from 'react';
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
  Sparkles
} from 'lucide-react';
import { DatabaseState } from '../../server/dataStore';
import { Aircraft, Component, ComponentInstallation } from '../types';

interface FleetViewProps {
  state: DatabaseState;
  onRefreshState: (newState: DatabaseState) => void;
}

export default function FleetView({ state, onRefreshState }: FleetViewProps) {
  const [activeTab, setActiveTab] = useState<'aircraft' | 'engines' | 'components'>('aircraft');
  const [showAddAircraftModal, setShowAddAircraftModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);

  // New Aircraft Form State
  const [newReg, setNewReg] = useState('');
  const [newMsn, setNewMsn] = useState('');
  const [newModel, setNewModel] = useState('737-800');
  const [newManufacturer, setNewManufacturer] = useState('Boeing');
  const [newHours, setNewHours] = useState('12000');
  const [newCycles, setNewCycles] = useState('8500');

  // New Component Form State
  const [newPartNum, setNewPartNum] = useState('');
  const [newSerialNum, setNewSerialNum] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [selectedAircraftForInstall, setSelectedAircraftForInstall] = useState(state.aircraft[0]?.id || '');
  const [newInstallPosition, setNewInstallPosition] = useState('Empennage / Elevator Control Bay');

  const handleCreateAircraft = async (e: FormEvent) => {
    e.preventDefault();
    if (!newReg || !newMsn) return;

    try {
      const payload: Partial<Aircraft> = {
        registration: newReg.toUpperCase(),
        msn: newMsn,
        manufacturer: newManufacturer,
        model: newModel,
        series: newModel,
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Plane className="w-4 h-4" />
            <span>Continuing Airworthiness Fleet Records</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            Fleet Assets & Component Configuration
          </h1>
          <p className="text-xs text-slate-400">
            Aircraft registrations, engine serial numbers, tracked appliances, and installation positions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddComponentModal(true)}
            className="flex items-center space-x-1.5 glass-panel hover:bg-white/10 text-slate-200 border border-white/10 px-3.5 py-2 rounded-lg text-xs font-semibold shadow transition font-mono"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Install Component</span>
          </button>

          <button
            onClick={() => setShowAddAircraftModal(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow transition font-mono uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Aircraft</span>
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
          <span>Airframes ({state.aircraft.length})</span>
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
          <span>Engines & APUs ({state.engines.length})</span>
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
          <span>Tracked Components & P/Ns ({state.components.length})</span>
        </button>
      </div>

      {/* Tab 1: Aircraft Fleet */}
      {activeTab === 'aircraft' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {state.aircraft.map((ac) => {
            const installedComps = state.installations.filter(i => i.aircraftId === ac.id && i.currentStatus === 'INSTALLED');
            const installedEngs = state.engines.filter(e => e.aircraftId === ac.id);
            const acAssessments = state.assessments.filter(a => a.entityId === ac.id);
            const applicableCount = acAssessments.filter(a => a.result === 'APPLICABLE').length;
            const reviewCount = acAssessments.filter(a => a.result === 'REVIEW_REQUIRED').length;

            return (
              <div
                key={ac.id}
                className="glass-panel rounded-xl p-5 shadow-sm space-y-4 hover:border-indigo-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-lg font-black text-white font-mono">{ac.registration}</span>
                    <p className="text-xs text-slate-400 font-mono">MSN {ac.msn} • {ac.manufacturer} {ac.model}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono uppercase">
                    {ac.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg text-xs font-mono border border-white/5">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Flight Hours</span>
                    <span className="text-slate-200 font-bold">{ac.totalFlightHours.toLocaleString()} FH</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Flight Cycles</span>
                    <span className="text-slate-200 font-bold">{ac.totalCycles.toLocaleString()} FC</span>
                  </div>
                </div>

                {/* Engines */}
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Installed Powerplants:</span>
                  <div className="space-y-1">
                    {installedEngs.map((e) => (
                      <div key={e.id} className="p-2 bg-slate-950/60 rounded border border-white/5 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-200">{e.position}: {e.model}</span>
                        <span className="text-indigo-300">S/N {e.serialNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installed Components */}
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Tracked Aeronautical Appliances:</span>
                  <div className="space-y-1">
                    {installedComps.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No special appliances tracked.</p>
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
                  <span className="text-slate-400">AD Effectivity:</span>
                  {reviewCount > 0 ? (
                    <span className="text-indigo-300 font-bold">{reviewCount} Review Req.</span>
                  ) : applicableCount > 0 ? (
                    <span className="text-amber-400 font-bold">{applicableCount} AD Actions Due</span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Compliant</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Engines */}
      {activeTab === 'engines' && (
        <div className="glass-panel rounded-xl p-5 shadow-sm space-y-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-white/5">
                <th className="py-2.5 px-3">Manufacturer & Model</th>
                <th className="py-2.5 px-3">Engine Serial Number (ESN)</th>
                <th className="py-2.5 px-3">Installed Aircraft</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3">Hours / Cycles</th>
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
                    <td className="py-3 px-3 text-slate-200">{targetAc?.registration || 'Spare / Shop'}</td>
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
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Installed Aircraft</th>
                <th className="py-2.5 px-3">Position</th>
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
                    <td className="py-3 px-3 text-white font-bold">{inst?.aircraftRegistration || 'Shop Inventory'}</td>
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

      {/* MODAL: ADD AIRCRAFT */}
      {showAddAircraftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/20 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plane className="w-4 h-4 text-indigo-400" />
                <span>Register Aircraft into Fleet</span>
              </h3>
              <button onClick={() => setShowAddAircraftModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAircraft} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Registration:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PR-ABC"
                    value={newReg}
                    onChange={(e) => setNewReg(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">MSN (Serial No):</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 41200"
                    value={newMsn}
                    onChange={(e) => setNewMsn(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Manufacturer:</label>
                  <input
                    type="text"
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Model:</label>
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
                  <label className="text-slate-300 font-semibold">Flight Hours:</label>
                  <input
                    type="number"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Flight Cycles:</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider"
                >
                  Save Aircraft
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
                <span>Install Tracked Component</span>
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
                    placeholder="e.g. 12345-01 or FF-9921"
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
                    placeholder="e.g. 456789"
                    value={newSerialNum}
                    onChange={(e) => setNewSerialNum(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Elevator Tab Control Rod"
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Target Aircraft:</label>
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
                <label className="text-slate-300 font-semibold">Installation Position:</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider"
                >
                  Install Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
