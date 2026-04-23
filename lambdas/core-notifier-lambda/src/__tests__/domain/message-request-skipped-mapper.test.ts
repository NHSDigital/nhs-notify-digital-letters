import { Sender } from 'utils';
import { mapPdmEventToMessageRequestSkipped } from 'domain/message-request-skipped-mapper';
import { PDMResourceAvailable } from 'digital-letters-events';
import { randomUUID } from 'node:crypto';

jest.mock('utils');
jest.mock('node:crypto');
const mockRandomUUID = jest.mocked(randomUUID);

describe('mapper', () => {
  const mockSender: Sender = {
    senderId: 'test-sender-id',
    senderName: 'Test Sender',
    meshMailboxSenderId: 'mesh-sender',
    meshMailboxReportsId: 'mesh-reports',
    fallbackWaitTimeSeconds: 300,
    routingConfigId: 'routing-config-123',
  };

  const mockPdmEvent: PDMResourceAvailable = {
    specversion: '1.0',
    id: 'event-123',
    source: 'pdm-service',
    plane: 'data',
    dataschemaversion: '1.0.0',
    subject: 'resource/available',
    type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
    time: '2024-01-15T10:30:00Z',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-available-data.schema.json',
    data: {
      messageReference: 'msg-ref-123',
      senderId: 'sender-456',
      resourceId: 'resource-789',
      nhsNumber: '9999999999',
      odsCode: 'ODS123',
    },
    traceparent: '00-trace-parent',
    recordedtime: '2024-01-15T10:30:00Z',
    severitynumber: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('45e7d942-0d33-46d1-a678-ada01e5de9fe');
  });

  describe('mapPdmEventToMessageRequestSkipped', () => {
    it('correctly maps PDM event to MessageRequestSkipped', () => {
      const mockDate = new Date('2024-01-15T12:00:00Z');
      jest.spyOn(globalThis, 'Date').mockImplementation(() => mockDate as any);

      const result = mapPdmEventToMessageRequestSkipped(
        mockPdmEvent,
        mockSender,
      );

      expect(result).toEqual({
        ...mockPdmEvent,
        id: '45e7d942-0d33-46d1-a678-ada01e5de9fe',
        time: '2024-01-15T12:00:00.000Z',
        recordedtime: '2024-01-15T12:00:00.000Z',
        type: 'uk.nhs.notify.digital.letters.messages.request.skipped.v1',
        dataschema:
          'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-skipped-data.schema.json',
        data: {
          messageReference: 'msg-ref-123',
          senderId: 'test-sender-id',
        },
      });

      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it('generates new UUID for event', () => {
      mapPdmEventToMessageRequestSkipped(mockPdmEvent, mockSender);

      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });

    it('includes messageReference in data', () => {
      const result = mapPdmEventToMessageRequestSkipped(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.messageReference).toBe('msg-ref-123');
    });

    it('uses sender senderId in data', () => {
      const result = mapPdmEventToMessageRequestSkipped(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.senderId).toBe('test-sender-id');
    });

    it('sets correct event type', () => {
      const result = mapPdmEventToMessageRequestSkipped(
        mockPdmEvent,
        mockSender,
      );

      expect(result.type).toBe(
        'uk.nhs.notify.digital.letters.messages.request.skipped.v1',
      );
    });

    it('sets correct dataschema', () => {
      const result = mapPdmEventToMessageRequestSkipped(
        mockPdmEvent,
        mockSender,
      );

      expect(result.dataschema).toBe(
        'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-skipped-data.schema.json',
      );
    });

    it('preserves CloudEvents properties from PDM event', () => {
      const result = mapPdmEventToMessageRequestSkipped(
        mockPdmEvent,
        mockSender,
      );

      expect(result.specversion).toBe('1.0');
      expect(result.source).toBe('pdm-service');
      expect(result.subject).toBe('resource/available');
      expect(result.traceparent).toBe('00-trace-parent');
    });
  });
});
