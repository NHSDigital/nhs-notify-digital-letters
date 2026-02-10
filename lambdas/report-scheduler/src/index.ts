import { createHandler } from 'apis/scheduled-event-handler';
import { createContainer } from 'container';

export const handler = createHandler(createContainer());

export default handler;
