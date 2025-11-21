import { Domain } from '../domain';
import { Infrastructure } from '../infra';
import { createDeleteClientCommand } from './delete-client';
import { createGetClientCommand } from './get-client';
import { createGetClientByNameCommand } from './get-client-by-name';
import { createListClientsCommand } from './list-clients';
import { createPutClientCommand } from './put-client';

export type AppDependencies = {
  domain: Domain;
  infra: Infrastructure;
};

export function createApp(dependencies: AppDependencies) {
  return {
    deleteClient: createDeleteClientCommand(dependencies),
    getClient: createGetClientCommand(dependencies),
    getClientByName: createGetClientByNameCommand(dependencies),
    listClients: createListClientsCommand(dependencies),
    putClient: createPutClientCommand(dependencies),
  };
}

export type App = ReturnType<typeof createApp>;
