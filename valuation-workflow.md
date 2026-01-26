# Valuation + Property Lookup Workflow

Bringing property valuations alongside the Lead Hub means you can generate context-ready reports for every address, link them into the Inbox, and hand them off to Claude, Luci, or an internal copilot. This workflow pairs built/cleaned leads with a property-aware CLI command so you can collect actionable insight before you start the campaign sequencing.

## Flow overview

1. Pick a label from `leads/organized/<group>/<label>/` via the Hub (`scripts/organize_leads.py`) and note the target addresses you want to price.
2. Run the CLI: `python scripts/valuation_report.py --address "123 Main St" --city "Austin" --state "TX" --source "Bluebird API"`.
3. The script writes both a human-friendly summary and a slugged filename in `leads/valuations/valuation-123-main-st.md`, which you can reference inside SMS replies (`links` column), SendGrid campaigns, or the inbox page on `sigalahsoue.io`.
4. Share or drop the markdown into Claude/Copilot for follow-up sequences; the file includes the timestamp, valuation, comps, and any notes you provided.

## CLI knobs

- `--address` (required) - canonical property line (the script slugifies this for filename and title).
- `--city`, `--state`, `--postal-code` - enrich the header so you know exactly which parcel was priced.
- `--source` - describe whether this came from an API, a partner, or manual research (default: "manual review").
- `--api-url` / `--api-key` - when provided, the script calls the external valuation API (JSON response is embedded in the markdown). Without them it falls back to the sample breakdown built into the script.
- `--output-dir` - defaults to `leads/valuations`, but you can redirect to any shared folder for copy/paste into a portal.
- `--notes` - comma-separated reminders about permission, opt-ins, or valuator comments that should live in the report.

## Output expectations

- Each run writes `valuation-<slug>.md` with:
  - Source metadata (API, timestamp, city/state).
  - Estimated value range and confidence.
  - Market comps table (address, price, source, notes).
  - Optional `notes` list for permission status or CTA.
  - Embed of the raw API response (when available) so you can audit the exact payload before linking in SMS replies.
- The script also prints the output path so you can quickly open it with `code` or share the file path inside the inbox template.

## Suggestions for a fully automated inbox

- When you queue an SMS that needs a valuation link, populate `leads/inbox/sms_queue.csv` with a `valuation_link` column pointing to `leads/valuations/valuation-123-main-st.md`.
- Use the `scripts/sms_bulk_reply.py` template to mention "valuation snapshot attached" and drop the `valuation_link` in the message body or follow-up remark after permission is confirmed.
- If you prefer an AI rebuttal sequence, have Claude read the valuation markdown, craft a multi-leg reply, and store the response under `leads/inbox/replies/` so the next bulk run can reference it.
