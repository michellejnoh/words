# Words

https://michellejnoh.github.io/words/

Three tools on one page:

- **English words:** word breakdown (prefixes, roots, suffixes) and etymology. Definitions and etymology come from the [Merriam-Webster Collegiate® Dictionary API](https://dictionaryapi.com). The breakdown is matched against a reference list of English affixes and Latin and Greek roots (`morphemes.js`) and an English word list (`words.js`, SCOWL, see `WORDLIST-LICENSE.txt`).
- **French verbs:** full conjugation tables for about 7,800 verbs, including reflexive verbs (*se lever*) and accent-free typing (*preferer*). Data from the Lefff lexicon via the `french-verbs-lefff` package (`fr-verbs.js`, see `FRENCH-VERBS-LICENSE.txt`). Each verb links to its page on [Le Conjugueur](https://leconjugueur.lefigaro.fr/).
- **IPA keyboard:** every symbol on the official IPA chart, laid out like [TypeIt](https://ipa.typeit.org/full/). Click to type, then copy.

Links can open a tab directly: `#en/transport`, `#fr/venir`, `#ipa`.

`config.js` holds the Merriam-Webster API key. `preview.png` is the image shown when the link is shared.
