import { ClientMetadata } from 'utils';
import { AppDependencies } from '.';
import { MetadataIndex } from '../infra/interfaces';

export type ListClientMetadataCommandParameters = Pick<
  MetadataIndex,
  'clientId'
>;

export function createListClientMetadataCommand({ infra }: AppDependencies) {
  return async function listClientMetadataCommand(
    params: ListClientMetadataCommandParameters
  ): Promise<ClientMetadata[]> {
    return await infra.metadataRepository.listMetadata(params.clientId);
  };
}
