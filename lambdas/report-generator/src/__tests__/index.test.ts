import { handler } from 'index';

jest.mock('container', () => ({
  createContainer: jest.fn(() => ({})),
}));

describe('index', () => {
  it('should export handler', () => {
    expect(handler).toBeDefined();
  });
});
