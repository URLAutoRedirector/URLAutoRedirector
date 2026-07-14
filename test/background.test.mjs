import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.resolve(testDir, "../src/background.js"), "utf8");

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createBackground({ options, localData = {} } = {}) {
  let storedOptions = clone(options);
  const listeners = {};
  const api = {
    localClears: 0,
    notifications: [],
    runtimeMessages: [],
    syncSets: [],
    tabCreates: [],
    tabUpdates: [],
  };

  const context = {
    chrome: {
      i18n: { getMessage: (key) => `message:${key}` },
      notifications: {
        create(details) {
          api.notifications.push(clone(details));
        },
      },
      runtime: {
        getURL: (path) => `chrome-extension://test/${path}`,
        onInstalled: { addListener: (listener) => (listeners.installed = listener) },
        onMessage: { addListener: (listener) => (listeners.message = listener) },
        sendMessage(message, callback) {
          api.runtimeMessages.push(clone(message));
          callback?.();
        },
      },
      storage: {
        local: {
          clear() {
            api.localClears += 1;
          },
          get(_key, callback) {
            callback(clone(localData));
          },
        },
        sync: {
          get(_key, callback) {
            callback(storedOptions === undefined ? {} : { options: clone(storedOptions) });
          },
          set(value, callback) {
            api.syncSets.push(clone(value));
            storedOptions = clone(value.options);
            callback?.();
          },
        },
      },
      tabs: {
        create(details, callback) {
          api.tabCreates.push(clone(details));
          callback?.({});
        },
        onUpdated: { addListener: (listener) => (listeners.tabUpdated = listener) },
        update(tabId, details) {
          api.tabUpdates.push([tabId, clone(details)]);
        },
      },
    },
    console: { log() {} },
  };

  vm.runInNewContext(source, context, { filename: "background.js" });
  return { api, context, listeners, storedOptions: () => clone(storedOptions) };
}

test("matchUrl redirects enabled exact and regular-expression rules only", () => {
  const background = createBackground({
    options: {
      isNewTab: false,
      isNotify: true,
      rules: [
        { src: "^https://old\\.example/(.*)$", dst: "https://new.example/$1", isEnabled: true, isRegex: true },
        { src: "https://disabled.example", dst: "https://ignored.example", isEnabled: false, isRegex: false },
        { src: "https://exact.example", dst: "https://target.example", isEnabled: true, isRegex: false },
      ],
    },
  });

  assert.equal(background.context.matchUrl("https://old.example/path"), "https://new.example/path");
  assert.equal(background.context.matchUrl("https://exact.example"), "https://target.example");
  assert.equal(background.context.matchUrl("https://disabled.example"), false);
  assert.equal(background.context.matchUrl("https://unmatched.example"), false);
  assert.equal(createBackground().context.matchUrl("https://old.example/path"), false);
});

test("tab updates replace the current tab and notify after it finishes loading", () => {
  const background = createBackground({
    options: {
      isNewTab: false,
      isNotify: true,
      rules: [{ src: "https://old.example", dst: "https://new.example", isEnabled: true, isRegex: false }],
    },
  });

  background.listeners.tabUpdated(7, { status: "loading", url: "https://old.example" });
  assert.deepEqual(background.api.tabUpdates, [[7, { url: "https://new.example" }]]);
  assert.equal(background.api.notifications.length, 0);

  background.listeners.tabUpdated(8, { status: "complete" });
  assert.equal(background.api.notifications.length, 0);
  background.listeners.tabUpdated(7, { status: "complete" });
  assert.deepEqual(background.api.notifications, [
    {
      type: "progress",
      iconUrl: "chrome-extension://test/images/icon-48.png",
      title: "message:ext_name",
      message: "message:prompt_msg",
      progress: 100,
    },
  ]);
});

test("new-tab redirects notify immediately", () => {
  const background = createBackground({
    options: {
      isNewTab: true,
      isNotify: true,
      rules: [{ src: "https://old.example", dst: "https://new.example", isEnabled: true, isRegex: false }],
    },
  });

  background.listeners.tabUpdated(7, { status: "loading", url: "https://old.example" });
  assert.deepEqual(background.api.tabCreates, [{ url: "https://new.example" }]);
  assert.deepEqual(background.api.tabUpdates, []);
  assert.equal(background.api.notifications.length, 1);
});

test("sync and reset messages update active rules and persist defaults", () => {
  const background = createBackground({
    options: {
      isNewTab: true,
      isNotify: true,
      rules: [],
    },
  });

  background.listeners.message({
    type: "syncOptions",
    options: {
      options: {
        isNewTab: false,
        isNotify: false,
        rules: [{ src: "^https://old\\.example/(.*)$", dst: "https://new.example/$1", isEnabled: true, isRegex: true }],
      },
    },
  });
  background.listeners.tabUpdated(3, { status: "loading", url: "https://old.example/path" });
  background.listeners.tabUpdated(3, { status: "complete" });
  assert.deepEqual(background.api.tabUpdates, [[3, { url: "https://new.example/path" }]]);
  assert.equal(background.api.notifications.length, 0);

  background.listeners.message({ type: "resetRules" });
  assert.deepEqual(background.api.runtimeMessages, [{ type: "reloadOptions" }]);
  assert.deepEqual(background.storedOptions().rules, clone(background.context.defaultOptions.options.rules));
});

test("installation saves defaults and updates migrate legacy local options", () => {
  const installation = createBackground();
  installation.listeners.installed({ reason: "install" });
  assert.deepEqual(installation.storedOptions(), clone(installation.context.defaultOptions.options));

  const legacyOptions = {
    options: {
      isNewTab: true,
      isNotify: false,
      rules: [{ src: "https://legacy.example", dst: "https://new.example", isEnabled: true, isRegex: false }],
    },
  };
  const update = createBackground({ localData: legacyOptions });
  update.listeners.installed({ reason: "update" });
  assert.equal(update.api.localClears, 1);
  assert.deepEqual(update.api.syncSets, [legacyOptions]);
});
