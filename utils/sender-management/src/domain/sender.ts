import { randomUUID } from 'node:crypto';
import { Sender } from 'utils';

export type CreateSenderParameters = Omit<Sender, 'senderId'> &
  Partial<Pick<Sender, 'senderId'>>;

export function createSender(parameters: CreateSenderParameters): Sender {
  return {
    senderId: parameters.senderId || randomUUID(),
    senderName: parameters.senderName,
    meshMailboxSenderId: parameters.meshMailboxSenderId,
    meshMailboxReportsId: parameters.meshMailboxReportsId,
    fallbackWaitTimeSeconds: parameters.fallbackWaitTimeSeconds,
    routingConfigId: parameters.routingConfigId,
  };
}
