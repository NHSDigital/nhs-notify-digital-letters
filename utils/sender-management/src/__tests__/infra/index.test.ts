import { Dependencies, createInfra } from 'infra';
import { mock } from 'jest-mock-extended';

describe('createInfra', () => {
  it('should create infra', () => {
    const dependencies = mock<Dependencies>();

    const senderRepository = createInfra(dependencies);
    expect(senderRepository).toBeDefined();
  });
});
