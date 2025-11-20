import { ClientMetadata } from 'utils';
import { CreateClientMetadataParameters } from '../domain/metadata';

import { NotFoundException } from '../domain/exceptions';
import { AppDependencies } from '.';

export type PutClientMetadataCommandParameters = CreateClientMetadataParameters;

export function createPutClientMetadataCommand({
  domain,
  infra,
}: AppDependencies) {
  return async function putClientMetadataCommand(
    params: PutClientMetadataCommandParameters
  ): Promise<ClientMetadata> {
    let { value } = params;

    const client = await infra.clientRepository.getClient(params.clientId);

    if (client === null) {
      throw new NotFoundException(`Client ID "${params.clientId}" not found.`);
    }

    const credential = domain.metadata.createMetadata({
      ...params,
    });

    await infra.metadataRepository.putMetadata(credential);

    return credential;
  };
}
