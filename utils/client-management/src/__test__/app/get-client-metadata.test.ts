import { mockDeep } from 'jest-mock-extended';
import { ClientMetadata } from 'utils';
import { AppDependencies } from '../../app';
import {
  createGetClientMetadataCommand,
  type GetClientMetadataCommandParameters,
} from '../../app/get-client-metadata';

function setup() {
  const credential: ClientMetadata = {
    clientId: 'test_client_id',
    scope: 'client-metadata',
    provider: 'govuknotify',
    type: 'api_key',
    value: 'test_credential_value',
  };

  const data = { credential };

  const mocks = mockDeep<AppDependencies>({
    infra: {
      metadataRepository: {
        getMetadata: jest.fn().mockResolvedValueOnce(credential),
      },
    },
  });

  const getClientMetadata = createGetClientMetadataCommand(mocks);

  return { mocks, data, getClientMetadata };
}

describe('getClientMetadata', () => {
  it('retrieves the credential from the repository and returns it', async () => {
    const { mocks, data, getClientMetadata } = setup();

    const input: GetClientMetadataCommandParameters = {
      clientId: 'input_id',
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'api_key',
    };

    const result = await getClientMetadata(input);

    expect(mocks.infra.metadataRepository.getMetadata).toHaveBeenCalledWith(
      input
    );

    expect(result).toBe(data.credential);
  });
});
