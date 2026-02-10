import { expect, test } from '@playwright/test';
import {
  ATHENA_WORKGROUP_NAME,
  GLUE_DATABASE_NAME,
  GLUE_TABLE_NAME,
} from 'constants/backend-constants';
import {
  QueryExecutionState,
  getQueryState,
  triggerTableMetadataRefresh,
} from 'helpers/athena-helpers';
import expectToPassEventually from 'helpers/expectations';

test.describe('Digital Letters - Report Generator', () => {
  test('should refresh data in the Glue table', async () => {
    const refreshQueryExecutionId = await triggerTableMetadataRefresh(
      GLUE_DATABASE_NAME,
      GLUE_TABLE_NAME,
      ATHENA_WORKGROUP_NAME,
    );

    await expectToPassEventually(async () => {
      const refreshQueryState = await getQueryState(refreshQueryExecutionId);

      expect(refreshQueryState).toEqual(QueryExecutionState.SUCCEEDED);
    });
  });
});
