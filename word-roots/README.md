# Word Roots

Search an English word to see its breakdown (prefixes, roots, suffixes) and its etymology.

- **Definitions and etymology** come from the [Merriam-Webster Collegiate® Dictionary API](https://dictionaryapi.com).
- **Word breakdown** is built in the browser by matching the word against a reference list of English affixes and Latin and Greek roots (`morphemes.js`), checked against an English word list (`words.js`, from SCOWL — see `WORDLIST-LICENSE.txt`). When Merriam-Webster's etymology names the parts (e.g. *trans- + portare*), those are shown too.

## Setup

1. Get a free API key at https://dictionaryapi.com/register/index (choose **Collegiate Dictionary**).
2. Either paste the key into the site when it asks (saved in your browser only), or put it in `config.js` so it works for everyone. Anything in `config.js` is public.

## Publish with GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / root → Save.
The site will be at `https://<your-username>.github.io/<repo-name>/`.

## Edit the root list

Add entries to `morphemes.js` in the form `"form": ["meaning", "origin"]`. Roots with several spellings use `/`, e.g. `"spec/spect/spic": ["look", "Latin"]`.
