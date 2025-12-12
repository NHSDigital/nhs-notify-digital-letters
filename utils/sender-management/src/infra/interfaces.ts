import { Sender } from 'utils';

export interface ISenderRepository {
  deleteSender(id: string): Promise<void>;
  getSender(id: string): Promise<Sender | null>;
  listSenders(options?: { skipCache?: boolean }): Promise<Sender[]>;
  putSender(sender: Sender): Promise<void>;
}
