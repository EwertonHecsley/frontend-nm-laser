import type { AuditFields, PageParams } from "./common";

export interface Patient extends AuditFields {
  fullName: string;
  birthDate: string;
  cpf: string;
  address: string;
  cityId: string;
  whatsapp: string | null;
}

export interface CreatePatientInput {
  fullName: string;
  birthDate: string;
  cpf: string;
  address: string;
  cityId: string;
  whatsapp?: string;
}

/**
 * O backend não aceita `cpf` no PATCH. Enviar esse campo resulta em 400
 * por causa do `forbidNonWhitelisted` do ValidationPipe.
 */
export type UpdatePatientInput = Partial<Omit<CreatePatientInput, "cpf">>;

export interface PatientListParams extends PageParams {
  search?: string;
}
