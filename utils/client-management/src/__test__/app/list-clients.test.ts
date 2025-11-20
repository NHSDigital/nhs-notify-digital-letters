import { mockDeep } from 'jest-mock-extended';
import { Client } from 'utils';
import { createApp, AppDependencies } from '../../app';

function setup() {
  const clients: Client[] = [
    {
      clientId: 'test_client_id',
      name: 'test_client_name',
      meshMailboxId: 'test_client_mesh_mailbox_id',
      meshWorkflowIdSuffix: 'test_client_mesh_workflow_id_suffix',
      senderOdsCode: 'test_ods_code',
    },
  ];

  const mocks = mockDeep<AppDependencies>({
    infra: {
      clientRepository: {
        listClients: jest.fn().mockResolvedValueOnce(clients),
      },
    },
  });

  return { mocks, data: { clients } };
}

describe('listClients', () => {
  it('retrieves clients from the client repository and returns them', async () => {
    const { mocks, data } = setup();

    const app = createApp(mocks);

    const result = await app.listClients();

    expect(mocks.infra.clientRepository.listClients).toHaveBeenCalled();
    expect(result).toBe(data.clients);
  });
});
