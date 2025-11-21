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
