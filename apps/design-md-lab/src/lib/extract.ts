import * as cheerio from "cheerio";
import { parse, walk, type CssNode } from "css-tree";

export type Counted = { value: string; count: number };

export type ComponentStyles = {
  name: string;
  selectors: string[];
  /** property -> most common value */
  declarations: Record<string, string>;
};

export type ExtractionResult = {
  url: string;
  title: string;
  description: string | null;
  themeColor: string | null;
  generator: string | null;
  fetchedAt: string;
  stylesheetCount: number;
  inlineStyleBlocks: number;
  cssBytes: number;
  customProperties: Counted[];
  colors: Counted[];
  fontFamilies: Counted[];
  fontSizes: Counted[];
  fontWeights: Counted[];
  lineHeights: Counted[];
  letterSpacings: Counted[];
  spacing: Counted[];
  radii: Counted[];
  shadows: Counted[];
  transitions: Counted[];
  zIndices: Counted[];
  components: ComponentStyles[];
  warnings: string[];
};

const FETCH_TIMEOUT_MS = 15_000;
const MAX_STYLESHEETS = 12;
const MAX_IMPORTS = 6;
const MAX_CSS_BYTES_TOTAL = 8 * 1024 * 1024;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 DesignMdLab/0.1";

class Counter {
  private map = new Map<string, number>();
  add(value: string, weight = 1) {
    const v = value.trim();
    if (!v) return;
    this.map.set(v, (this.map.get(v) ?? 0) + weight);
  }
  top(limit: number, sortFn?: (a: Counted, b: Counted) => number): Counted[] {
    const entries: Counted[] = [...this.map.entries()].map(([value, count]) => ({ value, count }));
    entries.sort((a, b) => b.count - a.count);
    const sliced = entries.slice(0, limit);
    if (sortFn) sliced.sort(sortFn);
    return sliced;
  }
  get size() {
    return this.map.size;
  }
}

async function fetchWithLimits(url: string, accept: string): Promise<{ text: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const contentType = res.headers.get("content-type") ?? "";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY_BYTES) {
      return { text: new TextDecoder().decode(buf.slice(0, MAX_BODY_BYTES)), contentType };
    }
    return { text: new TextDecoder().decode(buf), contentType };
  } finally {
    clearTimeout(timer);
  }
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // Numeric IPv4 private/loopback/link-local ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

export function normalizeTargetUrl(input: string): URL {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error("Refusing to fetch private or local addresses.");
  }
  return url;
}

const COLOR_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "fill",
  "stroke",
  "caret-color",
  "accent-color",
]);

const SPACING_PROPS = new Set([
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "gap",
  "row-gap",
  "column-gap",
]);

const COLOR_VALUE_RE =
  /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/gi;

function isFullyTransparent(v: string): boolean {
  if (/^#[0-9a-f]{3}0$/.test(v) || /^#[0-9a-f]{6}00$/.test(v)) return true;
  const alphaMatch = v.match(/^(?:rgba|hsla)\([^)]*,\s*(0|0?\.0+)\s*\)$/);
  if (alphaMatch) return true;
  if (/\/\s*0(?:\.0+)?\s*\)$/.test(v)) return true;
  return false;
}

function normalizeColor(raw: string): string | null {
  let v = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!v) return null;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (v === "transparent" || v === "inherit" || v === "currentcolor" || v === "initial" || v === "unset" || v === "none") {
    return null;
  }
  if (v.includes("var(")) return null;
  if (isFullyTransparent(v)) return null;
  return v;
}

function extractColorsFromValue(value: string, colors: Counter) {
  const matches = value.match(COLOR_VALUE_RE);
  if (!matches) return;
  for (const m of matches) {
    const normalized = normalizeColor(m);
    if (normalized) colors.add(normalized);
  }
}

function firstFontFamily(value: string): string | null {
  const first = value.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "");
  if (!first) return null;
  const generic = new Set(["inherit", "initial", "unset", "var"]);
  if (generic.has(first.toLowerCase()) || first.startsWith("var(")) return null;
  return first;
}

