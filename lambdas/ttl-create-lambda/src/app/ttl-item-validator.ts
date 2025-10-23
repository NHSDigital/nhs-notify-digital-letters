import { z } from 'zod';
import { TtlItemEvent } from 'infra/types';

export const $TtlItem: z.ZodType<TtlItemEvent> = z.object({
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
  data: z.object({
    uri: z.string(),
  }),
});

export default $TtlItem;
