import { Client } from 'utils';
import { AppDependencies } from '.';

export type DeleteClientCommandParameters = Pick<Client, 'clientId'> & {
  deleteMetadata?: boolean;
};

export function createDeleteClientCommand({ infra }: AppDependencies) {
  return async function deleteClientCommand(
    params: DeleteClientCommandParameters
  ): Promise<void> {
    if (params.deleteMetadata) {
      const metadataItems = await infra.metadataRepository.listMetadata(
        params.clientId
      );

      await Promise.all(
        metadataItems.map(async (item) =>
          infra.metadataRepository.deleteMetadata(item)
        )
      );
    }

    await infra.clientRepository.deleteClient(params.clientId);
  };
}
