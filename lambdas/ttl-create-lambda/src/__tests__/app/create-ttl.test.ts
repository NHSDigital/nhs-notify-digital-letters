import { CreateTtl } from 'app/create-ttl';
import { TtlRepository } from 'infra/ttl-repository';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';

describe('CreateTtl', () => {
  let repo: jest.Mocked<TtlRepository>;
  let logger: any;
  let createTtl: CreateTtl;
  const item: MESHInboxMessageDownloaded = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
    time: '2023-06-20T12:00:00Z',
    recordedtime: '2023-06-20T12:00:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
    severitytext: 'INFO',
    data: {
      messageReference: 'ref1',
      senderId: 'sender1',
      messageUri: 'https://example.com/ttl/resource',
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
