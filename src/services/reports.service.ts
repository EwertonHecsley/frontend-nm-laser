import { appointmentsService } from "@/services/appointments.service";
import { patientsService } from "@/services/patients.service";
import { salesService } from "@/services/sales.service";
import { sessionsService } from "@/services/sessions.service";
import type { Appointment, AppointmentStatus } from "@/types";

const PATIENT_PAGE_SIZE = 100;
const SESSION_REQUEST_BATCH_SIZE = 10;

export interface ManagerReport {
  patientCount: number;
  appointments: Appointment[];
  appointmentCounts: Record<AppointmentStatus, number>;
  completedSessionCount: number;
  financial: {
    salesCount: number;
    totalValue: string;
    totalDiscount: string;
    revenue: string;
  };
}

async function countCompletedSessions(
  from: string,
  to: string,
  patientIds: string[],
  totalPatientPages: number,
  options?: { signal?: AbortSignal },
): Promise<number> {
  for (
    let page = 2;
    page <= totalPatientPages;
    page += SESSION_REQUEST_BATCH_SIZE
  ) {
    const pages = await Promise.all(
      Array.from(
        {
          length: Math.min(
            SESSION_REQUEST_BATCH_SIZE,
            totalPatientPages - page + 1,
          ),
        },
        (_, index) =>
          patientsService.list(
            { page: page + index, limit: PATIENT_PAGE_SIZE },
            options,
          ),
      ),
    );
    patientIds.push(...pages.flatMap(({ data }) => data.map(({ id }) => id)));
  }

  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  let completedSessionCount = 0;

  for (
    let index = 0;
    index < patientIds.length;
    index += SESSION_REQUEST_BATCH_SIZE
  ) {
    const sessionsByPatient = await Promise.all(
      patientIds
        .slice(index, index + SESSION_REQUEST_BATCH_SIZE)
        .map((patientId) => sessionsService.listByPatient(patientId, options)),
    );

    for (const sessions of sessionsByPatient) {
      completedSessionCount += sessions.filter((session) => {
        const performedAt = new Date(session.performedAt).getTime();

        return (
          session.status === "completed" &&
          performedAt >= fromTime &&
          performedAt <= toTime
        );
      }).length;
    }
  }

  return completedSessionCount;
}

export const reportsService = {
  async getManagerReport(
    from: string,
    to: string,
    options?: { signal?: AbortSignal },
  ): Promise<ManagerReport> {
    const [patientsPage, appointments, financial] = await Promise.all([
      patientsService.list({ page: 1, limit: PATIENT_PAGE_SIZE }, options),
      appointmentsService.list(
        { from, to },
        options,
      ),
      salesService.summary({ from, to }, options),
    ]);
    const appointmentCounts: Record<AppointmentStatus, number> = {
      scheduled: 0,
      arrived: 0,
      performed: 0,
      missed: 0,
      rescheduled: 0,
      cancelled: 0,
    };

    for (const appointment of appointments) {
      appointmentCounts[appointment.status] += 1;
    }

    const completedSessionCount = await countCompletedSessions(
      from,
      to,
      patientsPage.data.map(({ id }) => id),
      patientsPage.meta.totalPages,
      options,
    );

    return {
      patientCount: patientsPage.meta.total,
      appointments,
      appointmentCounts,
      completedSessionCount,
      financial,
    };
  },
};
