import { randomUUID } from 'node:crypto';
import paperLetterOptOutEventTemplate from 'event-templates/paper-letter-opt-out-event.json';
import { CsvRow } from 'utils/csv-reader';

import { type ChannelStatusPublishedEventV1 } from '@nhsdigital/nhs-notify-event-schemas-status-published';

type GeneratePaperLetterOptOutEventsParams = {
  csvRows: CsvRow[];
  environment: string;
};

function generatePaperLetterOptOutEvent(
  environment: string,
  row: CsvRow,
): ChannelStatusPublishedEventV1 {
  const { messageReference, senderId } = row;

  return {
    ...paperLetterOptOutEventTemplate,
    specversion: '1.0' as const,
    type: 'uk.nhs.notify.channel.status.PUBLISHED.v1' as const,
    plane: 'data' as const,
    datacontenttype: 'application/json' as const,
    dataschema:
      paperLetterOptOutEventTemplate.dataschema as ChannelStatusPublishedEventV1['dataschema'],
    id: randomUUID(),
    time: new Date().toISOString(),
    source: `/nhs/england/notify/comms-mgr-dev/${environment}/data-plane/messaging`,
    data: {
      ...paperLetterOptOutEventTemplate.data,
      messageReference,
      clientId: senderId,
    },
  };
}

export function generatePaperLetterOptOutEvents({
  csvRows,
  environment,
}: GeneratePaperLetterOptOutEventsParams): ChannelStatusPublishedEventV1[] {
  const events = csvRows.map((row) =>
    generatePaperLetterOptOutEvent(environment, row),
  );

  console.group('Event generation:');
  console.log(`Total events generated:\t\t${events.length}`);
  console.log(`Type:\t\t\t\tPaperLetterOptedOut`);
  console.groupEnd();

  return events;
}
