import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getObjectMetadata } from '../../s3-utils/get-object-metadata';

const s3Client = mockClient(S3Client);

describe('getObjectMetadata', () => {
  beforeEach(() => {
    s3Client.reset();
  });

  it('gets the object metadata from S3', async () => {
    s3Client.on(HeadObjectCommand).resolves({
      Metadata: {
        key1: 'value1',
        key2: 'value2',
      },
    });

    const result = await getObjectMetadata({
      Bucket: 'sourceBucket',
      Key: 'sourceKey',
    });

    expect(s3Client).toHaveReceivedCommandWith(HeadObjectCommand, {
      Bucket: 'sourceBucket',
      Key: 'sourceKey',
    });

    expect(result).toEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });

  it('returns empty object when metadata is undefined', async () => {
    s3Client.on(HeadObjectCommand).resolves({
      Metadata: undefined,
    });

    const result = await getObjectMetadata({
      Bucket: 'sourceBucket',
      Key: 'sourceKey',
    });

    expect(result).toEqual({});
  });

  it('throws error when HeadObjectCommand fails', async () => {
    s3Client.on(HeadObjectCommand).rejects(new Error('S3 error'));

    await expect(
      getObjectMetadata({
        Bucket: 'sourceBucket',
        Key: 'sourceKey',
      }),
    ).rejects.toThrow(
      'Fetching metadata of sourceBucket/sourceKey failed, error: Error: S3 error',
    );
  });
});
