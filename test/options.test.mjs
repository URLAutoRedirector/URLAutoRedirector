import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(testDir, "../src");
const html = await readFile(path.join(sourceDir, "options.html"), "utf8");
const script = await readFile(path.join(sourceDir, "options.js"), "utf8");

function createPage(options) {
  let storedOptions = structuredClone(options);
  const sentMessages = [];
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "https://extension.test/options.html",
  });
  const { window } = dom;

  window.chrome = {
    i18n: { getMessage: (key) => key },
    runtime: {
      sendMessage(message, callback) {
        sentMessages.push(message);
        if (callback) callback();
      },
      onMessage: { addListener() {} },
    },
    storage: {
      sync: {
        get(_key, callback) {
          callback({ options: structuredClone(storedOptions) });
        },
        set(value, callback) {
          storedOptions = structuredClone(value.options);
          callback();
        },
      },
    },
  };
  window.alert = () => {};
  window.confirm = () => true;
  window.URL.createObjectURL = () => "blob:test";
  window.URL.revokeObjectURL = () => {};
  window.eval(script);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

  return {
    close: () => dom.window.close(),
    document: window.document,
    sentMessages,
    storedOptions: () => structuredClone(storedOptions),
    window,
  };
}

function dragEvent(window, type, properties = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.entries(properties).forEach(([name, value]) => {
    Object.defineProperty(event, name, { value });
  });
  return event;
}

test("options HTML loads only its native options script", () => {
  const document = new JSDOM(html).window.document;
  assert.deepEqual(
    [...document.querySelectorAll("script[src]")].map((element) => element.getAttribute("src")),
    ["options.js"],
  );
  assert.ok(document.querySelector("#rule-list"));
  assert.ok(document.querySelector("#new-rule"));
});

test("options page renders and persists native rule edits", () => {
  const page = createPage({
    isNewTab: true,
    isNotify: true,
    rules: [{ src: "https://old.example", dst: "https://new.example", isRegex: false, isEnabled: true }],
  });
  const { document, window } = page;
  try {
    assert.equal(window.$, undefined);
    assert.equal(document.querySelectorAll(".rule-item").length, 1);
    assert.equal(document.querySelector("input[name='tabOption'][value='newTab']").checked, true);

    const source = document.querySelector(".src");
    source.value = "https://changed.example";
    source.dispatchEvent(new window.Event("change", { bubbles: true }));
    assert.equal(page.storedOptions().rules[0].src, "https://changed.example");

    const regex = document.querySelector(".is-regex");
    regex.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    assert.equal(regex.dataset.isRegex, "true");
    assert.equal(regex.classList.contains("icon-check-square-o"), true);
    assert.equal(page.storedOptions().rules[0].isRegex, true);
    assert.equal(page.sentMessages.at(-1).type, "syncOptions");
  } finally {
    page.close();
  }
});

test("desktop drag-and-drop reorders rules and saves the new order", () => {
  const page = createPage({
    isNewTab: false,
    isNotify: true,
    rules: [
      { src: "first", dst: "one", isRegex: false, isEnabled: true },
      { src: "second", dst: "two", isRegex: false, isEnabled: true },
    ],
  });
  const { document, window } = page;
  try {
    const [first, second] = document.querySelectorAll(".rule-item");
    const transfer = { effectAllowed: "", setData() {} };
    first.querySelector(".drag-item").dispatchEvent(dragEvent(window, "dragstart", { dataTransfer: transfer }));
    second.querySelector(".src").dispatchEvent(dragEvent(window, "dragover", { clientY: 100 }));
    first.querySelector(".drag-item").dispatchEvent(dragEvent(window, "dragend"));

    assert.deepEqual(
      [...document.querySelectorAll(".src")].map((input) => input.value),
      ["second", "first"],
    );
    assert.deepEqual(
      page.storedOptions().rules.map((rule) => rule.src),
      ["second", "first"],
    );
  } finally {
    page.close();
  }
});
