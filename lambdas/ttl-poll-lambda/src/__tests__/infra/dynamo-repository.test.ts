import {
  BatchWriteCommandOutput,
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { Logger, deleteDynamoBatch, dynamoDocumentClient } from 'utils';
import { mock, mockFn } from 'jest-mock-extended';
import { DynamoRepository } from 'infra/dynamo-repository';
import 'aws-sdk-client-mock-jest';

const mockInputDate = '2022-01-01#2';
const mockInputTtl = 222_222_222;
const mockTableName = 'test';

const mockDynamoClient = mockClient(DynamoDBDocumentClient);
const logger = mock<Logger>();

const mockDynamoDeleteBatch = mockFn<typeof deleteDynamoBatch>();

const dynamoRepository = new DynamoRepository(
  mockTableName,
  dynamoDocumentClient,
  logger,
  mockDynamoDeleteBatch,
);

describe('dynamoRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDynamoClient.reset();

    mockDynamoDeleteBatch.mockResolvedValue({
      $metadata: {},
    });
    mockDynamoClient.on(QueryCommand).resolves({
      $metadata: {},
      Items: [
        {
          PK: 'Hello',
          SK: 'hello',
          requestItemDate: mockInputDate,
          ttl: mockInputTtl,
        },
      ],
    });
  });

  describe('deleteBatch', () => {
    it('sends correct payload to dynamodb', async () => {
      const input = [
        {
          PK: 'REQUEST_ITEM#hello1',
          SK: 'REQUEST_ITEM_PLAN#hello1',
        },
        {
          PK: 'REQUEST_ITEM#hello2',
          SK: 'REQUEST_ITEM_PLAN#hello2',
        },
      ];

      await dynamoRepository.deleteBatch(input);

      expect(mockDynamoDeleteBatch).toHaveBeenCalledTimes(1);
      expect(mockDynamoDeleteBatch).toHaveBeenCalledWith(
        mockTableName,
        input,
        logger,
        10,
      );
    });

    it('returns the output from the delete function', async () => {
      const input = [
        {
          PK: 'FAIL',
          SK: 'FAIL',
        },
        {
          PK: 'REQUEST_ITEM#hello2',
          SK: 'REQUEST_ITEM_PLAN#hello2',
        },
      ];

      const deleteResponse: BatchWriteCommandOutput = {
        $metadata: {},
        UnprocessedItems: {
          [mockTableName]: [
            {
              DeleteRequest: {
                Key: {
                  PK: 'FAIL',
                  SK: 'FAIL',
                },
              },
            },
          ],
        },
      };
      mockDynamoDeleteBatch.mockResolvedValueOnce(deleteResponse);

      const res = await dynamoRepository.deleteBatch(input);

      expect(res).toEqual(deleteResponse);
    });
  });

  describe('queryTtlIndex', () => {
    it('sends correct payload to dynamodb and returns correct response', async () => {
      const res = await dynamoRepository.queryTtlIndex(
        mockInputDate,
        mockInputTtl,
      );

      expect(mockDynamoClient).toReceiveCommandTimes(QueryCommand, 1);
      expect(mockDynamoClient).toReceiveCommandWith(QueryCommand, {
        TableName: mockTableName,
        IndexName: 'dateOfExpiryIndex',
        KeyConditionExpression:
          '#dateOfExpiry = :dateOfExpiry AND #ttl < :ttlBeforeSeconds',
        ExpressionAttributeNames: {
          '#dateOfExpiry': 'dateOfExpiry',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':dateOfExpiry': mockInputDate,
          ':ttlBeforeSeconds': 222_222_222,
        },
      });

      expect(res).toEqual(
        expect.objectContaining({
          Items: [
            {
              PK: 'Hello',
              SK: 'hello',
              requestItemDate: mockInputDate,
              ttl: mockInputTtl,
            },
          ],
        }),
      );
    });
  });
});
