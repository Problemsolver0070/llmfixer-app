function required(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  apiBase: import.meta.env.VITE_API_BASE || 'https://api.thefixer.in',
  paypalClientId: required('VITE_PAYPAL_CLIENT_ID'),
  paypalPlanId: required('VITE_PAYPAL_PLAN_ID'),
};
