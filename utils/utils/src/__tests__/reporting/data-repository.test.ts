import { AthenaClient } from '@aws-sdk/client-athena';
import { mockClient } from 'aws-sdk-client-mock';
import { AthenaRepository } from '../../reporting/data-repository';

const athenaClientMock = mockClient(AthenaClient);

describe('AthenaRepository', () => {
  let repository: AthenaRepository;
  const mockConfig = {
    athenaWorkgroup: 'test-workgroup',
    athenaDatabase: 'test-database',
  };

  beforeEach(() => {
    athenaClientMock.reset();
    repository = new AthenaRepository(new AthenaClient({}), mockConfig);
  });

  describe('startQuery', () => {
    it('should start query execution and return query execution ID', async () => {
      const mockQueryExecutionId = 'query-123';
      athenaClientMock.onAnyCommand().resolves({
        QueryExecutionId: mockQueryExecutionId,
      });

      const result = await repository.startQuery('SELECT * FROM table', [
        'param1',
        'param2',
      ]);

      expect(result).toBe(mockQueryExecutionId);
    });

    it('should send correct parameters to Athena client', async () => {
      const query = 'SELECT * FROM table WHERE id = ?';
      const executionParameters = ['123'];

      athenaClientMock.onAnyCommand().resolves({
        QueryExecutionId: 'query-456',
      });

      await repository.startQuery(query, executionParameters);

      const calls = athenaClientMock.commandCalls(
        Object.getPrototypeOf(athenaClientMock.calls()[0].args[0]).constructor,
      );
      expect(calls[0].args[0].input).toEqual({
        QueryString: query,
        WorkGroup: 'test-workgroup',
        QueryExecutionContext: { Database: 'test-database' },
        ExecutionParameters: executionParameters,
      });
    });

    it('should handle empty execution parameters', async () => {
      athenaClientMock.onAnyCommand().resolves({
        QueryExecutionId: 'query-789',
      });

      const result = await repository.startQuery('SELECT 1', []);

      expect(result).toBe('query-789');
    });

    it('should propagate Athena client errors', async () => {
      const mockError = new Error('Athena service error');
      athenaClientMock.onAnyCommand().rejects(mockError);

      await expect(
        repository.startQuery('SELECT * FROM table', []),
      ).rejects.toThrow('Athena service error');
    });
  });

  describe('getQueryStatus', () => {
    it('should return query execution state', async () => {
      athenaClientMock.onAnyCommand().resolves({
        QueryExecution: {
          Status: {
            State: 'SUCCEEDED',
          },
        },
      });

      const result = await repository.getQueryStatus('query-123');

      expect(result).toBe('SUCCEEDED');
    });

    it('should return undefined when QueryExecution is missing', async () => {
      athenaClientMock.onAnyCommand().resolves({});

      const result = await repository.getQueryStatus('query-999');

      expect(result).toBeUndefined();
    });

    it('should return undefined when Status is missing', async () => {
      athenaClientMock.onAnyCommand().resolves({
        QueryExecution: {},
      });

      const result = await repository.getQueryStatus('query-888');

      expect(result).toBeUndefined();
    });

    it('should propagate Athena client errors', async () => {
      const mockError = new Error('Query not found');
      athenaClientMock.onAnyCommand().rejects(mockError);

      await expect(repository.getQueryStatus('invalid-query')).rejects.toThrow(
        'Query not found',
      );
    });
  });
});
