jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: any, opts?: any) => ({ json: async () => payload, status: opts?.status || 200 }),
  },
  NextRequest: class {
    _body: any;
    constructor(body: any) { this._body = body; }
    async json() { return this._body; }
  },
}));

import { POST } from './route';

jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(async () => [{ id: 'camp_test' }]),
      })),
    })),
  },
}));

jest.mock('@/lib/api-auth', () => ({
  apiAuth: jest.fn(async () => ({ userId: 'user-1', teamId: 'team-1' })),
}));

describe('Campaign Push - team scoping & DB persistence', () => {
  it('persists campaign to DB when teamId derived from auth and returns id', async () => {
    const body = {
      campaignName: 'Test Campaign',
      campaignType: 'sms',
      leads: [{ id: 'l1', phones: ['+12223334444'] }],
    };

    const req = { json: async () => body } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.id).toBe('camp_test');
    expect(json.campaign.leadsAdded).toBe(1);
  });

  it('returns 400 when no campaignName', async () => {
    const body = { leads: [{ id: 'l1', phones: ['+1'] }] };
    const req = { json: async () => body } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
