import { supabase } from '@/lib/supabase';

export type PublicCounterparty = { id: string; name: string; identifier: string };

/** Counterparties with an ABN, visible to everyone. Needs at least 2 characters. */
export async function searchPublicCounterparties(query: string): Promise<PublicCounterparty[]> {
  const { data, error } = await supabase
    .schema('positions')
    .rpc('search_public_counterparties', { p_query: query });

  if (error) {
    console.log('search_public_counterparties failed:', JSON.stringify(error));
    return [];
  }

  return ((data ?? []) as {
    unregistered_counterparty_id: string;
    display_name: string;
    counterparty_identifier: string;
  }[]).map((r) => ({
    id: r.unregistered_counterparty_id,
    name: r.display_name,
    identifier: r.counterparty_identifier,
  }));
}