import { ParameterNotFound, Parameter } from '@aws-sdk/client-ssm';
import { IParameterStore } from '@comms/util-aws';
import { mockDeep } from 'jest-mock-extended';
import { Client } from 'utils';
import { ConflictException } from '../../../domain/exceptions';
import { ClientRepository } from '../../../infra/client-repository/repository';

function setup() {
  const mocks = {
    config: {
      environment: 'test_environment',
    },
    parameterStore: mockDeep<IParameterStore>({
      addParameter: jest.fn(),
      getParameter: jest.fn().mockResolvedValue({
        Value: JSON.stringify({
          clientId: 'old_client_id_1',
          name: 'old_client_name_1',
          meshMailboxId: 'old_client_mesh_mailbox_id_1',
          meshWorkflowIdSuffix: 'old_client_mesh_workflow_id_suffix_1',
          senderOdsCode: 'olds_client_ods_code',
        }),
      }),
      deleteParameter: jest.fn(),
    }),
  };

  const clients: Client[] = [
    {
      clientId: 'old_client_id_1',
      name: 'old_client_name_1',
      meshMailboxId: 'old_client_mesh_mailbox_id_1',
      meshWorkflowIdSuffix: 'old_client_mesh_workflow_id_suffix_1',
      senderOdsCode: 'olds_client_ods_code',
    },
    {
      clientId: 'old_client_id_2',
      name: 'old_client_name_2',
      meshMailboxId: 'old_client_mesh_mailbox_id_2',
      meshWorkflowIdSuffix: 'old_client_mesh_workflow_id_suffix_2',
      senderOdsCode: 'old_client_ods_code_2',
    },
  ];

  const newClient: Client = {
    clientId: 'new_client_id',
    name: 'new_client_name',
    meshMailboxId: 'new_client_mesh_mailbox_id',
    meshWorkflowIdSuffix: 'new_client_mesh_workflow_id_suffix',
    allowOdsOverride: true,
    senderOdsCode: 'new_client_ods_code',
  };

  mocks.parameterStore.getAllParameters.mockResolvedValue(
    clients.map((c) => ({
      Name: c.name,
      Value: JSON.stringify(c),
    }))
  );

  return { mocks, data: { clients, newClient } };
}

describe('putClient', () => {
  it('inserts a new client into the ssm parameter', async () => {
    const { mocks, data } = setup();

    const repository = new ClientRepository(mocks);

    await repository.putClient(data.newClient);

    expect(mocks.parameterStore.addParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.addParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/${data.newClient.clientId}`,
      JSON.stringify(data.newClient)
    );
  });

  it('overwrites an existing client with the same clientId', async () => {
    const { mocks, data } = setup();

    const repository = new ClientRepository(mocks);

    const [existingClient] = data.clients;

    const updatedClient = {
      ...data.newClient,
      clientId: existingClient.clientId,
    };

    await repository.putClient(updatedClient);

    expect(mocks.parameterStore.addParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.addParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/${existingClient.clientId}`,
      JSON.stringify(updatedClient)
    );
  });

  describe('conflicts', () => {
    const uniqueConstrainedAttributes = ['name', 'meshMailboxId'];
    const missingUniqueConstrainedAttributes = ['meshMailboxId'];

    it.each(uniqueConstrainedAttributes)(
      'raises a ConflictException if inserting a new client with a duplicate %s',
      async (attribute) => {
        expect.hasAssertions();

        const { mocks, data } = setup();

        const repository = new ClientRepository(mocks);

        const [existingClient] = data.clients;

        const input = {
          ...data.newClient,
          [attribute]: existingClient[attribute as keyof Client],
        };

        await expect(repository.putClient(input)).rejects.toThrow(
          ConflictException
        );
      }
    );

    it.each(uniqueConstrainedAttributes)(
      'raises a ConflictException if updating an existing client with a duplicate %s',
      async (attribute) => {
        expect.hasAssertions();

        const { mocks, data } = setup();

        const repository = new ClientRepository(mocks);

        const [client1, client2] = data.clients;

        const input = {
          ...client1,
          [attribute]: client2[attribute as keyof Client],
        };

        await expect(repository.putClient(input)).rejects.toThrow(
          ConflictException
        );
      }
    );

    it.each(missingUniqueConstrainedAttributes)(
      'ignores a missing unique value conflict if updating an existing client%s',
      async (attribute) => {
        expect.hasAssertions();

        const { mocks, data } = setup();

        const repository = new ClientRepository(mocks);

        const [client1, client2] = data.clients;

        delete client1[attribute as keyof Client];
        delete client2[attribute as keyof Client];

        const input = {
          ...client1,
        };

        await repository.putClient(input);

        expect(mocks.parameterStore.addParameter).toBeCalledTimes(1);
        expect(mocks.parameterStore.addParameter).toBeCalledWith(
          `/comms/${mocks.config.environment}/clients/${client1.clientId}`,
          JSON.stringify(input)
        );
      }
    );
  });
});

