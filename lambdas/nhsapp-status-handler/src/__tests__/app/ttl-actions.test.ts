import { messageDownloadedEvent, nhsAppStatusEvent } from '__tests__/data';
import { TtlActions } from 'app/ttl-actions';
import { TtlRepository } from 'infra/ttl-repository';

describe('TtlActions', () => {
  let repo: jest.Mocked<TtlRepository>;
  let logger: any;
  let ttlActions: TtlActions;

  beforeEach(() => {
    repo = { delete: jest.fn() } as any;
    logger = { warn: jest.fn(), info: jest.fn() };
    ttlActions = new TtlActions(repo, logger);
  });

  it('returns success when delete succeeds', async () => {
    repo.delete.mockResolvedValue({ event: messageDownloadedEvent });

    const result = await ttlActions.delete(nhsAppStatusEvent);

    expect(result).toEqual({
      result: 'success',
      ttlItem: { event: messageDownloadedEvent },
    });
    expect(repo.delete).toHaveBeenCalledWith(
      nhsAppStatusEvent.data.messageReference,
    );
  });

  it('returns success when TTL record not found', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    repo.delete.mockResolvedValue(undefined);

    const result = await ttlActions.delete(nhsAppStatusEvent);

    expect(result).toEqual({ result: 'success' });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('TTL record not found'),
        messageReference: nhsAppStatusEvent.data.messageReference,
      }),
    );
    expect(repo.delete).toHaveBeenCalledWith(
      nhsAppStatusEvent.data.messageReference,
    );
  });

  it('returns failed and logs error when delete throws', async () => {
    const error = new Error('fail');
    repo.delete.mockRejectedValue(error);

    const result = await ttlActions.delete(nhsAppStatusEvent);

    expect(result).toEqual({ result: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Error deleting TTL record'),
        err: error,
      }),
    );
  });
});
