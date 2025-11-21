import { Domain } from '../domain';
import { Infrastructure } from '../infra';
import { createAddApimClientCommand } from './add-apim-client';
import { createDeleteApimClientCommand } from './delete-apim-client';
import { createDeleteClientCommand } from './delete-client';
import { createDeleteClientMetadataCommand } from './delete-client-metadata';
import { createGetClientCommand } from './get-client';
import { createGetClientByNameCommand } from './get-client-by-name';
import { createGetClientMetadataCommand } from './get-client-metadata';
import { createGetClientRfrOverrideCodesCommand } from './get-client-rfr-override-codes';
import { createListClientMetadataCommand } from './list-client-metadata';
import { createListClientsCommand } from './list-clients';
import { createPutClientCommand } from './put-client';
import { createPutClientMetadataCommand } from './put-client-metadata';

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
    deleteClientMetadata: createDeleteClientMetadataCommand(dependencies),
    getClientMetadata: createGetClientMetadataCommand(dependencies),
    putClientMetadata: createPutClientMetadataCommand(dependencies),
    listClientMetadata: createListClientMetadataCommand(dependencies),
    getClientRfrOverrideCodes:
      createGetClientRfrOverrideCodesCommand(dependencies),
    addApimClient: createAddApimClientCommand(dependencies),
    deleteApimClient: createDeleteApimClientCommand(dependencies)
  };
}

export type App = ReturnType<typeof createApp>;
