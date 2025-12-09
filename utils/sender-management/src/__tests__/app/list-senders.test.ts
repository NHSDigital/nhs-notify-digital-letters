import { mockDeep } from 'jest-mock-extended';
import { Sender } from 'utils';
import { AppDependencies, createApp } from '../../app';

function setup() {
  const senders: Sender[] = [
    {
      senderId: 'test_sender_id',
      senderName: 'test_sender_name',
      meshMailboxSenderId: 'test_sender_mesh_mailbox_sender_id',
      meshMailboxReportsId: 'test_sender_mesh_mailbox_reports_id',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: '1234',
    },
  ];

  const mocks = mockDeep<AppDependencies>({
    infra: {
      senderRepository: {
        listSenders: jest.fn().mockResolvedValueOnce(senders),
      },
    },
  });

  return { mocks, data: { senders } };
}

describe('listSenders', () => {
  it('retrieves senders from the sender repository and returns them', async () => {
    const { data, mocks } = setup();

    const app = createApp(mocks);

    const result = await app.listSenders();

    expect(mocks.infra.senderRepository.listSenders).toHaveBeenCalled();
    expect(result).toBe(data.senders);
  });
});
