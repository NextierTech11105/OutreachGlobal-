#!/usr/bin/env python3
"""
USBizData CSV Importer
Chunks large CSV files into 10k batches and imports to NEXTIER API

Usage:
  python import-usbizdata.py <csv_file> --sector <sector_id> [--team <team_id>]

Examples:
  python import-usbizdata.py hotels.csv --sector hotels_motels
  python import-usbizdata.py consultants.csv --sector business_consultants --team tm_abc123
"""

import csv
import json
import requests
import argparse
import sys
import os
from pathlib import Path
from datetime import datetime

# Configuration
API_BASE = os.getenv("NEXTIER_API_URL", "https://outreach-global-api-4z29z.ondigitalocean.app")
API_KEY = os.getenv("NEXTIER_API_KEY", "")
CHUNK_SIZE = 10000  # 10k records per batch
DEFAULT_TEAM = os.getenv("NEXTIER_TEAM_ID", "tm_nextiertech")

# Sector mappings (sectorId -> display name + SIC codes)
SECTORS = {
    # USBizData Lists (YOUR 3 LISTS)
    "plumbers_hvac": "US Plumbing, Heating & AC Contractors (SIC 1711) - 338,605 records",
    "business_consultants": "US Business Management & Consultants (SIC 8742/8748) - 866,527 records",
    "realtors": "US Realtors (SIC 6531) - 2,184,726 records",

    # Other B2B
    "hotels_motels": "Hotels & Motels (SIC 7011)",
    "campgrounds_rv": "Campgrounds & RV Parks (SIC 7033)",
    "trucking": "Trucking Companies (SIC 4212/4213)",
    "schools": "US Schools Database (SIC 8211)",
    "restaurants": "Restaurants & Food Service (SIC 5812)",
    "professional_services": "Professional Services",
    "healthcare": "Healthcare & Medical",
    "retail": "Retail & Stores",
    "manufacturing": "Manufacturing",
    "transportation": "Transportation & Logistics",
    "education": "Education & Training Centers",
    "automotive": "Automotive",
    "financial": "Financial Services",
    "construction": "Construction & Contractors",
}

def chunk_list(lst, chunk_size):
    """Split list into chunks of specified size"""
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

def normalize_headers(headers):
    """Normalize CSV headers to expected field names"""
    mapping = {
        # Company/Business
        "company": "company",
        "company_name": "company",
        "business_name": "company",
        "business": "company",
        "name": "company",

        # Contact Name
        "contact": "contact_name",
        "contact_name": "contact_name",
        "full_name": "contact_name",
        "owner": "contact_name",
        "owner_name": "contact_name",
        "first_name": "first_name",
        "last_name": "last_name",
        "fname": "first_name",
        "lname": "last_name",

        # Phone
        "phone": "phone",
        "phone_number": "phone",
        "telephone": "phone",
        "tel": "phone",
        "mobile": "mobile",
        "cell": "mobile",

        # Email
        "email": "email",
        "email_address": "email",
        "e-mail": "email",

        # Address
        "address": "address",
        "street": "address",
        "street_address": "address",
        "address1": "address",
        "city": "city",
        "state": "state",
        "zip": "zip",
        "zipcode": "zip",
        "zip_code": "zip",
        "postal": "zip",

        # SIC
        "sic": "sic_code",
        "sic_code": "sic_code",
        "siccode": "sic_code",
        "sic_description": "sic_description",

        # Other
        "website": "website",
        "url": "website",
        "employees": "employee_count",
        "employee_count": "employee_count",
        "revenue": "revenue",
        "annual_revenue": "revenue",
    }

    normalized = {}
    for h in headers:
        key = h.lower().strip().replace(" ", "_").replace("-", "_")
        normalized[h] = mapping.get(key, key)

    return normalized

