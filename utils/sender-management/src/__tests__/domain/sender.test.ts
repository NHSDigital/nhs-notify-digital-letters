import { CreateSenderParameters, createSender } from '../../domain/sender';

const mockRandomUUID = 'test_random_uuid';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => mockRandomUUID),
}));

describe('createSender', () => {
  it('creates a sender entity using senderId specified', () => {
    const input: CreateSenderParameters = {
      senderId: 'test_sender_id',
      senderName: 'test_sender_name',
      meshMailboxSenderId: 'test_sender_mesh_mailbox_sender_id',
      meshMailboxReportsId: 'test_sender_mesh_mailbox_reports_id',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: '1234',
    };

    expect(createSender(input)).toEqual({
      senderId: input.senderId,
      senderName: input.senderName,
      meshMailboxSenderId: input.meshMailboxSenderId,
      meshMailboxReportsId: input.meshMailboxReportsId,
      fallbackWaitTimeSeconds: input.fallbackWaitTimeSeconds,
      routingConfigId: input.routingConfigId,
    });
  });

  it('creates a sender entity defaulting senderId to be an uuid', () => {
    const input: CreateSenderParameters = {
      senderName: 'test_sender_name',
      meshMailboxSenderId: 'test_sender_mesh_mailbox_sender_id',
      meshMailboxReportsId: 'test_sender_mesh_mailbox_reports_id',
      fallbackWaitTimeSeconds: 300,
      routingConfigId: '1234',
    };

    expect(createSender(input)).toEqual({
      senderId: mockRandomUUID,
      senderName: input.senderName,
      meshMailboxSenderId: input.meshMailboxSenderId,
      meshMailboxReportsId: input.meshMailboxReportsId,
      fallbackWaitTimeSeconds: input.fallbackWaitTimeSeconds,
      routingConfigId: input.routingConfigId,
    });
  });
});
