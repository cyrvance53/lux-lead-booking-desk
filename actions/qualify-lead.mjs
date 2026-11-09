// Lux Automations — part of Lux Lead & Booking Desk. See FINGERPRINT.txt.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { load, save, log, SERVICES } from "../lib/store.mjs";

export default defineAction({
  description:
    "Qualify an incoming lead for a Lux Automations service: score fit from the service requested, contact details and urgency signals, store the lead, and return the score and tier. Called identically by the UI form and by the agent.",
  schema: z.object({
    name: z.string().min(1).describe("Lead's name"),
    contact: z.string().default("").describe("Email or phone, if provided"),
    service: z.enum(Object.keys(SERVICES)).describe("Service the lead wants"),
    message: z.string().default("").describe("What the lead said they need"),
    actor: z.string().default("ui").describe("Who invoked it: ui | agent"),
  }),
  http: { method: "POST" },
  run: async ({ name, contact, service, message, actor }) => {
    const state = load();
    let score = 40;
    if (contact.includes("@") || /\d{7,}/.test(contact)) score += 25;
    if (/urgent|asap|this week|today|quote|price|book/i.test(message)) score += 20;
    if (message.trim().length >= 40) score += 15;
    const tier = score >= 80 ? "hot" : score >= 60 ? "warm" : "new";
    const lead = { id: `lead-${++state.seq.lead}`, name, contact, service, message, score, tier, status: "qualified", at: new Date().toISOString() };
    state.leads.unshift(lead);
    log(state, actor, `Qualified lead ${lead.id} (${name}, ${SERVICES[service].label}) — score ${score}, tier ${tier}`);
    save(state);
    return lead;
  },
});
