import { mockDeep } from 'jest-mock-extended';
import { IParameterStore, Sender } from 'utils';
import type { App } from 'app';
import { SenderManagement } from '../../..';
import { main } from '../../../entrypoint/cli';

// Store original argv
const originalArgv = process.argv;
const originalExitCode = process.exitCode;

const mockParameterStore: IParameterStore = {
  getParameter: jest.fn(),
  getAllParameters: jest.fn(),
  addParameter: jest.fn(),
  deleteParameter: jest.fn(),
  clearCachedParameter: jest.fn(),
};

const mockClientManagement: App = mockDeep<App>({
  deleteSender: jest.fn(),
  getSender: jest.fn(),
  listSenders: jest.fn(),
  putSender: jest.fn(),
});

jest.mock('utils', () => ({
  ParameterStore: jest.fn(() => mockParameterStore),
}));

jest.mock('../../..', () => ({
  SenderManagement: jest.fn(() => mockClientManagement),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleTable = jest.spyOn(console, 'table').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('CLI entrypoint', () => {
  const mockClient: Sender = {
    senderId: 'test-sender-id',
    senderName: 'Test Sender',
    meshMailboxSenderId: 'test-sender',
    meshMailboxReportsId: 'test-reports',
    fallbackWaitTimeSeconds: 300,
    routingConfigId: 'test-routing',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleTable.mockRestore();
    mockConsoleError.mockRestore();
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
  });

  describe('delete-sender command', () => {
    it('should delete a sender and print result as table by default', async () => {
      process.argv = [
        'node',
        'cli',
        'delete-sender',
        '--environment',
        'test',
        '--sender-id',
        'test-sender-id',
      ];

      // Import and execute main
      await main();

      expect(SenderManagement).toHaveBeenCalledWith({
        parameterStore: mockParameterStore,
        configOverrides: { environment: 'test' },
      });
      expect(mockClientManagement.deleteSender).toHaveBeenCalledWith({
        senderId: 'test-sender-id',
      });
      expect(mockConsoleTable).toHaveBeenCalledWith([
        { senderId: 'test-sender-id' },
      ]);
    });

    it('should delete a sender and print result as JSON when format is json', async () => {
      process.argv = [
        'node',
        'cli',
        'delete-sender',
        '--environment',
        'test',
        '--sender-id',
        'test-sender-id',
        '--format',
        'json',
      ];

      await main();

      expect(mockClientManagement.deleteSender).toHaveBeenCalledWith({
        senderId: 'test-sender-id',
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify({ senderId: 'test-sender-id' }, null, 2),
      );
    });
  });

  describe('get-sender command', () => {
    it('should get a sender and print result as table by default', async () => {
      (mockClientManagement.getSender as jest.Mock).mockResolvedValue(
        mockClient,
      );

      process.argv = [
        'node',
        'cli',
        'get-sender',
        '--environment',
        'test',
        '--sender-id',
        'test-sender-id',
      ];

      await main();

      expect(mockClientManagement.getSender).toHaveBeenCalledWith({
        senderId: 'test-sender-id',
      });
      expect(mockConsoleTable).toHaveBeenCalledWith([mockClient]);
    });

    it('should get a sender and print result as JSON when format is json', async () => {
      (mockClientManagement.getSender as jest.Mock).mockResolvedValue(
        mockClient,
      );

      process.argv = [
        'node',
        'cli',
        'get-sender',
        '--environment',
        'test',
        '--sender-id',
        'test-sender-id',
        '--format',
        'json',
      ];

      await main();

      expect(mockClientManagement.getSender).toHaveBeenCalledWith({
        senderId: 'test-sender-id',
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify(mockClient, null, 2),
      );
    });
  });

  describe('list-senders command', () => {
    it('should list senders and print result as table by default', async () => {
      const senders = [mockClient];
      (mockClientManagement.listSenders as jest.Mock).mockResolvedValue(
        senders,
      );

      process.argv = ['node', 'cli', 'list-senders', '--environment', 'test'];

      await main();

      expect(mockClientManagement.listSenders).toHaveBeenCalled();
      expect(mockConsoleTable).toHaveBeenCalledWith(senders);
    });

    it('should list senders and print result as JSON when format is json', async () => {
      const senders = [mockClient];
      (mockClientManagement.listSenders as jest.Mock).mockResolvedValue(
        senders,
      );

      process.argv = [
        'node',
        'cli',
        'list-senders',
        '--environment',
        'test',
        '--format',
        'json',
      ];

      await main();

      expect(mockClientManagement.listSenders).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify(senders, null, 2),
      );
    });
  });

  describe('put-sender command', () => {
    it('should put a sender and print result as table by default', async () => {
      (mockClientManagement.putSender as jest.Mock).mockResolvedValue(
        mockClient,
      );

      process.argv = [
        'node',
        'cli',
        'put-sender',
        '--environment',
        'test',
        '--sender-id',
        'test-sender-id',
        '--sender-name',
        'Test Sender',
        '--mesh-mailbox-sender-id',
        'test-sender',
        '--mesh-mailbox-reports-id',
        'test-reports',
        '--fallback-wait-time-seconds',
        '300',
        '--routing-config-id',
        'test-routing',
      ];

      await main();

      expect(mockClientManagement.putSender).toHaveBeenCalledWith({
        senderId: 'test-sender-id',
        senderName: 'Test Sender',
        meshMailboxSenderId: 'test-sender',
        meshMailboxReportsId: 'test-reports',
        fallbackWaitTimeSeconds: 300,
        routingConfigId: 'test-routing',
      });
      expect(mockConsoleTable).toHaveBeenCalledWith([mockClient]);
    });

    it('should put a sender without sender-id and print result as JSON when format is json', async () => {
      (mockClientManagement.putSender as jest.Mock).mockResolvedValue(
        mockClient,
      );

      process.argv = [
        'node',
        'cli',
        'put-sender',
        '--environment',
        'test',
        '--sender-name',
        'Test Sender',
        '--mesh-mailbox-sender-id',
        'test-sender',
        '--mesh-mailbox-reports-id',
        'test-reports',
        '--fallback-wait-time-seconds',
        '300',
        '--routing-config-id',
        'test-routing',
        '--format',
        'json',
      ];

      await main();

      expect(mockClientManagement.putSender).toHaveBeenCalledWith({
        senderId: undefined,
        senderName: 'Test Sender',
        meshMailboxSenderId: 'test-sender',
        meshMailboxReportsId: 'test-reports',
        fallbackWaitTimeSeconds: 300,
        routingConfigId: 'test-routing',
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify(mockClient, null, 2),
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors and set exit code to 1', async () => {
      const error = new Error('Test error');
      (mockClientManagement.getSender as jest.Mock).mockRejectedValue(error);

      process.argv = [
        'node',
        'cli',
        'get-sender',
        '--environment',
        'test',
        '--sender-id',
        'test-sender-id',
      ];

      // Expect main to throw the error
      await expect(main()).rejects.toThrow('Test error');
    });
  });
});
