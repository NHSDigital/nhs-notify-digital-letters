import { type ChannelStatusPublishedEventV1 } from '@nhsdigital/nhs-notify-event-schemas-status-published';

export const samplePaperLetterOptOutEvent: Omit<
  ChannelStatusPublishedEventV1,
  'id' | 'time' | 'source' | 'data'
> & {
  data: Omit<
    ChannelStatusPublishedEventV1['data'],
    'messageReference' | 'clientId'
  >;
} = {
  specversion: '1.0',
  subject:
    'customer/037f5f76-352c-445f-89a7-c3d18776ce86/message/3COesqsClaLyf0WNuLuhz1RDbWs/plan/3COezubdtrUFJlDOV4ucAQ93Akr',
  type: 'uk.nhs.notify.channel.status.PUBLISHED.v1',
  sequence: '00000000000451468843',
  datacontenttype: 'application/json',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/messaging/channel-status.published.1.0.1.schema.json',
  dataschemaversion: '1.0.1',
  plane: 'data',
  traceparent: '00-4d678967f96e353c07a0a31c1849b500-07f83ba58dd8df70-01',
  data: {
    messageId: '3COesqsClaLyf0WNuLuhz1RDbWs',
    channel: 'nhsapp',
    channelStatus: 'delivered',
    previousChannelStatus: 'delivered',
    supplierStatus: 'paper_letter_opted_out',
    previousSupplierStatus: 'read',
    cascadeType: 'primary',
    cascadeOrder: 1,
    timestamp: '2026-02-05T14:29:55Z',
    retryCount: 0,
  },
};
