import { defineConfig } from '@playwright/test';
import baseConfig from 'config/playwright.config';

export default defineConfig({
  ...baseConfig,

  timeout: 120_000, // 30 seconds in the playwright default
  expect: {
    timeout: 10_000, // default is 5 seconds. After creating and previewing sometimes the load is slow on a cold start
  },
  projects: [
    {
      name: 'senders:setup',
      testMatch: 'senders.setup.ts',
    },
    {
      name: 'firehose:setup',
      testMatch: 'firehose.setup.ts',
      teardown: 'firehose:teardown',
    },
    {
      name: 'firehose:teardown',
      testMatch: 'firehose.teardown.ts',
    },
    {
      name: 'component:setup',
      testMatch: 'component.setup.ts',
    },
    {
      name: 'component',
      testMatch: '*.component.spec.ts',
    },
    {
      name: 'component:teardown',
      testMatch: 'component.teardown.ts',
    },
  ],
});
