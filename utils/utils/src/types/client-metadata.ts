/**
 * Client represents a use-case such as Vaccs or GP Reg
 */
export type Client = {
  unprefixedName?: boolean;
  allowAnonymousPatient?: boolean;
  allowAlternativeContactDetails?: boolean;
  clientId: string;
  meshMailboxId?: string;
  meshWorkflowIdCompletedRequestItemsReport?: string;
  meshWorkflowIdReceiveRequestAck?: string;
  meshWorkflowIdSuffix?: string;
  name: string;
  senderOdsCode?: string;
};


export type ClientMetadataType =
  | 'api_key'
  | 'polling_index'
  | 'polling_index_international_numbers'
  | 'codes';

export type ClientMetadataProvider = 'govuknotify' | 'rfr-override';

type ClientMetadataIndexBase = {
  clientId: string;
  provider: ClientMetadataProvider;
  type: ClientMetadataType;
};

export type ClientScopedMetadataIndex = ClientMetadataIndexBase & {
  scope: 'client-metadata';
};

export type CampaignScopedMetadataIndex = ClientMetadataIndexBase & {
  scope: 'campaign-metadata';
  campaignId: string;
};

export type ClientMetadataIndex =
  | ClientScopedMetadataIndex
  | CampaignScopedMetadataIndex;

export type ClientScopedMetadata = {
  scope: 'client-metadata';
  value: string;
} & ClientMetadataIndexBase;

export type CampaignScopedMetadata = {
  scope: 'campaign-metadata';
  campaignId: string;
  value: string;
} & ClientMetadataIndexBase;

export type ClientMetadata = ClientScopedMetadata | CampaignScopedMetadata;
