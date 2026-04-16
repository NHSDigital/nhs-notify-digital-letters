import { $ChannelStatusPublishedEventV1 } from '@nhsdigital/nhs-notify-event-schemas-status-published';
import createdEvent from '@nhsdigital/nhs-notify-event-schemas-status-published/examples/ChannelStatusPublishedEvent/v1/created.json';
import {
  MatchersV3,
  MessageConsumerPact,
  asynchronousBodyHandler,
} from '@pact-foundation/pact';

import {
  PACT_CONSUMER,
  PACT_DIRECTORY,
  PACT_MESSAGE_DESCRIPTION,
  PACT_PROVIDER,
} from '../utils/pact-config';

async function handle(event: unknown) {
  $ChannelStatusPublishedEventV1.parse(event);
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
          datacontenttype: 'application/json',
          data: {
            channel: MatchersV3.regex(
              /^(email|sms|letter|nhsapp)$/,
              createdEvent.data.channel,
            ),
            channelStatus: MatchersV3.regex(
              /^(failed|created|delivered|sending|assigning_batch|retry|skipped|stale_pds)$/,
              createdEvent.data.channelStatus,
            ),
            clientId: MatchersV3.uuid(createdEvent.data.clientId),
            messageId: MatchersV3.string(createdEvent.data.messageId),
            messageReference: MatchersV3.string(
              createdEvent.data.messageReference,
            ),
            timestamp: MatchersV3.regex(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
              createdEvent.data.timestamp,
            ),
            supplierStatus: 'paper_letter_opted_out',
          },
          dataschema: MatchersV3.regex(
            /^https:\/\/notify\.nhs\.uk\/cloudevents\/schemas\/messaging\/channel-status\.published\.\d+\.\d+\.\d+\.schema\.json$/,
            createdEvent.dataschema,
          ),
          dataschemaversion: MatchersV3.regex(
            /^\d+\.\d+\.\d+$/,
            createdEvent.dataschemaversion,
          ),
          id: MatchersV3.uuid(createdEvent.id),
          plane: 'data',
          sequence: MatchersV3.string(createdEvent.sequence),
          source: MatchersV3.string(createdEvent.source),
          specversion: MatchersV3.regex(/^1\.0$/, createdEvent.specversion),
          subject: MatchersV3.regex(
            /^customer\/[0-9a-f-]+\/message\/[^/]+\/plan\/[^/]+$/,
            createdEvent.subject,
          ),
          time: MatchersV3.datetime(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            createdEvent.time,
          ),
          traceparent: MatchersV3.regex(
            /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/,
            createdEvent.traceparent,
          ),
          type: 'uk.nhs.notify.channel.status.PUBLISHED.v1',
        })
        .verify(asynchronousBodyHandler(handle)),
    ).resolves.not.toThrow();
  });
});
