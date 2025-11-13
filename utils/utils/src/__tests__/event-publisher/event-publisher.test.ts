import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsResultEntry,
} from '@aws-sdk/client-eventbridge';
import { randomInt, randomUUID } from 'node:crypto';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudEvent } from 'types';
import { Logger } from 'logger';
import { EventPublisher, EventPublisherDependencies } from 'event-publisher';

const eventBridgeMock = mockClient(EventBridgeClient);
const sqsMock = mockClient(SQSClient);

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

const testConfig: EventPublisherDependencies = {
  eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
  dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
  logger: mockLogger,
  sqsClient: sqsMock as unknown as SQSClient,
  eventBridgeClient: eventBridgeMock as unknown as EventBridgeClient,
};

const validCloudEvent: CloudEvent = {
  profileversion: '1.0.0',
  profilepublished: '2025-10',
  id: '550e8400-e29b-41d4-a716-446655440001',
  specversion: '1.0',
  source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
  subject:
    'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
  type: 'uk.nhs.notify.digital.letters.sent.v1',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
  dataschemaversion: '1.0',
  severitytext: 'INFO',
  data: {
    'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
    messageReference: 'ref1',
    senderId: 'sender1',
  },
};

const validCloudEvent2: CloudEvent = {
  ...validCloudEvent,
  id: '550e8400-e29b-41d4-a716-446655440002',
  data: {
    'digital-letter-id': '123e4567-e89b-12d3-a456-426614174001',
    messageReference: 'ref1',
    senderId: 'sender1',
  },
  source: '/nhs/england/notify/development/primary/data-plane/digital-letters',
  type: 'uk.nhs.notify.digital.letters.sent.v2',
};

const invalidCloudEvent = {
  type: 'data',
  id: 'missing-source',
};

const validEvents = [validCloudEvent, validCloudEvent2];
const invalidEvents = [invalidCloudEvent as unknown as CloudEvent];

