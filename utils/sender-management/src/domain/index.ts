import { createSender } from './sender';

export function createDomain() {
  return {
    sender: {
      createSender,
    },
  };
}

export type Domain = ReturnType<typeof createDomain>;
