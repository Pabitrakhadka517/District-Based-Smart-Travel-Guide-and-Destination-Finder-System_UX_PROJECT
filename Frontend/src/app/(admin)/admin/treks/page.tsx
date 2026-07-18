import { getPaginated } from "@/services/content";
import type { Trek } from "@/types";
import { TreksAdmin } from "./treks-admin";
export default async function Page() {
  const { data, total } = await getPaginated<Trek>("/treks?limit=500");
  return <TreksAdmin treks={data} total={total} />;
}
