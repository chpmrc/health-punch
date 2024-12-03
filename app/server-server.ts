/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
// TODO fix all these type issues

import { parse } from "url";
import next from "next";
import * as net from "net";
import { IncomingMessage, ServerResponse } from "http";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const socketPath = "/tmp/healthpunch-server2swarm";
export const headersPrefix = "HEADERS:";

await app.prepare();
console.log("API server ready");

const socket = net.createConnection(socketPath, () => {
  console.log("Connected to api2unix socket");
});

let buffer = "";

socket.on("data", async (chunk: string) => {
  // console.log("Got data", chunk);

  buffer += chunk;

  const requests = buffer.split("\n");
  // Keep the last incomplete chunk (if any) in the buffer
  buffer = requests[requests.length - 1]!;

  // Process all complete requests (all except last)
  for (let i = 0; i < requests.length - 1; i++) {
    // console.log("Processing request", i);
    const data = requests[i];
    if (!data) continue;

    // Deserialize the request
    let serializedReq;
    try {
      serializedReq = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse data:", e);
      console.log("=============");
      console.log(data);
      console.log("=============");
      continue;
    }

    // Create mock request object
    const mockSocket = new net.Socket();
    const req = new IncomingMessage(mockSocket);
    req.method = serializedReq.method;
    req.url = serializedReq.url;
    req.headers = serializedReq.headers;

    // console.log("Request", serializedReq);

    if (serializedReq.body) {
      req.push(serializedReq.body);
      req.push(null);
    }

    // Create response object that captures the response
    const res = new ServerResponse(req);
    const headers: Record<string, string | number | string[]> = {};

    // Capture headers when they're set
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name: string, value: string | number | string[]) {
      headers[name] = value;
      socket.write(
        "HEADERS:" +
          JSON.stringify({
            requestId: serializedReq.requestId,
            headers: { [name]: value },
          }) +
          "\n",
      );
      return originalSetHeader.call(this, name, value);
    };

    // Write method
    res.write = function (chunk) {
      // console.log("Writing", chunk);

      if (chunk) {
        socket.write(
          JSON.stringify({
            requestId: serializedReq.requestId,
            body: Buffer.from(chunk).toString("base64"),
          }) + "\n",
        );
      }
      return true;
    };

    // End method
    res.end = function (chunk?: string | Buffer) {
      // console.log("Ending", chunk);
      // console.log("Completing request", serializedReq.requestId);
      if (chunk) {
        socket.write(
          JSON.stringify({
            requestId: serializedReq.requestId,
            body: Buffer.from(chunk).toString("base64"),
          }) + "\n",
        );
      }
      socket.write(
        JSON.stringify({
          requestId: serializedReq.requestId,
          body: "",
        }) + "\n",
      );
      this.finished = true;
      this.emit("finish");
      return true;
    };

    // Writehead method
    res.writeHead = function (
      statusCode: number,
      statusMessage?: string | any,
      headers?: any,
    ) {
      if (typeof statusMessage === "object" && !headers) {
        headers = statusMessage;
        statusMessage = undefined;
      }

      if (headers) {
        for (const [name, value] of Object.entries(headers)) {
          this.setHeader(name, value as string | number | string[]);
        }
      }

      this.statusCode = statusCode;
      if (statusMessage) {
        this.statusMessage = statusMessage as string;
      }

      return this;
    };

    // Additional property overrides
    // res.headersSent = false;
    res.sendDate = true;

    // Override getHeader method
    const originalGetHeader = res.getHeader;
    res.getHeader = function (name: string) {
      return headers[name.toLowerCase()] || originalGetHeader.call(this, name);
    };

    // Override removeHeader method
    const originalRemoveHeader = res.removeHeader;
    res.removeHeader = function (name: string) {
      delete headers[name.toLowerCase()];
      return originalRemoveHeader.call(this, name);
    };

    // Override hasHeader method
    const originalHasHeader = res.hasHeader;
    res.hasHeader = function (name: string) {
      return (
        name.toLowerCase() in headers || originalHasHeader.call(this, name)
      );
    };

    // getHeaderNames method
    res.getHeaderNames = function () {
      return Object.keys(headers);
    };

    // getHeaders method
    res.getHeaders = function () {
      return { ...headers };
    };

    // Additional event handling
    res.on("pipe", () => {
      // Handle pipe events if needed
    });

    res.on("finish", () => {
      // Handle finish events if needed
    });

    res.on("close", () => {
      // Handle close events if needed
    });
    // Parse URL and handle the request
    const parsedUrl = parse(serializedReq.url, true);
    // console.log("Handling", serializedReq.requestId, serializedReq.url);
    await handle(req, res, parsedUrl);
  }
});

socket.on("error", (err) => {
  console.error("Socket error:", err);
});
