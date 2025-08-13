export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string;
  is_active: boolean;
}

export interface MiddlewareContext {
  tenant?: TenantInfo;
  isSubdomain: boolean;
  subdomain?: string;
  locale: string;
}