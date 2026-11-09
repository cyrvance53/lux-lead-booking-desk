// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { load, save, log } from "../lib/store.mjs";

export default defineAction({
  description:
    "The human-override action: approve a proposed booking, move it to another open slot, or cancel it (freeing the slot). Used by the UI buttons and by the agent when the user instructs it in chat.",
  schema: z.object({
    bookingId: z.string().min(1),
    change: z.enum(["approve", "cancel", "move"]),
    newSlotId: z.string().default("").describe("Required when change = move"),
    actor: z.string().default("ui"),
  }),
  http: { method: "POST" },
  run: async ({ bookingId, change, newSlotId, actor }) => {
    const state = load();
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error(`Unknown booking ${bookingId}`);
    if (change === "approve") {
      booking.status = "confirmed";
      log(state, actor, `Booking ${bookingId} approved → confirmed`);
    } else if (change === "cancel") {
      const slot = state.slots.find((s) => s.id === booking.slotId);
      if (slot) slot.takenBy = null;
      booking.status = "cancelled";
      log(state, actor, `Booking ${bookingId} cancelled; slot ${booking.date} ${booking.time} freed`);
    } else if (change === "move") {
      const target = state.slots.find((s) => s.id === newSlotId);
      if (!target) throw new Error(`Unknown slot ${newSlotId}`);
      if (target.takenBy) throw new Error(`Slot ${newSlotId} is already booked`);
      const old = state.slots.find((s) => s.id === booking.slotId);
      if (old) old.takenBy = null;
      target.takenBy = booking.id;
      booking.slotId = target.id; booking.date = target.date; booking.time = target.time;
      log(state, actor, `Booking ${bookingId} moved → ${target.date} ${target.time}`);
    }
    save(state);
    return booking;
  },
});
