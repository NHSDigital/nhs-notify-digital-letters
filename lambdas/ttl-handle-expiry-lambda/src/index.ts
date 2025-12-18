import { createHandler } from 'apis/dynamodb-stream-handler';
import { createContainer } from 'container';

export const handler = createHandler(createContainer());

export default handler;
