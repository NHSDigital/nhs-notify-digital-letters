import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { DynamoDBRecord } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { Logger } from 'utils';

const MAX_BATCH_SIZE = 10;

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
    if (!config.dlqUrl) {
      throw new Error('dlqUrl has not been specified');
    }
    if (!config.logger) {
      throw new Error('logger has not been provided');
    }
    if (!config.sqsClient) {
      throw new Error('sqsClient has not been provided');
    }

    this.dlqUrl = config.dlqUrl;
    this.logger = config.logger;
    this.sqs = config.sqsClient;
  }

  public async send(records: DynamoDBRecord[]): Promise<DynamoDBRecord[]> {
    const failedDlqs: DynamoDBRecord[] = [];

    this.logger.warn({
      description: 'Sending failed records to DLQ',
      dlqUrl: this.dlqUrl,
      eventCount: records.length,
    });

    for (let i = 0; i < records.length; i += MAX_BATCH_SIZE) {
      const batch = records.slice(i, i + MAX_BATCH_SIZE);
      const idToEventMap = new Map<string, DynamoDBRecord>();

      const entries = batch.map((record) => {
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
                eventId: failedRecord.eventID,
              });
              failedDlqs.push(failedRecord);
            }
          }
      } catch (error) {
        this.logger.warn({
          description: 'DLQ send error',
          err: error,
          dlqUrl: this.dlqUrl,
          batchSize: batch.length,
        });
        failedDlqs.push(...batch);
      }
    }

    return failedDlqs;
  }
}
