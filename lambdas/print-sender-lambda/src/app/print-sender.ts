import { PDFAnalysed } from 'digital-letters-events';
import { EventPublisher, Logger } from 'utils';
import { randomUUID } from 'node:crypto';
import {
  $LetterRequestPreparedEvent,
  LetterRequestPreparedEvent,
} from '@nhsdigital/nhs-notify-event-schemas-letter-rendering';

type LetterRequestDomainId = LetterRequestPreparedEvent['data']['domainId'];

export type PrintSenderOutcome = 'sent' | 'failed';

export class PrintSender {
  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly environment: string,
    private readonly accountName: string,
    private readonly logger: Logger,
  ) {}

  async send(item: PDFAnalysed): Promise<PrintSenderOutcome> {
    try {
      const letterPreparedEvent: LetterRequestPreparedEvent = {
        id: randomUUID(),
        time: new Date().toISOString(),
        recordedtime: new Date().toISOString(),
        type: 'uk.nhs.notify.letter-rendering.letter-request.prepared.v1',
        dataschema:
          'https://notify.nhs.uk/cloudevents/schemas/letter-rendering/letter-request.prepared.1.1.5.schema.json',
        source: `/data-plane/digital-letters/${this.accountName}/${this.environment}`,
        specversion: '1.0',
        traceparent: item.traceparent,
        severitynumber: item.severitynumber,
        severitytext: 'INFO',
        subject: `client/${item.data.senderId}/letter-request/${item.data.messageReference}`,
        dataschemaversion: '1.1.5',
        plane: 'data',
        data: {
          createdAt: new Date().toISOString(),
          domainId:
            `${item.data.senderId}_${item.data.messageReference}` as LetterRequestDomainId,
          pageCount: item.data.pageCount,
          requestItemPlanId: item.data.messageReference,
          sha256Hash: item.data.sha256Hash,
          status: 'PREPARED',
          url: item.data.letterUri,
          clientId: item.data.senderId,
          letterVariantId: 'notify-digital-letter-standard',
        },
      };

      await this.eventPublisher.sendEvents<LetterRequestPreparedEvent>(
        [letterPreparedEvent],
        (event) => $LetterRequestPreparedEvent.safeParse(event).success,
      );
    } catch (error) {
      this.logger.error({
        description: 'Error sending letter prepared event',
        err: error,
      });

      return 'failed';
    }

    return 'sent';
  }
}
