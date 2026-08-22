import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

export const runtime = 'nodejs';

export const GET = withPermission('vehicle_liability', () => NextResponse.json({ data: 'OK' }));

