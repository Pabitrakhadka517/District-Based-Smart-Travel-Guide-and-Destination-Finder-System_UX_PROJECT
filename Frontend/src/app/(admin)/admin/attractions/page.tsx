import { getPaginated } from "@/services/content";
import type { TouristAttraction } from "@/types";
import { AttractionsAdmin } from "./attractions-admin";
export default async function Page() {
  const { data, total } = await getPaginated<TouristAttraction>("/attractions?limit=500");
  return <AttractionsAdmin attractions={data} total={total} />;
}
