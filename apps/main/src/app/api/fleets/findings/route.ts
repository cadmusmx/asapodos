import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

export const runtime = 'nodejs';

export const GET = withPermission('findings', () => NextResponse.json({ data: 'OK' }));

