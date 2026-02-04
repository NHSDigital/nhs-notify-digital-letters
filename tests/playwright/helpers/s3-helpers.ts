import {
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
});

async function uploadToS3(
  content: string,
  bucket: string,
  key: string,
  metadata?: Record<string, string>,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      Metadata: metadata,
    }),
  );
}

async function downloadFromS3(
  bucket: string,
  keyPrefix: string,
): Promise<{ body: string; metadata?: Record<string, string> }> {
  const objects = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: keyPrefix }),
  );

  if ((objects.Contents?.length ?? 0) > 1) {
    throw new Error(
      `Multiple objects found for prefix s3://${bucket}/${keyPrefix}`,
    );
  }

  if ((objects.Contents?.length ?? 0) === 0) {
    throw new Error(`No objects found for prefix s3://${bucket}/${keyPrefix}`);
  }

  const key = objects.Contents?.[0]?.Key;
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`No content found for s3://${bucket}/${key}`);
  }

  return {
    body: await response.Body.transformToString(),
    metadata: response.Metadata,
  };
}

export { downloadFromS3, uploadToS3 };
