import { describe, it, expect } from "vitest";

import { buildWhatsAppHref, isValidWhatsAppNumber } from "@/lib/whatsapp";
import {
  canUseAppointmentWhatsApp,
  getAppointmentWhatsAppConfirmationHref,
  shouldShowAppointmentWhatsApp,
} from "./whatsapp";

describe("WhatsApp integration", () => {
  describe("canUseAppointmentWhatsApp", () => {
    it("should enable actions for sales and management", () => {
      expect(canUseAppointmentWhatsApp("vendas")).toBe(true);
      expect(canUseAppointmentWhatsApp("gestora")).toBe(true);
      expect(canUseAppointmentWhatsApp("aplicadora")).toBe(false);
    });
  });

  describe("shouldShowAppointmentWhatsApp", () => {
    it("should require both allowed role and confirmable status", () => {
      expect(shouldShowAppointmentWhatsApp("vendas", true)).toBe(true);
      expect(shouldShowAppointmentWhatsApp("vendas", false)).toBe(false);
      expect(shouldShowAppointmentWhatsApp("gestora", true)).toBe(true);
      expect(shouldShowAppointmentWhatsApp("aplicadora", true)).toBe(false);
    });
  });

  describe("getAppointmentWhatsAppConfirmationHref", () => {
    it("should build an encoded link with the confirmation message", () => {
      const href = getAppointmentWhatsAppConfirmationHref(
        "vendas",
        { fullName: "Maria Silva", whatsapp: "(83) 99999-9999" },
        "27/10/2026 às 14:30",
        "Patos",
      );
      const message =
        "Olá, Maria Silva! Tudo bem? Passando para confirmar seu agendamento de 27/10/2026 às 14:30 em Patos. Podemos confirmar?";

      expect(href).toBe(
        `https://wa.me/5583999999999?text=${encodeURIComponent(message)}`,
      );
      expect(new URL(href as string).searchParams.get("text")).toBe(message);
    });

    it("should return a string for allowed roles", () => {
      const href = getAppointmentWhatsAppConfirmationHref(
        "gestora",
        { fullName: "Maria Silva", whatsapp: "83999999999" },
        "27/10/2026 às 14:30",
        "Patos",
      );

      expect(typeof href).toBe("string");
    });

    it("should return null for disallowed roles", () => {
      expect(
        getAppointmentWhatsAppConfirmationHref(
          "aplicadora",
          { fullName: "Maria Silva", whatsapp: "83999999999" },
          "27/10/2026 às 14:30",
          "Patos",
        ),
      ).toBeNull();
    });

    it("should return null when phone is absent or invalid", () => {
      expect(
        getAppointmentWhatsAppConfirmationHref(
          "vendas",
          { fullName: "Maria Silva", whatsapp: null },
          "27/10/2026 às 14:30",
          "Patos",
        ),
      ).toBeNull();

      expect(
        getAppointmentWhatsAppConfirmationHref(
          "vendas",
          { fullName: "Maria Silva", whatsapp: "1234" },
          "27/10/2026 às 14:30",
          "Patos",
        ),
      ).toBeNull();
    });

    it("should omit city label for placeholder city", () => {
      const href = getAppointmentWhatsAppConfirmationHref(
        "vendas",
        { fullName: "Ana", whatsapp: "83999999999" },
        "01/01/2026 às 10:00",
        "—",
      );

      expect(href).not.toContain("em+em");
      expect(
        new URL(href as string).searchParams.get("text"),
      ).not.toContain(" em .");
    });

    it("should handle missing patient entirely", () => {
      expect(
        getAppointmentWhatsAppConfirmationHref(
          "vendas",
          undefined,
          "01/01/2026 às 10:00",
          "Patos",
        ),
      ).toBeNull();
    });
  });

  describe("buildWhatsAppHref", () => {
    it("should add country code when missing", () => {
      expect(buildWhatsAppHref("83999999999", "Olá")).toBe(
        "https://wa.me/5583999999999?text=Ol%C3%A1",
      );
    });

    it("should preserve a valid international number", () => {
      expect(buildWhatsAppHref("5511999999999", "Olá")).toBe(
        "https://wa.me/5511999999999?text=Ol%C3%A1",
      );
    });

    it("should return null for invalid numbers", () => {
      expect(buildWhatsAppHref(null, "Olá")).toBeNull();
      expect(buildWhatsAppHref("", "Olá")).toBeNull();
      expect(buildWhatsAppHref("1234", "Olá")).toBeNull();
    });

    it("should URL-encode injection payloads in the message", () => {
      const href = buildWhatsAppHref("83999999999", "&text=SPAM");

      // The message must be encoded as a single parameter value
      expect(href).toContain(encodeURIComponent("&text=SPAM"));
      expect(href).not.toContain("?text=&");
      expect(
        new URL(href as string).searchParams.get("text"),
      ).toBe("&text=SPAM");
    });
  });

  describe("isValidWhatsAppNumber", () => {
    it("should accept national and international formats", () => {
      expect(isValidWhatsAppNumber("83999999999")).toBe(true);
      expect(isValidWhatsAppNumber("(83) 99999-9999")).toBe(true);
      expect(isValidWhatsAppNumber("+5583999999999")).toBe(true);
      expect(isValidWhatsAppNumber("5583999999999")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidWhatsAppNumber(null)).toBe(false);
      expect(isValidWhatsAppNumber("")).toBe(false);
      expect(isValidWhatsAppNumber("1234")).toBe(false);
      expect(isValidWhatsAppNumber("teste")).toBe(false);
      expect(isValidWhatsAppNumber("83999999999999")).toBe(false);
    });
  });
});