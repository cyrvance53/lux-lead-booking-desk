// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { load, save, log, SERVICES } from "../lib/store.mjs";

export default defineAction({
  description:
    "Draft a follow-up message for a lead. DRAFT ONLY by design: nothing is sent anywhere; the draft lands in the UI for a human to review, edit and send — the same control pattern as the booking approval.",
  schema: z.object({
    leadId: z.string().min(1),
    actor: z.string().default("ui"),
  }),
  http: { method: "POST" },
  run: async ({ leadId, actor }) => {
    const state = load();
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Unknown lead ${leadId}`);
    const booking = state.bookings.find((b) => b.leadId === leadId && b.status !== "cancelled");
    const body = booking
      ? `Hi ${lead.name.split(" ")[0]}, thanks for your interest in our ${SERVICES[lead.service].label}. Your appointment is ${booking.status} for ${booking.date} at ${booking.time}. Reply here if that time still works, or tell us a better one and we'll move it. — Lux Automations`
      : `Hi ${lead.name.split(" ")[0]}, thanks for asking about our ${SERVICES[lead.service].label}. We have openings this week — want us to hold one for a quick scoping call? — Lux Automations`;
    const draft = { id: `followup-${state.followUps.length + 1}`, leadId, body, status: "draft — awaiting human review", at: new Date().toISOString() };
    state.followUps.unshift(draft);
    log(state, actor, `Follow-up draft created for ${lead.name} (${draft.id}) — not sent, awaiting human review`);
    save(state);
    return draft;
  },
});
