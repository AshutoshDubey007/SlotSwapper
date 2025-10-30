import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Event {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
  created_at: string;
  updated_at: string;
}

export interface SwapRequest {
  id: string;
  requester_id: string;
  requester_slot_id: string;
  owner_id: string;
  owner_slot_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}
