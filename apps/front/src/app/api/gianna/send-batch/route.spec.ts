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
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(async () => [{ id: 'l1', teamId: 'team-1', phone: '+12223334444' }]),
      })),
    })),
    update: jest.fn(),
  },
}));

describe('Gianna send-batch team scoping', () => {
  it('returns 403 if not all leadIds belong to the team', async () => {
    // Request asks for 2 leadIds but DB returns only 1 for this team
    const body = { leadIds: ['l1', 'l2'], teamId: 'team-1' };
    const req = { json: async () => body } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/One or more leads not found for this team/);
  });
});
