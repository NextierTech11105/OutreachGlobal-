import { NextRequest, NextResponse } from 'next/server';
import { getTeamFromToken } from '@/lib/auth/extension-auth';

/**
 * GET /api/extension/cadences
 *
 * Get active cadences for the extension.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const team = await getTeamFromToken(token);

    if (!team) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // TODO: Fetch actual cadences from database
    // const cadences = await db.query.campaigns.findMany({
    //   where: and(
    //     eq(campaigns.teamId, team.id),
    //     eq(campaigns.type, 'cadence'),
    //     eq(campaigns.status, 'active')
    //   )
    // });

    // Placeholder data
    const cadences = [
      {
        id: 'cadence-1',
        name: 'Initial Outreach',
        status: 'active',
        steps: 3,
        activeLeads: 45,
      },
      {
        id: 'cadence-2',
        name: 'Follow-up Sequence',
        status: 'active',
        steps: 5,
        activeLeads: 23,
      },
      {
        id: 'cadence-3',
        name: 'Re-engagement',
        status: 'paused',
        steps: 4,
        activeLeads: 12,
      },
    ];

    return NextResponse.json({ success: true, cadences });
  } catch (error) {
    console.error('Extension cadences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cadences' },
      { status: 500 }
    );
  }
}
