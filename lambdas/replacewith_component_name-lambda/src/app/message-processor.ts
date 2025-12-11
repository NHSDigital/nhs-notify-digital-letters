import { Logger } from 'utils/logger';
import type { SingleMessageRequest } from 'domain/request';

type Dependencies = {
  logger: Logger;
};

export class MessageProcessor {
  private readonly logger: Logger;

  constructor({ logger}: Dependencies) {
    this.logger = logger;
  }

  /**
   *
   * @param payload the single message request
   * @returns the ID returned by Core Notify for a succesful response.
   */
  public async process(
    payload: SingleMessageRequest,
    senderId: string,
  ): Promise<void> {
    const { messageReference } = payload.data.attributes;

    this.logger.info({
      description: 'Processing message',
      messageReference,
    });
    try {
      // NOTE: add business logic here.
      this.logger.info({
        description: 'Successfully processed request',
        messageReference,
      });
    } catch (error: any) {
      this.logger.error({
        description: 'Failed processing message',
        messageReference,
        error: error.message,
      });
      throw error;
    }
  }
}
