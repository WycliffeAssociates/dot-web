import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server for API mocking
const server = setupServer(...handlers);

// Start server before all tests
server.listen({
  onUnhandledRequest: 'bypass',
});

// Cleanup after all tests
process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());

export default () => {
  // Export setup function for Playwright
};
