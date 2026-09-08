import { ComplianceRequirement, Aircraft, InstalledSoftwareRecord, MaintenanceActionAccomplishment } from '../src/types';
import { camoDb } from './dataStore';
import { 
  evaluateCamoCompliance, 
  CamoAssessment, 
  FleetInventoryInput
} from './camoEngine';

/**
 * Orquestrador de Avaliação de Aeronavegabilidade CAMO V2
 * Desacoplado do motor legado. Prepara o inventário de frota e aciona o CAMO Rule Engine V2.
 */
export function evaluateRequirementWithCamoV2(
  requirement: ComplianceRequirement,
  targetAircraft?: Aircraft,
  customInventory?: Partial<FleetInventoryInput>
): CamoAssessment {
  const db = camoDb.getState();

  // 1. Determinar Aeronave Alvo
  let aircraft: Aircraft;
  if (targetAircraft) {
    aircraft = targetAircraft;
  } else if (customInventory?.aircraft) {
    aircraft = customInventory.aircraft;
  } else {
    // Default: primeira aeronave da frota ou fallback
    aircraft = db.aircraft[0] || {
      id: 'ac-default',
      operatorId: 'op-01',
      registration: 'UNKNOWN',
      msn: '',
      manufacturer: 'UNKNOWN',
      model: 'UNKNOWN',
      aircraftType: 'Commercial Transport',
      status: 'OPERATIONAL',
      totalFlightHours: 0,
      totalCycles: 0,
      totalLandings: 0
    };
  }

  // 2. Montar Inventário de Frota
  const installedSoftware: InstalledSoftwareRecord[] = customInventory?.installedSoftware || 
    (db.installedSoftware || []).filter(sw => sw.aircraftId === aircraft.id);

  const actionAccomplishments: MaintenanceActionAccomplishment[] = customInventory?.actionAccomplishments ||
    (db.actionAccomplishments || []).filter(acc => acc.aircraftId === aircraft.id);

  // Se houver componentes de aviônica no DB, mapear para o inventário
  const aircraftInstallations = db.installations.filter(i => i.aircraftId === aircraft.id);
  const aircraftComponents = db.components.filter(c => 
    aircraftInstallations.some(inst => inst.componentId === c.id)
  );

  const inventory: FleetInventoryInput = {
    aircraft,
    engines: customInventory?.engines || db.engines.filter(e => e.aircraftId === aircraft.id),
    components: customInventory?.components || aircraftComponents,
    installations: customInventory?.installations || aircraftInstallations,
    installedSoftware,
    actionAccomplishments,
    evidence: customInventory?.evidence || db.evidence.filter(ev => ev.complianceRequirementId === requirement.id),
    knowledgeFacts: customInventory?.knowledgeFacts || db.knowledgeFacts.filter(kf => kf.subjectId === aircraft.id)
  };

  // 3. Executar o CAMO Rule Engine V2
  return evaluateCamoCompliance(requirement, inventory);
}

/**
 * Avalia um requisito contra toda a frota de aeronaves cadastradas
 */
export function evaluateRequirementAcrossFleetCamoV2(
  requirement: ComplianceRequirement,
  installedSoftwareMap?: Record<string, InstalledSoftwareRecord[]>,
  actionAccomplishmentsMap?: Record<string, MaintenanceActionAccomplishment[]>
): CamoAssessment[] {
  const db = camoDb.getState();
  const assessments: CamoAssessment[] = [];

  for (const aircraft of db.aircraft) {
    const swRecords = installedSoftwareMap ? installedSoftwareMap[aircraft.id] : undefined;
    const accRecords = actionAccomplishmentsMap ? actionAccomplishmentsMap[aircraft.id] : undefined;
    const assessment = evaluateRequirementWithCamoV2(requirement, aircraft, {
      ...(swRecords ? { installedSoftware: swRecords } : {}),
      ...(accRecords ? { actionAccomplishments: accRecords } : {})
    });
    assessments.push(assessment);
  }

  return assessments;
}
