import { FileScanner } from 'app/file-scanner';
import { S3Client } from '@aws-sdk/client-s3';
import { Logger } from 'utils';
import { mockDeep } from 'jest-mock-extended';
import * as utilsModule from 'utils';

const mockS3Client = mockDeep<S3Client>();
const mockLogger = mockDeep<Logger>();

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  getS3Object: jest.fn(),
}));

const mockGetS3Object = utilsModule.getS3Object as jest.MockedFunction<
  typeof utilsModule.getS3Object
>;

describe('FileScanner', () => {
  let fileScanner: FileScanner;

  beforeEach(() => {
    jest.clearAllMocks();
    fileScanner = new FileScanner({
      documentReferenceBucket: 'test-doc-ref-bucket',
      unscannedFilesBucket: 'test-unscanned-bucket',
      unscannedFilesPathPrefix: 'dev',
      s3Client: mockS3Client,
      logger: mockLogger,
    });
  });

  describe('scanFile', () => {
    const validMessageUri =
      's3://test-doc-ref-bucket/document-reference/test-ref-001';
    const validMetadata = {
      messageReference: 'test-ref-001',
      senderId: 'SENDER_001',
      createdAt: '2026-01-19T12:00:00Z',
    };

    const validDocumentReference = {
      resourceType: 'DocumentReference',
      id: 'test-id',
      content: [
        {
          attachment: {
            contentType: 'application/pdf',
            data: Buffer.from('test pdf content').toString('base64'),
          },
        },
      ],
    };

    it('should successfully extract PDF and upload to unscanned bucket', async () => {
      mockGetS3Object.mockResolvedValue(JSON.stringify(validDocumentReference));
      (mockS3Client.send as any).mockResolvedValue({});

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('success');
      expect(result.errorMessage).toBeUndefined();

      // Verify DocumentReference was retrieved
      expect(mockGetS3Object).toHaveBeenCalledWith({
        Bucket: 'test-doc-ref-bucket',
        Key: 'document-reference/test-ref-001',
      });

      // Verify PDF was uploaded
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-unscanned-bucket',
            Key: 'dev/test-ref-001.pdf',
            ContentType: 'application/pdf',
            Metadata: {
              messageReference: 'test-ref-001',
              senderId: 'SENDER_001',
              createdAt: '2026-01-19T12:00:00Z',
            },
          }),
        }),
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Starting file scan',
          messageUri: validMessageUri,
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Successfully processed file for scanning',
          messageReference: 'test-ref-001',
        }),
      );
    });

    it('should handle invalid S3 URI format', async () => {
      const invalidUri = 'not-an-s3-uri';

      const result = await fileScanner.scanFile(invalidUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain('Invalid S3 URI format');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Error processing file for scanning',
          messageReference: 'test-ref-001',
        }),
      );
    });

    it('should handle S3 URI without key', async () => {
      const invalidUri = 's3://bucket-only/';

      const result = await fileScanner.scanFile(invalidUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain('Invalid S3 URI format');
    });

    it('should handle missing DocumentReference content', async () => {
      const invalidDocRef = {
        resourceType: 'DocumentReference',
        id: 'test-id',
        content: [],
      };

      mockGetS3Object.mockResolvedValue(JSON.stringify(invalidDocRef));

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain('DocumentReference has no content');
    });

    it('should handle undefined content array', async () => {
      const invalidDocRef = {
        resourceType: 'DocumentReference',
        id: 'test-id',
      };

      mockGetS3Object.mockResolvedValue(JSON.stringify(invalidDocRef));

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain('DocumentReference has no content');
    });

    it('should handle missing attachment in DocumentReference', async () => {
      const invalidDocRef = {
        resourceType: 'DocumentReference',
        id: 'test-id',
        content: [{}],
      };

      mockGetS3Object.mockResolvedValue(JSON.stringify(invalidDocRef));

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain(
        'DocumentReference content has no attachment data',
      );
    });

    it('should handle missing attachment data', async () => {
      const invalidDocRef = {
        resourceType: 'DocumentReference',
        id: 'test-id',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
            },
          },
        ],
      };

      mockGetS3Object.mockResolvedValue(JSON.stringify(invalidDocRef));

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain(
        'DocumentReference content has no attachment data',
      );
    });

    it('should handle S3 getObject error', async () => {
      mockGetS3Object.mockRejectedValue(new Error('S3 access denied'));

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain('S3 access denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Error processing file for scanning',
          err: expect.objectContaining({
            message: 'S3 access denied',
          }),
        }),
      );
    });

    it('should handle S3 putObject error', async () => {
      mockGetS3Object.mockResolvedValue(JSON.stringify(validDocumentReference));
      (mockS3Client.send as any).mockRejectedValue(
        new Error('S3 upload failed'),
      );

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toContain('S3 upload failed');
    });

    it('should handle invalid JSON in DocumentReference', async () => {
      mockGetS3Object.mockResolvedValue('invalid json {');

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toBeDefined();
    });

    it('should handle non-Error exceptions', async () => {
      mockGetS3Object.mockRejectedValue('string error');

      const result = await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(result.outcome).toBe('failed');
      expect(result.errorMessage).toBe('string error');
    });

    it('should correctly build unscanned file key with environment prefix', async () => {
      mockGetS3Object.mockResolvedValue(JSON.stringify(validDocumentReference));
      (mockS3Client.send as any).mockResolvedValue({});

      await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: 'dev/test-ref-001.pdf',
          }),
        }),
      );
    });

    it('should decode base64 PDF correctly', async () => {
      const pdfContent = 'This is a test PDF content';
      const docRef = {
        resourceType: 'DocumentReference',
        id: 'test-id',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              data: Buffer.from(pdfContent).toString('base64'),
            },
          },
        ],
      };

      mockGetS3Object.mockResolvedValue(JSON.stringify(docRef));
      (mockS3Client.send as any).mockResolvedValue({});

      await fileScanner.scanFile(validMessageUri, validMetadata);

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Body: Buffer.from(pdfContent),
          }),
        }),
      );
    });
  });
});
