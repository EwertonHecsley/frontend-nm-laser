import { appointmentsService } from "@/services/appointments.service";
import { patientsService } from "@/services/patients.service";
import { salesService } from "@/services/sales.service";
import { sessionsService } from "@/services/sessions.service";
import type { Appointment, AppointmentStatus } from "@/types";

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

export const reportsService = {
  async getManagerReport(
    from: string,
    to: string,
    options?: { signal?: AbortSignal },
  ): Promise<ManagerReport> {
    const [patientsPage, appointments, financial, sessionsOverview] =
      await Promise.all([
        patientsService.list({ page: 1, limit: 1 }, options),
        appointmentsService.list({ from, to }, options),
        salesService.summary({ from, to }, options),
        sessionsService.overview({ from, to, limit: 1 }, options),
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
      completedSessionCount: sessionsOverview.stats.completed,
      financial,
    };
  },
};
