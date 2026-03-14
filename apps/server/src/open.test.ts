import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { assertSuccess } from "@effect/vitest/utils";
import { FileSystem, Path, Effect } from "effect";
import { describe } from "vitest";

import {
  isCommandAvailable,
  launchDetached,
  resolveAvailableEditors,
  resolveAvailableOpenTargets,
  resolveEditorLaunch,
  resolveWorkspaceLaunch,
} from "./open";

it.layer(NodeServices.layer)("resolveEditorLaunch", (it) => {
  it.effect("returns commands for command-based editors", () =>
    Effect.gen(function* () {
      const antigravityLaunch = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "antigravity" },
        "darwin",
      );
      assert.deepEqual(antigravityLaunch, {
        command: "agy",
        args: ["/tmp/workspace"],
      });

      const cursorLaunch = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "cursor" },
        "darwin",
      );
      assert.deepEqual(cursorLaunch, {
        command: "cursor",
        args: ["/tmp/workspace"],
      });

      const vscodeLaunch = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "vscode" },
        "darwin",
      );
      assert.deepEqual(vscodeLaunch, {
        command: "code",
        args: ["/tmp/workspace"],
      });

      const zedLaunch = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "zed" },
        "darwin",
      );
      assert.deepEqual(zedLaunch, {
        command: "zed",
        args: ["/tmp/workspace"],
      });
    }),
  );

  it.effect("uses --goto when editor supports line/column suffixes", () =>
    Effect.gen(function* () {
      const lineOnly = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace/AGENTS.md:48", editor: "cursor" },
        "darwin",
      );
      assert.deepEqual(lineOnly, {
        command: "cursor",
        args: ["--goto", "/tmp/workspace/AGENTS.md:48"],
      });

      const lineAndColumn = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace/src/open.ts:71:5", editor: "cursor" },
        "darwin",
      );
      assert.deepEqual(lineAndColumn, {
        command: "cursor",
        args: ["--goto", "/tmp/workspace/src/open.ts:71:5"],
      });

      const vscodeLineAndColumn = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace/src/open.ts:71:5", editor: "vscode" },
        "darwin",
      );
      assert.deepEqual(vscodeLineAndColumn, {
        command: "code",
        args: ["--goto", "/tmp/workspace/src/open.ts:71:5"],
      });

      const zedLineAndColumn = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace/src/open.ts:71:5", editor: "zed" },
        "darwin",
      );
      assert.deepEqual(zedLineAndColumn, {
        command: "zed",
        args: ["/tmp/workspace/src/open.ts:71:5"],
      });
    }),
  );

  it.effect("maps file-manager editor to OS open commands", () =>
    Effect.gen(function* () {
      const launch1 = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "file-manager" },
        "darwin",
      );
      assert.deepEqual(launch1, {
        command: "open",
        args: ["/tmp/workspace"],
      });

      const launch2 = yield* resolveEditorLaunch(
        { cwd: "C:\\workspace", editor: "file-manager" },
        "win32",
      );
      assert.deepEqual(launch2, {
        command: "explorer",
        args: ["C:\\workspace"],
      });

      const launch3 = yield* resolveEditorLaunch(
        { cwd: "/tmp/workspace", editor: "file-manager" },
        "linux",
      );
      assert.deepEqual(launch3, {
        command: "xdg-open",
        args: ["/tmp/workspace"],
      });
    }),
  );
});

it.layer(NodeServices.layer)("resolveWorkspaceLaunch", (it) => {
  it.effect("returns editor-backed workspace launches for existing workspace targets", () =>
    Effect.gen(function* () {
      const cursorLaunch = yield* resolveWorkspaceLaunch(
        { cwd: "/tmp/workspace", target: "cursor" },
        "darwin",
      );
      assert.deepEqual(cursorLaunch, {
        command: "cursor",
        args: ["/tmp/workspace"],
      });

      const fileManagerLaunch = yield* resolveWorkspaceLaunch(
        { cwd: "/tmp/workspace", target: "file-manager" },
        "linux",
      );
      assert.deepEqual(fileManagerLaunch, {
        command: "xdg-open",
        args: ["/tmp/workspace"],
      });
    }),
  );

  it.effect("uses AppleScript for Ghostty on macOS", () =>
    Effect.gen(function* () {
      const launch = yield* resolveWorkspaceLaunch(
        { cwd: "/tmp/workspace", target: "ghostty" },
        "darwin",
      );

      assert.deepEqual(launch, {
        command: "osascript",
        args: [
          "-e",
          [
            'tell application "Ghostty"',
            "    activate",
            "    set cfg to new surface configuration",
            '    set initial working directory of cfg to "/tmp/workspace"',
            "    new window with configuration cfg",
            "end tell",
          ].join("\n"),
        ],
      });
    }),
  );

  it.effect("uses Ghostty CLI for Linux", () =>
    Effect.gen(function* () {
      const launch = yield* resolveWorkspaceLaunch(
        { cwd: "/tmp/workspace", target: "ghostty" },
        "linux",
      );

      assert.deepEqual(launch, {
        command: "ghostty",
        args: ["+new-window", "--working-directory", "/tmp/workspace"],
      });
    }),
  );

  it.effect("rejects Ghostty on unsupported platforms", () =>
    Effect.gen(function* () {
      const result = yield* resolveWorkspaceLaunch(
        { cwd: "C:\\workspace", target: "ghostty" },
        "win32",
      ).pipe(Effect.result);
      assert.equal(result._tag, "Failure");
    }),
  );
});

