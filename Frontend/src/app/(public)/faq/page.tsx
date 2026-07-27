import type { Metadata } from "next";
import { FaqClient } from "./faq-client";

export const metadata: Metadata = { title: "FAQ", description: "Frequently asked questions about travelling in Nepal with NepaYatra." };

export default function FaqPage() { return <FaqClient />; }
