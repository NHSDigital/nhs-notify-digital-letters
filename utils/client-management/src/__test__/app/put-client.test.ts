import { mockDeep } from 'jest-mock-extended';
import { Client } from 'utils';
import { PutClientCommandParameters } from '../../app/put-client';
import { createApp, AppDependencies } from '../../app';

function setup(clientSpec: 'min' | 'max') {
  const minimumClient: Client = {
    clientId: 'test_client_id',
    name: 'test_client_name',
    meshMailboxId: 'test_client_mesh_mailbox_id',
    meshWorkflowIdSuffix: 'test_client_mesh_workflow_id_suffix',
    allowOdsOverride: true,
  };

  const maximumClient: Client = {
    clientId: 'test_client_id',
    name: 'test_client_name',
    meshMailboxId: 'test_client_mesh_mailbox_id',
    meshWorkflowIdSuffix: 'test_client_mesh_workflow_id_suffix',
    meshWorkflowIdReceiveRequestAck:
      'test_client_mesh_workflow_id_receive_request_ack',
    meshWorkflowIdCompletedRequestItemsReport:
      'test_client_mesh_workflow_id_completed_items_report',
    senderOdsCode: 'A12345',
    allowAlternativeContactDetails: true,
    unprefixedName: true,
    allowAnonymousPatient: true,
    ignoreSecurityFlag: true,
    allowRfrOverride: true,
  };

  const client = clientSpec === 'min' ? minimumClient : maximumClient;

  const mocks = mockDeep<AppDependencies>({
    domain: {
      client: {
        createClient: jest.fn(() => client),
      },
    },
  });

  return { mocks, data: { client } };
}

describe('putClient', () => {
  it('creates a new client with minimum data, stores it in the client repository and returns it', async () => {
    const { mocks, data } = setup('min');

    const app = createApp(mocks);

    const input: PutClientCommandParameters = {
      clientId: 'input_client_id',
      name: 'input_client_name',
      meshMailboxId: 'input_client_mesh_mailbox_id',
      senderOdsCode: 'A12345',
    };

    const result = await app.putClient(input);

    expect(mocks.domain.client.createClient).toHaveBeenCalledWith(input);
    expect(mocks.infra.clientRepository.putClient).toHaveBeenCalledWith(
      data.client
    );
    expect(result).toBe(data.client);
  });

  it('creates a new client with maximum data, stores it in the client repository and returns it', async () => {
    const { mocks, data } = setup('max');

    const app = createApp(mocks);

    const input: PutClientCommandParameters = {
      clientId: 'input_client_id',
      name: 'input_client_name',
      meshMailboxId: 'input_client_mesh_mailbox_id',
      senderOdsCode: 'A12345',
      allowOdsOverride: true,
      allowAlternativeContactDetails: true,
      unprefixedName: true,
      allowAnonymousPatient: true,
      ignoreSecurityFlag: true,
      allowRfrOverride: true,
    };

    const result = await app.putClient(input);

    expect(mocks.domain.client.createClient).toHaveBeenCalledWith(input);
    expect(mocks.infra.clientRepository.putClient).toHaveBeenCalledWith(
      data.client
    );
    expect(result).toBe(data.client);
  });

  it('Rejects a client that does not have either senderOdsCode or allowOdsOverride', async () => {
    const { mocks } = setup('min');

    const app = createApp(mocks);

    const input: PutClientCommandParameters = {
      clientId: 'input_client_id',
      name: 'input_client_name',
    };

    await expect(app.putClient(input)).rejects.toThrow(
      'Client must have a senderOdsCode or enable allowOdsOverride'
    );
    expect(mocks.infra.clientRepository.putClient).toHaveBeenCalledTimes(0);
  });

  it('Accepts a client that has a 3 character valid ODS code', async () => {
    const { mocks, data } = setup('max');

    const app = createApp(mocks);

    const input: PutClientCommandParameters = {
      clientId: 'input_client_id',
      name: 'input_client_name',
      meshMailboxId: 'input_client_mesh_mailbox_id',
      senderOdsCode: 'AB1',
      allowOdsOverride: true,
      allowAlternativeContactDetails: true,
      unprefixedName: true,
      allowAnonymousPatient: true,
      ignoreSecurityFlag: true,
      allowRfrOverride: true,
    };

    const result = await app.putClient(input);

    expect(mocks.domain.client.createClient).toHaveBeenCalledWith(input);
    expect(mocks.infra.clientRepository.putClient).toHaveBeenCalledWith(
      data.client
    );
    expect(result).toBe(data.client);
  });

  it('Rejects a client that does not have a valid senderOdsCode', async () => {
    const { mocks } = setup('min');

    const app = createApp(mocks);

    const input: PutClientCommandParameters = {
      clientId: 'input_client_id',
      name: 'input_client_name',
      meshMailboxId: 'input_client_mesh_mailbox_id',
      senderOdsCode: 'ab12345',
    };

    await expect(app.putClient(input)).rejects.toThrow(
      'The supplied senderOdsCode is not in the correct format'
    );
    expect(mocks.infra.clientRepository.putClient).toHaveBeenCalledTimes(0);
  });
});
