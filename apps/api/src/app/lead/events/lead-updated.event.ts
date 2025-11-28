import { AppEvent } from "@/app/flow/app-event";
import { LeadSelect } from "../models/lead.model";
import { LEAD_UPDATED } from "@/app/flow/app-event.contants";

export class LeadUpdated implements AppEvent {
  $eventName = LEAD_UPDATED;

  constructor(public readonly lead: LeadSelect) {}
}
