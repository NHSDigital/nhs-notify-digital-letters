import { mockDeep } from 'jest-mock-extended';
import { Sender } from 'utils';
import { AppDependencies, createApp } from '../../app';
import { GetSenderCommandParameters } from '../../app/get-sender';

function setup() {
  const sender: Sender = {
    senderId: 'test_sender_id',
    senderName: 'test_sender_name',
    meshMailboxSenderId: 'test_sender_mesh_mailbox_sender_id',
    meshMailboxReportsId: 'test_sender_mesh_mailbox_reports_id',
    fallbackWaitTimeSeconds: 300,
    routingConfigId: '1234',
  };

  const mocks = mockDeep<AppDependencies>({
    infra: {
      senderRepository: {
        getSender: jest.fn().mockResolvedValueOnce(sender),
      },
    },
  });

  return { mocks, data: { sender } };
}

describe('getSender', () => {
  it('retrieves the sender from the sender repository by id and returns it', async () => {
    const { data, mocks } = setup();

    const app = createApp(mocks);

    const input: GetSenderCommandParameters = { senderId: 'input_id' };

    const result = await app.getSender(input);

    expect(mocks.infra.senderRepository.getSender).toHaveBeenCalledWith(
      input.senderId,
    );

    expect(result).toBe(data.sender);
  });
});
