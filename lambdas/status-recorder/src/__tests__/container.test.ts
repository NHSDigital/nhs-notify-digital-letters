import { createContainer } from 'container';

jest.mock('utils', () => ({
  logger: {},
}));

describe('container', () => {
  it('should create container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });
});
