// Lux Automations — Lux Lead & Booking Desk (Builder.io Agent-Native Hackathon entry)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data.json");

export const SERVICES = {
  "ai-receptionist": { label: "AI Voice Receptionist Setup", minutes: 45 },
  "chatbot": { label: "Website / WhatsApp Chatbot", minutes: 45 },
  "lead-booking": { label: "Lead & Booking System", minutes: 60 },
  "crm-automation": { label: "CRM / Workflow Automation", minutes: 60 },
};

export function seedSlots() {
  const slots = [];
  const now = new Date();
  let added = 0;
  for (let d = 1; added < 5 && d < 10; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    added++;
    const date = day.toISOString().slice(0, 10);
    for (const hour of [9, 10, 11, 13, 14, 15]) {
      slots.push({ id: `${date}T${String(hour).padStart(2, "0")}:00`, date, time: `${String(hour).padStart(2, "0")}:00`, takenBy: null });
    }
  }
  return slots;
}

export function load() {
  if (existsSync(DATA)) {
    try { return JSON.parse(readFileSync(DATA, "utf8")); } catch { /* fall through to seed */ }
  }
  const state = { leads: [], bookings: [], followUps: [], activity: [], slots: seedSlots(), seq: { lead: 0, booking: 0 } };
  save(state);
  return state;
}

export function save(state) {
  writeFileSync(DATA, JSON.stringify(state, null, 2));
}

export function log(state, actor, text) {
  state.activity.unshift({ at: new Date().toISOString(), actor, text });
  state.activity = state.activity.slice(0, 100);
}
