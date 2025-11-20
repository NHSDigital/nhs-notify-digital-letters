import { mockDeep } from 'jest-mock-extended';
import { createApp, AppDependencies } from '../../app';
import { DeleteClientMetadataCommandParameters } from '../../app/delete-client-metadata';

function setup() {
  const mocks = mockDeep<AppDependencies>({
    infra: {
      metadataRepository: {
        deleteMetadata: jest.fn(),
      },
    },
  });

  return { mocks };
}

describe('deleteClientMetadata', () => {
  it('deletes the item of client metadata from the metadata repository', async () => {
    const { mocks } = setup();

    const app = createApp(mocks);

    const input: DeleteClientMetadataCommandParameters = {
      clientId: 'input_id',
      scope: 'client-metadata',
      type: 'api_key',
      provider: 'govuknotify',
    };

    await app.deleteClientMetadata(input);

    expect(mocks.infra.metadataRepository.deleteMetadata).toHaveBeenCalledWith(
      input
    );
  });
});
