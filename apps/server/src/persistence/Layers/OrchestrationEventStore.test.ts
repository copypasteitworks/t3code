import { CommandId, EventId, ProjectId, ThreadId } from "@t3tools/contracts";
import { assert, it } from "@effect/vitest";
import { Effect, Layer, Schema, Stream } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { PersistenceDecodeError } from "../Errors.ts";
import { OrchestrationEventStore } from "../Services/OrchestrationEventStore.ts";
import { OrchestrationEventStoreLive } from "./OrchestrationEventStore.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";

const layer = it.layer(
  OrchestrationEventStoreLive.pipe(Layer.provideMerge(SqlitePersistenceMemory)),
);

layer("OrchestrationEventStore", (it) => {
  it.effect("stores json columns as strings and replays decoded events", () =>
    Effect.gen(function* () {
      const eventStore = yield* OrchestrationEventStore;
      const sql = yield* SqlClient.SqlClient;
      const now = new Date().toISOString();

      const appended = yield* eventStore.append({
        type: "project.created",
        eventId: EventId.makeUnsafe("evt-store-roundtrip"),
        aggregateKind: "project",
        aggregateId: ProjectId.makeUnsafe("project-roundtrip"),
        occurredAt: now,
        commandId: CommandId.makeUnsafe("cmd-store-roundtrip"),
        causationEventId: null,
        correlationId: CommandId.makeUnsafe("cmd-store-roundtrip"),
        metadata: {
          adapterKey: "codex",
        },
        payload: {
          projectId: ProjectId.makeUnsafe("project-roundtrip"),
          title: "Roundtrip Project",
          workspaceRoot: "/tmp/project-roundtrip",
          defaultModel: null,
          scripts: [],
          createdAt: now,
          updatedAt: now,
        },
      });

      const storedRows = yield* sql<{
        readonly payloadJson: string;
        readonly metadataJson: string;
      }>`
        SELECT
          payload_json AS "payloadJson",
          metadata_json AS "metadataJson"
        FROM orchestration_events
        WHERE event_id = ${appended.eventId}
      `;
      assert.equal(storedRows.length, 1);
      assert.equal(typeof storedRows[0]?.payloadJson, "string");
      assert.equal(typeof storedRows[0]?.metadataJson, "string");

      const replayed = yield* Stream.runCollect(eventStore.readFromSequence(0, 10)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      );
      assert.equal(replayed.length, 1);
      assert.equal(replayed[0]?.type, "project.created");
      assert.equal(replayed[0]?.metadata.adapterKey, "codex");
    }),
  );

  it.effect("fails with PersistenceDecodeError when stored json is invalid", () =>
    Effect.gen(function* () {
      const eventStore = yield* OrchestrationEventStore;
      const sql = yield* SqlClient.SqlClient;
      const now = new Date().toISOString();

      yield* sql`
        INSERT INTO orchestration_events (
          event_id,
          aggregate_kind,
          stream_id,
          stream_version,
          event_type,
          occurred_at,
          command_id,
          causation_event_id,
          correlation_id,
          actor_kind,
          payload_json,
          metadata_json
        )
        VALUES (
          ${EventId.makeUnsafe("evt-store-invalid-json")},
          ${"project"},
          ${ProjectId.makeUnsafe("project-invalid-json")},
          ${0},
          ${"project.created"},
          ${now},
          ${CommandId.makeUnsafe("cmd-store-invalid-json")},
          ${null},
          ${null},
          ${"server"},
          ${"{"},
          ${"{}"}
        )
      `;

      const replayResult = yield* Effect.result(
        Stream.runCollect(eventStore.readFromSequence(0, 10)),
      );
      assert.equal(replayResult._tag, "Failure");
      if (replayResult._tag === "Failure") {
        assert.ok(Schema.is(PersistenceDecodeError)(replayResult.failure));
        assert.ok(
          replayResult.failure.operation.includes(
            "OrchestrationEventStore.readFromSequence:decodeRows",
          ),
        );
      }
    }),
  );

  it.effect("normalizes legacy Claude turn-start events during replay", () =>
    Effect.gen(function* () {
      const eventStore = yield* OrchestrationEventStore;
      const sql = yield* SqlClient.SqlClient;
      const now = new Date().toISOString();
      const sequenceRows = yield* sql<{ readonly maxSequence: number | null }>`
        SELECT MAX(sequence) AS "maxSequence"
        FROM orchestration_events
      `;
      const maxSequence = sequenceRows[0]?.maxSequence ?? 0;

      yield* sql`
        INSERT INTO orchestration_events (
          event_id,
          aggregate_kind,
          stream_id,
          stream_version,
          event_type,
          occurred_at,
          command_id,
          causation_event_id,
          correlation_id,
          actor_kind,
          payload_json,
          metadata_json
        )
        VALUES (
          ${EventId.makeUnsafe("evt-store-legacy-claude-turn-start")},
          ${"thread"},
          ${ThreadId.makeUnsafe("thread-legacy-claude")},
          ${0},
          ${"thread.turn-start-requested"},
          ${now},
          ${CommandId.makeUnsafe("cmd-store-legacy-claude-turn-start")},
          ${null},
          ${null},
          ${"client"},
          ${JSON.stringify({
            threadId: ThreadId.makeUnsafe("thread-legacy-claude"),
            messageId: "msg-legacy-claude",
            provider: "claude",
            model: "claude-sonnet-4-6",
            modelOptions: {
              claude: {
                effort: "high",
              },
            },
            providerOptions: {
              claude: {
                binaryPath: "claude",
              },
            },
            assistantDeliveryMode: "buffered",
            runtimeMode: "full-access",
            interactionMode: "default",
            createdAt: now,
          })},
          ${"{}"}
        )
      `;

      const replayed = yield* Stream.runCollect(eventStore.readFromSequence(maxSequence, 10)).pipe(
        Effect.map((chunk) => Array.from(chunk)),
      );

      assert.equal(replayed.length, 1);
      assert.equal(replayed[0]?.type, "thread.turn-start-requested");
      if (replayed[0]?.type === "thread.turn-start-requested") {
        assert.equal(replayed[0].payload.provider, "claudeCode");
        assert.deepEqual(replayed[0].payload.modelOptions, {
          claudeCode: {
            effort: "high",
          },
        });
        assert.deepEqual(replayed[0].payload.providerOptions, {
          claudeCode: {
            binaryPath: "claude",
          },
        });
      }
    }),
  );

  it.effect(
    "drops unsupported provider payload fields during replay instead of failing startup",
    () =>
      Effect.gen(function* () {
        const eventStore = yield* OrchestrationEventStore;
        const sql = yield* SqlClient.SqlClient;
        const now = new Date().toISOString();
        const sequenceRows = yield* sql<{ readonly maxSequence: number | null }>`
        SELECT MAX(sequence) AS "maxSequence"
        FROM orchestration_events
      `;
        const maxSequence = sequenceRows[0]?.maxSequence ?? 0;

        yield* sql`
        INSERT INTO orchestration_events (
          event_id,
          aggregate_kind,
          stream_id,
          stream_version,
          event_type,
          occurred_at,
          command_id,
          causation_event_id,
          correlation_id,
          actor_kind,
          payload_json,
          metadata_json
        )
        VALUES (
          ${EventId.makeUnsafe("evt-store-unsupported-provider-turn-start")},
          ${"thread"},
          ${ThreadId.makeUnsafe("thread-unsupported-provider")},
          ${0},
          ${"thread.turn-start-requested"},
          ${now},
          ${CommandId.makeUnsafe("cmd-store-unsupported-provider-turn-start")},
          ${null},
          ${null},
          ${"client"},
          ${JSON.stringify({
            threadId: ThreadId.makeUnsafe("thread-unsupported-provider"),
            messageId: "msg-unsupported-provider",
            provider: "unsupported-provider",
            providerOptions: {
              unsupportedProvider: {
                enabled: true,
              },
            },
            modelOptions: {
              unsupportedProvider: {
                effort: "high",
              },
            },
            assistantDeliveryMode: "buffered",
            runtimeMode: "full-access",
            interactionMode: "default",
            createdAt: now,
          })},
          ${"{}"}
        )
      `;

        const replayed = yield* Stream.runCollect(
          eventStore.readFromSequence(maxSequence, 10),
        ).pipe(Effect.map((chunk) => Array.from(chunk)));

        assert.equal(replayed.length, 1);
        assert.equal(replayed[0]?.type, "thread.turn-start-requested");
        if (replayed[0]?.type === "thread.turn-start-requested") {
          assert.equal(replayed[0].payload.provider, undefined);
          assert.equal(replayed[0].payload.providerOptions, undefined);
          assert.equal(replayed[0].payload.modelOptions, undefined);
        }
      }),
  );
});
