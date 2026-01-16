import { Logger } from 'utils/logger';
import type { NotifyClient } from 'app/notify-api-client';
import type { SingleMessageRequest } from 'domain/request';
import { RequestAlreadyReceivedError } from 'domain/request-already-received-error';

type Dependencies = {
  nhsNotifyClient: NotifyClient;
  logger: Logger;
};

export class NotifyMessageProcessor {
  private readonly logger: Logger;

  private readonly nhsNotifyClient: NotifyClient;

  constructor({ logger, nhsNotifyClient }: Dependencies) {
    this.logger = logger;
    this.nhsNotifyClient = nhsNotifyClient;
  }

  /**
   *
   * @param payload the single message request
   * @returns the ID returned by Core Notify for a succesful response.
   */
  public async process(
    payload: SingleMessageRequest,
    senderId: string,
  ): Promise<string> {
    const { messageReference } = payload.data.attributes;

    this.logger.info({
      description: 'Sending request to Notify API',
      messageReference,
      senderId,
    });
    try {
      const response = await this.nhsNotifyClient.sendRequest(
        payload,
        messageReference,
      );
      const messageItemId = response.data.id;
      this.logger.info({
        description: 'Successfully processed request and sent to Notify',
        messageReference,
        senderId,
        messageItemId,
      });
      return messageItemId;
    } catch (error: any) {
      if (error instanceof RequestAlreadyReceivedError) {
        this.logger.info({
          description: 'Request has already been received by Notify',
          messageReference,
          senderId,
        });
        throw error;
      }

      this.logger.error({
        description: 'Failed sending request to Notify API',
        messageReference,
        senderId,
        error: error.message,
      });
      throw error;
    }
  }
}
