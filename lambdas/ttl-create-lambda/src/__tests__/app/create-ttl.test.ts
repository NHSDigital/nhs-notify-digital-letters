import { messageDownloadedEvent } from '__tests__/data';
import { CreateTtl } from 'app/create-ttl';
import { TtlRepository } from 'infra/ttl-repository';

describe('CreateTtl', () => {
  let repo: jest.Mocked<TtlRepository>;
  let logger: any;
  let createTtl: CreateTtl;

  beforeEach(() => {
    repo = { insertTtlRecord: jest.fn() } as any;
    logger = { error: jest.fn() };
    createTtl = new CreateTtl(repo, logger);
  });

  it('returns sent when insert succeeds', async () => {
    repo.insertTtlRecord.mockResolvedValue();

    const result = await createTtl.send(messageDownloadedEvent);

    expect(result).toBe('sent');
    expect(repo.insertTtlRecord).toHaveBeenCalledWith(messageDownloadedEvent);
  });

  it('returns failed and logs error when insert throws', async () => {
    const error = new Error('fail');
    repo.insertTtlRecord.mockRejectedValue(error);

    const result = await createTtl.send(messageDownloadedEvent);

    expect(result).toBe('failed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining(
          'Error inserting request TTL record',
        ),
        err: error,
      }),
    );
  });
});
