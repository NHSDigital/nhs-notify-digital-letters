import {
  AthenaClient,
  GetQueryExecutionCommand,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena';

export type AthenaRepositoryDependencies = {
  athenaClient: AthenaClient;
  athenaWorkgroup: string;
  athenaDatabase: string;
};

export type IDataRepository = {
  startQuery(
    query: string,
    executionParameters: string[],
  ): Promise<string | undefined>;
  getQueryStatus(reportQueryId: string): Promise<string | undefined>;
};

export class AthenaRepository implements IDataRepository {
  readonly athenaClient: AthenaClient;

  readonly workGroup: string;

  readonly database: string;

  constructor(dependencies: AthenaRepositoryDependencies) {
    this.athenaClient = dependencies.athenaClient;
    this.workGroup = dependencies.athenaWorkgroup;
    this.database = dependencies.athenaDatabase;
  }

  /**
   * Asynchronously starts a query execution in Athena.
   *
   * @param {string} query - The query string to execute.
   * @return {Promise<string>} - The ID of the query execution.
   */
  async startQuery(query: string, executionParameters: string[]) {
    const executionCommand = new StartQueryExecutionCommand({
      QueryString: query,
      WorkGroup: this.workGroup,
      QueryExecutionContext: { Database: this.database },
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
