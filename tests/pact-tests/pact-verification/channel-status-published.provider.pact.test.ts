import { MessageProviderPact } from '@pact-foundation/pact';

import ChannelStatusPublishedEventCreated from '@nhsdigital/nhs-notify-event-schemas-status-published/examples/ChannelStatusPublishedEvent/v1/created.json';

import {
  PACT_FILE,
  PACT_MESSAGE_DESCRIPTION,
  PACT_PROVIDER,
} from '../utils/pact-config';

describe('Channel status published provider tests', () => {
  test('verify pacts', async () => {
    const p = new MessageProviderPact({
      provider: PACT_PROVIDER,
      pactUrls: [PACT_FILE],
      messageProviders: {
        [PACT_MESSAGE_DESCRIPTION]: () => ({
          // This should be updated to an example with the paperletteroptedout supplier
          // status from schemas package, once we've updated core.
          ...ChannelStatusPublishedEventCreated,
          data: {
            ...ChannelStatusPublishedEventCreated.data,
            supplierStatus: 'paperletteroptedout',
          },
        }),
      },
      logLevel: 'error',
    });

    await expect(p.verify()).resolves.not.toThrow();
  });
});
