import { apiPost } from "./api-client";

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const submitContact = (payload: ContactPayload) =>
  apiPost<{ id: string }>("/contact", payload);
