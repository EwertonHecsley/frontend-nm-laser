import type { AuditFields } from "./common";

export interface Area extends AuditFields {
  name: string;
}

export interface CreateAreaInput {
  name: string;
}

export type UpdateAreaInput = Partial<CreateAreaInput>;
