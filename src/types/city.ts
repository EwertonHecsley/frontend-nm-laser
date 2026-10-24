import type { AuditFields } from "./common";

export interface City extends AuditFields {
  name: string;
}

export interface CreateCityInput {
  name: string;
}

export type UpdateCityInput = CreateCityInput;