describe('Event Publishing', () => {
  beforeEach(() => {
    eventBridgeMock.reset();
    sqsMock.reset();
    jest.clearAllMocks();
  });

  test('should return empty array when no events provided', async () => {
    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents([]);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(0);
    expect(sqsMock.calls()).toHaveLength(0);
  });

  test('should send valid events to EventBridge', async () => {
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: 'event-1' }],
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(validEvents);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(1);
    expect(sqsMock.calls()).toHaveLength(0);

    const eventBridgeCall = eventBridgeMock.calls()[0];
    expect(eventBridgeCall.args[0].input).toEqual({
      Entries: [
        {
          Source: validCloudEvent.source,
          DetailType: validCloudEvent.type,
          Detail: JSON.stringify(validCloudEvent),
          EventBusName:
            'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
        },
        {
          Source: validCloudEvent2.source,
          DetailType: validCloudEvent2.type,
          Detail: JSON.stringify(validCloudEvent2),
          EventBusName:
            'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
        },
      ],
    });
  });

  test('should send invalid events directly to DLQ', async () => {
    sqsMock.on(SendMessageBatchCommand).resolves({
      Successful: [
        { Id: 'msg-1', MessageId: 'success-1', MD5OfMessageBody: 'hash1' },
      ],
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(invalidEvents);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(0);
    expect(sqsMock.calls()).toHaveLength(1);

    const sqsCall = sqsMock.calls()[0];
    const sqsInput = sqsCall.args[0].input as any;
    expect(sqsInput.QueueUrl).toBe(
      'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
    );
    expect(sqsInput.Entries).toHaveLength(1);
    expect(sqsInput.Entries[0].MessageBody).toBe(
      JSON.stringify(invalidCloudEvent),
    );
    expect(sqsInput.Entries[0].Id).toBeDefined();
  });

  test('should send failed EventBridge events to DLQ', async () => {
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 1,
      Entries: [
        { ErrorCode: 'InternalFailure', ErrorMessage: 'Internal error' },
        { EventId: 'event-2' },
      ],
    });
    sqsMock.on(SendMessageBatchCommand).resolves({
      Successful: [
        { Id: 'msg-1', MessageId: 'success-1', MD5OfMessageBody: 'hash1' },
      ],
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(validEvents);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(1);
    expect(sqsMock.calls()).toHaveLength(1);

    // Verify EventBridge was called with both events
    const eventBridgeCall = eventBridgeMock.calls()[0];
    const eventBridgeInput = eventBridgeCall.args[0].input as any;
    expect(eventBridgeInput.Entries).toHaveLength(2);

    // Verify DLQ gets the failed event (first one)
    const sqsCall = sqsMock.calls()[0];
    const sqsInput = sqsCall.args[0].input as any;
    expect(sqsInput.Entries).toHaveLength(1);
    expect(sqsInput.Entries[0].MessageBody).toBe(
      JSON.stringify(validCloudEvent),
    );
  });

  test('should handle EventBridge send error and send all events to DLQ', async () => {
    eventBridgeMock
      .on(PutEventsCommand)
      .rejects(new Error('EventBridge error'));
    sqsMock.on(SendMessageBatchCommand).resolves({
      Successful: [
        { Id: 'msg-1', MessageId: 'success-1', MD5OfMessageBody: 'hash1' },
      ],
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(validEvents);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(1);
    expect(sqsMock.calls()).toHaveLength(1);
  });

  test('should return failed events when DLQ also fails', async () => {
    sqsMock.on(SendMessageBatchCommand).callsFake((params) => {
      const firstEntryId = params.Entries[0].Id;
      return Promise.resolve({
        Failed: [
          {
            Id: firstEntryId,
            Code: 'SenderFault',
            Message: 'Invalid message',
            SenderFault: true,
          },
        ],
      });
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(invalidEvents);

    expect(result).toEqual(invalidEvents);
    expect(eventBridgeMock.calls()).toHaveLength(0);
    expect(sqsMock.calls()).toHaveLength(1);
  });

  test('should handle DLQ send error and return all events as failed', async () => {
    sqsMock.on(SendMessageBatchCommand).rejects(new Error('DLQ error'));

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(invalidEvents);

    expect(result).toEqual(invalidEvents);
    expect(eventBridgeMock.calls()).toHaveLength(0);
    expect(sqsMock.calls()).toHaveLength(1);
  });

  test('should send to event bridge in batches', async () => {
    const largeEventArray = Array.from({ length: 25 })
      .fill(null)
      .map(() => ({
        ...validCloudEvent,
        id: randomUUID(),
      }));

    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: 'success' }],
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(largeEventArray);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(3);

    // Verify batch sizes: 10, 10, 5
    const calls = eventBridgeMock.calls();
    const firstBatchInput = calls[0].args[0].input as any;
    const secondBatchInput = calls[1].args[0].input as any;
    const thirdBatchInput = calls[2].args[0].input as any;

    expect(firstBatchInput.Entries).toHaveLength(10);
    expect(secondBatchInput.Entries).toHaveLength(10);
    expect(thirdBatchInput.Entries).toHaveLength(5);
  });

  test('should send to the DLQ in batches', async () => {
    const largeEventArray = Array.from({ length: 25 })
      .fill(null)
      .map(() => ({
        ...(invalidCloudEvent as unknown as CloudEvent),
        id: randomUUID(),
      }));

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(largeEventArray);

    expect(result).toEqual(largeEventArray);
    expect(sqsMock.calls()).toHaveLength(3);

    // Verify batch sizes: 10, 10, 5
    const calls = sqsMock.calls();
    const firstBatchInput = calls[0].args[0].input as any;
    const secondBatchInput = calls[1].args[0].input as any;
    const thirdBatchInput = calls[2].args[0].input as any;

    expect(firstBatchInput.Entries).toHaveLength(10);
    expect(secondBatchInput.Entries).toHaveLength(10);
    expect(thirdBatchInput.Entries).toHaveLength(5);
  });

  test('should handle multiple event outcomes in one batch', async () => {
    const valid = Array.from({ length: 11 }, (_, i) => ({
      ...validCloudEvent,
      id: `11111111-1111-1111-1111-${i.toString().padStart(12, '0')}`,
    }));

    const invalid = Array.from({ length: 12 }, (_, i) => ({
      ...(invalidCloudEvent as unknown as CloudEvent),
      id: `22222222-2222-2222-2222-${i.toString().padStart(12, '0')}`,
    }));

    const invalidAndDlqError = Array.from({ length: 13 }, (_, i) => ({
      ...(invalidCloudEvent as unknown as CloudEvent),
      id: `33333333-3333-3333-3333-${i.toString().padStart(12, '0')}`,
    }));

    const eventBridgeError = Array.from({ length: 14 }, (_, i) => ({
      ...validCloudEvent,
      id: `44444444-4444-4444-4444-${i.toString().padStart(12, '0')}`,
    }));

    const eventBridgeAndDlqError = Array.from({ length: 15 }, (_, i) => ({
      ...validCloudEvent,
      id: `55555555-5555-5555-5555-${i.toString().padStart(12, '0')}`,
    }));

    // Combine all events and shuffle them
    const allEvents = [
      ...valid,
      ...invalid,
      ...invalidAndDlqError,
      ...eventBridgeError,
      ...eventBridgeAndDlqError,
    ].toSorted(() => randomInt(0, 3) - 1);

    sqsMock.on(SendMessageBatchCommand).resolves({
      Successful: [
        { Id: 'msg-1', MessageId: 'success-1', MD5OfMessageBody: 'hash1' },
      ],
    });

    sqsMock.on(SendMessageBatchCommand).callsFake((input) => {
      const successful: any[] = [];
      const failed: any[] = [];

      for (const entry of input.Entries) {
        if (
          entry.MessageBody?.includes('33333333-3333-3333-3333') ||
          entry.MessageBody?.includes('55555555-5555-5555-5555')
        ) {
          failed.push({
            Id: entry.Id,
            Code: 'SenderFault',
            Message: 'Invalid message',
            SenderFault: true,
          });
        } else {
          successful.push({
            Id: entry.Id,
            MessageId: `success-${entry.Id}`,
            MD5OfMessageBody: 'hash',
          });
        }
      }

      return Promise.resolve({
        Successful: successful,
        Failed: failed,
      });
    });

    eventBridgeMock.on(PutEventsCommand).callsFake((input) => {
      let failedEntryCount = 0;
      const entries: PutEventsResultEntry[] = [];

      for (const [index, entry] of input.Entries.entries()) {
        const eventData = JSON.parse(entry.Detail || '{}');
        if (
          eventData.id?.includes('44444444-4444-4444-4444') ||
          eventData.id?.includes('55555555-5555-5555-5555')
        ) {
          failedEntryCount += 1;
          entries.push({
            ErrorCode: 'SenderFault',
            ErrorMessage: 'Invalid message',
          });
        } else {
          entries.push({
            EventId: `event-${index}`,
          });
        }
      }

      return Promise.resolve({
        FailedEntryCount: failedEntryCount,
        Entries: entries,
      });
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(allEvents);

    expect(result).toHaveLength(
      invalidAndDlqError.length + eventBridgeAndDlqError.length,
    );
    expect(result).toEqual(
      expect.arrayContaining([
        ...invalidAndDlqError,
        ...eventBridgeAndDlqError,
      ]),
    );

    const sqsMockEntries = [];

    for (const call of sqsMock.calls()) {
      const batch = call.args[0].input as any;
      sqsMockEntries.push(...batch.Entries);
    }

    expect(sqsMockEntries).toHaveLength(
      invalidAndDlqError.length +
        invalid.length +
        eventBridgeError.length +
        eventBridgeAndDlqError.length,
    );

    // Verify invalid events are are sent to the DLQ with correct reason
    expect(sqsMockEntries).toEqual(
      expect.arrayContaining(
        [...invalid, ...invalidAndDlqError].map((event) =>
          expect.objectContaining({
            MessageBody: JSON.stringify(event),
            MessageAttributes: {
              DlqReason: {
                DataType: 'String',
                StringValue: 'INVALID_EVENT',
              },
            },
          }),
        ),
      ),
    );

    // Verify EventBridge failure events are sent to the DLQ with correct reason
    expect(sqsMockEntries).toEqual(
      expect.arrayContaining(
        [...eventBridgeError, ...eventBridgeAndDlqError].map((event) =>
          expect.objectContaining({
            MessageBody: JSON.stringify(event),
            MessageAttributes: {
              DlqReason: {
                DataType: 'String',
                StringValue: 'EVENTBRIDGE_FAILURE',
              },
            },
          }),
        ),
      ),
    );

    const eventBridgeMockEntries = [];

    for (const call of eventBridgeMock.calls()) {
      const batch = call.args[0].input as any;
      eventBridgeMockEntries.push(...batch.Entries);
    }

    expect(eventBridgeMockEntries).toHaveLength(
      valid.length + eventBridgeError.length + eventBridgeAndDlqError.length,
    );

    // Verify valid events are sent to the event bridge
    expect(eventBridgeMockEntries).toEqual(
      expect.arrayContaining(
        [...valid, ...eventBridgeError, ...eventBridgeAndDlqError].map(
          (event) =>
            expect.objectContaining({
              Detail: JSON.stringify(event),
            }),
        ),
      ),
    );
  });
});

describe('EventPublisher Class', () => {
  beforeEach(() => {
    eventBridgeMock.reset();
    sqsMock.reset();
    jest.clearAllMocks();
  });

  test('should throw error when eventBusArn is missing from config', () => {
    expect(
      () => new EventPublisher({ ...testConfig, eventBusArn: '' }),
    ).toThrow('eventBusArn has not been specified');
  });

  test('should throw error when dlqUrl is missing from config', () => {
    expect(() => new EventPublisher({ ...testConfig, dlqUrl: '' })).toThrow(
      'dlqUrl has not been specified',
    );
  });

  test('should throw error when logger is missing from config', () => {
    expect(
      () => new EventPublisher({ ...testConfig, logger: null as any }),
    ).toThrow('logger has not been provided');
  });

  test('should throw error when sqsClient is missing from config', () => {
    expect(
      () => new EventPublisher({ ...testConfig, sqsClient: null as any }),
    ).toThrow('sqsClient has not been provided');
  });

  test('should throw error when eventBridgeClient is missing from config', () => {
    expect(
      () =>
        new EventPublisher({ ...testConfig, eventBridgeClient: null as any }),
    ).toThrow('eventBridgeClient has not been provided');
  });

  test('should be reusable for multiple calls', async () => {
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: 'event-1' }],
    });

    const publisher = new EventPublisher(testConfig);

    // First call
    const result1 = await publisher.sendEvents([validCloudEvent]);
    expect(result1).toEqual([]);

    // Second call with same publisher instance
    const result2 = await publisher.sendEvents([validCloudEvent2]);
    expect(result2).toEqual([]);

    expect(eventBridgeMock.calls()).toHaveLength(2);
  });
});
