export class SyncLeadCampaign {
  constructor(
    public readonly teamId: string,
    public readonly leadId: string,
    public readonly score: number,
  ) {}
}
