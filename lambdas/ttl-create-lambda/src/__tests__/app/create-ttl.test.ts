import { CreateTtl } from 'app/create-ttl';
import { TtlRepository } from 'infra/ttl-repository';
import { TtlItemEvent } from 'types/ttl-item-event';

describe('CreateTtl', () => {
  let repo: jest.Mocked<TtlRepository>;
  let logger: any;
  let createTtl: CreateTtl;
  const item: TtlItemEvent = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    specversion: '1.0',
    type: 'uk.nhs.notify.digital.letters.sent.v1',
    plane: 'data',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    time: '2023-06-20T12:00:00Z',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    dataschemaversion: '1.0',
    data: {
      uri: 'uri:uri',
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
    },
  };

  beforeEach(() => {
    repo = { insertTtlRecord: jest.fn() } as any;
    logger = { error: jest.fn() };
    createTtl = new CreateTtl(repo, logger);
  });

  it('returns sent when insert succeeds', async () => {
    repo.insertTtlRecord.mockResolvedValue();

    const result = await createTtl.send(item);

    expect(result).toBe('sent');
    expect(repo.insertTtlRecord).toHaveBeenCalledWith(item);
  });

  it('returns failed and logs error when insert throws', async () => {
    const error = new Error('fail');
    repo.insertTtlRecord.mockRejectedValue(error);

    const result = await createTtl.send(item);

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
