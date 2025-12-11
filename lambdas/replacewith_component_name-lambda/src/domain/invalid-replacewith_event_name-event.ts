/**
 * For irrecoverable errors like invalid event format.
 */
export class InvalidReplaceWith_EventNameEvent extends Error {
  readonly sqsMessageId: string;

  constructor(sqsMessageId: string) {
    super('Unable to parse ReplaceWith_EventName event from SQS message');
    this.sqsMessageId = sqsMessageId;
  }
}
