export type ServerLocation = {
  id: string;
  city: string;
  country: string;
  label: string;
  flag: string;
};

export const SERVER_LOCATIONS: ServerLocation[] = [
  { id: "lk-colombo", city: "Colombo", country: "Sri Lanka", label: "Colombo, Sri Lanka", flag: "🇱🇰" },
  { id: "sg-singapore", city: "Singapore", country: "Singapore", label: "Singapore", flag: "🇸🇬" },
  { id: "in-mumbai", city: "Mumbai", country: "India", label: "Mumbai, India", flag: "🇮🇳" },
  { id: "in-chennai", city: "Chennai", country: "India", label: "Chennai, India", flag: "🇮🇳" },
  { id: "de-frankfurt", city: "Frankfurt", country: "Germany", label: "Frankfurt, Germany", flag: "🇩🇪" },
  { id: "gb-london", city: "London", country: "United Kingdom", label: "London, UK", flag: "🇬🇧" },
  { id: "ae-dubai", city: "Dubai", country: "UAE", label: "Dubai, UAE", flag: "🇦🇪" },
  { id: "jp-tokyo", city: "Tokyo", country: "Japan", label: "Tokyo, Japan", flag: "🇯🇵" },
  { id: "kr-seoul", city: "Seoul", country: "South Korea", label: "Seoul, South Korea", flag: "🇰🇷" },
  { id: "hk-hongkong", city: "Hong Kong", country: "Hong Kong", label: "Hong Kong", flag: "🇭🇰" },
  { id: "us-virginia", city: "Virginia", country: "USA", label: "Virginia, USA", flag: "🇺🇸" },
];
