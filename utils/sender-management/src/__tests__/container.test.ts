import { createSenderManager } from '../container';
import { createApp } from '../app';
import { createDomain } from '../domain';
import { createInfra } from '../infra';
import { loadConfig } from '../config/config';

jest.mock('../app', () => ({
  createApp: jest.fn(),
}));

jest.mock('../domain', () => ({
  createDomain: jest.fn(),
}));

jest.mock('../infra', () => ({
  createInfra: jest.fn(),
}));

jest.mock('../config/config', () => ({
  loadConfig: jest.fn(),
}));

describe('createSenderManager', () => {
  const mockParameterStore = {
    getParameter: jest.fn(),
    getAllParameters: jest.fn(),
    addParameter: jest.fn(),
    deleteParameter: jest.fn(),
    clearCachedParameter: jest.fn(),
  };
  const mockConfigOverrides = {};
  const mockConfig = { key: 'value' };
  const mockDomain = {};
  const mockInfra = {};
  const mockApp = {};

  beforeEach(() => {
    jest.clearAllMocks();

    (loadConfig as jest.Mock).mockReturnValue(mockConfig);
    (createDomain as jest.Mock).mockReturnValue(mockDomain);
    (createInfra as jest.Mock).mockReturnValue(mockInfra);
    (createApp as jest.Mock).mockReturnValue(mockApp);
  });

  it('should create the sender manager with the correct dependencies', () => {
    const result = createSenderManager({
      configOverrides: mockConfigOverrides,
      parameterStore: mockParameterStore,
    });

    expect(loadConfig).toHaveBeenCalledWith(mockConfigOverrides);
    expect(createDomain).toHaveBeenCalled();
    expect(createInfra).toHaveBeenCalledWith({
      config: mockConfig,
      parameterStore: mockParameterStore,
      logger: expect.any(Object),
    });
    expect(createApp).toHaveBeenCalledWith({
      domain: mockDomain,
      infra: mockInfra,
    });
    expect(result).toBe(mockApp);
  });
});
