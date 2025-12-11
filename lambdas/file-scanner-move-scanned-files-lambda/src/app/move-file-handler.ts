import { Logger } from 'utils/logger';
import { S3Location, copyAndDeleteObjectS3, getObjectMetadata } from 'utils';
import { MoveScannedFilesConfig } from 'infra/config';
import {
  GuardDutyScanResultNotificationEvent,
  GuardDutyScanResultNotificationEventDetail,
} from 'aws-lambda';
import { FileQuarantined, FileSafe } from 'digital-letters-events';
import { createFileQuarantinedEvent, createFileSafeEvent } from 'domain/mapper';

export type MoveFileHandlerDependencies = {
  logger: Logger;
  scannedFilesConfig: MoveScannedFilesConfig;
};

export type EventToPublish = {
  fileSafe?: FileSafe;
  fileQuarantined?: FileQuarantined;
};

type ObjectMetadata = {
  senderId: string;
  messageReference: string;
  createdAt: string;
};

type ObjectsFromEvent = {
  eventToPublish: EventToPublish;
  source: S3Location;
  destination: S3Location;
};

const OBJECT_KEY_DISPLAY_LAST_CHARACTERS = 10;
const SCAN_STATUS_COMPLETED = 'COMPLETED';
const SCAN_RESULT_STATUS_NO_THREATS_FOUND = 'NO_THREATS_FOUND';

/**
 * Utility function to extract a subset of the object key for logging purposes.
 * @param key
 * @returns
 */
function getLastCharactersOfKey(key: string): string {
  return key.slice(-OBJECT_KEY_DISPLAY_LAST_CHARACTERS);
}

/**
 * Utility function to get the required metadata fields of an object stored in S3.
 * @param objectDetails
 * @returns the metadata or null if one of the required fields is missing.
 */
export async function extractMetadata(objectDetails: {
  bucketName: string;
  objectKey: string;
}): Promise<ObjectMetadata | null> {
  const source: S3Location = {
    Bucket: objectDetails.bucketName,
    Key: objectDetails.objectKey,
  };

  const metadata: Record<string, string> = await getObjectMetadata(source);

  const { createdAt, messageReference, senderId } = metadata;

  if (!messageReference || !senderId || !createdAt) {
    return null;
  }

  return {
    senderId,
    messageReference,
    createdAt,
  };
}

export class MoveFileHandler {
  private readonly logger: Logger;

  private readonly keyPrefixUnscannedFiles: string;

  private readonly unscannedBucketName: string;

  private readonly safeBucketName: string;

  private readonly quarantineBucketName: string;

  constructor(logger: Logger, scannedFilesConfig: MoveScannedFilesConfig) {
    this.logger = logger;
    this.keyPrefixUnscannedFiles = scannedFilesConfig.keyPrefixUnscannedFiles;
    this.unscannedBucketName = scannedFilesConfig.unscannedFileS3BucketName;
    this.safeBucketName = scannedFilesConfig.safeFileS3BucketName;
    this.quarantineBucketName = scannedFilesConfig.quarantineFileS3BucketName;
  }

  /**
   * As the guard duty scan result events are account wide, we need to ensure that the event is for
   * digital letters files before processing it.
   * @param eventDetail
   * @returns
   */
  isEventForDigitalLetters(
    eventDetail: GuardDutyScanResultNotificationEventDetail,
  ): boolean {
    const objectDetails = eventDetail.s3ObjectDetails;
    if (
      objectDetails.bucketName !== this.unscannedBucketName ||
      !objectDetails.objectKey.startsWith(this.keyPrefixUnscannedFiles)
    ) {
      this.logger.warn({
        description:
          'Received scan result for file not in unscanned bucket, ignoring event.',
        expectedUnscannedBucketName: this.unscannedBucketName,
        expectedKeyPrefix: this.keyPrefixUnscannedFiles,
        receivedBucketName: objectDetails.bucketName,
        receivedObjectKey: objectDetails.objectKey,
      });
      return false;
    }
    return true;
  }

  createObjectsFromData(
    scanStatus: string,
    objectKey: string,
    scanDetail: GuardDutyScanResultNotificationEventDetail,
    metadata: ObjectMetadata,
  ): ObjectsFromEvent {
    const eventToPublish: EventToPublish = {};
    let destinationBucket;

    if (
      scanStatus === SCAN_STATUS_COMPLETED &&
      scanDetail.scanResultDetails.scanResultStatus ===
        SCAN_RESULT_STATUS_NO_THREATS_FOUND
    ) {
      destinationBucket = this.safeBucketName;
      eventToPublish.fileSafe = createFileSafeEvent(
        metadata.messageReference,
        metadata.senderId,
        `s3://${destinationBucket}/${objectKey}`,
        metadata.createdAt,
      );
    } else {
      destinationBucket = this.quarantineBucketName;
      this.logger.warn({
        description: 'File scan did not complete successfully',
        scanStatus,
        scanResultDetails: scanDetail.scanResultDetails,
        key: getLastCharactersOfKey(objectKey),
      });
      eventToPublish.fileQuarantined = createFileQuarantinedEvent(
        metadata.messageReference,
        metadata.senderId,
        `s3://${destinationBucket}/${objectKey}`,
        metadata.createdAt,
      );
    }

    const source: S3Location = {
      Bucket: this.unscannedBucketName,
      Key: objectKey,
    };

    const destination: S3Location = {
      Bucket: destinationBucket,
      Key: objectKey,
    };

    return {
      source,
      destination,
      eventToPublish,
    };
  }

  public async handle(
    scanResult: GuardDutyScanResultNotificationEvent,
  ): Promise<EventToPublish | null> {
    const scanDetail = scanResult.detail;
    const { scanStatus } = scanDetail;
    const objectDetails = scanDetail.s3ObjectDetails;

    this.logger.info({
      description: 'Processing scan result',
      scanStatus,
      subkey: getLastCharactersOfKey(objectDetails.objectKey),
    });

    if (!(await this.isEventForDigitalLetters(scanResult.detail))) {
      this.logger.warn({
        description: 'Scan result event is not valid, skipping processing.',
        sourceBucket: objectDetails.bucketName,
        key: objectDetails.objectKey, // Full key to make it easier when investigating issues as all events should pass this validation.
      });
      return null;
    }
    const metadata = await extractMetadata(objectDetails);
    if (!metadata) {
      this.logger.error({
        description:
          'Failed to extract required metadata from scanned file, skipping processing.',
        subkey: getLastCharactersOfKey(objectDetails.objectKey),
      });
      return null;
    }

    const { destination, eventToPublish, source } = this.createObjectsFromData(
      scanStatus,
      objectDetails.objectKey,
      scanDetail,
      metadata,
    );

    this.logger.info({
      description: 'Going to move file to destination bucket',
      scanStatus,
      destinationLocation: destination.Bucket,
      subkey: getLastCharactersOfKey(objectDetails.objectKey),
    });

    await copyAndDeleteObjectS3(source, destination);
    return eventToPublish;
  }
}
