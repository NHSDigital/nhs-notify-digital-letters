export type PdmResponse = {
  resourceType: string;
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: string;
  subject: {
    identifier: {
      system: string;
      value: string;
    };
  };
  content: {
    attachment: {
      contentType: string;
      title: string;
      data?: string;
    };
  }[];
  author: {
    identifier: {
      system: string;
      value: string;
    };
  }[];
};
