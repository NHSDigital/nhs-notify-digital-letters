import { Client } from 'utils';
import { AppDependencies } from '.';

export type GetClientCommandParameters = Pick<Client, 'clientId'>;

export function createGetClientCommand({ infra }: AppDependencies) {
  return async function getClientCommand(
    params: GetClientCommandParameters
  ): Promise<Client | null> {
    return await infra.clientRepository.getClient(params.clientId);
  };
}
