import { beforeEach, describe, expect, test } from "bun:test";
import { AGENT_STEPS } from "@/store/agents";
import { useBoardStore } from "@/store/board-store";

const store = () => useBoardStore.getState();

function cardById(id: string) {
  const card = store().cards.find((c) => c.id === id);
  if (!card) throw new Error(`missing card ${id}`);
  return card;
}

function lastToast() {
  const toasts = store().toasts;
  return toasts[toasts.length - 1];
}

/** Drive one running agent to completion. */
function finishAgent(id: string) {
  for (let i = 0; i < AGENT_STEPS.length; i++) {
    store().advanceAgent(id);
  }
}

beforeEach(() => {
  globalThis.localStorage.clear();
  store().resetBoard();
});

describe("launching agents via Todo", () => {
  test("a drop in Todo starts an agent and moves the card to In progress", () => {
    store().moveCard("seed-0", "todo");
    const card = cardById("seed-0");
    expect(card.status).toBe("in-progress");
    expect(card.agent.state).toBe("running");
    expect(card.agent.step).toBe(0);
    expect(card.agent.log.length).toBe(1);
    expect(store().running).toEqual(["seed-0"]);
    expect(lastToast().message).toBe("Agent launched");
  });

  test("the fourth agent queues FIFO with a slot message", () => {
    store().moveCard("seed-0", "todo");
    store().moveCard("seed-1", "todo");
    store().moveCard("seed-2", "todo");
    store().moveCard("seed-3", "todo");
    store().moveCard("seed-4", "todo");

    expect(store().running).toEqual(["seed-0", "seed-1", "seed-2"]);
    expect(store().queue).toEqual(["seed-3", "seed-4"]);
    const queued = cardById("seed-3");
    expect(queued.status).toBe("todo");
    expect(queued.agent.state).toBe("queued");
    expect(
      store().toasts.some((t) =>
        t.message.includes("waiting for a free slot (3 agents at most)")
      )
    ).toBe(true);
  });

  test("starting an agent for a running card shows the red toast and does not move it", () => {
    store().moveCard("seed-0", "todo");
    store().moveCard("seed-0", "todo");
    expect(lastToast().message).toBe("An agent is already running for this item.");
    expect(lastToast().variant).toBe("destructive");
    expect(cardById("seed-0").status).toBe("in-progress");
    expect(store().running).toEqual(["seed-0"]);
  });
});

describe("agent lifecycle", () => {
  test("a finished agent moves the card to Review with an example PR chip", () => {
    store().moveCard("seed-0", "todo");
    finishAgent("seed-0");

    const card = cardById("seed-0");
    expect(card.status).toBe("review");
    expect(card.agent.state).toBe("done");
    expect(card.agent.pr?.number).toBe(123);
    expect(card.agent.pr?.summary).toContain("(example)");
    expect(card.agent.log.length).toBe(AGENT_STEPS.length);
    expect(store().running).toEqual([]);
    expect(store().prCounter).toBe(124);
  });

  test("finishing frees a slot and auto-starts the oldest queued card", () => {
    for (const id of ["seed-0", "seed-1", "seed-2", "seed-3", "seed-4"]) {
      store().moveCard(id, "todo");
    }
    finishAgent("seed-0");

    expect(store().running).toEqual(["seed-1", "seed-2", "seed-3"]);
    expect(store().queue).toEqual(["seed-4"]);
    const promoted = cardById("seed-3");
    expect(promoted.status).toBe("in-progress");
    expect(promoted.agent.state).toBe("running");
  });

  test("Stop returns the card to Todo and promotes the queue", () => {
    for (const id of ["seed-0", "seed-1", "seed-2", "seed-3"]) {
      store().moveCard(id, "todo");
    }
    store().stopAgent("seed-1");

    const stopped = cardById("seed-1");
    expect(stopped.status).toBe("todo");
    expect(stopped.agent.state).toBe("none");
    expect(store().running).toEqual(["seed-0", "seed-2", "seed-3"]);
    expect(store().queue).toEqual([]);
  });

  test("Approve moves Review to Done and keeps the PR chip", () => {
    store().moveCard("seed-0", "todo");
    finishAgent("seed-0");
    store().approve("seed-0");
    const card = cardById("seed-0");
    expect(card.status).toBe("done");
    expect(card.agent.pr?.number).toBe(123);
  });

  test("Request changes sends the card back through Todo and relaunches", () => {
    store().moveCard("seed-0", "todo");
    finishAgent("seed-0");
    store().requestChanges("seed-0");
    const card = cardById("seed-0");
    expect(card.status).toBe("in-progress");
    expect(card.agent.state).toBe("running");
    expect(card.agent.pr).toBeNull();
  });
});

