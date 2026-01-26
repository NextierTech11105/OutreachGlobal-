# README: How to Find Your Leads, Campaigns, and Batches

Welcome. This workspace is organized for quick access.

## 1. Leads (cleaned + labeled)
- `leads/organized/` is the main working area (cleaned CSVs).
- Start here: `leads/organized/START_HERE.md`
- Dashboard: `leads/organized/INDEX.md`
- Summaries: `index_by_group.csv`, `index_by_label.csv`, `index_by_tag.csv`
- Quick picker: run `python quick_open_leads.py` from the repo root
- Decision gate: run `python scripts/assess_leads.py --input <file>` to sample quality
- Windowshop preview: run `python scripts/windowshop_leads.py --open`

## 2. Leads (raw sources)
- `leads/linked_folders/` contains shortcuts to raw data folders.
- `leads/real_estate_api/` contains Real Estate API drop zones:
  - `leads/real_estate_api/Nextier/`
  - `leads/real_estate_api/Homeowner_Advisor/`
- Raw lead buckets:
  - `leads/zoho/`
  - `leads/fdaily/`
  - `leads/manual/`
  - `leads/batches/`

## 3. Campaigns
- All campaign blocks are in the `campaigns/` folder.

## 4. Batches
- All batch files/logs are in the `batches/` folder.

## 5. Templates
- Example lead CSV: `apps/front/public/templates/lead-lab-template.csv`

Tips:
- Use the CSV indexes in `leads/organized` to filter by label or tag.
- Use Ctrl+P to open any file quickly.
