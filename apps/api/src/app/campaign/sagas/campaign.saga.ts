import { LeadCreated } from "@/app/lead/events/lead-created.event";
import { Injectable } from "@nestjs/common";
import { ICommand, ofType, Saga } from "@nestjs/cqrs";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SyncLeadCampaign } from "../commands/sync-lead-campaign";
import { LeadUpdated } from "@/app/lead/events/lead-updated.event";

@Injectable()
export class CampaignSaga {
  @Saga()
  handle = (
    events$: Observable<LeadCreated | LeadUpdated>,
  ): Observable<ICommand> => {
    return events$.pipe(
      ofType(LeadCreated, LeadUpdated),
      map(
        (event) => new SyncLeadCampaign(
          event.lead.teamId,
          event.lead.id,
          event.lead.score || 0,
        ),
      ), // or RunWorkflow, etc.
    );
  };
}
