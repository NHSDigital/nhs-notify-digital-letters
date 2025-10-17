export type CloudEvent = {
  id: string;
  source: string;
  specversion: string;
  type: string;
  plane: string;
  subject: string;
  time: string; // ISO 8601 datetime string
  datacontenttype: string;
  dataschema: string;
  dataschemaversion: string;
};

export type TtlItemEvent = CloudEvent & {
  data: {
    uri: string;
  };
};

export type TtlItemBusEvent = {
  detail: TtlItemEvent;
};
