# Lead Hub Architecture & Navigation Map

This file orients every layer of the Outreach Global Lead Hub to the scripts, docs, and folders that keep the lake tidy and the cockpit launchable. It emphasizes the clean separation between the raw import zone, the organizer/indexer ("Hub"), and the downstream intelligence (Windowshop, Skip Trace, Inbox, Valuation, Campaigns, etc.).

## 1. Import Lake (raw + untouched)

- `leads/linked_folders/` and `leads/raw/` (various campaigns) are read-only sources; nothing writes back so the lake is pristine.
- Use `scripts/import-blocks.py`, `scripts/import-usbizdata.py`, and `scripts/import-campaign-blocks.ts` to hydrate the lake and drop new "source" exports under `leads/linked_folders/` or `batches/`.
- `scripts/upload-datalake.py` keeps the raw exports synced with any external storage or monitoring you need (see `monitor-properties.ts` under `scripts/` for API watch loops).
- Campaign or content creators can drop files under `campaigns/` or `content-library/` and wire them back into `leads/linked_folders/` via the import scripts above.

## 2. Hub / Organizer (indexing + metadata)

- `python scripts/organize_leads.py` reads every raw CSV, normalizes columns, assigns groups/labels/tags, and writes the structured assets under `leads/organized/`.
- The Hub publishes a small set of index files: `index.csv`, `index_by_group.csv`, `index_by_label.csv`, and `index_by_tag.csv`. These indexes are the contract that every downstream CLI or UI touches.
- `quick_open_leads.py` surfaces those indexes through a lightweight picker/favorites flow so humans can jump straight into the right label folder.
- Tag rules stay consistent: `tag_nextier + tag_usbizdata` routes to Nextier, `tag_nextier` alone powers Real Estate Nextier, `tag_homeowner_advisor` flags property-centric lists, and USBizData real estate keeps hitting Nextier.

## 3. Sectors / Lead Lab (cleaned CSVs)

- Cleaned datasets live under `leads/organized/<group>/<label>/` with consistent `label`, `group`, and `tags` to guarantee downstream tooling a stable schema.
- `leads/favorites.txt` pins preferred labels for `quick_open_leads.py`.
- `leads/organized/START_HERE.md` and `leads/DASHBOARD.md` document how to pick a sector, inspect the indexes, and where to run the Hub commands.

## 4. Data Browser / Windowshop

- `python scripts/windowshop_leads.py --open` assembles `windowshop.html`, surfaces stats, tags, sample rows, estimated enrichment cost, and folder/file shortcuts without opening the CSVs manually.
- Settings such as `--rows`, `--cols`, `--limit`, and `--cost-per` turn this into a lightweight UI that lets you "see the lake" before you pull data downstream.

## 5. Skip Trace / Decision Gate

- `python scripts/assess_leads.py --input "leads/organized/<group>/<label>/<file>.csv" [--require-tag tag_usbizdata]` samples records, calls the Trestle enrichment API, and reports contactability plus suppressed mobile/AI scores.
- Defaults: 100 record sample, $0.035 enrichment cost, 50 mobile suppress threshold, 70 activity ideal score.
- Only records that pass the tag or score gate get the green light to be pushed into Nextier, Homeowner Advisor, or USBizData flows.

## 6. Inbox / SMS + AI assistant

- `leads/inbox/sms_queue.csv` is the queue: add rows with `status=queued`, phone fields, and tags (e.g., `tag_auto_reply`) to flag how replies should flow.
- Run `python scripts/sms_bulk_reply.py --template "Hey {first_name_or_name}, ..." [--max 50 --status queued]` to generate templated replies, mark rows as `replied`, and log every run under `leads/inbox/sms_bulk_log.csv`.
- The existing inbox command already supports auto-respond, manual review (switch `--status`), and bulk send by trimming the queue before the run.

## 7. Content / Valuation / Campaign / Analytics surface

- Content Hub playback lives across `content-library/`, `campaigns/`, and `docs/`; use the Campaign Builder import tasks (above) to pipe content into the Hub whenever you tag new creative.
- The new `leads/valuations/` folder (created by `scripts/valuation_report.py`) stores enforcement-friendly valuation reports: each run writes `valuation-<slugified-address>.md`, so you can share links with Claude, Luci, or the copilot.
- `valuation-workflow.md` (see below) describes how the property lookup fits into the lead lifecycle and the CLI knobs you can use to hit an external API (or fall back to the offline sample data in the script).
- Analytics & INBOX/API sections are collected under `integrations/`, `functions/`, and `dashboards/`; these folders fuel the Inbox page on `sigalahsoue.io`, the Nextier Copilot commands, and any metrics you surface on the scoreboard.

