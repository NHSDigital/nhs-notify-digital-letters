import {
  Client,
} from 'utils';

export interface IClientRepository {
  deleteClient(id: string): Promise<void>;
  findFirst(attributes: Partial<Client>): Promise<Client | null>;
  getClient(id: string): Promise<Client | null>;
  listClients(options?: { skipCache?: boolean }): Promise<Client[]>;
  putClient(client: Client): Promise<void>;
}

type CommonIndexFields = 'clientId' | 'scope' | 'provider' | 'type';
