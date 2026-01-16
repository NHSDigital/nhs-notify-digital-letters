export class InvalidPdmResourceAvailableEvent extends Error {
  readonly sqsMessageId: string;

  constructor(sqsMessageId: string) {
    super('Unable to parse PDMResourceAvailable event from SQS message');
    this.sqsMessageId = sqsMessageId;
  }
}
