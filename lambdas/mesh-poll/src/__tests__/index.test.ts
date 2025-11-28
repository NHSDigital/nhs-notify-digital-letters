import type { Context } from 'aws-lambda';
import { mockDeep } from 'jest-mock-extended';
import { PDMResourceSubmitted } from 'typescript-schema-generator';
import { handler } from '..';

const context = mockDeep<Context>();
const callback = jest.fn();

describe('event-logging Lambda', () => {
  it('logs the input event and returns 200', async () => {
    const event: PDMResourceSubmitted = {
      type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
      source:
        '/nhs/england/notify/staging/dev-647563337/data-plane/digitalletters/pdm',
      dataschema:
        'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json',
      specversion: '1.0',
      id: '0249e529-f947-4012-819e-b634eb71be79',
      subject:
        'customer/7ff8ed41-cd5f-20e4-ef4e-34f96d8cc8ac/75027ace-9b8c-bcfe-866e-6c24242cffc3/q58dnxk5e/4cbek805wwx/yiaw7bl0d/her/1ccb7eb8-c6fe-0a42-279a-2a0e48ff1ca9/zk',
      time: '2025-11-21T16:01:52.268Z',
      datacontenttype: 'application/json',
      traceparent: '00-ee4790eb6821064c645406abe918b3da-3a4e6957ce2a15de-01',
      tracestate: 'nisi quis',
      partitionkey: 'customer-7ff8ed41',
      recordedtime: '2025-11-21T16:01:53.268Z',
      sampledrate: 1,
      sequence: '00000000000350773861',
      severitytext: 'INFO',
      severitynumber: 2,
      dataclassification: 'restricted',
      dataregulation: 'ISO-27001',
      datacategory: 'non-sensitive',
      data: {
        messageReference: 'incididunt Ut aute laborum',
        senderId: 'officia voluptate culpa Ut dolor',
        resourceId: 'a2bcbb42-ab7e-42b6-88d6-74f8d3ca4a09',
        retryCount: 97_903_257,
      },
    };

    const result = await handler(event, context, callback);

    expect(result).toEqual({
      statusCode: 200,
      body: 'Event logged',
    });
  });

  it('throws an error if an invalid event is provided', async () => {
    const invalidEvent = { foo: 'bar' };

    await expect(handler(invalidEvent, context, callback)).rejects.toThrow();
  });
});
