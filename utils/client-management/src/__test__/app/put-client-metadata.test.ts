import { mockDeep } from 'jest-mock-extended';
import { Client, ClientMetadata } from 'utils';
import { PutClientMetadataCommandParameters } from '../../app/put-client-metadata';
import { createApp, AppDependencies } from '../../app';

function setup() {
  const client: Client = {
    clientId: 'test_client_id',
    name: 'test_client_name',
    meshMailboxId: 'test_client_mesh_mailbox_id',
    meshWorkflowIdSuffix: 'test_client_mesh_workflow_id_suffix',
    senderOdsCode: 'test_ods_code',
  };

  const credential: ClientMetadata = {
    clientId: 'test_client_id',
    provider: 'govuknotify',
    scope: 'client-metadata',
    type: 'api_key',
    value: 'test_secret',
  };

  const mocks = mockDeep<AppDependencies>({
    domain: {
      metadata: {
        createMetadata: jest.fn(() => credential),
      },
    },
    infra: {
      clientRepository: {
        getClient: jest.fn(async () => client),
      },
    },
  });

  return { mocks, data: { client, credential } };
}

describe('putClientMetadata', () => {
  it('validates that the client exists, stores the new credential in the repository and returns it', async () => {
    const { mocks, data } = setup();

    const app = createApp(mocks);

    const input: PutClientMetadataCommandParameters = {
      clientId: 'input_client_id',
      scope: 'client-metadata',
      provider: 'govuknotify',
      type: 'api_key',
      value: 'input_value',
    };

    const result = await app.putClientMetadata(input);

    expect(mocks.infra.clientRepository.getClient).toHaveBeenCalledWith(
      input.clientId
    );

    expect(mocks.domain.metadata.createMetadata).toHaveBeenCalledWith(input);

    expect(mocks.infra.metadataRepository.putMetadata).toHaveBeenCalledWith(
      data.credential
    );

    expect(result).toBe(data.credential);
  });

  it('detect and parse RfR override codes', async () => {
    const { mocks } = setup();

    const app = createApp(mocks);

    const input: PutClientMetadataCommandParameters = {
      clientId: 'input_client_id',
      provider: 'rfr-override',
      scope: 'client-metadata',
      type: 'codes',
      value: 'ORR,SCT',
    };

    await app.putClientMetadata(input);

    expect(mocks.domain.metadata.createMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        value: '{"codes":["ORR","SCT"]}',
      })
    );
  });

  it('throws a ValidationException for invalid RfR override codes', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const app = createApp(mocks);

    const input: PutClientMetadataCommandParameters = {
      clientId: 'input_client_id',
      provider: 'rfr-override',
      scope: 'client-metadata',
      type: 'codes',
      value: 'ORR,SCT,XXX',
    };

    mocks.infra.clientRepository.getClient.mockResolvedValueOnce(null);

    await expect(
      app.putClientMetadata(input)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid RfR override codes: XXX. Allowed: DEA, EMB, SCT, NIT, TRA, ORR, AFL, AFN, CAN, CGA, DIS, LDN, OPA, RDI, RDR, RFI, RPR, SDL, SDN"`
    );

    expect(mocks.domain.metadata.createMetadata).not.toHaveBeenCalled();

    expect(mocks.infra.metadataRepository.putMetadata).not.toHaveBeenCalled();
  });

  it('throws a NotFoundException if the client does not exist', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const app = createApp(mocks);

    const input: PutClientMetadataCommandParameters = {
      clientId: 'input_client_id',
      provider: 'govuknotify',
      scope: 'client-metadata',
      type: 'api_key',
      value: 'input_value',
    };

    mocks.infra.clientRepository.getClient.mockResolvedValueOnce(null);

    await expect(
      app.putClientMetadata(input)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Client ID "input_client_id" not found."`
    );

    expect(mocks.domain.metadata.createMetadata).not.toHaveBeenCalled();

    expect(mocks.infra.metadataRepository.putMetadata).not.toHaveBeenCalled();
  });
});
