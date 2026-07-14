import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  event: () => import('../lib/api-handlers/events/[eventId].js'),
  memory: () => import('../lib/api-handlers/memories/[memoryId]/index.js'),
  'memory-process': () => import('../lib/api-handlers/memories/[memoryId]/process.js'),
  'memory-publish': () => import('../lib/api-handlers/memories/[memoryId]/publish.js'),
  'person-events': () => import('../lib/api-handlers/people/[personId]/events.js'),
  'person-memories': () => import('../lib/api-handlers/people/[personId]/memories.js'),
};

export default createTypedRouter(routes, {
  notFoundMessage: 'Story endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };
