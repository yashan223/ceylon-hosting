export type ServerLocation = {
  id: string;
  city: string;
  country: string;
  label: string;
  flag: string;
};

export const SERVER_LOCATIONS: ServerLocation[] = [
  { id: "sg-singapore", city: "Singapore", country: "Singapore", label: "Singapore", flag: "🇸🇬" },
  { id: "de-frankfurt", city: "Frankfurt", country: "Germany", label: "Germany", flag: "🇩🇪" },
];

