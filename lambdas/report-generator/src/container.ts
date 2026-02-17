import {
  AthenaDataRepository,
  AthenaDataRepositoryDependencies,
  EventPublisher,
  ReportService,
  S3StorageRepository,
  eventBridgeClient,
  logger,
  region,
  s3Client,
  sqsClient,
} from 'utils';
import { loadConfig } from 'infra/config';
import { ReportGenerator } from 'app/report-generator';
import { AthenaClient } from '@aws-sdk/client-athena';

export const createContainer = () => {
  const {
    athenaDatabase,
    athenaWorkgroup,
    eventPublisherDlqUrl,
    eventPublisherEventBusArn,
    maxPollLimit,
    reportName,
    reportingBucket,
    waitForInSeconds,
  } = loadConfig();

  const athenaClient = new AthenaClient({
    region: region(),
  });

  const dataRepositoryDependencies: AthenaDataRepositoryDependencies = {
    athenaClient,
    athenaDatabase,
    athenaWorkgroup,
  };

  const dataRepository = new AthenaDataRepository(dataRepositoryDependencies);

  const storageRepository = new S3StorageRepository({
    s3Client,
    reportingBucketName: reportingBucket,
    logger,
  });

  const reportService = new ReportService(
    dataRepository,
    storageRepository,
    maxPollLimit,
    waitForInSeconds,
    logger,
  );

  const reportGenerator = new ReportGenerator(
    logger,
    reportService,
    reportName,
  );

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  return {
    reportGenerator,
    eventPublisher,
    logger,
  };
};

export default createContainer;