describe('listClients', () => {
  it('returns the list of clients from ssm parameter store', async () => {
    const { mocks, data } = setup();

    const repository = new ClientRepository(mocks);

    const result = await repository.listClients();

    expect(mocks.parameterStore.getAllParameters).toBeCalledTimes(1);
    expect(mocks.parameterStore.getAllParameters).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/`,
      { force: undefined }
    );

    expect(result).toEqual(data.clients);
  });

  it('should not include any params that contain malformed clients', async () => {
    const { mocks, data } = setup();

    const invalidClientParams: Parameter[] = [
      {
        Name: `/comms/${mocks.config.environment}/clients/client-has-no-value`,
        Version: 2,
      },
      {
        Name: `/comms/${mocks.config.environment}/clients/client-is-not-json`,
        Value: 'not-a-client',
        Version: 2,
      },
      {
        Name: `/comms/${mocks.config.environment}/clients/client-is-missing-required-fields`,
        Value: '{"clientId":"client-id"}',
        Version: 2,
      },
    ];

    mocks.parameterStore.getAllParameters.mockResolvedValue([
      ...data.clients.map((c) => ({
        Name: c.name,
        Value: JSON.stringify(c),
      })),
      ...invalidClientParams,
    ]);

    const repository = new ClientRepository(mocks);

    const result = await repository.listClients();
    expect(result).toEqual(data.clients);
  });
});

describe('getClient', () => {
  it('returns the client with the given clientId', async () => {
    const { mocks, data } = setup();

    const [client] = data.clients;

    const repository = new ClientRepository(mocks);

    const result = await repository.getClient(client.clientId);

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/${client.clientId}`
    );

    expect(result).toEqual(client);
  });

  it('returns null if a ParameterNotFound exception is raised', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    mocks.parameterStore.getParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} })
    );

    const result = await repository.getClient('this-clientId-does-not-exist');

    expect(result).toBeNull();
  });

  it('raises other exceptions', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    const e = new Error('Something went wrong');

    mocks.parameterStore.getParameter.mockRejectedValueOnce(e);

    let caught: unknown;
    try {
      await repository.getClient('this-clientId-does-not-exist');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(e);
  });
});

describe('findFirst', () => {
  it('returns the first matching client', async () => {
    const { mocks, data } = setup();

    const repository = new ClientRepository(mocks);

    const [client1, client2] = data.clients;

    const result1 = await repository.findFirst({ name: client1.name });

    expect(result1).toEqual(client1);

    const result2 = await repository.findFirst({
      meshMailboxId: client2.meshMailboxId,
    });

    expect(result2).toEqual(client2);
  });

  it('matches on multiple criteria', async () => {
    const { mocks, data } = setup();

    const repository = new ClientRepository(mocks);

    const [, client] = data.clients;

    const result = await repository.findFirst({
      clientId: client.clientId,
      name: client.name,
    });

    expect(result).toEqual(client);
  });

  it('returns null if no client exists with the given criteria', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    const result = await repository.findFirst({
      name: 'this-client-name-does-not-exist',
    });

    expect(result).toBeNull();
  });
});

describe('deleteClient', () => {
  it('deletes the client with the given clientId', async () => {
    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    await repository.deleteClient('some-id');

    expect(mocks.parameterStore.deleteParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.deleteParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/some-id`
    );

    expect(1).toEqual(1);
  });

  it('handles ParameterNotFound exceptions', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    mocks.parameterStore.deleteParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} })
    );

    await repository.deleteClient('some-id');

    expect(mocks.parameterStore.deleteParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.deleteParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/clients/some-id`
    );
  });

  it('raises other exceptions', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    const e = new Error('Something went wrong');

    mocks.parameterStore.deleteParameter.mockRejectedValueOnce(e);

    let caught: unknown;
    try {
      await repository.deleteClient('some-id');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(e);
  });
});

describe('getApimClients', () => {
  const mocks = {
    config: {
      environment: 'test_environment',
    },
    parameterStore: mockDeep<IParameterStore>({
      addParameter: jest.fn(),
      getParameter: jest.fn().mockResolvedValue({
        Value: JSON.stringify({
          'apim-123': 'client-123',
          'apim-456': 'client-456',
        }),
      }),
      deleteParameter: jest.fn(),
    }),
  };

  it('returns the APIM clients from the SSM parameter store', async () => {
    const repository = new ClientRepository(mocks);

    const result = await repository.getApimClients();

    expect(mocks.parameterStore.getParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/commsapi-apim/token`
    );

    expect(result).toEqual({
      'apim-123': 'client-123',
      'apim-456': 'client-456',
    });
  });

  it('returns an empty object if the parameter value is empty', async () => {
    const repository = new ClientRepository(mocks);

    mocks.parameterStore.getParameter.mockResolvedValueOnce({
      Value: '',
    });

    const result = await repository.getApimClients();

    expect(result).toEqual({});
  });

  it('returns null if a ParameterNotFound exception is raised', async () => {
    expect.hasAssertions();

    const repository = new ClientRepository(mocks);

    mocks.parameterStore.getParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} })
    );

    const result = await repository.getApimClients();

    expect(result).toBeNull();
  });
});

describe('putApimClients', () => {
  it('inserts or updates the APIM clients in the SSM parameter store', async () => {
    const { mocks } = setup();

    const repository = new ClientRepository(mocks);

    const apimClients = {
      'apim-123': 'client-123',
      'apim-456': 'client-456',
    };

    await repository.putApimClients(apimClients);

    expect(mocks.parameterStore.addParameter).toBeCalledTimes(1);
    expect(mocks.parameterStore.addParameter).toBeCalledWith(
      `/comms/${mocks.config.environment}/commsapi-apim/token`,
      JSON.stringify(apimClients)
    );
  });
});
