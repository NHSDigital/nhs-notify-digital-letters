import { AppDependencies } from '.';
import { MetadataIndex } from '../infra/interfaces';

export type DeleteClientMetadataCommandParameters = MetadataIndex;

export function createDeleteClientMetadataCommand({ infra }: AppDependencies) {
  return async function deleteClientMetedataCommand(
    params: DeleteClientMetadataCommandParameters
  ): Promise<void> {
    await infra.metadataRepository.deleteMetadata(params);
  };
}
