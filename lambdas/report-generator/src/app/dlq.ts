import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { GenerateReport } from 'digital-letters-events';
import { randomUUID } from 'node:crypto';
import { Logger } from 'utils';

export interface DlqDependencies {
  dlqUrl: string;
  logger: Logger;
  sqsClient: SQSClient;
}

export class Dlq {
  private readonly sqs: SQSClient;

  private readonly dlqUrl: string;

  private readonly logger: Logger;

  constructor(config: DlqDependencies) {
    this.dlqUrl = config.dlqUrl;
    this.logger = config.logger;
    this.sqs = config.sqsClient;
  }

  public async send(records: GenerateReport[]): Promise<GenerateReport[]> {
    const failedDlqs: GenerateReport[] = [];

    this.logger.warn({
      description: 'Sending failed records to DLQ',
      dlqUrl: this.dlqUrl,
      eventCount: records.length,
    });

    const idToEventMap = new Map<string, GenerateReport>();

    const entries = records.map((record) => {
      const id = randomUUID();
      idToEventMap.set(id, record);
      return {
        Id: id,
        MessageBody: JSON.stringify(record),
      };
    });

    try {
      const response = await this.sqs.send(
        new SendMessageBatchCommand({
          QueueUrl: this.dlqUrl,
          Entries: entries,
        }),
      );

      if (response.Failed)
        for (const failedEntry of response.Failed) {
          const failedRecord =
            failedEntry.Id && idToEventMap.get(failedEntry.Id);
          if (failedRecord) {
            this.logger.warn({
              description: 'Record failed to send to DLQ',
              errorCode: failedEntry.Code,
              errorMessage: failedEntry.Message,
              eventId: failedRecord.id,
            });
            failedDlqs.push(failedRecord);
          }
        }
    } catch (error) {
      this.logger.warn({
        description: 'DLQ send error',
        err: error,
        dlqUrl: this.dlqUrl,
        batchSize: records.length,
      });
      failedDlqs.push(...records);
    }

    return failedDlqs;
  }
}
