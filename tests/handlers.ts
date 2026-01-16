import {fileURLToPath} from "node:url";
import {readFileSync} from "fs";
import {HttpResponse, http} from "msw";
import {dirname, join} from "path";

// Load mock data
const __dirname = dirname(fileURLToPath(import.meta.url));
const mockDataPath = join(__dirname, "./mockData/bc-response.json");
const bcResponseMock = JSON.parse(readFileSync(mockDataPath, "utf-8"));

// Create handlers for API calls
export const handlers = [
  // Mock getPlaylist API call
  http.get("http://localhost:4321/api/getPlaylist", () => {
    return new HttpResponse(JSON.stringify(bcResponseMock), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),

  // Mock getId API call
  http.get("http://localhost:4321/api/getId", () => {
    return new HttpResponse(
      JSON.stringify({
        accountId: "6314154063001",
        playerId: "9mlrvmAybr",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }),
];
