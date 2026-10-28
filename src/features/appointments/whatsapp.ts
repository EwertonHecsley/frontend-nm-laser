import { buildWhatsAppHref } from "../../lib/whatsapp";
import type { Role } from "../../types/common";
import type { Patient } from "../../types/patient";

export type AppointmentWhatsAppPatient = Pick<
  Patient,
  "fullName" | "whatsapp"
>;

export function canUseAppointmentWhatsApp(role: Role): boolean {
  return role === "vendas";
}

export function shouldShowAppointmentWhatsApp(
  role: Role,
  isConfirmable: boolean,
): boolean {
  return canUseAppointmentWhatsApp(role) && isConfirmable;
}

export function getAppointmentWhatsAppConfirmationHref(
  role: Role,
  patient: AppointmentWhatsAppPatient | undefined,
  scheduledAt: string,
  cityName: string,
): string | null {
  if (!canUseAppointmentWhatsApp(role) || !patient?.whatsapp) {
    return null;
  }

  const cityLabel = cityName && cityName !== "—" ? ` em ${cityName}` : "";
  const message = `Olá, ${patient.fullName}! Tudo bem? Passando para confirmar seu agendamento de ${scheduledAt}${cityLabel}. Podemos confirmar?`;

  return buildWhatsAppHref(patient.whatsapp, message);
}
