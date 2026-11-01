import { getFormsBundle } from "../../lib/content";

export const dynamic = "force-static";

/** Fetched only when a panel opens or a form sends, so forms add nothing to a page's first load. */
export async function GET() {
  return Response.json(await getFormsBundle());
}
