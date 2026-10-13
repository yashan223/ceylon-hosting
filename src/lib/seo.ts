export const siteName = "CeylonHosting";
export const siteTagline = "COD4 servers, mods and hosting support";
export const siteDescription =
  "Buy private Call of Duty 4 servers, custom mods, and one-time setup services from CeylonHosting. Browse the catalog, pay securely with Payments.lk, and get direct operator support.";
export const siteKeywords = [
  "CeylonHosting",
  "COD4 server",
  "Call of Duty 4 hosting",
  "COD4 server hosting",
  "COD4 mods",
  "COD4 mod pack",
  "Promod server",
  "game server Sri Lanka",
  "private COD4 server",
];

import { getAppUrl } from "./env";

export const siteUrl = getAppUrl();

export function absoluteUrl(path = "/") {
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return siteUrl;
  }
}
