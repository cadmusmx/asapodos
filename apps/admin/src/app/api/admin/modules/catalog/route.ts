import { NextResponse } from 'next/server'

import { getModuleCatalog } from '@/services/module-catalog-service'

export async function GET() {
  try {
    const catalog = await getModuleCatalog()

    return NextResponse.json({ modules: catalog })
  } catch (error) {
    console.error('[GET_MODULE_CATALOG_ERROR]', error)
    return NextResponse.json({ message: 'Error loading module catalog' }, { status: 500 })
  }
}
