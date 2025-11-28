import { AppEvent } from "@/app/flow/app-event";
import { LeadSelect } from "../models/lead.model";
import { LEAD_CREATED } from "@/app/flow/app-event.contants";

export class LeadCreated implements AppEvent {
  $eventName = LEAD_CREATED;

  constructor(public readonly lead: LeadSelect) {}
}