def read_csv(filepath):
    """Read CSV and return normalized records"""
    records = []

    with open(filepath, 'r', encoding='utf-8-sig', errors='replace') as f:
        # Try to detect delimiter
        sample = f.read(4096)
        f.seek(0)

        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=',\t;|')
        except:
            dialect = csv.excel

        reader = csv.DictReader(f, dialect=dialect)
        headers = reader.fieldnames

        if not headers:
            print("ERROR: Could not read CSV headers")
            sys.exit(1)

        header_map = normalize_headers(headers)
        print(f"Detected columns: {list(headers)}")
        print(f"Mapped to: {list(set(header_map.values()))}")

        for row in reader:
            record = {}
            for orig_key, new_key in header_map.items():
                if orig_key in row and row[orig_key]:
                    record[new_key] = row[orig_key].strip()

            # Combine first_name + last_name if no contact_name
            if "contact_name" not in record:
                first = record.pop("first_name", "")
                last = record.pop("last_name", "")
                if first or last:
                    record["contact_name"] = f"{first} {last}".strip()

            if record:  # Only add non-empty records
                records.append(record)

    return records

def import_chunk(records, sector_id, team_id, chunk_num, total_chunks):
    """Import a chunk of records to the API"""
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
        "source": "usbizdata_import",
        "chunk": chunk_num,
        "totalChunks": total_chunks,
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=120)

        if response.status_code == 200:
            data = response.json()
            return {"success": True, "imported": data.get("imported", len(records))}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text[:200]}"}

    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout (120s)"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Import USBizData CSV to NEXTIER")
    parser.add_argument("csv_file", help="Path to CSV file")
    parser.add_argument("--sector", required=True, help=f"Sector ID: {', '.join(SECTORS.keys())}")
    parser.add_argument("--team", default=DEFAULT_TEAM, help="Team ID (default: from env or tm_nextiertech)")
    parser.add_argument("--dry-run", action="store_true", help="Parse CSV but don't import")
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE, help=f"Records per chunk (default: {CHUNK_SIZE})")

    args = parser.parse_args()

    # Validate file exists
    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"ERROR: File not found: {csv_path}")
        sys.exit(1)

    # Validate sector
    if args.sector not in SECTORS:
        print(f"ERROR: Unknown sector '{args.sector}'")
        print(f"Available sectors: {', '.join(SECTORS.keys())}")
        sys.exit(1)

    print(f"""
================================================================================
USBizData CSV Importer
================================================================================
File:     {csv_path}
Sector:   {args.sector} ({SECTORS[args.sector]})
Team:     {args.team}
Chunk:    {args.chunk_size:,} records
API:      {API_BASE}
================================================================================
""")

    # Read CSV
    print("Reading CSV file...")
    records = read_csv(csv_path)
    total_records = len(records)

    if total_records == 0:
        print("ERROR: No valid records found in CSV")
        sys.exit(1)

    print(f"Found {total_records:,} records")

    # Show sample record
    print(f"\nSample record:")
    print(json.dumps(records[0], indent=2))

    if args.dry_run:
        print("\n[DRY RUN] Would import {total_records:,} records in {len(list(chunk_list(records, args.chunk_size)))} chunks")
        return

    # Chunk and import
    chunks = list(chunk_list(records, args.chunk_size))
    total_chunks = len(chunks)

    print(f"\nImporting {total_records:,} records in {total_chunks} chunks...")
    print("-" * 60)

    imported_total = 0
    failed_chunks = []

    for i, chunk in enumerate(chunks, 1):
        print(f"Chunk {i}/{total_chunks} ({len(chunk):,} records)... ", end="", flush=True)

        result = import_chunk(chunk, args.sector, args.team, i, total_chunks)

        if result["success"]:
            imported_total += result["imported"]
            print(f"OK ({result['imported']:,} imported)")
        else:
            failed_chunks.append(i)
            print(f"FAILED: {result['error']}")

    # Summary
    print("-" * 60)
    print(f"""
================================================================================
IMPORT COMPLETE
================================================================================
Total Records:   {total_records:,}
Imported:        {imported_total:,}
Failed Chunks:   {len(failed_chunks)} {f'({failed_chunks})' if failed_chunks else ''}
Success Rate:    {(imported_total / total_records * 100):.1f}%
================================================================================
""")

if __name__ == "__main__":
    main()
