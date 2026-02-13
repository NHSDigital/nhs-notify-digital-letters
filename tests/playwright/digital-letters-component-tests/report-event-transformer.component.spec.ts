import { expect, test } from '@playwright/test';
import type {
  FirehoseTransformationEvent,
  FirehoseTransformationEventRecord,
  FirehoseTransformationResult,
} from 'aws-lambda';
import { REPORT_EVENT_TRANSFORMER_LAMBDA_NAME } from 'constants/backend-constants';
import { invokeLambdaSync } from 'helpers/lambda-helpers';

const year = 2026;
const month = 1;
const day = 1;
const timestamp = new Date(Date.UTC(year, month - 1, day)).toISOString();
const eventType = 'test-event-type';

function createRecord(
  recordId: string,
  data: any,
): FirehoseTransformationEventRecord {
  return {
    recordId,
    data: Buffer.from(
      JSON.stringify({
        detail: {
          data,
          time: timestamp,
          type: eventType,
        },
      }),
    ).toString('base64'),
    approximateArrivalTimestamp: Date.now(),
  };
}

test.describe('Digital Letters - Report Event Transformer', () => {
  test('should transform events as expected', async () => {
    const validData = {
      messageReference: 'test-message-ref',
      pageCount: 3,
      reasonCode: 'test-reason-code',
      reasonText: 'test-reason-text',
      senderId: 'test-sender-id',
      supplierId: 'test-supplier-id',
    };
    const validRecord = createRecord('test-record-id', validData);

    const invalidRecord = createRecord('test-invalid-record-id', {
      // Missing required messageReference field
      pageCount: 3,
      reasonCode: 'test-reason-code',
      reasonText: 'test-reason-text',
      senderId: 'test-sender-id',
      supplierId: 'test-supplier-id',
    });

    const invalidJSONRecord: FirehoseTransformationEventRecord = {
      recordId: 'test-invalid-json-record-id',
      data: Buffer.from('invalid-json').toString('base64'),
      approximateArrivalTimestamp: Date.now(),
    };

    const payload: FirehoseTransformationEvent = {
      invocationId: 'test-invocation-id',
      deliveryStreamArn: 'test-delivery-stream-arn',
      sourceKinesisStreamArn: 'test-source-kinesis-stream-arn',
      region: 'eu-west-2',
      records: [validRecord, invalidRecord, invalidJSONRecord],
    };

    const result = await invokeLambdaSync<FirehoseTransformationResult>(
      REPORT_EVENT_TRANSFORMER_LAMBDA_NAME,
      payload,
    );

    expect(result).toBeDefined();
    expect(result!.records).toHaveLength(3);
    expect(result!.records).toContainEqual({
      recordId: validRecord.recordId,
      result: 'Ok',
      data: Buffer.from(
        JSON.stringify({
          messageReference: validData.messageReference,
          pageCount: validData.pageCount,
          senderId: validData.senderId,
          supplierId: validData.supplierId,
          reasonCode: validData.reasonCode,
          reasonText: validData.reasonText,
          time: timestamp,
          type: eventType,
        }),
      ).toString('base64'),
      metadata: {
        partitionKeys: {
          year: year.toString(),
          month: month.toString(),
          day: day.toString(),
          senderId: validData.senderId,
        },
      },
    });
    expect(result!.records).toContainEqual({
      recordId: invalidRecord.recordId,
      result: 'ProcessingFailed',
      data: invalidRecord.data,
    });
    expect(result!.records).toContainEqual({
      recordId: invalidJSONRecord.recordId,
      result: 'ProcessingFailed',
      data: invalidJSONRecord.data,
    });
  });
});
