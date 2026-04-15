import { generatePaperLetterOptOutEvents } from 'generators/paper-letter-opt-out-events';
import { samplePaperLetterOptOutEvent } from '__tests__/fixtures/sample-paper-letter-opt-out-event';
import { CsvRow } from 'utils/csv-reader';

const environment = 'nft';

const sampleRows: CsvRow[] = [
  {
    messageReference: '037f5f76-352c-445f-89a7-c3d18776ce86',
    senderId: 'sender-001',
  },
];

describe('generatePaperLetterOptOutEvents', () => {
  it('should generate events in the expected format', () => {
    const events = generatePaperLetterOptOutEvents({
      csvRows: [sampleRows[0]],
      environment,
    });

    expect(events[0]).toStrictEqual({
      ...samplePaperLetterOptOutEvent,
      id: expect.any(String),
      time: expect.any(String),
      source: `/nhs/england/notify/comms-mgr-dev/${environment}/data-plane/messaging`,
      data: {
        ...samplePaperLetterOptOutEvent.data,
        messageReference: sampleRows[0].messageReference,
        clientId: sampleRows[0].senderId,
        timestamp: expect.any(String),
      },
    });
  });
});
