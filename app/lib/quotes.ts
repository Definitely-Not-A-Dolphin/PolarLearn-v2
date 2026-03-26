export type Quote = {
  text: string;
  author: string;
  lang: string;
};

export const quotes: Quote[] = [
  {
    text: "Open Source zal voor altijd heersen.",
    author: "Andrei K. (Stichter PolarNL)",
    lang: "nl"
  },
  {
    text: "Open Source will reign forever.",
    author: "Andrei K. (Founder of PolarNL)",
    lang: "en"
  },
  {
    text: "2 + 2 = 5",
    author: "Siem",
    lang: "nl"
  },
  {
    text: "2 + 2 = 5",
    author: "Siem",
    lang: "en"
  },
  {
    text: "Ik kan geen quote verzinnen dus hier is een koekje 🍪",
    author: "Andrei. K",
    lang: "nl"
  },
  {
    text: "The cake is a lie",
    author: "Siem",
    lang: "en"
  },
  {
    text: "Stille werk. Luide toekomst.",
    author: "Nerissa Z.",
    lang: "nl"
  },
  {
    text: "Gebouwd door discipline, niet door geluk.",
    author: "Nerissa Z.",
    lang: "nl"
  },
  {
    text: "Gemaakt met ❤️",
    author: "Team PolarNL",
    lang: "nl"
  },
  {
    text: "Een klant is meer dan data waard.",
    author: "Quinn",
    lang: "nl"
  },
  {
    text: "Veni, Vidi, Vici.",
    author: "Julius Caesar",
    lang: "nl"
  },
  {
    text: "Veni, Vidi, Vici.",
    author: "Julius Caesar",
    lang: "en"
  }
]

export function getRandomQuote(lang: string): Quote {
  const filteredQuotes = quotes.filter((quote) => quote.lang === lang);
  const quotePool = filteredQuotes.length > 0 ? filteredQuotes : quotes;

  return quotePool[Math.floor(Math.random() * quotePool.length)];
}