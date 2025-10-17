import { createHandler } from 'apis/sqs-trigger-lambda';
import type { SQSEvent } from 'aws-lambda';
import { $TtlItem } from 'app/ttl-item-validator';

describe('createHandler', () => {
  let createTtl: any;
  let logger: any;
  let handler: any;

  const validItem = {
    id: '1',
    source: 'src',
    specversion: '1',
    type: 't',
    plane: 'p',
    subject: 's',
    time: 'now',
    datacontenttype: 'json',
    dataschema: 'sch',
    dataschemaversion: '1',
    data: { uri: 'uri' },
  };

  beforeEach(() => {
    createTtl = { send: jest.fn() };
    logger = { error: jest.fn(), info: jest.fn() };
    handler = createHandler({ createTtl, logger });
  });

  it('processes a valid SQS event and returns success', async () => {
    jest
      .spyOn($TtlItem, 'safeParse')
      .mockReturnValue({ success: true, data: validItem });
    createTtl.send.mockResolvedValue('sent');
    const event: SQSEvent = {
      Records: [{ body: JSON.stringify(validItem), messageId: 'msg1' }],
    } as any;

    const res = await handler(event);

    expect(res.batchItemFailures).toEqual([]);
    expect(createTtl.send).toHaveBeenCalledWith(validItem);
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
      .spyOn($TtlItem, 'safeParse')
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
      .spyOn($TtlItem, 'safeParse')
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
    jest.spyOn($TtlItem, 'safeParse').mockImplementation(() => {
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
});
