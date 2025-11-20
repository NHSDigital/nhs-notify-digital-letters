import { mockDeep } from 'jest-mock-extended';
import { ClientMetadata } from 'utils';
import { createApp, AppDependencies } from '../../app';

function setup() {
  const clientId = 'test_client_id';

  const metadata: ClientMetadata[] = [
    {
      clientId,
      provider: 'govuknotify',
      scope: 'client-metadata',
      type: 'api_key',
      value: 'test_secret',
    },
    {
      clientId,
      provider: 'govuknotify',
      scope: 'client-metadata',
      type: 'polling_index',
      value: 'notifyid',
    },
    {
      clientId,
      provider: 'govuknotify',
      campaignId: 'mmr',
      scope: 'campaign-metadata',
      type: 'polling_index',
      value: 'notifyid',
    },
  ];

  const mocks = mockDeep<AppDependencies>({
    infra: {
      metadataRepository: {
        listMetadata: jest.fn().mockResolvedValueOnce(metadata),
      },
    },
  });

  return { mocks, data: { metadata, clientId } };
}

describe('listClientMetadata', () => {
  it('retrieves clients from the client repository and returns them', async () => {
    const { mocks, data } = setup();

    const app = createApp(mocks);

    const params = { clientId: data.clientId };

    const result = await app.listClientMetadata(params);

    expect(mocks.infra.metadataRepository.listMetadata).toHaveBeenCalledWith(
      params.clientId
    );
    expect(result).toBe(data.metadata);
  });
});
