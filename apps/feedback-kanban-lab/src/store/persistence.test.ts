import { beforeEach, describe, expect, test } from "bun:test";
import { STORAGE_KEY, useBoardStore } from "@/store/board-store";

const store = () => useBoardStore.getState();

beforeEach(() => {
  globalThis.localStorage.clear();
  store().resetBoard();
});

describe("localStorage persistence", () => {
  test("writes board state under the versioned key", () => {
    store().setTitle("Sprint Feedback");
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.title).toBe("Sprint Feedback");
    expect(Array.isArray(parsed.state.cards)).toBe(true);
  });

  test("does not persist toasts or edit mode", () => {
    store().pushToast("hello");
    store().setEditMode(true);
    const parsed = JSON.parse(
      globalThis.localStorage.getItem(STORAGE_KEY) as string
    );
    expect(parsed.state.toasts).toBeUndefined();
    expect(parsed.state.editMode).toBeUndefined();
  });

  test("rehydrate restores a stored board, like a page reload", async () => {
    store().setTitle("Before reload");
    store().moveCard("seed-0", "todo");
    const raw = globalThis.localStorage.getItem(STORAGE_KEY) as string;

    store().resetBoard();
    expect(store().title).toBe("Demo Feedback");

    globalThis.localStorage.setItem(STORAGE_KEY, raw);
    await useBoardStore.persist.rehydrate();

    expect(store().title).toBe("Before reload");
    const card = store().cards.find((c) => c.id === "seed-0");
    expect(card?.status).toBe("in-progress");
    expect(store().running).toEqual(["seed-0"]);
  });

  test("resetBoard restores the seed", () => {
    store().setTitle("Renamed");
    store().moveCard("seed-0", "todo");
    store().resetBoard();
    expect(store().title).toBe("Demo Feedback");
    expect(store().running).toEqual([]);
    expect(store().queue).toEqual([]);
    expect(store().cards.find((c) => c.id === "seed-0")?.status).toBe("new");
  });
});

describe("export and import", () => {
  test("round trips the board through JSON", () => {
    store().setTitle("Exported board");
    store().setColumnName("new", "Inbox");
    store().moveCard("seed-0", "todo");
    const json = store().exportBoard();

    store().resetBoard();
    expect(store().title).toBe("Demo Feedback");

    expect(store().importBoard(json)).toBe(true);
    expect(store().title).toBe("Exported board");
    expect(store().columnNames.new).toBe("Inbox");
    expect(store().cards.find((c) => c.id === "seed-0")?.status).toBe(
      "in-progress"
    );
    expect(store().running).toEqual(["seed-0"]);
  });

  test("rejects invalid JSON without touching the board", () => {
    store().setTitle("Keep me");
    expect(store().importBoard("not json {")).toBe(false);
    expect(store().title).toBe("Keep me");
  });

  test("rejects JSON from another app", () => {
    const foreign = JSON.stringify({ app: "other", board: { cards: [] } });
    expect(store().importBoard(foreign)).toBe(false);
  });

  test("rejects cards with unknown statuses", () => {
    const bad = JSON.stringify({
      app: "feedback-kanban-lab",
      version: 1,
      board: { cards: [{ id: "x", body: "hi", status: "bogus" }] },
    });
    expect(store().importBoard(bad)).toBe(false);
  });
});
