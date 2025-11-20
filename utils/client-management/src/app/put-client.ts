import { Client, validateOdsCode } from 'utils';
import { CreateClientParameters } from '../domain/client';
import { AppDependencies } from '.';

export type PutClientCommandParameters = CreateClientParameters;

export function createPutClientCommand({ domain, infra }: AppDependencies) {
  return async function putClientCommand(
    params: PutClientCommandParameters
  ): Promise<Client> {
    if (!params.allowOdsOverride && !params.senderOdsCode) {
      throw new Error(
        'Client must have a senderOdsCode or enable allowOdsOverride'
      );
    }

    if (params.senderOdsCode) {
      const isValidOdsCode = validateOdsCode(params.senderOdsCode);

      if (!isValidOdsCode) {
        throw new Error(
          'The supplied senderOdsCode is not in the correct format'
        );
      }
    }

    const client = domain.client.createClient(params);

    await infra.clientRepository.putClient(client);

    return client;
  };
}
