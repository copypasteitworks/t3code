import "../index.css";

import {
  EventId,
  ORCHESTRATION_WS_CHANNELS,
  ORCHESTRATION_WS_METHODS,
  type MessageId,
  type OrchestrationEvent,
  type OrchestrationReadModel,
  type ProjectId,
  type ServerConfig,
  type ThreadId,
  type WsWelcomePayload,
  WS_CHANNELS,
  WS_METHODS,
} from "@t3tools/contracts";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { HttpResponse, http, ws } from "msw";
import { setupWorker } from "msw/browser";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

vi.mock("../components/DiffWorkerPoolProvider", () => ({
  DiffWorkerPoolProvider: ({ children }: { children: ReactNode }) => children,
}));

import { useComposerDraftStore } from "../composerDraftStore";
import { getRouter } from "../router";
import { useStore } from "../store";

const THREAD_ID = "thread-bootstrap-test" as ThreadId;
const PROJECT_ID = "project-bootstrap-test" as ProjectId;
const NOW_ISO = "2026-03-12T12:00:00.000Z";
const INITIAL_BOOTSTRAP_ERROR = "Initial bootstrap snapshot failed.";
const POST_HYDRATION_ERROR = "Post-hydration snapshot failed.";

interface TestFixture {
  snapshot: OrchestrationReadModel;
  serverConfig: ServerConfig;
  welcome: WsWelcomePayload;
}

type SnapshotBehavior =
  | { kind: "success"; snapshot: OrchestrationReadModel }
  | { kind: "error"; message: string };

let fixture: TestFixture;
let snapshotBehavior: SnapshotBehavior;
let snapshotRequestCount = 0;
let wsClient: { send: (data: string) => void } | null = null;
let pushSequence = 1;

const wsLink = ws.link(/ws(s)?:\/\/.*/);

function createBaseServerConfig(): ServerConfig {
  return {
    cwd: "/repo/project",
    keybindingsConfigPath: "/repo/project/.t3code-keybindings.json",
    keybindings: [],
    issues: [],
    providers: [
      {
        provider: "codex",
        status: "ready",
        available: true,
        authStatus: "authenticated",
        checkedAt: NOW_ISO,
      },
    ],
    availableEditors: [],
  };
}

function createSnapshot(): OrchestrationReadModel {
  return {
    snapshotSequence: 1,
    projects: [
      {
        id: PROJECT_ID,
        title: "Project",
        workspaceRoot: "/repo/project",
        defaultModel: "gpt-5",
        scripts: [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
      },
    ],
    threads: [
      {
        id: THREAD_ID,
        projectId: PROJECT_ID,
        title: "Bootstrap test thread",
        model: "gpt-5",
        interactionMode: "default",
        runtimeMode: "full-access",
        branch: "main",
        worktreePath: null,
        latestTurn: null,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
        messages: [
          {
            id: "msg-user-bootstrap" as MessageId,
            role: "user",
            text: "bootstrap",
            turnId: null,
            streaming: false,
            createdAt: NOW_ISO,
            updatedAt: NOW_ISO,
          },
        ],
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        session: {
          threadId: THREAD_ID,
          status: "ready",
          providerName: "codex",
          runtimeMode: "full-access",
          activeTurnId: null,
          lastError: null,
          updatedAt: NOW_ISO,
        },
      },
    ],
    updatedAt: NOW_ISO,
  };
}

function buildFixture(): TestFixture {
  return {
    snapshot: createSnapshot(),
    serverConfig: createBaseServerConfig(),
    welcome: {
      cwd: "/repo/project",
      projectName: "Project",
      bootstrapProjectId: PROJECT_ID,
      bootstrapThreadId: THREAD_ID,
    },
  };
}

function resolveWsRpc(method: string): { result?: unknown; error?: { message: string } } {
  if (method === ORCHESTRATION_WS_METHODS.getSnapshot) {
    snapshotRequestCount += 1;
    if (snapshotBehavior.kind === "error") {
      return { error: { message: snapshotBehavior.message } };
    }
    return { result: snapshotBehavior.snapshot };
  }
  if (method === WS_METHODS.serverGetConfig) {
    return { result: fixture.serverConfig };
  }
  if (method === WS_METHODS.gitListBranches) {
    return {
      result: {
        isRepo: true,
        hasOriginRemote: true,
        branches: [{ name: "main", current: true, isDefault: true, worktreePath: null }],
      },
    };
  }
  if (method === WS_METHODS.gitStatus) {
    return {
      result: {
        branch: "main",
        hasWorkingTreeChanges: false,
        workingTree: { files: [], insertions: 0, deletions: 0 },
        hasUpstream: true,
        aheadCount: 0,
        behindCount: 0,
        pr: null,
      },
    };
  }
  if (method === WS_METHODS.projectsSearchEntries) {
    return { result: { entries: [], truncated: false } };
  }
  return { result: {} };
}

const worker = setupWorker(
  wsLink.addEventListener("connection", ({ client }) => {
    wsClient = client;
    pushSequence = 1;
    client.send(
      JSON.stringify({
        type: "push",
        sequence: pushSequence++,
        channel: WS_CHANNELS.serverWelcome,
        data: fixture.welcome,
      }),
    );
    client.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      let request: { id: string; body: { _tag: string } };
      try {
        request = JSON.parse(event.data);
      } catch {
        return;
      }

      const method = request.body?._tag;
      if (typeof method !== "string") {
        return;
      }
      client.send(
        JSON.stringify({
          id: request.id,
          ...resolveWsRpc(method),
        }),
      );
    });
  }),
  http.get("*/attachments/:attachmentId", () => new HttpResponse(null, { status: 204 })),
  http.get("*/api/project-favicon", () => new HttpResponse(null, { status: 204 })),
);

