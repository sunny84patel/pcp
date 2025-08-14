import { affiliateLinks } from '../config/affiliate.js';

export function injectAffiliateUrl(storeItem) {
  const config = affiliateLinks[storeItem.store];
  if (!config) return storeItem.url;

  const encodedProductUrl = encodeURIComponent(storeItem.url);
  return `${config.base}?${config.param}=${encodedProductUrl}`;
}
