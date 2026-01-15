import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'path';
import { http, HttpResponse } from 'msw';

// Load mock data
const __dirname = dirname(fileURLToPath(import.meta.url));
const mockDataPath = join(__dirname, './mockData/bc-response.json');
const bcResponseMock = JSON.parse(readFileSync(mockDataPath, 'utf-8'));

// Create handlers for Brightcove API calls
export const handlers = [
  // Mock getPlaylist API call
  http.get('https://edge.api.brightcove.com/playback/v1/accounts/:accountId/playlists/*', () => {
    return new HttpResponse(JSON.stringify(bcResponseMock), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }),

  // Mock getId API call
  http.get('http://localhost:4321/api/getId', () => {
    return new HttpResponse(JSON.stringify({
      accountId: '6314154063001',
      playerId: '9mlrvmAybr',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }),
];
