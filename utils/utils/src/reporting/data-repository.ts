import {
  AthenaClient,
  GetNamedQueryCommand,
  GetQueryExecutionCommand,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena';

export type AthenaDataRepositoryDependencies = {
  athenaClient: AthenaClient;
};

export type IDataRepository = {
  startQuery(
    namedQueryId: string,
    executionParameters: string[],
  ): Promise<string | undefined>;
  getQueryStatus(reportQueryId: string): Promise<string | undefined>;
};

export class AthenaDataRepository implements IDataRepository {
  readonly athenaClient: AthenaClient;

  constructor(dependencies: AthenaDataRepositoryDependencies) {
    this.athenaClient = dependencies.athenaClient;
  }

  /**
   * Asynchronously starts a query execution in Athena.
   *
   * @param {string} query - The query string to execute.
   * @return {Promise<string>} - The ID of the query execution.
   */
  async startQuery(namedQueryId: string, executionParameters: string[]) {
    const namedQueryResponse = await this.athenaClient.send(
      new GetNamedQueryCommand({
        NamedQueryId: namedQueryId,
      }),
    );

    const queryString = namedQueryResponse.NamedQuery?.QueryString;
    const queryDatabase = namedQueryResponse.NamedQuery?.Database;
    const queryWorkGroup = namedQueryResponse.NamedQuery?.WorkGroup;

    if (!queryString) {
      throw new Error(`Named query ${namedQueryId} not found or has no SQL.`);
    }

    if (!queryDatabase) {
      throw new Error(
        `Named query ${namedQueryId} does not specify a database.`,
      );
    }

    if (!queryWorkGroup) {
      throw new Error(
        `Named query ${namedQueryId} does not specify a workgroup.`,
      );
    }

    const executionCommand = new StartQueryExecutionCommand({
      QueryString: queryString,
      WorkGroup: queryWorkGroup,
      QueryExecutionContext: { Database: queryDatabase },
      ExecutionParameters: executionParameters,
    });

    const { QueryExecutionId } = await this.athenaClient.send(executionCommand);

    return QueryExecutionId;
  }

  /**
   * Retrieves the status of a query execution.
   *
   * @param {string} reportQueryId - The ID of the query execution.
   * @return {State} The state of the query execution.
   */
  async getQueryStatus(reportQueryId: string) {
    const getQueryExecutionCommand = new GetQueryExecutionCommand({
      QueryExecutionId: reportQueryId,
    });

    const { QueryExecution } = await this.athenaClient.send(
      getQueryExecutionCommand,
    );

    return QueryExecution?.Status?.State;
  }
}
