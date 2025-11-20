import { Client } from 'utils';
import { AppDependencies } from '.';

export type GetClientByNameCommandParameters = Pick<Client, 'name'>;

export function createGetClientByNameCommand({ infra }: AppDependencies) {
  return async function getClientByNameCommand(
    params: GetClientByNameCommandParameters
  ): Promise<Client | null> {
    return await infra.clientRepository.findFirst({ name: params.name });
  };
}
