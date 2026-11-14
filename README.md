# Words

https://michellejnoh.github.io/words/

Three tools on one page:

- **English words:** word breakdown (prefixes, roots, suffixes), etymology, and a thesaurus (synonyms and related words from the Merriam-Webster Collegiate Thesaurus; antonyms appear when "Show antonyms" is ticked at the bottom). Definitions and etymology come from the [Merriam-Webster Collegiate® Dictionary API](https://dictionaryapi.com). The breakdown comes from MorphoLex-en, a peer-reviewed morphological database of about 70,000 English words (`morpholex/`, CC BY-NC-SA 4.0, see `morpholex/README.md`). Meanings of the parts come from `morphemes.js`. Definitions include Merriam-Webster's example sentences.
- **French verbs:** full conjugation tables for about 7,800 verbs, including reflexive verbs (*se lever*) and accent-free typing (*preferer*). Data from the Lefff lexicon via the `french-verbs-lefff` package (`fr-verbs.js`, see `FRENCH-VERBS-LICENSE.txt`). Each verb links to its page on [Le Conjugueur](https://leconjugueur.lefigaro.fr/).
- **IPA keyboard:** every symbol on the official IPA chart, laid out like [TypeIt](https://ipa.typeit.org/full/). Click to type, then copy.

Links can open a tab directly: `#en/transport`, `#th/happy`, `#fr/venir`, `#ipa`.

**Float:** in Chrome or Edge, the Float button opens a small window that stays on top of other apps (Google Docs, Pages, Word). Keep the original tab open while using it.

`config.js` holds the Merriam-Webster dictionary and thesaurus keys. `preview.png` is the image shown when the link is shared.
