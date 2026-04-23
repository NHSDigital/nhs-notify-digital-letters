import { MessageRequestSubmittedMapper } from 'domain/message-request-submitted-mapper';
import { randomUUID } from 'node:crypto';
import { validPdmEvent, validSender } from '__tests__/constants';

jest.mock('node:crypto');
const mockRandomUUID = jest.mocked(randomUUID);

const NHS_APP_BASE_URL = 'https://example.com';
const MOCK_UUID = '45e7d942-0d33-46d1-a678-ada01e5de9fe';
const MOCK_DATE = new Date('2024-01-15T12:00:00Z');
const MOCK_NOTIFY_ID = 'notify-id-abc123';

describe('MessageRequestSubmittedMapper', () => {
  let mapper: MessageRequestSubmittedMapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue(MOCK_UUID);
    jest.spyOn(globalThis, 'Date').mockImplementation(() => MOCK_DATE as any);
    mapper = new MessageRequestSubmittedMapper(NHS_APP_BASE_URL);
  });

  describe('mapPdmEventToMessageRequestSubmitted', () => {
    it('correctly maps a PDM event to a MessageRequestSubmitted event', () => {
      const result = mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(result).toEqual({
        ...validPdmEvent,
        id: MOCK_UUID,
        time: MOCK_DATE.toISOString(),
        recordedtime: MOCK_DATE.toISOString(),
        type: 'uk.nhs.notify.digital.letters.messages.request.submitted.v1',
        dataschema:
          'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-submitted-data.schema.json',
        source:
          '/nhs/england/notify/development/dev-12345/digitalletters/messages',
        data: {
          messageReference: validPdmEvent.data.messageReference,
          senderId: validSender.senderId,
          notifyId: MOCK_NOTIFY_ID,
          messageUri: `${NHS_APP_BASE_URL}/patient/digital-letters/letter?id=${validPdmEvent.data.resourceId}`,
        },
      });
    });

    it('replaces /pdm suffix in source with /messages', () => {
      const result = mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(result.source).toBe(
        '/nhs/england/notify/development/dev-12345/digitalletters/messages',
      );
    });

    it('builds the messageUri using the nhsAppBaseUrl and resourceId', () => {
      const result = mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(result.data.messageUri).toBe(
        `${NHS_APP_BASE_URL}/patient/digital-letters/letter?id=${validPdmEvent.data.resourceId}`,
      );
    });

    it('generates a new UUID for the event id', () => {
      mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
      expect(mockRandomUUID).toHaveBeenCalledWith();
    });

    it('sets the notifyId from the parameter', () => {
      const customNotifyId = 'custom-notify-id-xyz';

      const result = mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        customNotifyId,
      );

      expect(result.data.notifyId).toBe(customNotifyId);
    });

    it('sets the senderId from the sender object', () => {
      const result = mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(result.data.senderId).toBe(validSender.senderId);
    });

    it('uses the nhsAppBaseUrl passed to the constructor', () => {
      const customBaseUrl = 'https://custom.nhsapp.example.com';
      const customMapper = new MessageRequestSubmittedMapper(customBaseUrl);

      const result = customMapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(result.data.messageUri).toContain(customBaseUrl);
    });

    it('preserves envelope fields from the original PDM event', () => {
      const result = mapper.mapPdmEventToMessageRequestSubmitted(
        validPdmEvent,
        validSender,
        MOCK_NOTIFY_ID,
      );

      expect(result.specversion).toBe(validPdmEvent.specversion);
      expect(result.subject).toBe(validPdmEvent.subject);
      expect(result.traceparent).toBe(validPdmEvent.traceparent);
      expect(result.plane).toBe(validPdmEvent.plane);
      expect(result.datacontenttype).toBe(validPdmEvent.datacontenttype);
      expect(result.severitynumber).toBe(validPdmEvent.severitynumber);
    });
  });
});
