/**
 * Partnerlere verilen webhook URL tabanı.
 * VDS: aynı origin /vds-api/fn
 */
export function getPublicEdgeFunctionsBaseUrl(): string {
  if (import.meta.env.VITE_VDS_SELFHOST === 'true' && typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}/vds-api/fn`;
  }
  const proxy = (import.meta.env.VITE_PUBLIC_SUPABASE_FN_PROXY_BASE_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (proxy) return proxy;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'www.sefpos.com.tr' || host === 'sefpos.com.tr') {
      return `${window.location.origin}/vds-api/fn`;
    }
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}/vds-api/fn`;
  }
  return '/vds-api/fn';
}

export function getPartnerWebhookBaseUrl(): string {
  return getPublicEdgeFunctionsBaseUrl();
}

export function publicPartnerEdgeUrl(pathAndQuery: string): string {
  const base = getPartnerWebhookBaseUrl();
  const p = pathAndQuery.startsWith('/') ? pathAndQuery.slice(1) : pathAndQuery;
  return `${base}/${p}`;
}
