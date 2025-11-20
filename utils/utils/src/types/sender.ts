/**
 * Sender represents a use-case such as Vaccs or GP Reg
 */
export type Sender = {
  senderId: string;
  senderName: string;
  meshMailboxSenderId: string;
  meshMailboxReportsId: string;
  fallbackWaitTimeSeconds: number;
  routingConfigId: string;
};
