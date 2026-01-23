import { type Readable } from 'node:stream';
import {
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from './s3-client';

export function isReadable(
  body: Readable | ReadableStream | Blob | undefined,
): body is Readable {
  // eslint-disable-next-line sonarjs/different-types-comparison
  return body !== undefined && body && (body as Readable).read !== undefined;
}

export type GetObjectOutputReadableBody = GetObjectCommandOutput & {
  Body: Readable;
};

export function isReadableBody(
  response: GetObjectCommandOutput,
): response is GetObjectOutputReadableBody {
  return (
    response.Body !== undefined &&
    response.Body &&
    // eslint-disable-next-line sonarjs/different-types-comparison
    (response.Body as Readable).read !== undefined
  );
}

export interface S3Location {
  Bucket: string;
  Key: string;
  VersionId?: string;
}

export async function streamToString(Body: Readable) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    Body.on('data', (chunk: ArrayBuffer | SharedArrayBuffer) =>
      chunks.push(Buffer.from(chunk)),
    );
    Body.on('error', (err) => reject(err));
    Body.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

export async function streamToBuffer(Body: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    Body.on('data', (chunk: ArrayBuffer | SharedArrayBuffer) =>
      chunks.push(Buffer.from(chunk)),
    );
    Body.on('error', (err) => reject(err));
    Body.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function getS3ObjectStream(
  location: S3Location,
): Promise<Readable> {
  const { Bucket, Key, VersionId } = location;
  const params = {
    Bucket,
    Key,
    VersionId,
  };
  try {
    const { Body } = await s3Client.send(new GetObjectCommand(params));

    // https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
    if (isReadable(Body)) {
      return Body;
    }
  } catch (error_) {
    const error = error_ as Error;
    throw new Error(
      `Could not retrieve from bucket 's3://${Bucket}/${Key}' from S3: ${error.message}`,
    );
  }
  throw new Error(`Could not read file from bucket. 's3://${Bucket}/${Key}'`);
}

export async function getS3Object(
  location: S3Location,
  defaultValue?: string,
): Promise<string> {
  try {
    return await streamToString(await getS3ObjectStream(location));
  } catch (error) {
    if (defaultValue) {
      return defaultValue;
    }

    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not retrieve from bucket 's3://${location.Bucket}/${location.Key}' from S3: ${msg}`,
    );
  }
}

export async function getS3ObjectFromUri(uri: string): Promise<string> {
  const regex = /^s3:\/\/([^/]+)\/(.+)$/;
  const match = regex.exec(uri);
  if (!match) {
    throw new Error(`Invalid S3 URI format: ${uri}`);
  }
  const [, Bucket, Key] = match;
  return getS3Object({ Bucket, Key });
}

export async function getObjectFromS3(
  bucket: string,
  key: string,
): Promise<Buffer | undefined> {
  try {
    const stream = await getS3ObjectStream({ Bucket: bucket, Key: key });
    return await streamToBuffer(stream);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes('Could not retrieve from bucket')
    ) {
      return undefined;
    }
    throw error;
  }
}

export async function getObjectMetadata(
  bucket: string,
  key: string,
): Promise<Record<string, string> | undefined> {
  try {
    const response = await s3Client.send(
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
