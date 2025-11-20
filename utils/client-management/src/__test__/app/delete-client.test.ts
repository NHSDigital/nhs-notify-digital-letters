import { mockDeep } from 'jest-mock-extended';
import { ClientMetadata } from 'utils';
import { createApp, AppDependencies } from '../../app';
import { DeleteClientCommandParameters } from '../../app/delete-client';

function setup() {
  const clientId = 'input_id';

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
  ];

  const mocks = mockDeep<AppDependencies>({
    infra: {
      clientRepository: {
        deleteClient: jest.fn(),
      },
      metadataRepository: {
        listMetadata: jest.fn().mockResolvedValueOnce(metadata),
      },
    },
  });

  return { mocks, data: { metadata } };
}

describe('deleteClient', () => {
  it('deletes the client from the client repository by id', async () => {
    const { mocks } = setup();

    const app = createApp(mocks);

    const input: DeleteClientCommandParameters = { clientId: 'input_id' };

    await app.deleteClient(input);

    expect(mocks.infra.clientRepository.deleteClient).toHaveBeenCalledWith(
      input.clientId
    );
  });

  it('optionally also deletes associated client metadata', async () => {
    const { mocks, data } = setup();

    const app = createApp(mocks);

    const input: DeleteClientCommandParameters = {
      clientId: 'input_id',
      deleteMetadata: true,
    };

    await app.deleteClient(input);

    expect(mocks.infra.clientRepository.deleteClient).toHaveBeenCalledWith(
      input.clientId
    );

    expect(mocks.infra.metadataRepository.listMetadata).toHaveBeenCalledWith(
      input.clientId
    );

    expect(mocks.infra.metadataRepository.deleteMetadata).toHaveBeenCalledTimes(
      2
    );

    expect(mocks.infra.metadataRepository.deleteMetadata).toBeCalledWith(
      data.metadata[0]
    );

    expect(mocks.infra.metadataRepository.deleteMetadata).toBeCalledWith(
      data.metadata[1]
    );
  });
});
