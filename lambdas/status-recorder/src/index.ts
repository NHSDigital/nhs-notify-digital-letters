import { createHandler } from 'apis/firehose-handler';
import { createContainer } from 'container';

export const handler = createHandler(createContainer());

export default handler;
