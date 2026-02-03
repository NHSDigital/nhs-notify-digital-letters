import { EventPublisher, Logger, Sender } from 'utils';
import { ISenderManagement } from 'sender-management';
import { GenerateReport } from 'digital-letters-events';
import { createHandler } from 'apis/scheduled-event-handler';
import GenerateReportValidator from 'digital-letters-events/GenerateReport.js';

describe('scheduled-event-handler', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockSenderManagement: jest.Mocked<ISenderManagement>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockSenderManagement = {
      listSenders: jest.fn(),
    } as unknown as jest.Mocked<ISenderManagement>;

    mockEventPublisher = {
      sendEvents: jest.fn(),
    } as unknown as jest.Mocked<EventPublisher>;

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createHandler', () => {
    it('should calculate yesterday date range correctly', async () => {
      const mockDate = new Date('2024-01-15T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      mockSenderManagement.listSenders.mockResolvedValue([]);
      mockEventPublisher.sendEvents.mockResolvedValue([]);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await handler();

      expect(mockLogger.debug).toHaveBeenCalledWith({
        description: 'Calculated yesterday date range',
        yesterdayStart: '2024-01-14T00:00:00.000Z',
        yesterdayEnd: '2024-01-14T23:59:59.999Z',
      });
    });

    it('should retrieve senders from sender management', async () => {
      mockSenderManagement.listSenders.mockResolvedValue([]);
      mockEventPublisher.sendEvents.mockResolvedValue([]);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await handler();

      expect(mockSenderManagement.listSenders).toHaveBeenCalledTimes(1);
    });

    it('should publish generate report events for each sender', async () => {
      const mockDate = new Date('2024-01-15T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      const mockSenders = [
        { senderId: 'sender-1' },
        { senderId: 'sender-2' },
        { senderId: 'sender-3' },
      ] as unknown as Sender[];

      mockSenderManagement.listSenders.mockResolvedValue(mockSenders);
      mockEventPublisher.sendEvents.mockResolvedValue([]);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await handler();

      expect(mockEventPublisher.sendEvents).toHaveBeenCalledTimes(1);
      const [[events, validator]] = mockEventPublisher.sendEvents.mock.calls;

      expect(events).toHaveLength(3);
      expect(validator).toBeDefined();
    });

    it('should create events with correct structure for each sender', async () => {
      const mockDate = new Date('2024-01-15T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      const mockSenders = [
        { senderId: 'test-sender-123' },
      ] as unknown as Sender[];

      mockSenderManagement.listSenders.mockResolvedValue(mockSenders);
      mockEventPublisher.sendEvents.mockResolvedValue([]);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await handler();

      const [[events]] = mockEventPublisher.sendEvents.mock.calls;
      const event = events[0] as GenerateReport;

      expect(event.data.senderId).toBe('test-sender-123');
      expect(event.data.reportPeriodStartTime).toBe('2024-01-14T00:00:00.000Z');
      expect(event.data.reportPeriodEndTime).toBe('2024-01-14T23:59:59.999Z');
      expect(event.specversion).toBe('1.0');
      expect(event.id).toBeDefined();
      expect(event.source).toBe(
        '/nhs/england/notify/production/primary/data-plane/digitalletters/reporting',
      );
      expect(event.subject).toBe('customer/test-sender-123');
      expect(event.type).toBe(
        'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
      );
      expect(event.time).toBe('2024-01-15T12:00:00.000Z');
      expect(event.severitynumber).toBe(2);

      const isEventValid = GenerateReportValidator(event);
      expect(GenerateReportValidator.errors).toBeNull();
      expect(isEventValid).toBe(true);
    });

    it('should handle empty sender list', async () => {
      mockSenderManagement.listSenders.mockResolvedValue([]);
      mockEventPublisher.sendEvents.mockResolvedValue([]);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await handler();

      const [[events]] = mockEventPublisher.sendEvents.mock.calls;
      expect(events).toHaveLength(0);
    });

    it('should handle sender management errors', async () => {
      const error = new Error('Failed to list senders');
      mockSenderManagement.listSenders.mockRejectedValue(error);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await expect(handler()).rejects.toThrow('Failed to list senders');
      expect(mockEventPublisher.sendEvents).not.toHaveBeenCalled();
    });

    it('should handle event publisher errors', async () => {
      const mockSenders = [{ senderId: 'sender-1' }] as unknown as Sender[];
      const error = new Error('Failed to publish events');

      mockSenderManagement.listSenders.mockResolvedValue(mockSenders);
      mockEventPublisher.sendEvents.mockRejectedValue(error);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await expect(handler()).rejects.toThrow('Failed to publish events');
    });

    it('should generate unique event IDs for multiple senders', async () => {
      const mockSenders = [
        { senderId: 'sender-1' },
        { senderId: 'sender-2' },
      ] as unknown as Sender[];

      mockSenderManagement.listSenders.mockResolvedValue(mockSenders);
      mockEventPublisher.sendEvents.mockResolvedValue([]);

      const handler = createHandler({
        logger: mockLogger,
        senderManagement: mockSenderManagement,
        eventPublisher: mockEventPublisher,
      });

      await handler();

      const [[events]] = mockEventPublisher.sendEvents.mock.calls;
      const eventIds = events.map((e) => e.id);

      expect(new Set(eventIds).size).toBe(eventIds.length);
    });
  });
});
