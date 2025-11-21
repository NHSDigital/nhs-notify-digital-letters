import { createClient } from './client';

export function createDomain() {
  return {
    client: {
      createClient,
    },
  };
}

export type Domain = ReturnType<typeof createDomain>;
