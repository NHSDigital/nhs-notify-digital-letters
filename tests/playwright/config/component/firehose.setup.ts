import { test as setup } from '@playwright/test';
import {
  MINIMUM_DESTINATION_BUFFER_INTERVAL,
  MINIMUM_PROCESSOR_BUFFER_INTERVAL,
  TERRAFORM_DESTINATION_BUFFER_INTERVAL,
  TERRAFORM_PROCESSOR_BUFFER_INTERVAL,
} from 'constants/backend-constants';
import { alterFirehoseBufferIntervals } from 'helpers/data-firehose-helpers';

setup('Reduce Firehose buffer intervals', async () => {
  await alterFirehoseBufferIntervals({
    expected: {
      destination: TERRAFORM_DESTINATION_BUFFER_INTERVAL,
      processor: TERRAFORM_PROCESSOR_BUFFER_INTERVAL,
    },
    update: {
      destination: MINIMUM_DESTINATION_BUFFER_INTERVAL,
      processor: MINIMUM_PROCESSOR_BUFFER_INTERVAL,
    },
  });
});
