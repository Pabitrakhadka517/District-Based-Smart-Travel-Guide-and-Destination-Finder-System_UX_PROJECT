import { getPaginated } from "@/services/content";
import type { Festival } from "@/types";
import { FestivalsAdmin } from "./festivals-admin";
export default async function Page() {
  const { data, total } = await getPaginated<Festival>("/festivals?limit=500");
  return <FestivalsAdmin festivals={data} total={total} />;
}
