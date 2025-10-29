import { CloudEvent } from 'utils';

export type TtlItemEvent = CloudEvent & {
  data: {
    uri: string;
  };
};

export type TtlItemBusEvent = {
  detail: TtlItemEvent;
};
