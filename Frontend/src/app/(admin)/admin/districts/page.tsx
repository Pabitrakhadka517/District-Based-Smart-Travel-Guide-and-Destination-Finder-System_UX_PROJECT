import { getPaginated } from "@/services/content";
import type { District } from "@/types";
import { DistrictsAdmin } from "./districts-admin";
export default async function Page() {
  const { data, total } = await getPaginated<District>("/districts?limit=500");
  return <DistrictsAdmin districts={data} total={total} />;
}
