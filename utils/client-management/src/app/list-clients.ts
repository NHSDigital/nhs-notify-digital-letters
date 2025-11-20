import { Client } from 'utils';
import { AppDependencies } from '.';

export function createListClientsCommand({ infra }: AppDependencies) {
  return async function listClientsCommand(options?: {
    skipCache?: boolean;
  }): Promise<Client[]> {
    return await infra.clientRepository.listClients(options);
  };
}
