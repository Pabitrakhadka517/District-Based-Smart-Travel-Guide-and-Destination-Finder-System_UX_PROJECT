/** Ported from the frontend's src/data/images.ts so seeded image URLs match exactly. */
const U = "https://images.unsplash.com/photo-";

export const img = (id: string, w = 1200, q = 80): string =>
  `${U}${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const PHOTO = {
  himalaya1: "1544735716-392fe2489ffa",
  himalaya2: "1486911278844-a81c5267e227",
  himalaya3: "1469854523086-cc02fe5d8800",
  himalaya4: "1551632811-561732d1e306",
  himalaya5: "1454496522488-7a8e488e8606",
  himalaya6: "1464822759023-fed622ff2c3b",
  himalaya7: "1506905925346-21bda4d32df4",
  himalaya8: "1519681393784-d120267933ba",
  himalaya9: "1458668383970-8ddd3927deed",
  forest1: "1470071459604-3b5ec3a7fe05",
  stupa1: "1605640840605-14ac1855827b",
  stupa2: "1592285896110-8d88b5b3a5d8",
  square1: "1571536802807-30451e3955d8",
  durbarSquareKTM: "1736457093305-5c54384fc49e",
  patanCourtyard: "1699204121879-f7d805d3bc41",
  thamelStreet: "1580321827154-812450ccf214",
  lake1: "1526772662000-3f88f10405ff",
  lake2: "1506905925346-21bda4d32df4",
  jungle1: "1581852017103-68ac65514cf7",
  forest2: "1470071459604-3b5ec3a7fe05",
  hotel1: "1566073771259-6a8506099945",
  hotel2: "1551882547-ff40c63fe5fa",
  lodge1: "1455587734955-081b22074882",
  // District hero images — verified CDN IDs
  ebc:           "1522774607452-dac2ecc66330",
  kanchenjunga:  "1627119703136-3964f14b7325",
  swayambhu:     "1665435246383-4103fc803522",
  patanDurbar:   "1676299950521-638fa4f0f475",
  bhaktapurSq:   "1706188047078-0ba67733fa45",
  chitwan:       "1498712067384-01239c6b377c",
  phewa:         "1659808909524-5fcad5cd48bf",
  mustangDesert: "1642402734863-15ead077a324",
  manaslu:       "1610912335893-b996d1743610",
  annapurna:     "1653043506251-05cecdfe9cfd",
  teaHills:      "1742106856193-5cc3424ac450",
  teaPickers:    "1758390286435-e559ab6d4596",
  tiger:         "1714318808656-1aa1639eae15",
  himalayaLake:  "1715935257216-fdba0eadd42a",
  sacredLake:    "1715935564077-bc4e06915d8c",
  brickTemple:   "1760366621342-5c4703099c2c",
  janakpur:      "1760973179127-414475da8dcc",
  nuwakotPalace: "1669557582081-274a568aff4d",
  namobuddha:    "1540961286473-8ad1368dc1bd",
  nepalHills:    "1599751229070-854ae5c90869",
  tanahun:       "1731339987698-a9ddbd4be744",
  tansen:        "1529733905113-027ed85d7e33",
  // Festival-specific photos — verified CDN IDs
  holiColors:    "1774160481361-ddc7c7c5f0eb",
  tiharDiya:     "1605292356183-a77d0a9c9d1d",
  dashainKite:   "1572140857887-c4324122ff1e",
} as const;

export const gallery = (...ids: string[]): string[] => ids.map((id) => img(id, 1400));

export interface SeedImage {
  url: string;
  publicId: null;
  alt: string;
}

/**
 * Wraps a legacy seed URL string into the structured image shape the models
 * now expect. `publicId` stays null — these were never uploaded through
 * Cloudinary, so they must never be sent to Cloudinary's destroy API.
 */
export const toImage = (url: string, alt: string): SeedImage => ({
  url: url ?? "",
  publicId: null,
  alt
});

export const toGallery = (urls: string[], alt: string): SeedImage[] =>
  (urls ?? []).map((url, i) => toImage(url, `${alt} — photo ${i + 1}`));
