import ChannelStatusPublishedEventPaperLetterOptedOut from '@nhsdigital/nhs-notify-event-schemas-status-published/examples/ChannelStatusPublishedEvent/v1/paper_letter_opted_out.json';
import {
  MatchersV3,
  MessageConsumerPact,
  asynchronousBodyHandler,
} from '@pact-foundation/pact';
import { z } from 'zod';

import {
  PACT_CONSUMER,
  PACT_DIRECTORY,
  PACT_MESSAGE_DESCRIPTION,
  PACT_PROVIDER,
} from '../utils/pact-config';

const ChannelStatusPublishedEventSchema = z.object({
  data: z.object({
    messageReference: z.string(),
    supplierStatus: z.literal('paper_letter_opted_out'),
  }),
});

async function handle(event: unknown) {
  // This should ultimately reference the actual event validation code
  // being implemented in CCM-15676
  ChannelStatusPublishedEventSchema.parse(event);
}

describe('Pact message consumer - ChannelStatusPublished event', () => {
  const messagePact = new MessageConsumerPact({
    consumer: PACT_CONSUMER,
    provider: PACT_PROVIDER,
    dir: PACT_DIRECTORY,
    logLevel: 'error',
    pactfileWriteMode: 'update',
  });

  it('validates a channel status published event', async () => {
    await expect(
      messagePact
        .expectsToReceive(PACT_MESSAGE_DESCRIPTION)
        .withContent({
          data: {
            messageReference: MatchersV3.string(
              ChannelStatusPublishedEventPaperLetterOptedOut.data
                .messageReference,
            ),
            supplierStatus:
              ChannelStatusPublishedEventPaperLetterOptedOut.data
                .supplierStatus,
          },
        })
        .verify(asynchronousBodyHandler(handle)),
    ).resolves.not.toThrow();
  });
});
