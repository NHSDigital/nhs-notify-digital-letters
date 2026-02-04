import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger, getS3Object } from 'utils';

export interface DocumentReference {
  resourceType: string;
  id: string;
  content?: {
    attachment?: {
      contentType?: string;
      data?: string;
    };
  }[];
}

export interface FileScannerDependencies {
  documentReferenceBucket: string;
  unscannedFilesBucket: string;
  unscannedFilesPathPrefix: string;
  s3Client: S3Client;
  logger: Logger;
}

export interface ScanFileMetadata {
  messageReference: string;
  senderId: string;
  createdAt: string;
}

export type ScanFileResult = {
  outcome: 'success' | 'failed';
  errorMessage?: string;
};

export class FileScanner {
  private readonly documentReferenceBucket: string;

  private readonly unscannedFilesBucket: string;

  private readonly unscannedFilesPathPrefix: string;

  private readonly s3Client: S3Client;

  private readonly logger: Logger;

  constructor({
    documentReferenceBucket,
    logger,
    s3Client,
    unscannedFilesBucket,
    unscannedFilesPathPrefix,
  }: FileScannerDependencies) {
    this.documentReferenceBucket = documentReferenceBucket;
    this.unscannedFilesBucket = unscannedFilesBucket;
    this.unscannedFilesPathPrefix = unscannedFilesPathPrefix;
    this.s3Client = s3Client;
    this.logger = logger;
  }

  async scanFile(
    messageUri: string,
    metadata: ScanFileMetadata,
  ): Promise<ScanFileResult> {
    try {
      this.logger.info({
        description: 'Starting file scan',
        messageUri,
        messageReference: metadata.messageReference,
        senderId: metadata.senderId,
      });

      const documentReferenceKey = FileScanner.extractS3Key(messageUri);

      const documentReferenceJson = await getS3Object({
        Bucket: this.documentReferenceBucket,
        Key: documentReferenceKey,
      });

      const documentReference: DocumentReference = JSON.parse(
        documentReferenceJson,
      );

      const pdfBase64 =
        FileScanner.extractPdfFromDocumentReference(documentReference);
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      const unscannedFileKey = this.buildUnscannedFileKey(
        metadata.messageReference,
      );

      await this.uploadToUnscannedBucket(unscannedFileKey, pdfBuffer, metadata);

      this.logger.info({
        description: 'Successfully processed file for scanning',
        messageReference: metadata.messageReference,
        senderId: metadata.senderId,
        unscannedFileKey,
      });

      return { outcome: 'success' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error({
        description: 'Error processing file for scanning',
        err:
          error instanceof Error
            ? { message: error.message, name: error.name, stack: error.stack }
            : error,
        messageReference: metadata.messageReference,
        senderId: metadata.senderId,
      });

      return { outcome: 'failed', errorMessage };
    }
  }

  private static extractS3Key(messageUri: string): string {
    const regex = /^s3:\/\/[^/]+\/(.+)$/;
    const match = regex.exec(messageUri);
    if (!match) {
      throw new Error(`Invalid S3 URI format: ${messageUri}`);
    }
    return match[1];
  }

  private static extractPdfFromDocumentReference(
    documentReference: DocumentReference,
  ): string {
    const { content } = documentReference;
    if (!content || content.length === 0) {
      throw new Error('DocumentReference has no content');
    }

    const { attachment } = content[0];
    if (!attachment || !attachment.data) {
      throw new Error('DocumentReference content has no attachment data');
    }

    return attachment.data;
  }

  private buildUnscannedFileKey(messageReference: string): string {
    return `${this.unscannedFilesPathPrefix}/${messageReference}.pdf`;
  }

  private async uploadToUnscannedBucket(
    key: string,
    pdfBuffer: Buffer,
    metadata: ScanFileMetadata,
  ): Promise<void> {
    const params = {
      Bucket: this.unscannedFilesBucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        messageReference: metadata.messageReference,
        senderId: metadata.senderId,
        createdAt: metadata.createdAt,
      },
    };

    await this.s3Client.send(new PutObjectCommand(params));

    this.logger.info({
      description: 'PDF uploaded to unscanned files bucket',
      bucket: this.unscannedFilesBucket,
      key,
    });
  }
}
