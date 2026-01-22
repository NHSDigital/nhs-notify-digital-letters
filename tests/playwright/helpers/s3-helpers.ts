import {
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
});

async function listBuckets(substring: string): Promise<string[]> {
  const resp = await s3.send(new ListBucketsCommand({}));
  const buckets = resp.Buckets ?? [];
  if (!substring) {
    return buckets.map((b) => b.Name!).filter(Boolean);
  }
  const needle = substring.toLowerCase();
  return buckets
    .map((b) => b.Name)
    .filter(
      (name): name is string => !!name && name.toLowerCase().includes(needle),
    );
}

async function uploadToS3(
  content: string,
  bucket: string,
  key: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
    }),
  );
}

async function getObjectFromS3(
  bucket: string,
  key: string,
): Promise<Buffer | undefined> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      return undefined;
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'NoSuchKey'
    ) {
      return undefined;
    }
    throw error;
  }
}

async function getObjectMetadata(
  bucket: string,
  key: string,
): Promise<Record<string, string> | undefined> {
  try {
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return response.Metadata || {};
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'NotFound'
    ) {
      return undefined;
    }
    throw error;
  }
}

export { getObjectFromS3, getObjectMetadata, listBuckets, uploadToS3 };
