// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { load, SERVICES } from "../lib/store.mjs";

export default defineAction({
  description:
    "List open appointment slots for a service from the shared calendar. Read-only; the same result the UI calendar and the agent see.",
  schema: z.object({
    service: z.enum(Object.keys(SERVICES)).describe("Service to check"),
    date: z.string().default("").describe("Optional YYYY-MM-DD filter"),
  }),
  http: { method: "GET" },
  run: async ({ service, date }) => {
    const state = load();
    const open = state.slots.filter((s) => !s.takenBy && (!date || s.date === date));
    return { service, serviceLabel: SERVICES[service].label, minutes: SERVICES[service].minutes, openSlots: open.slice(0, 12) };
  },
});
