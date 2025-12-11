/* eslint-disable no-console */
import { HeadObjectCommand, HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import type { S3Location } from './get-object-s3';
import { s3Client } from './s3-client';

export async function getObjectMetadata(
  source: S3Location,
): Promise<Record<string, string>> {
  try {
    const params = {
      Bucket: source.Bucket,
      Key: source.Key,
    };

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/HeadObjectCommand/
    const response: HeadObjectCommandOutput = await s3Client.send(
      new HeadObjectCommand(params),
    );

    return response.Metadata || {};
  } catch (error) {
    throw new Error(
      `Fetching metadata of ${source.Bucket}/${source.Key} failed, error: ${error}`,
    );
  }
}
