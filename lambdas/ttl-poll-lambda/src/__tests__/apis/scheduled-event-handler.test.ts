import { ScheduledEvent } from 'aws-lambda';
import { Logger } from 'utils';
import { mock } from 'jest-mock-extended';
import { EventDetail, createHandler } from 'apis/scheduled-event-handler';
import {
  ProcessingStatistics,
  TtlExpiryService,
} from 'infra/ttl-expiry-service';

const malformedEvents = [
  {
    detail: {
      dateOfExpiry: 2_323_231,
    },
  } as unknown as ScheduledEvent<EventDetail>,
  {
    detail: {
      dateOfExpiry: 'hello',
    },
  },
  {
    detail: {
      dateOfExpiry: '02-02-2023',
    },
  },
  {
    detail: {
      dateOfExpiry: '2023/02/02',
    },
  },
] as ScheduledEvent<EventDetail>[];

jest.useFakeTimers();

const logger = mock<Logger>();

jest.mock('../../infra/config', () => ({
  loadConfig: jest.fn().mockReturnValue({ concurrency: 60 }),
}));

describe('createHandler', () => {
  const mockTtlExpiryService = mock<TtlExpiryService>();

  const handler = createHandler({
    logger,
    ttlExpiryService: mockTtlExpiryService,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2020-01-01T12:00:00'));
  });

  it.each(malformedEvents)(
    'throws error when receiving event %j where dateOfExpiry attribute is not in recognised date format - YYYY-MM-DD',
    async (event) => {
      await expect(handler(event)).rejects.toThrow(
        `dateOfExpiry is not valid ISO date format (YYYY-MM-DD): ${event.detail.dateOfExpiry}`,
      );
    },
  );

  it('throws error when receiving event where timeOfExpiry attribute is defined and cannot be parsed as a date object', async () => {
    await expect(
      handler(<ScheduledEvent<EventDetail>>{
        detail: { dateOfExpiry: '2022-03-07', timeOfExpiry: 'not_a_date' },
      }),
    ).rejects.toThrow(
      `timeOfExpiry is not valid date format (YYYY-MM-DD'T'HH:MM:SSZ): not_a_date`,
    );
  });

  it('should use dateOfExpiry if provided in event payload', async () => {
    mockTtlExpiryService.processExpiredTtlRecords.mockImplementationOnce(
      async () =>
        ({
          processed: 0,
          deleted: 0,
          failedToDelete: 0,
        }) satisfies ProcessingStatistics,
    );

    await handler(<ScheduledEvent<EventDetail>>{
      detail: { dateOfExpiry: '2022-03-07' },
    });

    expect(mockTtlExpiryService.processExpiredTtlRecords).toHaveBeenCalledWith(
      '2022-03-07',
      1_577_880_000,
      1_577_880_000_000,
    );
  });

  it('should use system date if dateOfExpiry is not provided in event payload', async () => {
    mockTtlExpiryService.processExpiredTtlRecords.mockImplementationOnce(
      async () =>
        ({
          processed: 0,
          deleted: 0,
          failedToDelete: 0,
        }) satisfies ProcessingStatistics,
    );

    await handler(<ScheduledEvent<EventDetail>>{});

    expect(mockTtlExpiryService.processExpiredTtlRecords).toHaveBeenCalledWith(
      '2020-01-01',
      1_577_880_000,
      1_577_880_000_000,
    );
  });

  it('should query previous day if within 1 hour of date change', async () => {
    jest.setSystemTime(new Date('2020-01-01T00:30:00'));

    mockTtlExpiryService.processExpiredTtlRecords.mockImplementationOnce(
      async () =>
        ({
          processed: 0,
          deleted: 0,
          failedToDelete: 0,
        }) satisfies ProcessingStatistics,
    );

    await handler(<ScheduledEvent<EventDetail>>{});

    expect(mockTtlExpiryService.processExpiredTtlRecords).toHaveBeenCalledWith(
      '2019-12-31',
      1_577_838_600,
      1_577_838_600_000,
    );
  });

  it('should use timeOfExpiry from event payload if provided', async () => {
    mockTtlExpiryService.processExpiredTtlRecords.mockImplementationOnce(
      async () =>
        ({
          processed: 0,
          deleted: 0,
          failedToDelete: 0,
        }) satisfies ProcessingStatistics,
    );

    await handler(<ScheduledEvent<EventDetail>>{
      detail: {
        dateOfExpiry: '2022-03-07',
        timeOfExpiry: '2022-03-06T12:34:56Z',
      },
    });

    expect(mockTtlExpiryService.processExpiredTtlRecords).toHaveBeenCalledWith(
      '2022-03-07',
      1_646_570_096,
      1_577_880_000_000,
    );
  });

  it('should throw error if ttl poll process throws error', async () => {
    const error = new Error('Fatal error');

    mockTtlExpiryService.processExpiredTtlRecords.mockImplementation(
      async () => {
        throw error;
      },
    );

    expect.assertions(2);
    await expect(handler(<ScheduledEvent<EventDetail>>{})).rejects.toThrow(
      error,
    );
    expect(mockTtlExpiryService.processExpiredTtlRecords).toHaveBeenCalledTimes(
      1,
    );
  });
});
