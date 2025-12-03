import { $Sender, Sender } from 'utils';
import { CreateSenderParameters } from '../domain/sender';
import { ConflictException, ValidationException } from '../domain/exceptions';
import { AppDependencies } from './types';

export type PutSenderCommandParameters = CreateSenderParameters;

export async function validateSender(
  sender: Sender,
  infra: AppDependencies['infra'],
): Promise<void> {
  try {
    $Sender.parse(sender);
  } catch (error) {
    throw new ValidationException(`Invalid new sender data ${error}`);
  }

  const existingSenders = await infra.senderRepository.listSenders();

  const conflicts = existingSenders.filter((s) => {
    return (
      s.senderId !== sender.senderId &&
      (s.meshMailboxSenderId === sender.meshMailboxSenderId ||
        s.senderName === sender.senderName)
    );
  });

  if (conflicts.length > 0) {
    throw new ConflictException(`Failed to create/update sender. Found conflicts: ${conflicts.length}
      ${conflicts
        .map(
          (s) =>
            `senderId:${s.senderId} senderName:${s.senderName} meshMailboxSenderId:${s.meshMailboxSenderId}\n`,
        )
        .join(', ')}`);
  }
}

export function createPutSenderCommand({ domain, infra }: AppDependencies) {
  return async function putSenderCommand(
    params: PutSenderCommandParameters,
  ): Promise<Sender> {
    const sender = domain.sender.createSender(params);

    await validateSender(sender, infra);

    await infra.senderRepository.putSender(sender);

    return sender;
  };
}
