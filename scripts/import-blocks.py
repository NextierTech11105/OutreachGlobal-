#!/usr/bin/env python3
"""
USBizData Block Importer
Imports pre-chunked CSV blocks from USBizData to NEXTIER API

Usage:
  python import-blocks.py <folder> --sector <sector_id> [--start <block_num>] [--dry-run]

Examples:
  python import-blocks.py "C:/Users/colep/Downloads/CampaignBlocks/Plumbing" --sector plumbers_hvac
  python import-blocks.py "C:/Users/colep/Downloads/CampaignBlocks/Consultants/SIC_8742" --sector business_consultants_8742
  python import-blocks.py "C:/Users/colep/Downloads/CampaignBlocks/Realtors/SIC_6531" --sector realtors --start 50

The folder should contain:
  - header.csv (column headers)
  - block_0001.csv, block_0002.csv, ... (data blocks without headers)
"""

import csv
import json
import requests
import argparse
import sys
import os
import glob
from pathlib import Path
from datetime import datetime
import time

# Configuration
API_BASE = os.getenv("NEXTIER_API_URL", "https://outreach-global-api-4z29z.ondigitalocean.app")
API_KEY = os.getenv("NEXTIER_API_KEY", "")
FRONT_URL = os.getenv("NEXTIER_FRONT_URL", "https://outreachglobal.app")
DEFAULT_TEAM = os.getenv("NEXTIER_TEAM_ID", "tm_nextiertech")

# Sector mappings
SECTORS = {
    # USBizData Lists
    "plumbers_hvac": "US Plumbing, Heating & AC Contractors (SIC 1711)",
    "business_consultants": "US Business Management Consultants (SIC 8742+8748)",
    "business_consultants_8742": "US Business Management Consultants (SIC 8742)",
    "business_consultants_8748": "US Business Management Consultants (SIC 8748)",
    "realtors": "US Realtors (SIC 6531)",

    # Other
    "hotels_motels": "Hotels & Motels (SIC 7011)",
    "restaurants": "Restaurants (SIC 5812)",
    "trucking": "Trucking Companies (SIC 4212/4213)",
}

def normalize_headers(headers):
    """Normalize CSV headers to standard field names"""
    mapping = {
        "company name": "company",
        "company_name": "company",
        "business_name": "company",
        "address": "address",
        "city": "city",
        "state": "state",
        "zip": "zip",
        "zipcode": "zip",
        "zip_code": "zip",
        "county": "county",
        "phone": "phone",
        "phone_number": "phone",
        "contact first": "first_name",
        "contact_first": "first_name",
        "first_name": "first_name",
        "contact last": "last_name",
        "contact_last": "last_name",
        "last_name": "last_name",
        "title": "title",
        "direct phone": "direct_phone",
        "direct_phone": "direct_phone",
        "email": "email",
        "email_address": "email",
        "website": "website",
        "url": "website",
        "employee range": "employee_count",
        "employees": "employee_count",
        "employee_count": "employee_count",
        "annual sales": "revenue",
        "revenue": "revenue",
        "annual_revenue": "revenue",
        "sic code": "sic_code",
        "sic_code": "sic_code",
        "siccode": "sic_code",
        "industry": "sic_description",
        "sic description": "sic_description",
    }

    normalized = {}
    for h in headers:
        key = h.lower().strip()
        normalized[h] = mapping.get(key, key.replace(" ", "_"))
    return normalized

def read_block(header_path, block_path):
    """Read a block CSV using header from header.csv"""
    # Read headers
    with open(header_path, 'r', encoding='utf-8-sig', errors='replace') as f:
        reader = csv.reader(f)
        headers = next(reader)

    header_map = normalize_headers(headers)

    # Read block data
    records = []
    with open(block_path, 'r', encoding='utf-8-sig', errors='replace') as f:
        reader = csv.DictReader(f, fieldnames=headers)

        # Skip header row if present in block
        first_row = next(reader)
        if first_row.get(headers[0], "").strip() != headers[0]:
            # First row is data, not header - include it
            record = {}
            for orig_key, new_key in header_map.items():
                if orig_key in first_row and first_row[orig_key]:
                    record[new_key] = first_row[orig_key].strip()
            if record:
                records.append(record)

        # Read rest of rows
        for row in reader:
            record = {}
            for orig_key, new_key in header_map.items():
                if orig_key in row and row[orig_key]:
                    record[new_key] = row[orig_key].strip()

            # Combine first + last if no contact_name
            if "contact_name" not in record:
                first = record.get("first_name", "")
                last = record.get("last_name", "")
                if first or last:
                    record["contact_name"] = f"{first} {last}".strip()

            if record:
                records.append(record)

    return records

