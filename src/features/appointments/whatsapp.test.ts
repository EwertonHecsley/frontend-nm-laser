import assert from "node:assert/strict";
import test from "node:test";

import { buildWhatsAppHref, isValidWhatsAppNumber } from "../../lib/whatsapp";
import {
  canUseAppointmentWhatsApp,
  getAppointmentWhatsAppConfirmationHref,
  shouldShowAppointmentWhatsApp,
} from "./whatsapp";

test("enables appointment WhatsApp actions only for sales", () => {
  assert.equal(canUseAppointmentWhatsApp("vendas"), true);
  assert.equal(canUseAppointmentWhatsApp("gestora"), false);
  assert.equal(canUseAppointmentWhatsApp("aplicadora"), false);
  assert.equal(shouldShowAppointmentWhatsApp("vendas", true), true);
  assert.equal(shouldShowAppointmentWhatsApp("vendas", false), false);
  assert.equal(shouldShowAppointmentWhatsApp("gestora", true), false);
  assert.equal(shouldShowAppointmentWhatsApp("aplicadora", true), false);
  assert.equal(
    getAppointmentWhatsAppConfirmationHref(
      "gestora",
      { fullName: "Maria Silva", whatsapp: "83999999999" },
      "27/10/2026 às 14:30",
      "Patos",
    ),
    null,
  );
  assert.equal(
    getAppointmentWhatsAppConfirmationHref(
      "aplicadora",
      { fullName: "Maria Silva", whatsapp: "83999999999" },
      "27/10/2026 às 14:30",
      "Patos",
    ),
    null,
  );
});

test("builds an encoded WhatsApp link with the confirmation message", () => {
  const href = getAppointmentWhatsAppConfirmationHref(
    "vendas",
    { fullName: "Maria Silva", whatsapp: "(83) 99999-9999" },
    "27/10/2026 às 14:30",
    "Patos",
  );
  const message =
    "Olá, Maria Silva! Tudo bem? Passando para confirmar seu agendamento de 27/10/2026 às 14:30 em Patos. Podemos confirmar?";

  assert.ok(href);
  assert.equal(
    href,
    `https://wa.me/5583999999999?text=${encodeURIComponent(message)}`,
  );
  assert.equal(new URL(href).searchParams.get("text"), message);
  assert.equal(
    buildWhatsAppHref("5511999999999", "Olá"),
    "https://wa.me/5511999999999?text=Ol%C3%A1",
  );
});

test("does not build a link when the WhatsApp number is absent or invalid", () => {
  assert.equal(isValidWhatsAppNumber(null), false);
  assert.equal(isValidWhatsAppNumber(""), false);
  assert.equal(isValidWhatsAppNumber("telefone indisponível"), false);
  assert.equal(isValidWhatsAppNumber("1234"), false);
  assert.equal(isValidWhatsAppNumber("83999999999999"), false);
  assert.equal(
    getAppointmentWhatsAppConfirmationHref(
      "vendas",
      { fullName: "Maria Silva", whatsapp: null },
      "27/10/2026 às 14:30",
      "Patos",
    ),
    null,
  );
  assert.equal(
    getAppointmentWhatsAppConfirmationHref(
      "vendas",
      { fullName: "Maria Silva", whatsapp: "1234" },
      "27/10/2026 às 14:30",
      "Patos",
    ),
    null,
  );
});
