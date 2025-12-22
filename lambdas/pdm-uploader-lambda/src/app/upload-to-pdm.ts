import { IPdmClient, Logger, getS3ObjectFromUri } from 'utils';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';

export type UploadToPdmOutcome = 'sent' | 'failed';

export type UploadToPdmResult = {
  outcome: UploadToPdmOutcome;
  resourceId?: string;
};

export class UploadToPdm {
  constructor(
    private readonly pdmClient: IPdmClient,
    private readonly logger: Logger,
  ) {}

  async send(event: MESHInboxMessageDownloaded): Promise<UploadToPdmResult> {
    try {
      const fhirRequest = await getS3ObjectFromUri(event.data.messageUri);
      const { messageReference } = event.data;

      const response = await this.pdmClient.createDocumentReference(
        fhirRequest,
        messageReference,
      );

      this.logger.info({
        description: 'Successfully sent request to PDM',
        eventId: event.id,
        messageReference,
        resourceId: response.id,
      });

      return { outcome: 'sent', resourceId: response.id };
    } catch (error) {
      this.logger.error({
        description: 'Error sending request to PDM',
        err:
          error instanceof Error
            ? { message: error.message, name: error.name, stack: error.stack }
            : error,
      });

      return { outcome: 'failed' };
    }
  }
}