def import_block(records, sector_id, team_id, block_num, total_blocks):
    """Import a block of records to the API"""
    endpoint = f"{API_BASE}/api/sectors/import"

    headers = {
        "Content-Type": "application/json",
        "x-team-id": team_id,
    }
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    payload = {
        "sectorId": sector_id,
        "records": records,
        "source": "usbizdata_blocks",
        "chunk": block_num,
        "totalChunks": total_blocks,
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=180)

        if response.status_code == 200:
            data = response.json()
            return {"success": True, "imported": data.get("imported", len(records))}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text[:200]}"}

    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout (180s)"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def find_blocks(folder):
    """Find all block_*.csv files in folder"""
    pattern = os.path.join(folder, "block_*.csv")
    blocks = sorted(glob.glob(pattern))
    return blocks

def main():
    parser = argparse.ArgumentParser(description="Import USBizData blocks to NEXTIER")
    parser.add_argument("folder", help="Path to folder containing header.csv and block_*.csv files")
    parser.add_argument("--sector", required=True, help=f"Sector ID: {', '.join(SECTORS.keys())}")
    parser.add_argument("--team", default=DEFAULT_TEAM, help="Team ID")
    parser.add_argument("--start", type=int, default=1, help="Start from block number (default: 1)")
    parser.add_argument("--end", type=int, default=0, help="End at block number (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Parse but don't import")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between blocks (seconds)")

    args = parser.parse_args()

    # Validate folder
    folder_path = Path(args.folder)
    if not folder_path.exists():
        print(f"ERROR: Folder not found: {folder_path}")
        sys.exit(1)

    header_path = folder_path / "header.csv"
    if not header_path.exists():
        print(f"ERROR: header.csv not found in {folder_path}")
        sys.exit(1)

    # Find blocks
    blocks = find_blocks(folder_path)
    if not blocks:
        print(f"ERROR: No block_*.csv files found in {folder_path}")
        sys.exit(1)

    total_blocks = len(blocks)

    # Filter by start/end
    start_idx = args.start - 1
    end_idx = args.end if args.end > 0 else total_blocks
    blocks_to_process = blocks[start_idx:end_idx]

    print(f"""
================================================================================
USBizData Block Importer
================================================================================
Folder:      {folder_path}
Sector:      {args.sector} ({SECTORS.get(args.sector, 'Unknown')})
Team:        {args.team}
Total Blocks: {total_blocks}
Processing:  Blocks {args.start} to {end_idx} ({len(blocks_to_process)} blocks)
API:         {API_BASE}
================================================================================
""")

    # Read header to show columns
    with open(header_path, 'r', encoding='utf-8-sig') as f:
        headers = next(csv.reader(f))
    print(f"Columns: {headers}")
    print()

    if args.dry_run:
        # Just count records
        total_records = 0
        for block_path in blocks_to_process:
            records = read_block(header_path, block_path)
            total_records += len(records)
            block_name = os.path.basename(block_path)
            print(f"{block_name}: {len(records)} records")
        print(f"\n[DRY RUN] Would import {total_records:,} records from {len(blocks_to_process)} blocks")
        return

    # Import blocks
    print(f"Importing {len(blocks_to_process)} blocks...")
    print("-" * 60)

    imported_total = 0
    failed_blocks = []
    start_time = datetime.now()

    for i, block_path in enumerate(blocks_to_process, start=args.start):
        block_name = os.path.basename(block_path)

        # Read block
        try:
            records = read_block(header_path, block_path)
        except Exception as e:
            print(f"Block {i}/{total_blocks} ({block_name}): READ ERROR - {e}")
            failed_blocks.append(i)
            continue

        print(f"Block {i}/{total_blocks} ({block_name}): {len(records):,} records... ", end="", flush=True)

        # Import
        result = import_block(records, args.sector, args.team, i, total_blocks)

        if result["success"]:
            imported_total += result["imported"]
            print(f"OK ({result['imported']:,} imported)")
        else:
            failed_blocks.append(i)
            print(f"FAILED: {result['error']}")

        # Delay between blocks
        if args.delay > 0 and i < end_idx:
            time.sleep(args.delay)

    # Summary
    duration = datetime.now() - start_time
    print("-" * 60)
    print(f"""
================================================================================
IMPORT COMPLETE
================================================================================
Duration:        {duration}
Blocks Processed: {len(blocks_to_process)}
Records Imported: {imported_total:,}
Failed Blocks:   {len(failed_blocks)} {f'({failed_blocks})' if failed_blocks else ''}
Success Rate:    {((len(blocks_to_process) - len(failed_blocks)) / len(blocks_to_process) * 100):.1f}%
================================================================================
""")

    if failed_blocks:
        print(f"\nTo retry failed blocks, run:")
        for b in failed_blocks[:5]:
            print(f"  python import-blocks.py \"{folder_path}\" --sector {args.sector} --start {b} --end {b}")
        if len(failed_blocks) > 5:
            print(f"  ... and {len(failed_blocks) - 5} more")

if __name__ == "__main__":
    main()
