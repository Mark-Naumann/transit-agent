# Instructions for AI assistants working on this repo

- The owner is new to coding. Explain each step in plain, simple words before doing it.
- Keep code simple and well commented so the owner can explain it in an interview.
- Keep any API keys or secrets in a `.env` file, never in the code. Never print a key.
- Never commit `.env` (it is listed in `.gitignore`).
- The repo stays PRIVATE until the owner has checked it.
- Files in `vapi/` and `make/` must be redacted before committing: no webhook URLs,
  emails, org IDs, phone numbers, keys or credentials. `npm run export` does this for
  `vapi/`; check `make/` by hand or with `npm run check`.
