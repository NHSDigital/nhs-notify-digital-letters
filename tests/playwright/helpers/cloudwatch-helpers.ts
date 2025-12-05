import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { region } from 'utils';
import { test } from '@playwright/test';

const client = new CloudWatchLogsClient({ region: region() });

let testStartTime = new Date();

test.beforeEach(() => {
  testStartTime = new Date();
});

/**
 * @param logGroupName e.g. '/aws/lambda/nhs-main-dl-apim-key-generation'
 * @param patterns e.g. [ '$.id = "someId"', '$.message.messageUri = "messageUri"' ]
 */
export async function getLogsFromCloudwatch(
  logGroupName: string,
  patterns: string[],
): Promise<unknown[]> {
  const filterEvents = new FilterLogEventsCommand({
    logGroupName,
    startTime: testStartTime.getTime() - 60 * 1000,
    filterPattern: `{${patterns.join(' && ')}}`,
    limit: 50,
  });

  const { events = [] } = await client.send(filterEvents);

  return events.flatMap(({ message }) =>
    message ? [JSON.parse(message)] : [],
  );
}
