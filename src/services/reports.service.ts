import { appointmentsService } from "@/services/appointments.service";
import { patientsService } from "@/services/patients.service";
import type { Appointment, AppointmentStatus } from "@/types";

export interface ManagerReport {
  patientCount: number;
  appointments: Appointment[];
  appointmentCounts: Record<AppointmentStatus, number>;
  financial: {
    paidConsultations: number | null;
    paidAmount: number | null;
    outstandingAmount: number | null;
    appointmentsWithoutPaymentData: number;
  };
}

export const reportsService = {
  async getManagerReport(
    from: string,
    to: string,
    options?: { signal?: AbortSignal },
  ): Promise<ManagerReport> {
    const [patientsPage, appointments] = await Promise.all([
      patientsService.list({ page: 1, limit: 1 }, options),
      appointmentsService.list(
        { from, to },
        options,
      ),
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

    return {
      patientCount: patientsPage.meta.total,
      appointments,
      appointmentCounts,
      financial: {
        paidConsultations: null,
        paidAmount: null,
        outstandingAmount: null,
        appointmentsWithoutPaymentData: appointments.length,
      },
    };
  },
};
