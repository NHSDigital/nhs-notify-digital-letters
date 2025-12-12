import { Sender } from 'utils';
import { AppDependencies } from './types';

export type DeleteSenderCommandParameters = Pick<Sender, 'senderId'>;

export function createDeleteSenderCommand({ infra }: AppDependencies) {
  return async function deleteSenderCommand(
    params: DeleteSenderCommandParameters,
  ): Promise<void> {
    await infra.senderRepository.deleteSender(params.senderId);
  };
}
