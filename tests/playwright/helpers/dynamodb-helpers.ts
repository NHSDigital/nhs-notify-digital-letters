import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { REGION, TTL_TABLE_NAME } from 'constants/backend-constants';

const dynamoDbClient = new DynamoDBClient({ region: REGION });

async function getTtl(messageUri: string) {
  const params = {
    TableName: TTL_TABLE_NAME,
    KeyConditionExpression: `PK = :messageUri`,
    ExpressionAttributeValues: {
      ':messageUri': messageUri,
    },
  };
  const request = new QueryCommand(params);
  const { Items }: QueryCommandOutput = await dynamoDbClient.send(request);

  return Items ?? [];
}

export default getTtl;
