export interface AccountData {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    status: string;
    trial_ends_at: string | null;
    paypal_sub_id: string | null;
    cancels_at: string | null;
    comp_until: string | null;
  };
  requests_this_week: number;
  active_key_count: number;
}

export interface UseAccountResult {
  data: AccountData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAccount(): UseAccountResult {
  return { data: null, loading: true, error: null, refresh: async () => {} };
}
