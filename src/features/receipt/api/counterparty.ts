import { supabase } from '@/lib/supabase';

export const fetchCounterparty = async (publicId: string): Promise<{ display_name: string } | null> => {
  const { data, error } = await supabase.schema('positions').rpc('get_counterparty', { p_public_id: publicId });
  return error ? null : data?.[0] ?? null;
};