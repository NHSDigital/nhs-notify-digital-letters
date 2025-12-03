import { Sender } from 'utils';
import { AppDependencies } from './types';

export function createListSendersCommand({ infra }: AppDependencies) {
  return async function listSendersCommand(options?: {
    skipCache?: boolean;
  }): Promise<Sender[]> {
    return infra.senderRepository.listSenders(options);
  };
}
