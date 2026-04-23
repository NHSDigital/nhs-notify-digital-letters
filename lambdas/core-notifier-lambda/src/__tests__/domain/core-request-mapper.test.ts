import { Sender, logger } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import { CoreRequestMapper } from 'domain/core-request-mapper';

jest.mock('utils');

const mockLogger = jest.mocked(logger);

describe('CoreRequestMapper', () => {
  const nhsAppBaseUrl = 'https://example.com';

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
    source: '/nhs/england/notify/development/dev-1/digitalletters/pdm',
    subject: 'resource/available',
    type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
    time: '2024-01-15T10:30:00Z',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-available-data.schema.json',
    data: {
      messageReference: 'test-sender-id_msg-ref-123',
      senderId: 'sender-456',
      resourceId: 'resource-789',
      nhsNumber: '9999999999',
      odsCode: 'ODS123',
    },
    traceparent: '00-trace-parent',
    recordedtime: '2024-01-15T10:30:00Z',
    severitynumber: 2,
    plane: 'data',
    dataschemaversion: '1.0.0',
  };

  let mapper: CoreRequestMapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mapper = new CoreRequestMapper(nhsAppBaseUrl);
  });

  describe('mapPdmEventToSingleMessageRequest', () => {
    it('correctly maps PDM event to SingleMessageRequest', () => {
      const result = mapper.mapPdmEventToSingleMessageRequest(
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
                'https://example.com/patient/digital-letters/letter?id=resource-789',
            },
          },
        },
      });
    });

    it('builds the digitalLetterURL from the configured nhsAppBaseUrl and the event resourceId', () => {
      const customBaseUrl = 'https://custom.nhsapp.example.com';
      const customMapper = new CoreRequestMapper(customBaseUrl);

      const result = customMapper.mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.attributes.personalisation.digitalLetterURL).toBe(
        'https://custom.nhsapp.example.com/patient/digital-letters/letter?id=resource-789',
      );
    });

    it('uses the sender routingConfigId as the routingPlanId', () => {
      const result = mapper.mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.attributes.routingPlanId).toBe('routing-config-123');
    });

    it('uses the sender senderId as the billingReference', () => {
      const result = mapper.mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.attributes.billingReference).toBe('test-sender-id');
    });

    it('maps the nhsNumber from the PDM event data', () => {
      const result = mapper.mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.attributes.recipient.nhsNumber).toBe('9999999999');
    });

    it('maps the odsCode from the PDM event data', () => {
      const result = mapper.mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.attributes.originator.odsCode).toBe('ODS123');
    });

    it('maps the messageReference from the PDM event data', () => {
      const result = mapper.mapPdmEventToSingleMessageRequest(
        mockPdmEvent,
        mockSender,
      );

      expect(result.data.attributes.messageReference).toBe('msg-ref-123');
    });

    it('logs an info message with the messageReference and senderId', () => {
      mapper.mapPdmEventToSingleMessageRequest(mockPdmEvent, mockSender);

      expect(mockLogger.info).toHaveBeenCalledWith({
        description: 'Mapping resource available',
        messageReference: 'msg-ref-123',
        senderId: 'test-sender-id',
      });
    });
  });
});
