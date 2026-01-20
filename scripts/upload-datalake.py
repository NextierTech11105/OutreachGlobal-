#!/usr/bin/env python3
"""
USBizData Datalake Uploader
Upload pre-chunked CSV blocks to LUCI datalake for scanning

Usage:
  python upload-datalake.py <folder> --sector <sector_id> [--start <block>] [--dry-run]

Examples:
  python upload-datalake.py "C:/Users/colep/Downloads/CampaignBlocks/Plumbing" --sector plumbers_hvac
  python upload-datalake.py "C:/Users/colep/Downloads/CampaignBlocks/Consultants/SIC_8742" --sector business_consultants
  python upload-datalake.py "C:/Users/colep/Downloads/CampaignBlocks/Realtors/SIC_6531" --sector realtors

The folder should contain:
  - header.csv (column headers)
  - block_0001.csv, block_0002.csv, ... (data blocks)
"""

import os
import sys
import glob
import argparse
import requests
import time
from pathlib import Path
from datetime import datetime

# Configuration
API_BASE = os.getenv("NEXTIER_FRONT_URL", "https://outreachglobal.app")
# API_BASE = "http://localhost:3000"  # For local testing

# Sector definitions
SECTORS = {
    "plumbers_hvac": "US Plumbing, Heating & AC Contractors (SIC 1711) - 338K records",
    "business_consultants": "US Business Management & Consultants (SIC 8742/8748) - 866K records",
    "realtors": "US Realtors (SIC 6531) - 2.18M records",
    "hotels_motels": "Hotels & Motels (SIC 7011)",
    "restaurants": "Restaurants (SIC 5812)",
    "trucking": "Trucking Companies (SIC 4212/4213)",
}

def upload_file(sector_id, file_path, is_header=False):
    """Upload a single file to the datalake"""
    endpoint = f"{API_BASE}/api/luci/datalake"

    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'text/csv')}
            data = {
                'sector': sector_id,
                'isHeader': 'true' if is_header else 'false'
            }

            response = requests.post(endpoint, files=files, data=data, timeout=120)

            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'records': result.get('uploaded', {}).get('records', 0),
                    'path': result.get('uploaded', {}).get('path', ''),
                }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.text[:200]}"
                }
    except requests.exceptions.Timeout:
        return {'success': False, 'error': "Request timeout (120s)"}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def find_blocks(folder):
    """Find all block_*.csv files in folder"""
    pattern = os.path.join(folder, "block_*.csv")
    blocks = sorted(glob.glob(pattern))
    return blocks

def main():
    parser = argparse.ArgumentParser(description="Upload USBizData blocks to LUCI datalake")
    parser.add_argument("folder", help="Path to folder containing header.csv and block_*.csv files")
    parser.add_argument("--sector", required=True, help=f"Sector ID: {', '.join(SECTORS.keys())}")
    parser.add_argument("--start", type=int, default=1, help="Start from block number (default: 1)")
    parser.add_argument("--end", type=int, default=0, help="End at block number (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="List files but don't upload")
    parser.add_argument("--delay", type=float, default=0.2, help="Delay between uploads (seconds)")

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

    # Validate sector
    if args.sector not in SECTORS:
        print(f"ERROR: Invalid sector '{args.sector}'")
        print(f"Available: {', '.join(SECTORS.keys())}")
        sys.exit(1)

    # Find blocks
    blocks = find_blocks(folder_path)
    if not blocks:
        print(f"ERROR: No block_*.csv files found in {folder_path}")
        sys.exit(1)

    total_blocks = len(blocks)
    start_idx = args.start - 1
    end_idx = args.end if args.end > 0 else total_blocks
    blocks_to_upload = blocks[start_idx:end_idx]

    print(f"""
================================================================================
LUCI DATALAKE UPLOADER
================================================================================
Folder:       {folder_path}
Sector:       {args.sector}
              {SECTORS[args.sector]}
Total Blocks: {total_blocks}
Uploading:    Blocks {args.start} to {end_idx} ({len(blocks_to_upload)} blocks)
API:          {API_BASE}
================================================================================
""")

    if args.dry_run:
        print("[DRY RUN] Would upload:")
        print(f"  - header.csv")
        for b in blocks_to_upload[:10]:
            print(f"  - {os.path.basename(b)}")
        if len(blocks_to_upload) > 10:
            print(f"  ... and {len(blocks_to_upload) - 10} more blocks")
        return

    # Upload header first
    print("Uploading header.csv... ", end="", flush=True)
    result = upload_file(args.sector, header_path, is_header=True)
    if result['success']:
        print("OK")
    else:
        print(f"FAILED: {result['error']}")
        print("Continuing with blocks anyway...")

    # Upload blocks
    print(f"\nUploading {len(blocks_to_upload)} blocks...")
    print("-" * 60)

    uploaded_total = 0
    records_total = 0
    failed_blocks = []
    start_time = datetime.now()

    for i, block_path in enumerate(blocks_to_upload, start=args.start):
        block_name = os.path.basename(block_path)
        print(f"Block {i}/{total_blocks} ({block_name})... ", end="", flush=True)

        result = upload_file(args.sector, block_path)

        if result['success']:
            uploaded_total += 1
            records_total += result['records']
            print(f"OK ({result['records']:,} records)")
        else:
            failed_blocks.append(i)
            print(f"FAILED: {result['error']}")

        # Delay between uploads
        if args.delay > 0 and i < end_idx:
            time.sleep(args.delay)

    # Summary
    duration = datetime.now() - start_time
    print("-" * 60)
    print(f"""
================================================================================
UPLOAD COMPLETE
================================================================================
Duration:         {duration}
Blocks Uploaded:  {uploaded_total}/{len(blocks_to_upload)}
Records Total:    {records_total:,}
Failed Blocks:    {len(failed_blocks)} {f'({failed_blocks[:5]})' if failed_blocks else ''}
Success Rate:     {(uploaded_total / len(blocks_to_upload) * 100):.1f}%
================================================================================

NEXT STEPS:
1. Check datalake: GET {API_BASE}/api/luci/datalake?sector={args.sector}
2. Scan for leads: POST {API_BASE}/api/luci/scan
   {{"sector": "{args.sector}", "state": "TX", "limit": 500}}
3. Activate leads: POST {API_BASE}/api/luci/activate
   {{"scanId": "scan_xxx", "enrich": "skipTrace"}}
================================================================================
""")

    if failed_blocks:
        print(f"To retry failed blocks:")
        for b in failed_blocks[:5]:
            print(f"  python upload-datalake.py \"{folder_path}\" --sector {args.sector} --start {b} --end {b}")

if __name__ == "__main__":
    main()