describe("status transitions", () => {
  test("the dropdown can move a card to any plain status", () => {
    store().moveCard("seed-0", "skipped");
    expect(cardById("seed-0").status).toBe("skipped");
    store().moveCard("seed-0", "not-implemented");
    expect(cardById("seed-0").status).toBe("not-implemented");
    store().moveCard("seed-0", "new");
    expect(cardById("seed-0").status).toBe("new");
  });

  test("dragging a queued card out of Todo removes it from the queue", () => {
    for (const id of ["seed-0", "seed-1", "seed-2", "seed-3"]) {
      store().moveCard(id, "todo");
    }
    expect(store().queue).toEqual(["seed-3"]);
    store().moveCard("seed-3", "new");
    expect(store().queue).toEqual([]);
    expect(cardById("seed-3").agent.state).toBe("none");
  });

  test("moving a running card elsewhere cancels its agent and promotes the queue", () => {
    for (const id of ["seed-0", "seed-1", "seed-2", "seed-3"]) {
      store().moveCard(id, "todo");
    }
    store().moveCard("seed-0", "done");
    expect(cardById("seed-0").status).toBe("done");
    expect(cardById("seed-0").agent.state).toBe("none");
    expect(store().running).toEqual(["seed-1", "seed-2", "seed-3"]);
    expect(store().queue).toEqual([]);
  });
});

describe("settings", () => {
  test("raising max agents promotes queued cards FIFO", () => {
    for (const id of ["seed-0", "seed-1", "seed-2", "seed-3", "seed-4"]) {
      store().moveCard(id, "todo");
    }
    store().setMaxAgents(5);
    expect(store().running).toEqual([
      "seed-0",
      "seed-1",
      "seed-2",
      "seed-3",
      "seed-4",
    ]);
    expect(store().queue).toEqual([]);
  });

  test("max agents clamps to 1 through 5", () => {
    store().setMaxAgents(0);
    expect(store().maxAgents).toBe(1);
    store().setMaxAgents(9);
    expect(store().maxAgents).toBe(5);
  });

  test("lowering max agents does not kill running agents", () => {
    for (const id of ["seed-0", "seed-1", "seed-2"]) {
      store().moveCard(id, "todo");
    }
    store().setMaxAgents(1);
    expect(store().running.length).toBe(3);
    store().moveCard("seed-3", "todo");
    expect(store().queue).toEqual(["seed-3"]);
  });
});

describe("cards", () => {
  test("addCard puts the new card at the top of New", () => {
    store().addCard("Add a confetti burst when a card lands in Done.", "Animation");
    const first = store().cards[0];
    expect(first.status).toBe("new");
    expect(first.handle).toBe("you");
    expect(first.body).toContain("confetti");
  });

  test("addCard ignores empty input", () => {
    const before = store().cards.length;
    store().addCard("   ", "General");
    expect(store().cards.length).toBe(before);
  });

  test("pushFeedCard cycles through the pool at the top of New", () => {
    const before = store().cards.length;
    store().pushFeedCard();
    store().pushFeedCard();
    expect(store().cards.length).toBe(before + 2);
    expect(store().cards[0].status).toBe("new");
    expect(store().feedIndex).toBe(2);
  });
});
