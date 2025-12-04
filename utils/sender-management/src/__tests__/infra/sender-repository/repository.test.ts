import { Parameter, ParameterNotFound } from '@aws-sdk/client-ssm';
import { IParameterStore, Sender } from 'utils';
import { mockDeep } from 'jest-mock-extended';
import { SenderRepository } from '../../../infra/sender-repository/repository';

let logger: any;

function setup() {
  logger = { info: jest.fn(), error: jest.fn() };

  const mocks = {
    config: {
      environment: 'test_environment',
    },
    parameterStore: mockDeep<IParameterStore>({
      addParameter: jest.fn(),
      getParameter: jest.fn().mockResolvedValue({
        Value: JSON.stringify({
          senderId: 'old_client_id_1',
          senderName: 'old_client_name_1',
          meshMailboxSenderId: 'old_client_mesh_mailbox_sender_id_1',
          meshMailboxReportsId: 'old_client_mesh_mailbox_reports_id_1',
          fallbackWaitTimeSeconds: 300,
          routingConfigId: '1234',
        }),
      }),
      deleteParameter: jest.fn(),
    }),
    logger,
  };

  const senders: Sender[] = [
    {
      senderId: 'old_client_id_1',
      senderName: 'old_client_name_1',
      meshMailboxSenderId: 'old_client_mesh_mailbox_sender_id_1',
      meshMailboxReportsId: 'old_client_mesh_mailbox_reports_id_1',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: '1234',
    },
    {
      senderId: 'old_client_id_2',
      senderName: 'old_client_name_2',
      meshMailboxSenderId: 'old_client_mesh_mailbox_sender_id_2',
      meshMailboxReportsId: 'old_client_mesh_mailbox_reports_id_2',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: '1234',
    },
  ];

  const newClient: Sender = {
    senderId: 'new_client_id',
    senderName: 'new_client_name',
    meshMailboxSenderId: 'new_client_mesh_mailbox_sender_id',
    meshMailboxReportsId: 'new_client_mesh_mailbox_reports_id',
    fallbackWaitTimeSeconds: 300,
    routingConfigId: '1234',
  };

  mocks.parameterStore.getAllParameters.mockResolvedValue(
    senders.map((c) => ({
      Name: c.senderName,
      Value: JSON.stringify(c),
    })),
  );

  return { mocks, data: { senders, newClient } };
}

describe('putSender', () => {
  it('inserts a new sender into the ssm parameter', async () => {
    const { data, mocks } = setup();

    const repository = new SenderRepository(mocks);

    await repository.putSender(data.newClient);

    expect(mocks.parameterStore.addParameter).toHaveBeenCalledTimes(1);
    expect(mocks.parameterStore.addParameter).toHaveBeenCalledWith(
      `/dl/${mocks.config.environment}/senders/${data.newClient.senderId}`,
      JSON.stringify(data.newClient),
    );
  });

  it('overwrites an existing sender with the same senderId', async () => {
    const { data, mocks } = setup();

    const repository = new SenderRepository(mocks);

    const [existingSender] = data.senders;

    const updatedClient = {
      ...data.newClient,
      senderId: existingSender.senderId,
    };

    await repository.putSender(updatedClient);

    expect(mocks.parameterStore.addParameter).toHaveBeenCalledTimes(1);
    expect(mocks.parameterStore.addParameter).toHaveBeenCalledWith(
      `/dl/${mocks.config.environment}/senders/${existingSender.senderId}`,
      JSON.stringify(updatedClient),
    );
  });
});

describe('listSenders', () => {
  it('returns the list of senders from ssm parameter store', async () => {
    const { data, mocks } = setup();

    const repository = new SenderRepository(mocks);

    const result = await repository.listSenders();

    expect(mocks.parameterStore.getAllParameters).toHaveBeenCalledTimes(1);
    expect(mocks.parameterStore.getAllParameters).toHaveBeenCalledWith(
      `/dl/${mocks.config.environment}/senders/`,
      { force: undefined },
    );

    expect(result).toEqual(data.senders);
  });

  it('should not include any params that contain malformed senders', async () => {
    const { data, mocks } = setup();

    const invalidClientParams: Parameter[] = [
      {
        Name: `/dl/${mocks.config.environment}/senders/sender-has-no-value`,
        Version: 2,
      },
      {
        Name: `/dl/${mocks.config.environment}/senders/sender-is-not-json`,
        Value: 'not-a-sender',
        Version: 2,
      },
      {
        Name: `/dl/${mocks.config.environment}/senders/sender-is-missing-required-fields`,
        Value: '{"senderId":"sender-id"}',
        Version: 2,
      },
    ];

    mocks.parameterStore.getAllParameters.mockResolvedValue([
      ...data.senders.map((c) => ({
        Name: c.senderName,
        Value: JSON.stringify(c),
      })),
      ...invalidClientParams,
    ]);

    const repository = new SenderRepository(mocks);

    const result = await repository.listSenders();
    expect(result).toEqual(data.senders);
  });
});

describe('getSender', () => {
  it('returns the sender with the given senderId', async () => {
    const { data, mocks } = setup();

    const [sender] = data.senders;

    const repository = new SenderRepository(mocks);

    const result = await repository.getSender(sender.senderId);

    expect(mocks.parameterStore.getParameter).toHaveBeenCalledTimes(1);
    expect(mocks.parameterStore.getParameter).toHaveBeenCalledWith(
      `/dl/${mocks.config.environment}/senders/${sender.senderId}`,
    );

    expect(result).toEqual(sender);
  });

  it('returns null if a ParameterNotFound exception is raised', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new SenderRepository(mocks);

    mocks.parameterStore.getParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} }),
    );

    const result = await repository.getSender('this-senderId-does-not-exist');

    expect(result).toBeNull();
  });

  it('raises other exceptions', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new SenderRepository(mocks);

    const e = new Error('Something went wrong');

    mocks.parameterStore.getParameter.mockRejectedValueOnce(e);

    let caught: unknown;
    try {
      await repository.getSender('this-senderId-does-not-exist');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(e);
  });
});

describe('deleteSender', () => {
  it('deletes the sender with the given senderId', async () => {
    const { mocks } = setup();

    const repository = new SenderRepository(mocks);

    await repository.deleteSender('some-id');

    expect(mocks.parameterStore.deleteParameter).toHaveBeenCalledTimes(1);
    expect(mocks.parameterStore.deleteParameter).toHaveBeenCalledWith(
      `/dl/${mocks.config.environment}/senders/some-id`,
    );

    expect(1).toEqual(1);
  });

  it('handles ParameterNotFound exceptions', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new SenderRepository(mocks);

    mocks.parameterStore.deleteParameter.mockRejectedValueOnce(
      new ParameterNotFound({ message: 'ParameterNotFound', $metadata: {} }),
    );

    await repository.deleteSender('some-id');

    expect(mocks.parameterStore.deleteParameter).toHaveBeenCalledTimes(1);
    expect(mocks.parameterStore.deleteParameter).toHaveBeenCalledWith(
      `/dl/${mocks.config.environment}/senders/some-id`,
    );
  });

  it('raises other exceptions', async () => {
    expect.hasAssertions();

    const { mocks } = setup();

    const repository = new SenderRepository(mocks);

    const e = new Error('Something went wrong');

    mocks.parameterStore.deleteParameter.mockRejectedValueOnce(e);

    let caught: unknown;
    try {
      await repository.deleteSender('some-id');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(e);
  });
});
