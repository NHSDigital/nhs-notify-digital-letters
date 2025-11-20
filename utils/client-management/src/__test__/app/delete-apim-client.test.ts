import { mockDeep } from 'jest-mock-extended';
import { createDeleteApimClientCommand } from '../../app/delete-apim-client';
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

  const deleteApimClientCommand =
    createDeleteApimClientCommand(mockDependencies);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete an existing clientId', async () => {
    mockGetApimClients.mockResolvedValueOnce({
      'apim-123': 'client-123',
      'apim-456': 'client-456',
    });

    const params = { clientId: 'client-123' };

    const result = await deleteApimClientCommand(params);

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).toHaveBeenCalledWith({
      'apim-456': 'client-456',
    });
    expect(result).toEqual({
      'apim-456': 'client-456',
    });
  });

  it('should throw an error if the clientId does not exist', async () => {
    mockGetApimClients.mockResolvedValueOnce({
      'apim-123': 'client-123',
      'apim-456': 'client-456',
    });

    const params = { clientId: 'client-789' };

    await expect(deleteApimClientCommand(params)).rejects.toThrow(
      `Client ID ${params.clientId} does not exist.`
    );

    expect(mockGetApimClients).toHaveBeenCalledTimes(1);
    expect(mockPutApimClients).not.toHaveBeenCalled();
  });
});
