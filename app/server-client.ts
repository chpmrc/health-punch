import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { parse, type UrlWithParsedQuery } from "url";
import next from "next";
import * as net from "net";

const port = 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const headersPrefix = "HEADERS:";

const socketPath = "/tmp/healthpunch-client2swarm";
const pendingResponses = new Map<string, ServerResponse<IncomingMessage>>();
let requestCounter = 0;
let buffer = "";

const socket: net.Socket = net.createConnection(socketPath, () => {
  console.log("Connected to socket");

  void app.prepare().then(() => {
    createServer((req, res) => {
      const requestId = (requestCounter++).toString();
      pendingResponses.set(requestId, res);

      const parsedUrl = parse(req.url!, true);

      // Collect request body if present
      if (req.method !== "GET" && req.method !== "HEAD") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          sendRequestToSocket(req, body, parsedUrl, requestId);
        });
      } else {
        sendRequestToSocket(req, "", parsedUrl, requestId);
      }

      function sendRequestToSocket(
        req: IncomingMessage,
        body: string,
        parsedUrl: UrlWithParsedQuery,
        reqId: string,
      ) {
        const serializedReq = {
          requestId: reqId,
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body,
          query: parsedUrl.query,
        };
        // console.log("Request:", serializedReq.requestId, serializedReq.url);
        socket.write(JSON.stringify(serializedReq) + "\n");
      }
    }).listen(port);

    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`,
    );
  });
});

type ParsedRequest = {
  headers: Record<string, string>;
  requestId: string;
  body: string;
};

// Listen for responses
socket.on("data", (chunk) => {
  buffer += chunk.toString();

  while (buffer.includes("\n")) {
    const newlineIndex = buffer.indexOf("\n");
    const data = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (data.startsWith(headersPrefix)) {
      try {
        const headerJson = data.substring(8); // Remove "HEADERS:" prefix
        const parsedData = JSON.parse(headerJson) as ParsedRequest;
        // console.log("Headers", parsedData);
        if (parsedData.headers && parsedData.requestId) {
          const response = pendingResponses.get(parsedData.requestId);
          if (response) {
            Object.entries(parsedData.headers).forEach(([name, value]) => {
              response.setHeader(name, value);
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse headers:", e);
      }
    } else if (data) {
      try {
        const parsedData = JSON.parse(data) as ParsedRequest;
        // console.log("Body", data);
        // console.log("Response:", parsedData.requestId);
        if (parsedData.requestId) {
          const response = pendingResponses.get(parsedData.requestId);
          if (response) {
            if (parsedData.body) {
              const decodedBody = Buffer.from(
                parsedData.body,
                "base64",
              ).toString();
              response.write(decodedBody);
            } else {
              // console.log(response.getHeaders());
              response.end();
              pendingResponses.delete(parsedData.requestId);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse body data:", e);
      }
    }
  }
});

socket.on("error", (err) => {
  console.error("Socket error:", err);
});