const LENGTH_RE = /^-?\d*\.?\d+(px|rem|em|vh|vw|%|ch)$|^0$/;

function splitSpacingValues(value: string): string[] {
  return value
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => LENGTH_RE.test(t) && t !== "0");
}

/** Convert a CSS length to px for sorting (assumes 16px root). Non-convertible → NaN. */
export function lengthToPx(v: string): number {
  const m = v.match(/^(-?\d*\.?\d+)(px|rem|em)$/);
  if (!m) return NaN;
  const n = Number(m[1]);
  return m[2] === "px" ? n : n * 16;
}

const byLength = (a: Counted, b: Counted) => {
  const pa = lengthToPx(a.value);
  const pb = lengthToPx(b.value);
  if (Number.isNaN(pa) || Number.isNaN(pb)) return b.count - a.count;
  return pa - pb;
};

type ComponentBucket = {
  name: string;
  match: (selector: string) => boolean;
  props: Set<string>;
  selectors: Set<string>;
  values: Map<string, Counter>;
};

function makeBuckets(): ComponentBucket[] {
  const typographyProps = new Set(["font-size", "font-weight", "line-height", "letter-spacing", "font-family", "color", "margin-bottom", "margin-top"]);
  const surfaceProps = new Set(["background", "background-color", "color", "padding", "border", "border-radius", "box-shadow", "font-size", "font-weight", "gap"]);
  const mk = (name: string, re: RegExp, props: Set<string>): ComponentBucket => ({
    name,
    match: (s) => re.test(s),
    props,
    selectors: new Set(),
    values: new Map(),
  });
  return [
    mk("Button", /(^|[\s,>+~])button\b|\.(btn|button)\b|\[class\*=["']?[Bb]utton/i, surfaceProps),
    mk("Link", /(^|[\s,>+~])a\b(?!\w)|\.link\b/i, new Set(["color", "text-decoration", "font-weight", "transition"])),
    mk("Heading 1", /(^|[\s,>+~])h1\b/i, typographyProps),
    mk("Heading 2", /(^|[\s,>+~])h2\b/i, typographyProps),
    mk("Heading 3", /(^|[\s,>+~])h3\b/i, typographyProps),
    mk("Body text", /^(body|html body|p)$/i, typographyProps),
    mk("Card / Surface", /\.(card|panel|tile|surface)\b|\[class\*=["']?[Cc]ard/i, surfaceProps),
    mk("Input", /(^|[\s,>+~])(input|textarea|select)\b|\.(input|field)\b/i, surfaceProps),
    mk("Navigation", /(^|[\s,>+~])(nav|header)\b|\.(nav|navbar|header)\b/i, surfaceProps),
  ];
}

export async function extractDesign(targetUrl: string): Promise<ExtractionResult> {
  const url = normalizeTargetUrl(targetUrl);
  const warnings: string[] = [];

  const page = await fetchWithLimits(url.href, "text/html,application/xhtml+xml");
  if (page.contentType && !/text\/html|application\/xhtml/.test(page.contentType)) {
    throw new Error(`URL did not return an HTML page (got ${page.contentType.split(";")[0]}).`);
  }

  const $ = cheerio.load(page.text);
  const title = $("title").first().text().trim() || url.hostname;
  const description = $('meta[name="description"]').attr("content")?.trim() || null;
  const themeColor = $('meta[name="theme-color"]').attr("content")?.trim() || null;
  const generator = $('meta[name="generator"]').attr("content")?.trim() || null;

  // Gather CSS text: linked stylesheets + <style> blocks + inline style attributes.
  const cssTexts: string[] = [];
  let cssBytes = 0;

  const hrefs: string[] = [];
  $('link[rel~="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) hrefs.push(href);
  });

  const fetchedSheets = await Promise.allSettled(
    hrefs.slice(0, MAX_STYLESHEETS).map(async (href) => {
      const abs = new URL(href, url.href).href;
      const sheet = await fetchWithLimits(abs, "text/css,*/*;q=0.1");
      return { abs, text: sheet.text };
    }),
  );

  const importUrls: string[] = [];
  let stylesheetCount = 0;
  for (const result of fetchedSheets) {
    if (result.status === "rejected") {
      warnings.push(`Could not fetch a stylesheet: ${String(result.reason).slice(0, 120)}`);
      continue;
    }
    stylesheetCount++;
    cssBytes += result.value.text.length;
    cssTexts.push(result.value.text);
    for (const m of result.value.text.matchAll(/@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/g)) {
      importUrls.push(new URL(m[1], result.value.abs).href);
    }
    if (cssBytes > MAX_CSS_BYTES_TOTAL) break;
  }

  for (const imp of importUrls.slice(0, MAX_IMPORTS)) {
    if (cssBytes > MAX_CSS_BYTES_TOTAL) break;
    try {
      const sheet = await fetchWithLimits(imp, "text/css,*/*;q=0.1");
      stylesheetCount++;
      cssBytes += sheet.text.length;
      cssTexts.push(sheet.text);
    } catch {
      warnings.push(`Could not fetch @import stylesheet: ${imp}`);
    }
  }

  let inlineStyleBlocks = 0;
  $("style").each((_, el) => {
    const text = $(el).text();
    if (text.trim()) {
      inlineStyleBlocks++;
      cssBytes += text.length;
      cssTexts.push(text);
    }
  });

  // Inline style="" attributes, wrapped in a synthetic rule so the parser accepts them.
  const inlineDecls: string[] = [];
  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (style) inlineDecls.push(style);
  });
  if (inlineDecls.length) {
    cssTexts.push(`.__inline__{${inlineDecls.join(";")}}`);
  }

  if (cssTexts.length === 0) {
    throw new Error("No CSS found on this page (it may be fully JS-rendered).");
  }

  // Aggregate declarations across all CSS.
  const customProps = new Counter();
  const customPropValues = new Map<string, string>();
  const colors = new Counter();
  const fontFamilies = new Counter();
  const fontSizes = new Counter();
  const fontWeights = new Counter();
  const lineHeights = new Counter();
  const letterSpacings = new Counter();
  const spacing = new Counter();
  const radii = new Counter();
  const shadows = new Counter();
  const transitions = new Counter();
  const zIndices = new Counter();
  const buckets = makeBuckets();

  if (themeColor) {
    const norm = normalizeColor(themeColor);
    if (norm) colors.add(norm, 5);
  }

  for (const cssText of cssTexts) {
    let ast;
    try {
      ast = parse(cssText, { parseValue: false, parseRulePrelude: false, parseAtrulePrelude: false });
    } catch {
      warnings.push("One stylesheet could not be parsed and was skipped.");
      continue;
    }

    let currentSelector = "";
    walk(ast, {
      enter(node: CssNode) {
        if (node.type === "Rule" && node.prelude.type === "Raw") {
          currentSelector = node.prelude.value.trim();
        }
        if (node.type !== "Declaration") return;
        const prop = node.property.toLowerCase();
        const value =
          node.value.type === "Raw" ? node.value.value.trim().replace(/\s+/g, " ") : "";
        if (!value || value.length > 400) return;

        if (prop.startsWith("--")) {
          customProps.add(prop);
          if (!customPropValues.has(prop)) customPropValues.set(prop, value);
          extractColorsFromValue(value, colors);
          return;
        }

        if (COLOR_PROPS.has(prop) || prop === "box-shadow" || prop.startsWith("border")) {
          extractColorsFromValue(value, colors);
        }

        switch (prop) {
          case "font-family":
            {
              const fam = firstFontFamily(value);
              if (fam) fontFamilies.add(fam);
            }
            break;
          case "font-size":
            if (!value.includes("var(")) fontSizes.add(value);
            break;
          case "font-weight":
            if (/^\d{3}$|^(bold|normal|medium|semibold)$/i.test(value)) fontWeights.add(value);
            break;
          case "line-height":
            if (!value.includes("var(")) lineHeights.add(value);
            break;
          case "letter-spacing":
            if (!value.includes("var(")) letterSpacings.add(value);
            break;
          case "border-radius":
            if (!value.includes("var(") && value.split(/\s+/).length === 1) radii.add(value);
            break;
          case "box-shadow":
            if (!value.includes("var(") && value !== "none") shadows.add(value);
            break;
          case "transition":
          case "transition-duration":
            if (!value.includes("var(")) transitions.add(value);
            break;
          case "z-index":
            if (/^\d+$/.test(value)) zIndices.add(value);
            break;
          case "font":
            {
              const fam = firstFontFamily(value.split("/").pop() ?? "");
              if (fam && !/^\d/.test(fam)) fontFamilies.add(fam);
            }
            break;
        }

        if (SPACING_PROPS.has(prop) && !value.includes("var(") && !value.includes("calc(")) {
          for (const token of splitSpacingValues(value)) spacing.add(token);
        }

        // Component buckets keyed by the current rule's selector.
        // Skip reset-ish values so buckets reflect intentional styling.
        const RESET_VALUES = new Set(["inherit", "unset", "initial", "none", "0", "transparent", "normal"]);
        if (currentSelector && !RESET_VALUES.has(value.toLowerCase())) {
          for (const bucket of buckets) {
            if (!bucket.props.has(prop)) continue;
            const selectorParts = currentSelector.split(",").map((s) => s.trim());
            const matching = selectorParts.filter((s) => bucket.match(s));
            if (matching.length === 0) continue;
            // Prefer short, human-readable selectors over generated utility variants.
            for (const s of matching.sort((a, b) => a.length - b.length).slice(0, 3)) {
              if (bucket.selectors.size < 6 && s.length <= 60) bucket.selectors.add(s);
            }
            if (!bucket.values.has(prop)) bucket.values.set(prop, new Counter());
            bucket.values.get(prop)!.add(value);
          }
        }
      },
      leave(node: CssNode) {
        if (node.type === "Rule") currentSelector = "";
      },
    });
  }

  // Prioritize custom properties whose values look design-token-ish.
  const customPropList: Counted[] = customProps
    .top(200)
    .map((c) => ({ value: `${c.value}: ${customPropValues.get(c.value) ?? ""}`, count: c.count }))
    .filter((c) => c.value.length < 160)
    .slice(0, 48);

  const components: ComponentStyles[] = buckets
    .filter((b) => b.values.size >= 2)
    .map((b) => ({
      name: b.name,
      selectors: [...b.selectors].slice(0, 4),
      declarations: Object.fromEntries(
        [...b.values.entries()]
          .map(([prop, counter]) => [prop, counter.top(1)[0]?.value ?? ""] as const)
          .filter(([, v]) => v && v.length < 200),
      ),
    }))
    .filter((c) => Object.keys(c.declarations).length >= 2);

  return {
    url: url.href,
    title,
    description,
    themeColor,
    generator,
    fetchedAt: new Date().toISOString(),
    stylesheetCount,
    inlineStyleBlocks,
    cssBytes,
    customProperties: customPropList,
    colors: colors.top(24),
    fontFamilies: fontFamilies.top(8),
    fontSizes: fontSizes.top(16, byLength),
    fontWeights: fontWeights.top(8, (a, b) => Number(a.value) - Number(b.value) || b.count - a.count),
    lineHeights: lineHeights.top(8),
    letterSpacings: letterSpacings.top(6),
    spacing: spacing.top(16, byLength),
    radii: radii.top(10, byLength),
    shadows: shadows.top(6),
    transitions: transitions.top(6),
    zIndices: zIndices.top(8, (a, b) => Number(a.value) - Number(b.value)),
    components,
    warnings,
  };
}
