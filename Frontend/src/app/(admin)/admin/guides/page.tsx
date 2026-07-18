import { getPaginated } from "@/services/content";
import type { GuideArticle } from "@/types";
import { GuidesAdmin } from "./guides-admin";
export default async function Page() {
  const { data, total } = await getPaginated<GuideArticle>("/guides?limit=500");
  return <GuidesAdmin guides={data} total={total} />;
}
