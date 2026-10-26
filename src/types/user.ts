import type { AuditFields, Role } from "./common";

export type SubordinateRole = Extract<Role, "vendas" | "aplicadora">;

export interface ManagedUser extends AuditFields {
  name: string;
  email: string;
  role: SubordinateRole;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: SubordinateRole;
  password: string;
}

export type UpdateUserInput = Partial<CreateUserInput>;
