import { createFileQuarantinedEvent, createFileSafeEvent } from 'domain/mapper';

// Mock randomUUID to make tests deterministic
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'mocked-uuid-12345'),
}));

const createdAt = '2024-01-15T10:30:00.000Z';

describe('mapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date to make tests deterministic
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createFileSafeEvent', () => {
    it('creates a FileSafe event with correct structure', () => {
      const messageReference = 'msg-ref-123';
      const senderId = 'sender-456';
      const letterUri = 's3://safe-bucket/path/to/file.pdf';

      const result = createFileSafeEvent(
        messageReference,
        senderId,
        letterUri,
        createdAt,
      );

      expect(result).toEqual({
        specversion: '1.0',
        id: 'mocked-uuid-12345',
        subject: `customer/${senderId}/recipient/${messageReference}`,
        source:
          '/nhs/england/notify/production/primary/data-plane/digitalletters/print',
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        type: 'uk.nhs.notify.digital.letters.print.file.safe.v1',
        time: '2024-01-15T10:30:00.000Z',
        data: {
          messageReference,
          senderId,
          letterUri,
          createdAt,
        },
        recordedtime: '2024-01-15T10:30:00.000Z',
        severitynumber: 2,
      });
    });

    it('handles different input values correctly', () => {
      const result = createFileSafeEvent(
        'different-msg-ref',
        'different-sender',
        'https://another-bucket/another/path.pdf',
        createdAt,
      );

      expect(result.data.messageReference).toBe('different-msg-ref');
      expect(result.data.senderId).toBe('different-sender');
      expect(result.data.letterUri).toBe(
        'https://another-bucket/another/path.pdf',
      );
      expect(result.data.createdAt).toBe(createdAt);
      expect(result.type).toBe(
        'uk.nhs.notify.digital.letters.print.file.safe.v1',
      );
    });
  });

  describe('createFileQuarantinedEvent', () => {
    it('creates a FileQuarantined event with correct structure', () => {
      const messageReference = 'msg-ref-789';
      const senderId = 'sender-012';
      const letterUri = 's3://quarantine-bucket/path/to/infected.pdf';

      const result = createFileQuarantinedEvent(
        messageReference,
        senderId,
        letterUri,
        createdAt,
      );

      expect(result).toEqual({
        specversion: '1.0',
        id: 'mocked-uuid-12345',
        subject: `customer/${senderId}/recipient/${messageReference}`,
        source:
          '/nhs/england/notify/production/primary/data-plane/digitalletters/print',
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        type: 'uk.nhs.notify.digital.letters.print.file.quarantined.v1',
        time: '2024-01-15T10:30:00.000Z',
        data: {
          messageReference,
          senderId,
          letterUri,
          createdAt,
        },
        recordedtime: '2024-01-15T10:30:00.000Z',
        severitynumber: 2,
      });
    });
  });
});
