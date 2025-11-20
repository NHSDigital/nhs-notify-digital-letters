import { createClient } from './client';
import { createMetadata, parseMetadataIndex } from './metadata';

export function createDomain() {
  return {
    client: {
      createClient,
    },
    metadata: {
      createMetadata,
      parseMetadataIndex,
    },
  };
}

export type Domain = ReturnType<typeof createDomain>;
