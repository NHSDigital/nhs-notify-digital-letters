import {
  AthenaClient,
  GetNamedQueryCommand,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena';
import { mockClient } from 'aws-sdk-client-mock';
import {
  AthenaDataRepository,
  AthenaDataRepositoryDependencies,
} from '../../reporting/data-repository';

const athenaClientMock = mockClient(AthenaClient);

describe('AthenaDataRepository', () => {
  let repository: AthenaDataRepository;
  const config: AthenaDataRepositoryDependencies = {
    athenaClient: new AthenaClient({}),
  };

  beforeEach(() => {
    athenaClientMock.reset();
    repository = new AthenaDataRepository(config);
  });

  describe('startQuery', () => {
    it('should start query execution and return query execution ID', async () => {
      const mockQueryExecutionId = 'query-123';
      athenaClientMock.on(GetNamedQueryCommand).resolves({
        NamedQuery: {
          Name: 'Test Named Query',
          Database: 'test-database',
          WorkGroup: 'test-workgroup',
          QueryString: 'SELECT * FROM table',
        },
      });
      athenaClientMock.on(StartQueryExecutionCommand).resolves({
        QueryExecutionId: mockQueryExecutionId,
      });

      const result = await repository.startQuery('testNamedQueryId', [
        'param1',
        'param2',
      ]);

      expect(result).toBe(mockQueryExecutionId);
    });

    it('should send correct parameters to Athena client', async () => {
      const query = 'SELECT * FROM table WHERE id = ?';
      const executionParameters = ['123'];
      const namedQueryId = 'testNamedQueryId';
      const testDatabase = 'test-database';
      const testWorkGroup = 'test-workgroup';

      const mockQueryExecutionId = 'query-123';
      athenaClientMock.on(GetNamedQueryCommand).resolves({
        NamedQuery: {
          Name: 'Test Named Query',
          Database: testDatabase,
          WorkGroup: testWorkGroup,
          QueryString: query,
        },
      });
      athenaClientMock.on(StartQueryExecutionCommand).resolves({
        QueryExecutionId: mockQueryExecutionId,
      });

      await repository.startQuery(namedQueryId, executionParameters);

      const calls = athenaClientMock.commandCalls(
        Object.getPrototypeOf(athenaClientMock.calls()[1].args[0]).constructor,
      );
      expect(calls[0].args[0].input).toEqual({
        QueryString: query,
        WorkGroup: testWorkGroup,
        QueryExecutionContext: { Database: testDatabase },
        ExecutionParameters: executionParameters,
      });
    });

    it('should throw an error if named query is not found', async () => {
      athenaClientMock.on(GetNamedQueryCommand).resolves({});

      await expect(
        repository.startQuery('nonExistentNamedQuery', ['param']),
      ).rejects.toThrow(
        'Named query nonExistentNamedQuery not found or has no SQL.',
      );
    });

    it('should throw an error if named query does not specify a database', async () => {
      athenaClientMock.on(GetNamedQueryCommand).resolves({
        NamedQuery: {
          WorkGroup: 'test-workgroup',
          QueryString: 'SELECT 1',
        } as any,
      });

      await expect(
        repository.startQuery('namedQueryWithoutDatabase', ['param']),
      ).rejects.toThrow(
        'Named query namedQueryWithoutDatabase does not specify a database.',
      );
    });

    it('should throw an error if named query does not specify a workgroup', async () => {
      athenaClientMock.on(GetNamedQueryCommand).resolves({
        NamedQuery: {
          Database: 'test-database',
          QueryString: 'SELECT 1',
        } as any,
      });

      await expect(
        repository.startQuery('namedQueryWithoutWorkgroup', ['param']),
      ).rejects.toThrow(
        'Named query namedQueryWithoutWorkgroup does not specify a workgroup.',
      );
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
