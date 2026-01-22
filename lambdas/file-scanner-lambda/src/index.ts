import { createHandler } from 'apis/sqs-handler';
import { createContainer } from 'container';

export const handler = createHandler(createContainer());

export default handler;
