import type { Metadata } from "next";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with the NepaYatra team." };

export default function ContactPage() { return <ContactClient />; }
