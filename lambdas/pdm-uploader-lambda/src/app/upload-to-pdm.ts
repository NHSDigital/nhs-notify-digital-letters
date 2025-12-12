import { Logger, TtlItemEvent, getS3ObjectFromUri } from 'utils';
import { IPdmClient } from 'infra/pdm-api-client';

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

  async send(event: TtlItemEvent): Promise<UploadToPdmResult> {
    try {
      const fhirRequest = await getS3ObjectFromUri(event.data.messageUri);
      const requestId = crypto.randomUUID();

      const response = await this.pdmClient.createDocumentReference(
        fhirRequest,
        requestId,
        event.id,
      );

      this.logger.info({
        description: 'Successfully sent request to PDM',
        resourceId: response.id,
        requestId,
        eventId: event.id,
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
