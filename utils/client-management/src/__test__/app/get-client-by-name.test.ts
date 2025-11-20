import { mockDeep } from 'jest-mock-extended';
import { Client } from 'utils';
import { createApp, AppDependencies } from '../../app';
import { GetClientByNameCommandParameters } from '../../app/get-client-by-name';

function setup() {
  const client: Client = {
    clientId: 'test_client_id',
    name: 'test_client_name',
    meshMailboxId: 'test_client_mesh_mailbox_id',
    meshWorkflowIdSuffix: 'test_client_mesh_workflow_id_suffix',
    senderOdsCode: 'test_ods_code',
  };

  const mocks = mockDeep<AppDependencies>({
    infra: {
      clientRepository: {
        findFirst: jest.fn().mockResolvedValueOnce(client),
      },
    },
  });

  return { mocks, data: { client } };
}

describe('getClientByName', () => {
  it('retrieves the client from the client repository by id and returns it', async () => {
    const { mocks, data } = setup();

    const app = createApp(mocks);

    const input: GetClientByNameCommandParameters = { name: 'input_name' };

    const result = await app.getClientByName(input);

    expect(mocks.infra.clientRepository.findFirst).toHaveBeenCalledWith({
      name: input.name,
    });

    expect(result).toBe(data.client);
  });
});
