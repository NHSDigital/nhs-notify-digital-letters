import { ClientMetadata } from 'utils';
import { AppDependencies } from '.';
import { MetadataIndex } from '../infra/interfaces';

export type GetClientMetadataCommandParameters = MetadataIndex;

export function createGetClientMetadataCommand({ infra }: AppDependencies) {
  return async function getClientMetadataCommand(
    params: GetClientMetadataCommandParameters
  ): Promise<ClientMetadata | null> {
    return await infra.metadataRepository.getMetadata(params);
  };
}
