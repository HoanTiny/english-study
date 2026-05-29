export type LoopCard = {
  en: string;
  vi: string;
  ipa: string;
  example: string;
};

// Học theo CỤM + CÂU MẪU, không phải từ lẻ.
export const loopCards: LoopCard[] = [
  {
    en: "It depends on…",
    vi: "Còn tùy vào…",
    ipa: "/ɪt dɪˈpendz ɒn/",
    example: "It depends on the weather.",
  },
  {
    en: "I'm thinking about…",
    vi: "Tôi đang nghĩ đến việc…",
    ipa: "/aɪm ˈθɪŋkɪŋ əˈbaʊt/",
    example: "I'm thinking about learning to cook.",
  },
  {
    en: "I'd rather…",
    vi: "Tôi thà… hơn",
    ipa: "/aɪd ˈræðər/",
    example: "I'd rather stay home tonight.",
  },
];
