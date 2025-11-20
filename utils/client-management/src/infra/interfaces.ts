import {
  CampaignScopedMetadata,
  Client,
  ClientMetadata,
  ClientRfrOverrideCodes,
  ClientScopedMetadata,
} from 'utils';

export interface IClientRepository {
  deleteClient(id: string): Promise<void>;
  findFirst(attributes: Partial<Client>): Promise<Client | null>;
  getClient(id: string): Promise<Client | null>;
  listClients(options?: { skipCache?: boolean }): Promise<Client[]>;
  putClient(client: Client): Promise<void>;
  getApimClients(): Promise<{ [key: string]: string } | null>;
  putApimClients(apimClient: { [key: string]: string }): Promise<void>;
}

type CommonIndexFields = 'clientId' | 'scope' | 'provider' | 'type';

export type MetadataIndex =
  | Pick<ClientScopedMetadata, CommonIndexFields>
  | Pick<CampaignScopedMetadata, CommonIndexFields | 'campaignId'>;

export interface IMetadataRepository {
  deleteMetadata(metadata: MetadataIndex): Promise<void>;
  getMetadata(metadata: MetadataIndex): Promise<ClientMetadata | null>;
  putMetadata(metadata: ClientMetadata): Promise<void>;
  listMetadata(id: string): Promise<ClientMetadata[]>;
  getClientRfrOverrideCodes(
    clientId: string
  ): Promise<ClientRfrOverrideCodes | undefined>;
}
