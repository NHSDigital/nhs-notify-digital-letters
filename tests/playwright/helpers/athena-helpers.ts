import {
  AthenaClient,
  GetQueryExecutionCommand,
  QueryExecutionState,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena';

export { QueryExecutionState } from '@aws-sdk/client-athena';

const client = new AthenaClient();

/**
 * Triggers a metadata refresh for an Athena table using the MSCK REPAIR TABLE command.
 *
 * This will cause any new files in S3 to be picked up.
 *
 * @param database - The name of the Athena database
 * @param tableName - The name of the table to repair
 * @param workgroup - The Athena workgroup to run the query in
 * @returns The query execution ID
 */
export async function triggerTableMetadataRefresh(
  database: string,
  tableName: string,
  workgroup: string,
): Promise<string> {
  const command = new StartQueryExecutionCommand({
    QueryString: `MSCK REPAIR TABLE ${tableName};`,
    QueryExecutionContext: {
      Database: database,
      Catalog: 'AwsDataCatalog',
    },
    WorkGroup: workgroup,
  });

  const response = await client.send(command);

  if (!response.QueryExecutionId) {
    throw new Error(
      'Failed to start query execution - no query execution ID returned',
    );
  }

  return response.QueryExecutionId;
}

export async function getQueryState(
  queryExecutionId: string,
): Promise<QueryExecutionState> {
  const queryExecutionInfo = await client.send(
    new GetQueryExecutionCommand({
      QueryExecutionId: queryExecutionId,
    }),
  );

  if (!queryExecutionInfo.QueryExecution?.Status?.State) {
    throw new Error('Failed to get query execution state');
  }

  return queryExecutionInfo.QueryExecution?.Status?.State;
}
