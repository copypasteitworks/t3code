import http from "node:http";
import { randomUUID } from "node:crypto";

export interface ClaudeCodeHookGatewayResponse {
  readonly exitCode: number;
  readonly stdout?: string;
  readonly stderr?: string;
}

export interface ClaudeCodeTurnHookRegistration {
  readonly token: string;
  readonly baseUrl: string;
  readonly dispose: () => void;
}

export interface ClaudeCodeHookGateway {
  readonly baseUrl: string;
  readonly registerTurn: (input: {
    readonly onEvent: (
      eventName: string,
      payload: unknown,
    ) => Promise<ClaudeCodeHookGatewayResponse>;
  }) => ClaudeCodeTurnHookRegistration;
  readonly close: () => Promise<void>;
}

export async function createClaudeCodeHookGateway(): Promise<ClaudeCodeHookGateway> {
  const handlers = new Map<
    string,
    (eventName: string, payload: unknown) => Promise<ClaudeCodeHookGatewayResponse>
  >();
  const server = http.createServer(async (request, response) => {
    try {
      if (request.method !== "POST" || !request.url) {
        response.writeHead(404).end();
        return;
      }
      const match = request.url.match(/^\/turn\/([^/]+)\/([^/]+)$/);
      if (!match) {
        response.writeHead(404).end();
        return;
      }
      const [, token, eventName] = match;
      if (!token || !eventName) {
        response.writeHead(404).end();
        return;
      }
      const handler = token ? handlers.get(token) : undefined;
      if (!handler) {
        response.writeHead(404).end();
        return;
      }
      const body = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
        );
        request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        request.on("error", reject);
      });
      const payload = body.trim().length > 0 ? JSON.parse(body) : {};
      const result = await handler(eventName, payload);
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          exitCode: 1,
          stderr: error instanceof Error ? error.message : String(error),
        } satisfies ClaudeCodeHookGatewayResponse),
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Claude hook gateway failed to bind an HTTP port.");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    registerTurn: ({ onEvent }) => {
      const token = randomUUID();
      handlers.set(token, onEvent);
      return {
        token,
        baseUrl: `${baseUrl}/turn/${token}`,
        dispose: () => {
          handlers.delete(token);
        },
      };
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
