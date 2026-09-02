import { createAdminClient } from '@/lib/supabase/admin'
import type { Part } from '@/types/database'

/**
 * Inventory service boundary. Dashboard and inventory page should use these instead of direct Supabase in pages.
 */
export async function getPartsList(limit = 500): Promise<Part[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('parts')
    .select('*')
    .order('name')
    .limit(limit)
  return (data ?? []) as Part[]
}

export async function getLowStockParts(): Promise<Part[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('parts')
    .select('*')
    .eq('active', true)
    .filter('quantity', 'lte', 'minimum_stock')
  return (data ?? []) as Part[]
}
