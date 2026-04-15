import { sampleSupplierApiLetterEvent } from '__tests__/fixtures/sample-supplier-api-letter-event';
import { generateSupplierApiLetterEvents } from 'generators/supplier-api-letter-events';

const SENDER_ID = '00f3b388-bbe9-41c9-9e76-052d37ee8988';

describe('generateSupplierApiLetterEvents', () => {
  it('should generate the requested number of events', () => {
    const requestedNumberOfEvents = 347;

    const generatedEvents = generateSupplierApiLetterEvents({
      status: 'ACCEPTED',
      environment: 'test',
      numberOfEvents: requestedNumberOfEvents,
    });

    expect(generatedEvents).toHaveLength(requestedNumberOfEvents);
  });

  it('should generate events in the expected format', () => {
    const environment = 'test';
    const status = 'PRINTED';
    const generatedEvents = generateSupplierApiLetterEvents({
      status,
      environment,
      numberOfEvents: 1,
    });

    expect(generatedEvents[0]).toStrictEqual({
      ...sampleSupplierApiLetterEvent,
      id: expect.any(String),
      time: expect.any(String),
      recordedtime: expect.any(String),
      source: `/data-plane/supplier-api/${environment}/update-status`,
      type: `uk.nhs.notify.supplier-api.letter.${status}.v1`,
      dataschema: `https://notify.nhs.uk/cloudevents/schemas/supplier-api/letter.${status}.1.0.17.schema.json`,
      subject: expect.stringMatching(
        new RegExp(`^letter-origin/letter-rendering/letter/${SENDER_ID}_`),
      ),
      data: {
        ...sampleSupplierApiLetterEvent.data,
        status,
        origin: {
          ...sampleSupplierApiLetterEvent.data.origin,
          subject: expect.stringMatching(
            new RegExp(`^client/${SENDER_ID}/letter-request/`),
          ),
        },
      },
    });
  });

  it('should use the provided id when specified', () => {
    const fixedId = '11111111-1111-1111-1111-111111111111';

    const generatedEvents = generateSupplierApiLetterEvents({
      status: 'ACCEPTED',
      environment: 'test',
      numberOfEvents: 3,
      id: fixedId,
    });

    for (const event of generatedEvents) {
      expect(event.id).toBe(fixedId);
    }
  });

  it('should use the provided time when specified', () => {
    const fixedTime = '2024-01-15T10:30:00.000Z';

    const generatedEvents = generateSupplierApiLetterEvents({
      status: 'ACCEPTED',
      environment: 'test',
      numberOfEvents: 3,
      time: fixedTime,
    });

    for (const event of generatedEvents) {
      expect(event.time).toBe(fixedTime);
    }
  });

  it('should use the provided subject when specified', () => {
    const fixedSubject = 'my-custom-subject';

    const generatedEvents = generateSupplierApiLetterEvents({
      status: 'ACCEPTED',
      environment: 'test',
      numberOfEvents: 3,
      subject: fixedSubject,
    });

    for (const event of generatedEvents) {
      expect(event.subject).toBe(fixedSubject);
    }
  });

  it('should use the provided messageReference when specified', () => {
    const fixedMessageReference = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    const generatedEvents = generateSupplierApiLetterEvents({
      status: 'ACCEPTED',
      environment: 'test',
      numberOfEvents: 3,
      messageReference: fixedMessageReference,
    });

    for (const event of generatedEvents) {
      expect(event.subject).toBe(
        `letter-origin/letter-rendering/letter/${SENDER_ID}_${fixedMessageReference}`,
      );
      expect(event.data.origin.subject).toBe(
        `client/${SENDER_ID}/letter-request/${fixedMessageReference}`,
      );
    }
  });

  it('should generate unique ids per event when no id is provided', () => {
    const generatedEvents = generateSupplierApiLetterEvents({
      status: 'ACCEPTED',
      environment: 'test',
      numberOfEvents: 5,
    });

    const ids = generatedEvents.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });
});
