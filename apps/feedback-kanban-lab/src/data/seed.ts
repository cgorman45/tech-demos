import type { Card, Category, Source } from "@/lib/types";
import { IDLE_AGENT } from "@/lib/types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface SeedInput {
  ref: string;
  handle: string;
  source: Source;
  sourceMeta?: string;
  age: number;
  body: string;
  tags: string[];
  category: Category;
}

function card(input: SeedInput, now: number, index: number): Card {
  return {
    id: `seed-${index}`,
    ref: input.ref,
    handle: input.handle,
    source: input.source,
    sourceMeta: input.sourceMeta ?? null,
    createdAt: now - input.age,
    body: input.body,
    tags: input.tags,
    category: input.category,
    status: "new",
    notes: "",
    agent: { ...IDLE_AGENT },
  };
}

/** Example feedback from colleagues reacting to Colton's tech demos. All of it is made up. */
const SEED_NEW: SeedInput[] = [
  {
    ref: "ef00de9e",
    handle: "maria.g",
    source: "text",
    age: 2 * HOUR,
    body: "Can the BD map show win rates per agency? A small percentage next to each city would do it.",
    tags: ["screened", "claude"],
    category: "Map",
  },
  {
    ref: "871a7517",
    handle: "dev.okafor",
    source: "voice",
    sourceMeta: "6s",
    age: 5 * HOUR,
    body: "Make the drafting animation slower. At full speed I lose track of which section is being written.",
    tags: ["screened"],
    category: "Animation",
  },
  {
    ref: "16feb346",
    handle: "j.chen",
    source: "email",
    age: 9 * HOUR,
    body: "Add a dark/light toggle. The projector in the big room washes out the dark theme.",
    tags: ["screened"],
    category: "General",
  },
  {
    ref: "9f105df7",
    handle: "sam.ortiz",
    source: "text",
    age: 11 * HOUR,
    body: "Export the pipeline chart as PNG so I can drop it into the Monday slides.",
    tags: ["screened", "claude"],
    category: "Data",
  },
  {
    ref: "58cbd157",
    handle: "priya.n",
    source: "voice",
    sourceMeta: "4s",
    age: 13 * HOUR,
    body: "The minimap sits on top of the last column on my laptop. Can it move or shrink?",
    tags: ["screened"],
    category: "Map",
  },
];

const SEED_TODO: SeedInput = {
  ref: "c4f50dcb",
  handle: "tom.b",
  source: "text",
  age: 10 * HOUR,
  body: "Show a one line summary of each agent run in the activity log, not just the step names.",
  tags: ["screened"],
  category: "Agents",
};

const SEED_REVIEW: SeedInput = {
  ref: "d20ba6ce",
  handle: "lena.k",
  source: "email",
  age: DAY,
  body: "The Review column empty state says 'Nothing her'. Missing an e.",
  tags: ["screened", "claude"],
  category: "Copy",
};

const SEED_DONE: SeedInput = {
  ref: "5b098d22",
  handle: "omar.f",
  source: "voice",
  sourceMeta: "3s",
  age: 2 * DAY,
  body: "Thanks for building this. The lead runner demo landed well with the group.",
  tags: ["screened"],
  category: "General",
};

export function seedCards(now: number = Date.now()): Card[] {
  const cards: Card[] = SEED_NEW.map((s, i) => card(s, now, i));

  const todo = card(SEED_TODO, now, 90);
  todo.status = "todo";
  cards.push(todo);

  const review = card(SEED_REVIEW, now, 91);
  review.status = "review";
  review.agent = {
    state: "done",
    step: -1,
    log: [],
    pr: {
      number: 122,
      summary:
        "Fixed the empty state copy in the Review column. 1 file changed, tests pass. (example)",
    },
  };
  cards.push(review);

  const done = card(SEED_DONE, now, 92);
  done.status = "done";
  cards.push(done);

  return cards;
}

export interface FeedItem {
  handle: string;
  source: Source;
  sourceMeta?: string;
  body: string;
  tags: string[];
  category: Category;
}

/** Pool the live feed cycles through. */
export const FEED_POOL: FeedItem[] = [
  {
    handle: "ana.p",
    source: "text",
    body: "Can we filter the board by category? I only care about Map items.",
    tags: ["screened"],
    category: "General",
  },
  {
    handle: "nick.d",
    source: "voice",
    sourceMeta: "5s",
    body: "The win rate tooltip rounds to whole numbers. One decimal would read better.",
    tags: ["screened", "claude"],
    category: "Data",
  },
  {
    handle: "j.chen",
    source: "email",
    body: "Column headers wrap on a 1280 wide screen. Could they truncate instead?",
    tags: ["screened"],
    category: "Copy",
  },
  {
    handle: "lena.k",
    source: "text",
    body: "The slide-in animation stutters when several cards arrive at once.",
    tags: ["screened"],
    category: "Animation",
  },
  {
    handle: "sam.ortiz",
    source: "text",
    body: "Love the agent log. Can it show the test output too?",
    tags: ["screened", "claude"],
    category: "Agents",
  },
  {
    handle: "priya.n",
    source: "email",
    body: "Email imports lose line breaks. Everything arrives as one paragraph.",
    tags: ["screened"],
    category: "Data",
  },
  {
    handle: "tom.b",
    source: "voice",
    sourceMeta: "8s",
    body: "Add a way to pin a card to the top of a column so it does not scroll away.",
    tags: ["screened"],
    category: "General",
  },
  {
    handle: "maria.g",
    source: "text",
    body: "Show who approved a card once it lands in Done.",
    tags: ["screened"],
    category: "General",
  },
  {
    handle: "dev.okafor",
    source: "text",
    body: "The PR chip could show how many files changed next to the number.",
    tags: ["screened", "claude"],
    category: "Agents",
  },
  {
    handle: "omar.f",
    source: "email",
    body: "Queue order is unclear when three items wait. A position number would help.",
    tags: ["screened"],
    category: "Copy",
  },
  {
    handle: "ana.p",
    source: "voice",
    sourceMeta: "7s",
    body: "The map legend overlaps the agency list when I zoom the browser to 110 percent.",
    tags: ["screened"],
    category: "Map",
  },
  {
    handle: "nick.d",
    source: "text",
    body: "Could the drafting scene pause when the tab loses focus? It burns my laptop fan.",
    tags: ["screened"],
    category: "Animation",
  },
];
