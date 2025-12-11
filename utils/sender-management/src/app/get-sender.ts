import { Sender } from 'utils';
import { AppDependencies } from './types';

export type GetSenderCommandParameters = Pick<Sender, 'senderId'>;

export function createGetSenderCommand({ infra }: AppDependencies) {
  return async function getSenderCommand(
    params: GetSenderCommandParameters,
  ): Promise<Sender | null> {
    return infra.senderRepository.getSender(params.senderId);
  };
}
