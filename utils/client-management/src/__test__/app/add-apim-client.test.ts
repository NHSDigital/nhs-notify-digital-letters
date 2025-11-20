import { mockDeep } from 'jest-mock-extended';
import {
  ApimClient,
  createAddApimClientCommand,
} from '../../app/add-apim-client';
import { AppDependencies } from '../../app';

describe('addApimClientCommand', () => {
  const mockGetApimClients = jest.fn();
  const mockPutApimClients = jest.fn();

  const mockDependencies = mockDeep<AppDependencies>({
    infra: {
      clientRepository: {
        getApimClients: mockGetApimClients,
        putApimClients: mockPutApimClients,
      },
    },
  });

  const addApimClientCommand = createAddApimClientCommand(mockDependencies);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add a new APIM client when no clients exist', async () => {
    mockGetApimClients.mockResolvedValueOnce(null);

    const params: ApimClient = { apimId: 'apim-123', clientId: 'client-123' };

    const result = await addApimClientCommand(params);

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).toHaveBeenCalledWith({
      'apim-123': 'client-123',
    });
    expect(result).toEqual({ 'apim-123': 'client-123' });
  });

  it('should add a new APIM client when other clients exist', async () => {
    mockGetApimClients.mockResolvedValueOnce({
      'apim-456': 'client-456',
    });

    const params: ApimClient = { apimId: 'apim-123', clientId: 'client-123' };

    const result = await addApimClientCommand(params);

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).toHaveBeenCalledWith({
      'apim-456': 'client-456',
      'apim-123': 'client-123',
    });
    expect(result).toEqual({
      'apim-456': 'client-456',
      'apim-123': 'client-123',
    });
  });

  it('should overwrite the client ID if it already exists', async () => {
    mockGetApimClients.mockResolvedValueOnce({
      'apim-456': 'client-456',
    });

    const params: ApimClient = { apimId: 'apim-123', clientId: 'client-456' };

    const result = await addApimClientCommand(params);

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).toHaveBeenCalledWith({
      'apim-123': 'client-456',
    });
    expect(result).toEqual({
      'apim-123': 'client-456',
    });
  });

  it('should throw an error if the APIM ID already exists', async () => {
    mockGetApimClients.mockResolvedValueOnce({
      'apim-123': 'client-456',
    });

    const params: ApimClient = { apimId: 'apim-123', clientId: 'client-789' };

    await expect(addApimClientCommand(params)).rejects.toThrow(
      `APIM ID ${params.apimId} already exists.`
    );

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).not.toHaveBeenCalled();
  });

  it('should handle empty client repository gracefully', async () => {
    mockGetApimClients.mockResolvedValueOnce(undefined);

    const params: ApimClient = { apimId: 'apim-789', clientId: 'client-789' };

    const result = await addApimClientCommand(params);

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).toHaveBeenCalledWith({
      'apim-789': 'client-789',
    });
    expect(result).toEqual({ 'apim-789': 'client-789' });
  });
});
