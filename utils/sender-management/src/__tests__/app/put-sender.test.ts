import { mockDeep } from 'jest-mock-extended';
import { Sender } from 'utils';
import { ConflictException, ValidationException } from 'domain/exceptions/';
import { PutSenderCommandParameters } from '../../app/put-sender';
import { AppDependencies, createApp } from '../../app';

const input: PutSenderCommandParameters = {
  senderId: 'test_sender_id',
  senderName: 'test_sender_name',
  meshMailboxSenderId: 'test_sender_mesh_mailbox_id',
  meshMailboxReportsId: 'test_sender_mesh_workflow_id_suffix',
  fallbackWaitTimeSeconds: 300,
  routingConfigId: '1234',
};

const sender: Sender = {
  senderId: 'test_sender_id',
  senderName: 'test_sender_name',
  meshMailboxSenderId: 'test_sender_mesh_mailbox_id',
  meshMailboxReportsId: 'test_sender_mesh_workflow_id_suffix',
  fallbackWaitTimeSeconds: 300,
  routingConfigId: '1234',
};

function setup(existingSenders: Sender[] = [], createSenderResponse = sender) {
  const mocks = mockDeep<AppDependencies>({
    domain: {
      sender: {
        createSender: jest.fn(() => createSenderResponse),
      },
    },
    infra: {
      senderRepository: {
        putSender: jest.fn(),
        listSenders: jest.fn().mockResolvedValue(existingSenders),
      },
    },
  });

  return { mocks, data: { sender } };
}

describe('putSender', () => {
  it('creates a new sender when not existing senders, stores it in the sender repository and returns it', async () => {
    const { data, mocks } = setup([]);

    const app = createApp(mocks);
    delete input.senderId; // simulate no senderId provided
    const result = await app.putSender(input);

    expect(mocks.domain.sender.createSender).toHaveBeenCalledWith(input);
    expect(mocks.infra.senderRepository.putSender).toHaveBeenCalledWith(
      data.sender,
    );
    expect(result).toBe(data.sender);
  });

  it('creates a new sender when existing senders, stores it in the sender repository and returns it', async () => {
    const existingSender: Sender = {
      ...sender,
      senderId: 'existing_client_id',
      meshMailboxSenderId: 'existing_mesh_mailbox_sender_id',
      senderName: 'new_client_name',
    };
    const { data, mocks } = setup([existingSender]);

    const app = createApp(mocks);

    const result = await app.putSender(input);

    expect(mocks.domain.sender.createSender).toHaveBeenCalledWith(input);
    expect(mocks.infra.senderRepository.putSender).toHaveBeenCalledWith(
      data.sender,
    );
    expect(result).toBe(data.sender);
  });

  it('Updates sender when it exists, stores it in the sender repository and returns it', async () => {
    const existingSender: Sender = {
      ...sender,
      meshMailboxSenderId: 'existing_mesh_mailbox_sender_id',
    };
    const { data, mocks } = setup([existingSender]);

    const app = createApp(mocks);

    const result = await app.putSender(input);

    expect(mocks.domain.sender.createSender).toHaveBeenCalledWith(input);
    expect(mocks.infra.senderRepository.putSender).toHaveBeenCalledWith(
      data.sender,
    );
    expect(result).toBe(data.sender);
  });

  it('throws an error when a different existing sender has the same mailbox sender ID', async () => {
    const existingSender: Sender = {
      ...sender,
      senderId: 'existing_client_id',
      senderName: 'new_client_name',
    };
    const { mocks } = setup([existingSender]);

    const app = createApp(mocks);

    await expect(app.putSender(input)).rejects.toThrow(ConflictException);

    expect(mocks.domain.sender.createSender).toHaveBeenCalledWith(input);
    expect(mocks.infra.senderRepository.putSender).toHaveBeenCalledTimes(0);
  });

  it('throws an error when a different existing sender has the same sender name', async () => {
    const existingSender: Sender = {
      ...sender,
      senderId: 'existing_client_id',
      meshMailboxSenderId: 'new_mesh_mailbox_sender_id',
    };
    const { mocks } = setup([existingSender]);

    const app = createApp(mocks);

    await expect(app.putSender(input)).rejects.toThrow(ConflictException);

    expect(mocks.domain.sender.createSender).toHaveBeenCalledWith(input);
    expect(mocks.infra.senderRepository.putSender).toHaveBeenCalledTimes(0);
  });

  it('throws an error when the incoming sender is not valid', async () => {
    const newInvalidClient: Sender = {
      ...sender,
    };
    delete (newInvalidClient as Partial<Sender>).meshMailboxSenderId;

    const { mocks } = setup([], newInvalidClient);

    const app = createApp(mocks);

    await expect(app.putSender(newInvalidClient)).rejects.toThrow(
      ValidationException,
    );

    expect(mocks.domain.sender.createSender).toHaveBeenCalledWith(
      newInvalidClient,
    );
    expect(mocks.infra.senderRepository.putSender).toHaveBeenCalledTimes(0);
  });
});
