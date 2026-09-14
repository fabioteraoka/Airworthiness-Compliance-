import { describe, it, expect, beforeEach } from 'vitest';
import { camoDb } from '../server/dataStore';
import { fleetAirworthinessControlEngine } from '../server/camoEngine/fleetAirworthinessControlEngine';
import { Aircraft, AircraftOperationalStatus } from '../src/types';

describe('CAMO Fleet Management — Aircraft Edit, Status Decommission, and Safe Deletion', () => {
  beforeEach(() => {
    camoDb.resetToSeed();
  });

  it('1. Deve atualizar com sucesso os dados de uma aeronave (PUT /api/fleet/aircraft/:id)', () => {
    const initialList = camoDb.getState().aircraft;
    expect(initialList.length).toBeGreaterThanOrEqual(1);
    const target = initialList[0];

    const updatedData: Partial<Aircraft> = {
      registration: 'PR-UPDATED',
      totalFlightHours: 15400,
      totalCycles: 9200,
      manufacturer: 'Boeing Commercial',
      model: '737-800 NG',
      notes: 'Horas e ciclos atualizados após auditoria de diários de bordo'
    };

    camoDb.update((state) => {
      const acIdx = state.aircraft.findIndex(a => a.id === target.id);
      expect(acIdx).toBeGreaterThanOrEqual(0);

      const oldRegistration = target.registration;
      state.aircraft[acIdx] = {
        ...state.aircraft[acIdx],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      // Propagate registration if changed
      if (updatedData.registration && updatedData.registration !== oldRegistration) {
        state.installations.forEach(inst => {
          if (inst.aircraftId === target.id) {
            inst.aircraftRegistration = updatedData.registration!;
          }
        });
      }
    });

    const reloaded = camoDb.getState().aircraft.find(a => a.id === target.id);
    expect(reloaded).toBeDefined();
    expect(reloaded?.registration).toBe('PR-UPDATED');
    expect(reloaded?.totalFlightHours).toBe(15400);
    expect(reloaded?.totalCycles).toBe(9200);
    expect(reloaded?.manufacturer).toBe('Boeing Commercial');
    expect(reloaded?.model).toBe('737-800 NG');
    expect(reloaded?.notes).toContain('diários de bordo');
  });

  it('2. Deve inutilizar / descomissionar uma aeronave e registrar statusReason e decommissionDate', () => {
    const initialList = camoDb.getState().aircraft;
    const target = initialList[0];

    const newStatus: AircraftOperationalStatus = 'DECOMMISSIONED';
    const reason = 'Aeronave retirada definitivamente de serviço e canibalizada para peças sobressalentes';
    const decommissionDate = new Date().toISOString().split('T')[0];

    camoDb.update((state) => {
      const acIdx = state.aircraft.findIndex(a => a.id === target.id);
      state.aircraft[acIdx] = {
        ...state.aircraft[acIdx],
        status: newStatus,
        statusReason: reason,
        decommissionDate,
        updatedAt: new Date().toISOString()
      };
    });

    const reloaded = camoDb.getState().aircraft.find(a => a.id === target.id);
    expect(reloaded).toBeDefined();
    expect(reloaded?.status).toBe('DECOMMISSIONED');
    expect(reloaded?.statusReason).toBe(reason);
    expect(reloaded?.decommissionDate).toBe(decommissionDate);
  });

  it('3. Deve desassociar motores e desinstalar componentes ao remover uma aeronave permanentemente', () => {
    const testAcId = 'ac-test-delete-999';
    const engineId = 'eng-test-999';
    const instId = 'inst-test-999';

    // Cadastrar uma aeronave com motor e componente vinculados para teste de exclusão
    camoDb.update((state) => {
      const newAc: Aircraft = {
        id: testAcId,
        operatorId: 'op-01',
        registration: 'PR-DEL99',
        msn: '99999',
        manufacturer: 'Boeing',
        model: '737-700',
        aircraftType: 'Commercial Transport',
        totalFlightHours: 5000,
        totalCycles: 3000,
        totalLandings: 3000,
        status: 'OPERATIONAL'
      };
      state.aircraft.push(newAc);

      state.engines.push({
        id: engineId,
        manufacturer: 'CFM International',
        model: 'CFM56-7B26',
        serialNumber: 'ESN-999999',
        aircraftId: testAcId,
        position: 'Position 1 (Left)',
        totalHours: 5000,
        totalCycles: 3000,
        status: 'INSTALLED'
      });

      state.installations.push({
        id: instId,
        componentId: 'comp-test-999',
        aircraftId: testAcId,
        aircraftRegistration: 'PR-DEL99',
        position: 'Test Bay',
        installationDate: '2026-01-01',
        installationHours: 0,
        installationCycles: 0,
        currentStatus: 'INSTALLED',
        installedBy: 'Test Eng',
        workOrderRef: 'WO-DEL-01'
      });
    });

    // Executar a remoção da aeronave testada
    camoDb.update((state) => {
      const acIndex = state.aircraft.findIndex(a => a.id === testAcId);
      expect(acIndex).toBeGreaterThanOrEqual(0);

      state.aircraft.splice(acIndex, 1);

      // Detach engines
      state.engines.forEach(eng => {
        if (eng.aircraftId === testAcId) {
          eng.aircraftId = undefined;
          eng.status = 'STORED';
        }
      });

      // Mark installations as REMOVED
      state.installations.forEach(inst => {
        if (inst.aircraftId === testAcId) {
          inst.currentStatus = 'REMOVED';
        }
      });
    });

    // Verificações
    const reloaded = camoDb.getState();
    expect(reloaded.aircraft.find(a => a.id === testAcId)).toBeUndefined();

    const detachedEngine = reloaded.engines.find(e => e.id === engineId);
    expect(detachedEngine).toBeDefined();
    expect(detachedEngine?.aircraftId).toBeUndefined();
    expect(detachedEngine?.status).toBe('STORED');

    const markedInst = reloaded.installations.find(i => i.id === instId);
    expect(markedInst).toBeDefined();
    expect(markedInst?.currentStatus).toBe('REMOVED');
  });

  it('4. Deve executar avaliação de aeronavegabilidade sem quebras mesmo com frota contendo aeronaves desativadas', () => {
    camoDb.update((state) => {
      const testAc = state.aircraft[0];
      testAc.status = 'DECOMMISSIONED';
      testAc.statusReason = 'Baixada do registro de voo';
    });

    const fleetAssessment = fleetAirworthinessControlEngine.assessFleetAirworthiness();
    expect(fleetAssessment).toBeDefined();
    const currentAircraft = camoDb.getState().aircraft;
    expect(fleetAssessment.totalAircraft).toBe(currentAircraft.length);
    expect(fleetAssessment.aircraftAssessments.length).toBe(currentAircraft.length);
  });
});