it.layer(NodeServices.layer)("launchDetached", (it) => {
  it.effect("resolves when command can be spawned", () =>
    Effect.gen(function* () {
      const result = yield* launchDetached({
        command: process.execPath,
        args: ["-e", "process.exit(0)"],
      }).pipe(Effect.result);
      assertSuccess(result, undefined);
    }),
  );

  it.effect("rejects when command does not exist", () =>
    Effect.gen(function* () {
      const result = yield* launchDetached({
        command: `t3code-no-such-command-${Date.now()}`,
        args: [],
      }).pipe(Effect.result);
      assert.equal(result._tag, "Failure");
    }),
  );
});

it.layer(NodeServices.layer)("isCommandAvailable", (it) => {
  it.effect("resolves win32 commands with PATHEXT", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-open-test-" });
      yield* fs.writeFileString(path.join(dir, "code.CMD"), "@echo off\r\n");
      const env = {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("code", { platform: "win32", env }), true);
    }),
  );

  it("returns false when a command is not on PATH", () => {
    const env = {
      PATH: "",
      PATHEXT: ".COM;.EXE;.BAT;.CMD",
    } satisfies NodeJS.ProcessEnv;
    assert.equal(isCommandAvailable("definitely-not-installed", { platform: "win32", env }), false);
  });

  it.effect("does not treat bare files without executable extension as available on win32", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-open-test-" });
      yield* fs.writeFileString(path.join(dir, "npm"), "echo nope\r\n");
      const env = {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("npm", { platform: "win32", env }), false);
    }),
  );

  it.effect("appends PATHEXT for commands with non-executable extensions on win32", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-open-test-" });
      yield* fs.writeFileString(path.join(dir, "my.tool.CMD"), "@echo off\r\n");
      const env = {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("my.tool", { platform: "win32", env }), true);
    }),
  );

  it.effect("uses platform-specific PATH delimiter for platform overrides", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const firstDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-open-test-" });
      const secondDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-open-test-" });
      yield* fs.writeFileString(path.join(firstDir, "code.CMD"), "@echo off\r\n");
      yield* fs.writeFileString(path.join(secondDir, "code.CMD"), "MZ");
      const env = {
        PATH: `${firstDir};${secondDir}`,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      } satisfies NodeJS.ProcessEnv;
      assert.equal(isCommandAvailable("code", { platform: "win32", env }), true);
    }),
  );
});

it.layer(NodeServices.layer)("resolveAvailableEditors", (it) => {
  it.effect("returns installed editors for command launches", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-editors-" });

      yield* fs.writeFileString(path.join(dir, "cursor.CMD"), "@echo off\r\n");
      yield* fs.writeFileString(path.join(dir, "explorer.CMD"), "MZ");
      const editors = resolveAvailableEditors("win32", {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      });
      assert.deepEqual(editors, ["cursor", "file-manager"]);
    }),
  );
});

describe("resolveAvailableOpenTargets", () => {
  it("returns Ghostty on macOS when the app is installed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-open-targets-darwin-"));
    try {
      fs.writeFileSync(path.join(dir, "cursor"), "#!/bin/sh\n", { mode: 0o755 });
      fs.writeFileSync(path.join(dir, "open"), "#!/bin/sh\n", { mode: 0o755 });

      const targets = resolveAvailableOpenTargets(
        "darwin",
        {
          PATH: dir,
        },
        {
          isMacApplicationAvailable: (appName) => appName === "Ghostty",
        },
      );
      assert.deepEqual(targets, ["cursor", "ghostty", "file-manager"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("omits Ghostty on macOS when the app is not installed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-open-targets-darwin-missing-"));
    try {
      fs.writeFileSync(path.join(dir, "cursor"), "#!/bin/sh\n", { mode: 0o755 });
      fs.writeFileSync(path.join(dir, "open"), "#!/bin/sh\n", { mode: 0o755 });
      fs.writeFileSync(path.join(dir, "ghostty"), "#!/bin/sh\n", { mode: 0o755 });

      const targets = resolveAvailableOpenTargets(
        "darwin",
        {
          PATH: dir,
        },
        {
          isMacApplicationAvailable: () => false,
        },
      );
      assert.deepEqual(targets, ["cursor", "file-manager"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns Ghostty on Linux only when the CLI is available", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-open-targets-"));
    try {
      fs.writeFileSync(path.join(dir, "cursor"), "#!/bin/sh\n", { mode: 0o755 });
      fs.writeFileSync(path.join(dir, "ghostty"), "#!/bin/sh\n", { mode: 0o755 });
      fs.writeFileSync(path.join(dir, "xdg-open"), "#!/bin/sh\n", { mode: 0o755 });

      const targets = resolveAvailableOpenTargets("linux", {
        PATH: dir,
      });
      assert.deepEqual(targets, ["cursor", "ghostty", "file-manager"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("omits Ghostty on unsupported platforms", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-open-targets-win-"));
    try {
      fs.writeFileSync(path.join(dir, "cursor.CMD"), "@echo off\r\n", "utf8");
      fs.writeFileSync(path.join(dir, "explorer.EXE"), "MZ", "utf8");

      const targets = resolveAvailableOpenTargets("win32", {
        PATH: dir,
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
      });
      assert.deepEqual(targets, ["cursor", "file-manager"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
