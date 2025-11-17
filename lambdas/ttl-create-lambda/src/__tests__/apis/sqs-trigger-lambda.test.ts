import { createHandler } from 'apis/sqs-trigger-lambda';
import type { SQSEvent } from 'aws-lambda';
import { $TtlItemEvent, TtlItemEvent } from 'utils';

describe('createHandler', () => {
  let createTtl: any;
  let eventPublisher: any;
  let logger: any;
  let handler: any;

  const validItem: TtlItemEvent = {
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
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    dataschemaversion: '1.0',
    severitytext: 'INFO',
    data: {
      uri: 'https://example.com/ttl/resource',
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
    },
  };

  beforeEach(() => {
    createTtl = { send: jest.fn() };
    eventPublisher = { sendEvents: jest.fn().mockResolvedValue([]) };
    logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
    handler = createHandler({ createTtl, eventPublisher, logger });
  });

  it('processes a valid SQS event and returns success', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('sent');
    const event: SQSEvent = {
      Records: [{ body: JSON.stringify(validItem), messageId: 'msg1' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([]);
    expect(createTtl.send).toHaveBeenCalledWith(validItem);
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([validItem]);
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 0,
      retrieved: 1,
      sent: 1,
    });
  });

  it('handles parse failure and logs error', async () => {
    const zodError = { errors: [] } as any;
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: false, error: zodError });
    const event: SQSEvent = {
      Records: [{ body: '{}', messageId: 'msg2' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'msg2' }]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('parsing ttl queue entry'),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 1,
      retrieved: 1,
      sent: 0,
    });
  });

  it('handles createTtl.send failure', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('failed');
    const event: SQSEvent = {
      Records: [{ body: JSON.stringify(validItem), messageId: 'msg3' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'msg3' }]);
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 1,
      retrieved: 1,
      sent: 0,
    });
  });

  it('handles thrown error and logs', async () => {
    jest.spyOn($TtlItemEvent, 'safeParse').mockImplementation(() => {
      throw new Error('bad json');
    });
    const event: SQSEvent = {
      Records: [{ body: '{}', messageId: 'msg4' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'msg4' }]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('SQS trigger handler'),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 1,
      retrieved: 1,
      sent: 0,
    });
  });

  it('handles rejected promises from event.Records.map', async () => {
    // Very unlikely that event.Records.map will reject as all the logic is inside a try/catch.

    const event = { Records: [] } as any;
    // Spy on Promise.allSettled to return a rejected result
    const originalAllSettled = Promise.allSettled;
    Promise.allSettled = jest
      .fn()
      .mockResolvedValue([
        { status: 'rejected', reason: new Error('forced rejection') },
      ]);

    await handler(event);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
    );
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 1,
      retrieved: 1,
      sent: 0,
    });

    Promise.allSettled = originalAllSettled;
  });

  it('processes multiple successful events and sends them as a batch', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('sent');
    const event: SQSEvent = {
      Records: [
        { body: JSON.stringify(validItem), messageId: 'msg1' },
        { body: JSON.stringify(validItem), messageId: 'msg2' },
        { body: JSON.stringify(validItem), messageId: 'msg3' },
      ],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([]);
    expect(createTtl.send).toHaveBeenCalledTimes(3);
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([
      validItem,
      validItem,
      validItem,
    ]);
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 0,
      retrieved: 3,
      sent: 3,
    });
  });

  it('handles partial event publishing failures and logs warning', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('sent');
    const failedEvents = [validItem];
    eventPublisher.sendEvents.mockResolvedValue(failedEvents);

    const event: SQSEvent = {
      Records: [
        { body: JSON.stringify(validItem), messageId: 'msg1' },
        { body: JSON.stringify(validItem), messageId: 'msg2' },
      ],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([]);
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([
      validItem,
      validItem,
    ]);
    expect(logger.warn).toHaveBeenCalledWith({
      description: 'Some events failed to publish',
      failedCount: 1,
      totalAttempted: 2,
    });
  });

  it('handles event publishing exception and logs warning', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('sent');
    const publishError = new Error('EventBridge error');
    eventPublisher.sendEvents.mockRejectedValue(publishError);

    const event: SQSEvent = {
      Records: [{ body: JSON.stringify(validItem), messageId: 'msg1' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([]);
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([validItem]);
    expect(logger.warn).toHaveBeenCalledWith({
      err: publishError,
      description: 'Failed to send events to EventBridge',
      eventCount: 1,
    });
  });

  it('does not call eventPublisher when no successful events', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('failed');

    const event: SQSEvent = {
      Records: [{ body: JSON.stringify(validItem), messageId: 'msg1' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'msg1' }]);
    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 1,
      retrieved: 1,
      sent: 0,
    });
  });

  it('handles mixed success and failure scenarios', async () => {
    jest
      .spyOn($TtlItemEvent, 'safeParse')
      .mockReturnValueOnce({ success: true, data: validItem })
      .mockReturnValueOnce({ success: false, error: { errors: [] } as any })
      .mockReturnValueOnce({ success: true, data: validItem });
    createTtl.send
      .mockResolvedValueOnce('sent')
      .mockResolvedValueOnce('failed');

    const event: SQSEvent = {
      Records: [
        { body: JSON.stringify(validItem), messageId: 'msg1' },
        { body: '{}', messageId: 'msg2' },
        { body: JSON.stringify(validItem), messageId: 'msg3' },
      ],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([
      { itemIdentifier: 'msg2' },
      { itemIdentifier: 'msg3' },
    ]);
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([validItem]);
    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processed SQS Event.',
      failed: 2,
      retrieved: 3,
      sent: 1,
    });
  });
});
