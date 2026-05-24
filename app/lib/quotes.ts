// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

export interface Quote {
  text: string;
  author: string;
  lang: string;
}

export const quotes: Quote[] = [
  {
    text: "Open Source zal voor altijd heersen.",
    author: "Andrei K. (Stichter PolarNL)",
    lang: "nl",
  },
  {
    text: "Open Source will reign forever.",
    author: "Andrei K. (Founder of PolarNL)",
    lang: "en",
  },
  {
    text: "2 + 2 = 5",
    author: "Siem",
    lang: "nl",
  },
  {
    text: "2 + 2 = 5",
    author: "Siem",
    lang: "en",
  },
  {
    text: "Ik kan geen quote verzinnen dus hier is een koekje 🍪",
    author: "Andrei. K",
    lang: "nl",
  },
  {
    text: "The cake is a lie",
    author: "Siem",
    lang: "en",
  },
  {
    text: "Stille werk. Luide toekomst.",
    author: "Nerissa Z.",
    lang: "nl",
  },
  {
    text: "Gebouwd door discipline, niet door geluk.",
    author: "Nerissa Z.",
    lang: "nl",
  },
  {
    text: "Gemaakt met ❤️",
    author: "Team PolarNL",
    lang: "nl",
  },
  {
    text: "Een klant is meer dan data waard.",
    author: "Quinn",
    lang: "nl",
  },
  {
    text: "Veni, Vidi, Vici.",
    author: "Julius Caesar",
    lang: "nl",
  },
  {
    text: "Veni, Vidi, Vici.",
    author: "Julius Caesar",
    lang: "en",
  },
  {
    text: "Oefening baart kunst. (vaak dan)",
    author: "Jessi Flessi",
    lang: "nl",
  },
];

export function getRandomQuote(lang: string): Quote {
  const filteredQuotes = quotes.filter((quote) => quote.lang === lang);
  const quotePool = filteredQuotes.length > 0 ? filteredQuotes : quotes;

  return quotePool[Math.floor(Math.random() * quotePool.length)];
}
