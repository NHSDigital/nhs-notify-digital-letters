import { expect, test } from '@playwright/test';
import { ENV } from 'constants/backend-constants';
import listBuckets from 'helpers/s3-helpers';

test.describe('Digital Letters', () => {
  test('should contain a bucket with dl-letters in its name', async () => {
    const buckets = await listBuckets(ENV);
    expect(buckets.some((b) => b.includes('dl-letters'))).toBeTruthy();
  });
});
