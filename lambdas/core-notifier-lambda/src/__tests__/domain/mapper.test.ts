import { Sender, logger } from 'utils';
import {
  mapPdmEventToMessageRequestRejected,
  mapPdmEventToMessageRequestSkipped,
  mapPdmEventToMessageRequestSubmitted,
  mapPdmEventToSingleMessageRequest,
} from 'domain/mapper';
import { PDMResourceAvailable } from 'digital-letters-events';
import { randomUUID } from 'node:crypto';

jest.mock('utils');
jest.mock('node:crypto');

const mockLogger = jest.mocked(logger);
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

  describe('mapPdmEventToSingleMessageRequest', () => {
    it('correctly maps PDM event to single message request', () => {
      const result = mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result).toEqual({
        data: {
          type: 'Message',
          attributes: {
            routingPlanId: 'routing-config-123',
            messageReference: 'msg-ref-123',
            billingReference: 'test-sender-id',
            recipient: {
              nhsNumber: '9999999999',
            },
            originator: {
              odsCode: 'ODS123',
            },
            personalisation: {
              digitalLetterURL:
                'https://www.nhsapp.service.nhs.uk/digital-letters?letterid=resource-789',
            },
          },
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        description: 'Mapping resource available',
        messageReference: 'msg-ref-123',
        senderId: 'test-sender-id',
      });
    });
  });

  describe('mapPdmEventToMessageRequestSubmitted', () => {
    it('correctly maps PDM event to MessageRequestSubmitted', () => {
      const notifyId = 'notify-123';
      const mockDate = new Date('2024-01-15T12:00:00Z');
      jest.spyOn(globalThis, 'Date').mockImplementation(() => mockDate as any);

      const result = mapPdmEventToMessageRequestSubmitted(
        mockPdmEvent,
        mockSender,
        notifyId,
      );

      expect(result).toEqual({
        ...mockPdmEvent,
        id: '45e7d942-0d33-46d1-a678-ada01e5de9fe',
        time: '2024-01-15T12:00:00.000Z',
        recordedtime: '2024-01-15T12:00:00.000Z',
        type: 'uk.nhs.notify.digital.letters.messages.request.submitted.v1',
        dataschema:
          'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-submitted-data.schema.json',
        data: {
          messageReference: 'msg-ref-123',
          senderId: 'test-sender-id',
          notifyId: 'notify-123',
          messageUri:
            'https://www.nhsapp.service.nhs.uk/digital-letters?letterid=resource-789',
        },
      });

      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });
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

  describe('mapPdmEventToMessageRequestRejected', () => {
    it('correctly maps PDM event to MessageRequestRejected', () => {
      const failureCode = 'INVALID_NHS_NUMBER';
      const mockDate = new Date('2024-01-15T12:00:00Z');
      jest.spyOn(globalThis, 'Date').mockImplementation(() => mockDate as any);

      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result).toEqual({
        ...mockPdmEvent,
        id: '45e7d942-0d33-46d1-a678-ada01e5de9fe',
        time: '2024-01-15T12:00:00.000Z',
        recordedtime: '2024-01-15T12:00:00.000Z',
        type: 'uk.nhs.notify.digital.letters.messages.request.rejected.v1',
        dataschema:
          'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-rejected-data.schema.json',
        data: {
          messageReference: 'msg-ref-123',
          senderId: 'test-sender-id',
          failureCode: 'INVALID_NHS_NUMBER',
          messageUri:
            'https://www.nhsapp.service.nhs.uk/digital-letters?letterid=resource-789',
        },
      });

      expect(mockRandomUUID).toHaveBeenCalled();
    });

    it('generates new UUID for event', () => {
      const failureCode = 'VALIDATION_ERROR';
      mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });

    it('includes failureCode in data', () => {
      const failureCode = 'ROUTING_FAILED';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.data.failureCode).toBe('ROUTING_FAILED');
    });

    it('includes messageUri with resource ID', () => {
      const failureCode = 'TIMEOUT';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.data.messageUri).toBe(
        'https://www.nhsapp.service.nhs.uk/digital-letters?letterid=resource-789',
      );
    });

    it('uses sender senderId in data', () => {
      const failureCode = 'UNKNOWN_ERROR';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.data.senderId).toBe('test-sender-id');
    });

    it('uses messageReference from PDM event', () => {
      const failureCode = 'DUPLICATE_REQUEST';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.data.messageReference).toBe('msg-ref-123');
    });

    it('sets correct event type', () => {
      const failureCode = 'SYSTEM_ERROR';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.type).toBe(
        'uk.nhs.notify.digital.letters.messages.request.rejected.v1',
      );
    });

    it('sets correct dataschema', () => {
      const failureCode = 'CONFIG_ERROR';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.dataschema).toBe(
        'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-message-request-rejected-data.schema.json',
      );
    });

    it('preserves CloudEvents properties from PDM event', () => {
      const failureCode = 'NETWORK_ERROR';
      const result = mapPdmEventToMessageRequestRejected(
        mockPdmEvent,
        mockSender,
        failureCode,
      );

      expect(result.specversion).toBe('1.0');
      expect(result.source).toBe('pdm-service');
      expect(result.subject).toBe('resource/available');
      expect(result.traceparent).toBe('00-trace-parent');
    });
  });
});
