import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudEvent } from 'types';
import { Logger } from 'logger';
import { EventPublisher, EventPublisherConfig } from 'event-publisher';

const eventBridgeMock = mockClient(EventBridgeClient);
const sqsMock = mockClient(SQSClient);

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

const testConfig: EventPublisherConfig = {
  eventBusArn: 'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
  dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
  logger: mockLogger,
};

const validCloudEvent: CloudEvent = {
  id: '1',
  source: 'test-source',
  specversion: '1.0',
  type: 'test-type',
  plane: 'control',
  subject: 'test-subject',
  time: '2023-01-01T00:00:00Z',
  datacontenttype: 'application/json',
  dataschema: 'https://example.com/schema',
  dataschemaversion: '1.0',
};

const validCloudEvent2: CloudEvent = {
  ...validCloudEvent,
  id: '2',
};

const invalidCloudEvent = {
  type: 'data',
  id: 'missing-source',
};

const validEvents = [validCloudEvent, validCloudEvent2];
const invalidEvents = [invalidCloudEvent as unknown as CloudEvent];
const mixedEvents = [
  validCloudEvent,
  invalidCloudEvent as unknown as CloudEvent,
];

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
          Source: 'custom.event',
          DetailType: 'test-type',
          Detail: JSON.stringify(validCloudEvent),
          EventBusName:
            'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
        },
        {
          Source: 'custom.event',
          DetailType: 'test-type',
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

  test('should handle mixed valid and invalid events', async () => {
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: 'event-1' }],
    });
    sqsMock.on(SendMessageBatchCommand).resolves({
      Successful: [
        { Id: 'msg-1', MessageId: 'success-1', MD5OfMessageBody: 'hash1' },
      ],
    });

    const publisher = new EventPublisher(testConfig);
    const result = await publisher.sendEvents(mixedEvents);

    expect(result).toEqual([]);
    expect(eventBridgeMock.calls()).toHaveLength(1);
    expect(sqsMock.calls()).toHaveLength(1);

    // Verify EventBridge only gets valid events
    const eventBridgeCall = eventBridgeMock.calls()[0];
    expect(eventBridgeCall.args[0].input).toEqual({
      Entries: [
        {
          Source: 'custom.event',
          DetailType: 'test-type',
          Detail: JSON.stringify(validCloudEvent),
          EventBusName:
            'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
        },
      ],
    });

    // Verify DLQ only gets invalid events
    const sqsCall = sqsMock.calls()[0];
    const sqsInput = sqsCall.args[0].input as any;
    expect(sqsInput.Entries).toHaveLength(1);
    expect(sqsInput.Entries[0].MessageBody).toBe(
      JSON.stringify(invalidCloudEvent),
    );
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

    expect(result).toHaveLength(1);
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

  test('should process multiple batches for large event arrays', async () => {
    const largeEventArray = Array.from({ length: 25 })
      .fill(null)
      .map((_, i) => ({
        ...validCloudEvent,
        id: `event-${i}`,
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

    // Verify all use the same EventBusName
    expect(firstBatchInput.Entries[0].EventBusName).toBe(
      'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
    );
    expect(secondBatchInput.Entries[0].EventBusName).toBe(
      'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
    );
    expect(thirdBatchInput.Entries[0].EventBusName).toBe(
      'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
    );
  });

  test('should preserve CloudEvent structure in EventBridge Detail field', async () => {
    eventBridgeMock.on(PutEventsCommand).resolves({
      FailedEntryCount: 0,
      Entries: [{ EventId: 'event-1' }],
    });

    const customEvent: CloudEvent = {
      ...validCloudEvent,
      id: 'custom-event-123',
      source: 'nhs.notify.digital-letters',
      type: 'letter.created',
      subject: 'Patient/12345',
    };

    const publisher = new EventPublisher(testConfig);
    await publisher.sendEvents([customEvent]);

    const eventBridgeCall = eventBridgeMock.calls()[0];
    const entry = (eventBridgeCall.args[0].input as any).Entries[0];

    // Verify the CloudEvent is preserved as-is in the Detail field
    expect(entry.Detail).toBe(JSON.stringify(customEvent));

    // Verify EventBridge-specific fields are correctly mapped
    expect(entry.Source).toBe('custom.event');
    expect(entry.DetailType).toBe('letter.created');
    expect(entry.EventBusName).toBe(
      'arn:aws:events:us-east-1:123456789012:event-bus/test-bus',
    );

    // Verify the original CloudEvent structure is intact in Detail
    const detailObject = JSON.parse(entry.Detail);
    expect(detailObject.id).toBe('custom-event-123');
    expect(detailObject.source).toBe('nhs.notify.digital-letters');
    expect(detailObject.type).toBe('letter.created');
    expect(detailObject.subject).toBe('Patient/12345');
    expect(detailObject.specversion).toBe('1.0');
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
    ).toThrow('eventBusArn is required in config');
  });

  test('should throw error when dlqUrl is missing from config', () => {
    expect(() => new EventPublisher({ ...testConfig, dlqUrl: '' })).toThrow(
      'dlqUrl is required in config',
    );
  });

  test('should throw error when logger is missing from config', () => {
    expect(
      () => new EventPublisher({ ...testConfig, logger: null as any }),
    ).toThrow('logger is required in config');
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
