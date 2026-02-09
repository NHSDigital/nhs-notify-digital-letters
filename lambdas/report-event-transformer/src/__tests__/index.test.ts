import { handler } from 'index';

jest.mock('apis/firehose-handler', () => ({
  createHandler: jest.fn(() => jest.fn()),
}));

jest.mock('container', () => ({
  createContainer: jest.fn(() => ({})),
}));

describe('index', () => {
  it('should export handler', () => {
    expect(handler).toBeDefined();
  });
});
