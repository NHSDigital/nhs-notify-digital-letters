import { Client, ClientRfrOverrideCodes } from 'utils';
import { AppDependencies } from '.';

export type GetClientRfrOverrideCodes = Pick<Client, 'clientId'>;

export function createGetClientRfrOverrideCodesCommand({
  infra,
}: AppDependencies) {
  return async function getClientRfrOverrideCodesCommand(
    params: GetClientRfrOverrideCodes
  ): Promise<ClientRfrOverrideCodes | undefined> {
    return await infra.metadataRepository.getClientRfrOverrideCodes(
      params.clientId
    );
  };
}