function setSnapshotSuccess(snapshot = fixture.snapshot) {
  snapshotBehavior = { kind: "success", snapshot };
}

function setSnapshotError(message: string) {
  snapshotBehavior = { kind: "error", message };
}

function sendDomainEventPush() {
  if (!wsClient) {
    throw new Error("WebSocket client not connected");
  }
  const session = fixture.snapshot.threads[0]?.session;
  if (!session) {
    throw new Error("Fixture thread session is required");
  }

  const eventSequence = Math.max(pushSequence, fixture.snapshot.snapshotSequence + 1);

  const event: OrchestrationEvent = {
    sequence: eventSequence,
    eventId: EventId.makeUnsafe(`event-${eventSequence}`),
    aggregateKind: "thread",
    aggregateId: THREAD_ID,
    occurredAt: NOW_ISO,
    commandId: null,
    causationEventId: null,
    correlationId: null,
    metadata: {},
    type: "thread.session-set",
    payload: {
      threadId: THREAD_ID,
      session,
    },
  };

  wsClient.send(
    JSON.stringify({
      type: "push",
      sequence: pushSequence++,
      channel: ORCHESTRATION_WS_CHANNELS.domainEvent,
      data: event,
    }),
  );
}

async function waitForComposerEditor(): Promise<void> {
  await expect.element(page.getByTestId("composer-editor")).toBeInTheDocument();
}

async function waitForFatalBootstrapScreen(): Promise<void> {
  await expect.element(page.getByText("Unable to initialize app state.")).toBeInTheDocument();
}

async function waitForNoFatalBootstrapScreen(): Promise<void> {
  await vi.waitFor(
    () => {
      expect(document.body.textContent ?? "").not.toContain("Unable to initialize app state.");
    },
    { timeout: 8_000, interval: 16 },
  );
}

async function mountApp() {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.width = "100vw";
  host.style.height = "100vh";
  host.style.display = "grid";
  host.style.overflow = "hidden";
  document.body.append(host);

  const router = getRouter(createMemoryHistory({ initialEntries: ["/"] }));
  const screen = await render(<RouterProvider router={router} />, { container: host });

  return {
    router,
    cleanup: async () => {
      await screen.unmount();
      host.remove();
    },
  };
}

describe("Root bootstrap failure handling", () => {
  beforeAll(async () => {
    fixture = buildFixture();
    setSnapshotSuccess(fixture.snapshot);
    await worker.start({
      onUnhandledRequest: "bypass",
      quiet: true,
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  beforeEach(() => {
    fixture = buildFixture();
    snapshotRequestCount = 0;
    pushSequence = 1;
    localStorage.clear();
    document.body.innerHTML = "";
    useComposerDraftStore.setState({
      draftsByThreadId: {},
      draftThreadsByThreadId: {},
      projectDraftThreadIdByProjectId: {},
    });
    useStore.setState({
      projects: [],
      threads: [],
      threadsHydrated: false,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a fatal bootstrap screen when the first snapshot request fails", async () => {
    setSnapshotError(INITIAL_BOOTSTRAP_ERROR);

    const mounted = await mountApp();

    try {
      await waitForFatalBootstrapScreen();
      await vi.waitFor(
        () => {
          expect(document.body.textContent ?? "").toContain(INITIAL_BOOTSTRAP_ERROR);
        },
        { timeout: 8_000, interval: 16 },
      );

      await page.getByText("Show error details").click();
      await vi.waitFor(
        () => {
          const details = document.querySelector("details[open] pre")?.textContent ?? "";
          expect(details).toContain(INITIAL_BOOTSTRAP_ERROR);
        },
        { timeout: 8_000, interval: 16 },
      );

      expect(useStore.getState().threadsHydrated).toBe(false);
    } finally {
      await mounted.cleanup();
    }
  });

  it("retries bootstrap and recovers once snapshot loading succeeds", async () => {
    setSnapshotError(INITIAL_BOOTSTRAP_ERROR);

    const mounted = await mountApp();

    try {
      await waitForFatalBootstrapScreen();
      expect(snapshotRequestCount).toBeGreaterThanOrEqual(1);

      setSnapshotSuccess();
      await page.getByRole("button", { name: "Retry bootstrap" }).click();

      await waitForComposerEditor();
      await waitForNoFatalBootstrapScreen();
      await vi.waitFor(
        () => {
          expect(mounted.router.state.location.pathname).toBe(`/${THREAD_ID}`);
        },
        { timeout: 8_000, interval: 16 },
      );
      expect(useStore.getState().threadsHydrated).toBe(true);
      expect(snapshotRequestCount).toBeGreaterThanOrEqual(2);
    } finally {
      await mounted.cleanup();
    }
  });

  it("keeps later snapshot failures non-fatal after hydration", async () => {
    setSnapshotSuccess();

    const mounted = await mountApp();

    try {
      await waitForComposerEditor();
      expect(useStore.getState().threadsHydrated).toBe(true);

      setSnapshotError(POST_HYDRATION_ERROR);
      const requestCountBeforePush = snapshotRequestCount;
      sendDomainEventPush();

      await vi.waitFor(
        () => {
          expect(snapshotRequestCount).toBeGreaterThan(requestCountBeforePush);
        },
        { timeout: 8_000, interval: 16 },
      );

      await waitForComposerEditor();
      expect(document.body.textContent ?? "").not.toContain("Unable to initialize app state.");
      expect(document.body.textContent ?? "").not.toContain(POST_HYDRATION_ERROR);
      expect(useStore.getState().threadsHydrated).toBe(true);
    } finally {
      await mounted.cleanup();
    }
  });
});
