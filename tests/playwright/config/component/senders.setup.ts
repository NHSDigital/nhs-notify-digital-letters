import { test as setup } from '@playwright/test';
import { TEST_SENDERS } from 'constants/test-senders';
import senderRepository from 'helpers/sender-helpers';

setup('Create senders', async () => {
  for (const sender of TEST_SENDERS) {
    await senderRepository.putSender(sender);
  }
});
