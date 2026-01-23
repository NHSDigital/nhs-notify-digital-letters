/* eslint-disable no-console */
import {
  ListBucketsCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import type { S3Location } from './get-object-s3';
import { s3Client } from './s3-client';

export async function putDataS3(
  fileData: Record<string, unknown>,
  { Bucket, Key }: S3Location,
  Metadata: Record<string, string> = {},
): Promise<PutObjectCommandOutput> {
  try {
    const params = {
      Bucket,
      Key,
      Body: JSON.stringify(fileData, null, 2),
      Metadata,
    };

    const data = await s3Client.send(new PutObjectCommand(params));
    console.log(`Data uploaded to ${Bucket}/${Key}`);
    return data;
  } catch (error) {
    throw new Error(`Upload to ${Bucket}/${Key} failed, error: ${error}`);
  }
}

export async function uploadToS3(
  content: string,
  bucket: string,
  key: string,
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
    }),
  );
}

export async function listBuckets(substring: string): Promise<string[]> {
  const resp = await s3Client.send(new ListBucketsCommand({}));
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
