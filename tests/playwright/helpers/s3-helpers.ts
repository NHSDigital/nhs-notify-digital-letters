import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';

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

export default listBuckets;
