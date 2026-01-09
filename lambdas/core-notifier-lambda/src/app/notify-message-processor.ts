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
  public async process(payload: SingleMessageRequest): Promise<string> {
    const { messageReference } = payload.data.attributes;

    this.logger.info('Processing request', {
      messageReference,
    });
    try {
      const response = await this.nhsNotifyClient.sendRequest(
        payload,
        messageReference,
      );
      this.logger.info('Successfully processed request and sent to Notify', {
        messageReference,
        messageItemId: response.data.id,
      });
      return response.data.id;
    } catch (error: any) {
      if (error instanceof RequestAlreadyReceivedError) {
        this.logger.info('Request has already been received by Notify', {
          messageReference,
        });
        throw error;
      }

      this.logger.error('Failed processing request', {
        messageReference,
        error: error.message,
      });
      throw error;
    }
  }
}