## 8. Navigation Cheat Sheet

| Feature | Script / Path | Quick command |
| --- | --- | --- |
| Organizer / Tag sync | `scripts/organize_leads.py` | `python scripts/organize_leads.py` |
| Quick picker | `quick_open_leads.py` + `leads/favorites.txt` | `python quick_open_leads.py` |
| Windowshop browser | `scripts/windowshop_leads.py` | `python scripts/windowshop_leads.py --open` |
| Skip trace / Assess | `scripts/assess_leads.py` | `python scripts/assess_leads.py --input "leads/organized/.../file.csv"` |
| Inbox / Bulk SMS | `scripts/sms_bulk_reply.py`, `leads/inbox/sms_queue.csv` | `python scripts/sms_bulk_reply.py --template "..." --status queued` |
| Campaign import | `scripts/import-campaign-blocks.ts` | `node scripts/import-campaign-blocks.ts ...` |
| Property valuation | `scripts/valuation_report.py` (see `valuation-workflow.md`) | `python scripts/valuation_report.py --address "123 Main St" --city "Austin"` |
| Dashboard / Start docs | `leads/DASHBOARD.md`, `leads/organized/START_HERE.md` | open in editor |

---

## QUICK NAVIGATION (Live links & quick actions)

- **Nextier** — Platform root and admin panels
- **SECTORS / Dashboard** — Frontend: `/t/{team}/sectors` (per-team dashboard), REST: `GET /rest/sectors/stats`
- **HUB / Import** — `scripts/import-campaign-blocks.ts` or Frontend: `/t/{team}/data-hub`
- **B2B Search** — API: `POST /api/b2b/search` (used by Lead Lab and B2B workflows)
- **Skip Trace** — Enrichment endpoints and scripts: `scripts/assess_leads.py`, `apps/api/src/app/enrichment/` (skiptrace)
- **Lead Lab** — Frontend: `/lead-lab` or `/leadlab` (experimental); use `leads/` organized datasets
- **Leads** — Frontend: `/t/{team}/leads` ; REST: `GET /rest/leads`
- **Data Browser / LAKE** — Raw & organized: `/t/{team}/data-hub`, LUCI endpoints: `/api/luci/*`

**Owner quick links (use only if you are the platform owner):**
- SMS Blast (live staging): `https://monkfish-app-mb7h3.ondigitalocean.app/t/thomas-borrusos-team-f4371/blast`
- Dashboard (local): open `tools/lead-dashboard/dashboard.html` after running `pnpm generate:lead-hub`

**Usage tips:**
- Replace `{team}` with your team slug (e.g., `thomas-borrusos-team-f4371`) when opening frontend links.
- To run an owner-level action when team context is missing, set `FEATURE_OWNER_BYPASS=true` in your DO env (be careful; usage is audited).

If you'd like, I can convert this into a clickable HTML quick-nav page in `tools/lead-dashboard` for one-click access. Tell me if you want that and I'll add it.
## Next Steps

- Run the valuation script, drop the generated markdown under `leads/valuations/`, then load it into your Claude or Luci workflow and link it from the inbox when you reply over SMS.
- Extend the `sigalahsoue.io` inbox page by wiring the nav items (SMS queue, auto-respond, property link) to this document so every teammate can follow the same mission.
- Ship additional CLI wrappers (e.g., a menu for Content Hub / Campaign Builder / Valuation / Inbox) once the command list above is stable.

---

## Generated Inventory & Live Dashboard (automated)

- A generator script now exists at `scripts/generate_lead_hub.js` that scans the repo for all CSVs and creates a machine-readable manifest and a quick static dashboard.

How to run:

1. From repo root:

```bash
node scripts/generate_lead_hub.js
```

- Output files it writes:
  - `leads/LEAD_HUB.json` — full JSON manifest (generated, do not manually edit)
  - `leads/LEAD_HUB_INVENTORY.md` — a readable table of every CSV found (generated)
  - `tools/lead-dashboard/dashboard.html` — a simple, searchable static dashboard you can open in your browser or VS Code to see every CSV at a glance

Notes:
- This is safe to run locally. It does not modify CSVs — it only reads them to build indexes and the dashboard.
- If you want this to run as part of CI or a scheduling job, add a step that runs `node scripts/generate_lead_hub.js` and archives the generated outputs to a build artifact or DO Space.

If you'd like, I can now:
- Add a package.json script to run the generator (one-line), and
- Wire a VS Code Task or a simple GitHub Action to run it on demand.

Tell me which option you want next and I will implement it.
