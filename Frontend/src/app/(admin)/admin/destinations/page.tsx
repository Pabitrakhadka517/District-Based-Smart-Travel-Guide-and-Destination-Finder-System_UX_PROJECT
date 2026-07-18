import { getPaginated } from "@/services/content";
import type { Destination } from "@/types";
import { DestinationsAdmin } from "./destinations-admin";
export default async function Page() {
  const { data, total } = await getPaginated<Destination>("/destinations?limit=500");
  return <DestinationsAdmin destinations={data} total={total} />;
}
