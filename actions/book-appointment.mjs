// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { load, save, log, SERVICES } from "../lib/store.mjs";

export default defineAction({
  description:
    "Book a lead into an open slot. Agent-made bookings land as PROPOSED — a human approves, edits or cancels them in the UI (user stays in control). UI-made bookings are confirmed immediately.",
  schema: z.object({
    leadId: z.string().min(1).describe("Lead id, e.g. lead-1"),
    slotId: z.string().min(1).describe("Slot id from check-availability"),
    actor: z.string().default("ui").describe("Who invoked it: ui | agent"),
  }),
  http: { method: "POST" },
  run: async ({ leadId, slotId, actor }) => {
    const state = load();
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Unknown lead ${leadId}`);
    const slot = state.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error(`Unknown slot ${slotId}`);
    if (slot.takenBy) throw new Error(`Slot ${slotId} is already booked`);
    const booking = {
      id: `booking-${++state.seq.booking}`,
      leadId, name: lead.name, service: lead.service, serviceLabel: SERVICES[lead.service].label,
      slotId, date: slot.date, time: slot.time,
      status: actor === "agent" ? "proposed" : "confirmed",
      createdBy: actor, at: new Date().toISOString(),
    };
    slot.takenBy = booking.id;
    state.bookings.unshift(booking);
    lead.status = "booked";
    log(state, actor, `${actor === "agent" ? "Agent proposed" : "Booked"} ${booking.id}: ${lead.name} — ${booking.serviceLabel} on ${slot.date} ${slot.time} (${booking.status})`);
    save(state);
    return booking;
  },
});


































