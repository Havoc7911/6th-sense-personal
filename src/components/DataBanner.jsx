import { isSupabaseConfigured } from '../lib/supabase';

export default function DataBanner() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="data-banner" role="status">
      <strong>Backend not connected.</strong> Add{' '}
      <code className="data-banner-code">VITE_SUPABASE_URL</code> and{' '}
      <code className="data-banner-code">VITE_SUPABASE_ANON_KEY</code> (see{' '}
      <code className="data-banner-code">.env.example</code>) and run{' '}
      <code className="data-banner-code">supabase/schema.sql</code> in the Supabase SQL editor. For magic link
      sign-in on <code className="data-banner-code">/portal</code>, add your <code className="data-banner-code">/portal</code>{' '}
      URL under Authentication → Redirect URLs. Forms and dashboards use live data once configured.
    </div>
  );
}
