import { RegulatorySource } from '../../src/types';
import { IRegulatoryConnector } from './types';
import { FederalRegisterConnector } from './federalRegisterConnector';
import { FaaDrsConnector } from './faaDrsConnector';

export class RegulatorySourceRegistry {
  private connectors: Map<string, IRegulatoryConnector> = new Map();

  constructor() {
    this.registerConnector(new FederalRegisterConnector());
    this.registerConnector(new FaaDrsConnector());
  }

  registerConnector(connector: IRegulatoryConnector) {
    this.connectors.set(connector.sourceId, connector);
  }

  getConnector(sourceId: string): IRegulatoryConnector | undefined {
    return this.connectors.get(sourceId);
  }

  getFederalRegisterConnector(): FederalRegisterConnector {
    return this.connectors.get('federal-register-v1') as FederalRegisterConnector;
  }

  getAllSources(): RegulatorySource[] {
    return Array.from(this.connectors.values()).map(c => c.getSourceInfo());
  }
}

export const regulatorySourceRegistry = new RegulatorySourceRegistry();
