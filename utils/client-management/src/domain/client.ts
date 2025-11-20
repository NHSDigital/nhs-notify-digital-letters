import { randomUUID } from 'crypto';
import { Client } from 'utils';

export type CreateClientParameters = Omit<Client, 'clientId'> &
  Partial<Pick<Client, 'clientId'>>;

export function createClient(parameters: CreateClientParameters): Client {
  return {
    clientId: parameters.clientId || randomUUID(),
    name: parameters.name,
    meshMailboxId: parameters.meshMailboxId,
    allowOdsOverride: parameters.allowOdsOverride,
    senderOdsCode: parameters.senderOdsCode,
    allowAlternativeContactDetails: parameters.allowAlternativeContactDetails,
    allowRfrOverride: parameters.allowRfrOverride,
    ignoreSecurityFlag: parameters.ignoreSecurityFlag,
    allowAnonymousPatient: parameters.allowAnonymousPatient,
    unprefixedName: parameters.unprefixedName,
  };
}
