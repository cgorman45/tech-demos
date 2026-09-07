import { extractDesign } from "@/lib/extract";
import { generateDesignMd } from "@/lib/generate-markdown";

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: "Missing 'url' in request body." }, { status: 400 });
  }

  try {
    const result = await extractDesign(url);
    const markdown = generateDesignMd(result);
    return Response.json({
      markdown,
      meta: {
        url: result.url,
        title: result.title,
        stylesheetCount: result.stylesheetCount,
        cssBytes: result.cssBytes,
        colorCount: result.colors.length,
        fontCount: result.fontFamilies.length,
        tokenCount: result.customProperties.length,
        componentCount: result.components.length,
        warnings: result.warnings,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    const status = /aborted|abort/i.test(message) ? 504 : 422;
    return Response.json(
      { error: /abort/i.test(message) ? "Timed out fetching the page." : message },
      { status },
    );
  }
}
