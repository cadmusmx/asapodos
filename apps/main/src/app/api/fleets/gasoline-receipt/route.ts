import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

export const runtime = 'nodejs';

export const GET = withPermission('gasoline_receipt', () => NextResponse.json({ data: 'OK' }));

