import { test as setup } from '@playwright/test';
import senderRepository from 'helpers/sender-helpers';
import { Sender } from 'utils';

const testSenders: Sender[] = [
  {
    senderId: 'test-sender-1',
    senderName: 'Test Sender 1',
    meshMailboxSenderId: 'test-mesh-sender-1',
    meshMailboxReportsId: 'test-mesh-reports-1',
    fallbackWaitTimeSeconds: 24 * 3600,
  },
];

setup('Create senders', async () => {
  for (const sender of testSenders) {
    await senderRepository.putSender(sender);
  }
});
