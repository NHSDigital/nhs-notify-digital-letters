import { z } from 'zod';
import { CloudEvent } from '../types';

export const $CloudEvent: z.ZodType<CloudEvent> = z.object({
  id: z.string(),
  source: z.string(),
  specversion: z.string(),
  type: z.string(),
  plane: z.string(),
  subject: z.string(),
  time: z.iso.datetime(),
  datacontenttype: z.string(),
  dataschema: z.string(),
  dataschemaversion: z.string(),
});

export default $CloudEvent;
