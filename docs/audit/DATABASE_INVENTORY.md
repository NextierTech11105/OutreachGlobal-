# DATABASE INVENTORY

**Generated:** 2025-12-30T18:37:43.660Z
**Database:** DigitalOcean PostgreSQL 17
**Host:** app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tables | 95 |
| Total Rows | 166 |
| Tables with team_id | 59 |
| Tables without team_id | 36 |

---

## Tables by Row Count (Non-Empty)

| Table | Rows |
|-------|------|
| properties | 156 |
| users | 6 |
| personal_access_tokens | 1 |
| power_dialers | 1 |
| team_members | 1 |
| teams | 1 |

---

## Tables WITH team_id Column (59)

```
achievement_notifications, ai_sdr_avatars, api_keys, appointments, automation_plays, business_owners, cadence_templates, campaign_cadences, campaign_initial_messages, campaign_queue, campaigns, content_categories, content_items, conversation_labels, import_lead_presets, inbox_items, initial_messages, integrations, intelligence_log, intelligence_metrics, knowledge_documents, lead_activities, lead_labels, leaderboard_snapshots, leads, message_labels, message_templates, messages, outreach_logs, persona_addresses, persona_demographics, persona_emails, persona_merge_history, persona_phones, persona_socials, personas, power_dialers, prompts, property_owners, property_searches, response_buckets, saved_searches, scheduled_events, sdr_campaign_configs, sdr_sessions, shared_links, skiptrace_jobs, skiptrace_results, suppression_list, team_invitations, team_members, team_settings, unified_lead_cards, user_achievements, user_stats, worker_personalities, worker_phone_assignments, worker_voice_configs, workflows
```

---

## Tables WITHOUT team_id Column (36)

```
achievement_definitions, bucket_movements, buckets, businesses, call_histories, call_recordings, campaign_events, campaign_executions, campaign_leads, campaign_sequences, content_usage_logs, data_sources, dialer_contacts, integration_fields, integration_tasks, lead_flags, lead_label_links, lead_phone_numbers, message_label_links, personal_access_tokens, properties, property_distress_scores, property_search_blocks, saved_search_results, shared_link_views, sms_messages, teams, users, workflow_fields, workflow_links, workflow_runs, workflow_step_fields, workflow_step_runs, workflow_steps, workflow_task_fields, workflow_tasks
```

---

## Complete Table Definitions

### achievement_definitions

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| type | character varying | NO | - |
| name | character varying | NO | - |
| description | text | NO | - |
| icon | character varying | NO | - |
| tier | character varying | NO | - |
| points_value | integer | YES | 10 |
| target_count | integer | YES | 1 |
| category | character varying | NO | - |
| is_repeatable | boolean | YES | false |
| animation | character varying | YES | 'bounce'::character varying |
| sound_effect | character varying | YES | - |
| color | character varying | YES | '#6366f1'::character varying |
| glow_color | character varying | YES | '#818cf8'::character varying |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### achievement_notifications

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | NO | - |
| achievement_id | character varying | YES | - |
| is_displayed | boolean | YES | false |
| displayed_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### ai_sdr_avatars

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| description | text | YES | - |
| personality | character varying | NO | - |
| voice_type | character varying | NO | - |
| avatar_uri | character varying | YES | - |
| active | boolean | YES | true |
| industry | character varying | NO | - |
| mission | character varying | NO | - |
| goal | character varying | NO | - |
| roles | ARRAY | NO | '{}'::text[] |
| faqs | jsonb | NO | '[]'::jsonb |
| tags | ARRAY | NO | '{}'::text[] |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

---

### api_keys

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| key_hash | character varying | NO | - |
| key_prefix | character varying | NO | - |
| type | character varying | NO | 'USER'::character varying |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| name | character varying | NO | - |
| description | character varying | YES | - |
| permissions | jsonb | YES | - |
| rate_limit | character varying | YES | '1000/hour'::character varying |
| is_active | boolean | NO | true |
| last_used_at | timestamp without time zone | YES | - |
| expires_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `user_id` → `users` (ON DELETE SET NULL)

**Indexes:**
- `idx_api_keys_team`
- `idx_api_keys_hash`
- `idx_api_keys_prefix`
- `idx_api_keys_active`

---

### appointments

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| lead_id | character varying | YES | - |
| setter_id | character varying | YES | - |
| closer_id | character varying | YES | - |
| start_time | timestamp without time zone | NO | - |
| end_time | timestamp without time zone | YES | - |
| status | character varying | YES | 'scheduled'::character varying |
| meeting_link | text | YES | - |
| notes | text | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### automation_plays

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| name | character varying | NO | - |
| description | text | YES | - |
| trigger_type | character varying | NO | - |
| trigger_config | jsonb | NO | - |
| actions | jsonb | NO | - |
| conditions | jsonb | YES | - |
| is_active | boolean | YES | true |
| run_count | integer | YES | 0 |
| last_run_at | timestamp without time zone | YES | - |
| success_count | integer | YES | 0 |
| failure_count | integer | YES | 0 |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### bucket_movements

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| inbox_item_id | character varying | YES | - |
| from_bucket_id | character varying | YES | - |
| to_bucket_id | character varying | YES | - |
| moved_by | character varying | YES | - |
| reason | text | YES | - |
| is_auto | boolean | YES | false |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### buckets

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | text | NO | - |
| name | text | NO | - |
| description | text | YES | - |
| source | text | NO | 'real-estate'::text |
| filters | jsonb | NO | '{}'::jsonb |
| total_leads | integer | YES | 0 |
| enriched_leads | integer | YES | 0 |
| queued_leads | integer | YES | 0 |
| contacted_leads | integer | YES | 0 |
| enrichment_status | text | YES | 'pending'::text |
| enrichment_progress | jsonb | YES | - |
| queued_at | timestamp without time zone | YES | - |
| last_enriched_at | timestamp without time zone | YES | - |
| campaign_id | uuid | YES | - |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |

**Indexes:**
- `buckets_user_id_idx`
- `buckets_source_idx`
- `buckets_enrichment_status_idx`

---

### business_owners

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| business_id | character varying | YES | - |
| role | character varying | YES | - |
| title | character varying | YES | - |
| ownership_percentage | real | YES | - |
| is_primary_contact | boolean | YES | false |
| is_decision_maker | boolean | YES | false |
| start_date | timestamp without time zone | YES | - |
| end_date | timestamp without time zone | YES | - |
| phone | character varying | YES | - |
| email | character varying | YES | - |
| linkedin_url | character varying | YES | - |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| raw_data | jsonb | YES | - |
| confidence_score | real | YES | 1.0 |
| last_verified_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### businesses

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| data_source_id | uuid | YES | - |
| user_id | text | NO | - |
| external_id | text | YES | - |
| ein | text | YES | - |
| duns | text | YES | - |
| company_name | text | NO | - |
| dba | text | YES | - |
| legal_name | text | YES | - |
| entity_type | text | YES | - |
| address | text | YES | - |
| address_2 | text | YES | - |
| city | text | YES | - |
| state | text | YES | - |
| zip | text | YES | - |
| zip_4 | text | YES | - |
| county | text | YES | - |
| country | text | YES | 'US'::text |
| latitude | numeric | YES | - |
| longitude | numeric | YES | - |
| phone | text | YES | - |
| phone_alt | text | YES | - |
| fax | text | YES | - |
| email | text | YES | - |
| website | text | YES | - |
| sic_code | text | YES | - |
| sic_code_2 | text | YES | - |
| sic_code_3 | text | YES | - |
| sic_description | text | YES | - |
| naics_code | text | YES | - |
| naics_description | text | YES | - |
| employee_count | integer | YES | - |
| employee_range | text | YES | - |
| annual_revenue | integer | YES | - |
| revenue_range | text | YES | - |
| sales_volume | text | YES | - |
| year_established | integer | YES | - |
| years_in_business | integer | YES | - |
| is_headquarters | boolean | YES | true |
| parent_company | text | YES | - |
| franchise_flag | boolean | YES | false |
| owner_name | text | YES | - |
| owner_first_name | text | YES | - |
| owner_last_name | text | YES | - |
| owner_title | text | YES | - |
| owner_gender | text | YES | - |
| owner_phone | text | YES | - |
| owner_email | text | YES | - |
| executive_name | text | YES | - |
| executive_title | text | YES | - |
| executive_phone | text | YES | - |
| executive_email | text | YES | - |
| primary_sector_id | text | YES | - |
| secondary_sector_ids | jsonb | YES | '[]'::jsonb |
| status | text | YES | 'new'::text |
| score | integer | YES | 0 |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

**Indexes:**
- `idx_businesses_sector`
- `idx_businesses_city`
- `idx_businesses_state`
- `idx_businesses_sic`
- `idx_businesses_user`

---

### cadence_templates

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| description | text | YES | - |
| category | character varying | YES | - |
| is_default | boolean | YES | false |
| is_active | boolean | YES | true |
| steps | jsonb | NO | - |
| total_days | integer | YES | - |
| total_touches | integer | YES | - |
| channels | ARRAY | YES | '{}'::text[] |
| success_metrics | jsonb | YES | - |
| usage_count | integer | YES | 0 |
| avg_conversion_rate | real | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### call_histories

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| dialer_contact_id | character varying | NO | - |
| power_dialer_id | character varying | NO | - |
| sid | character varying | YES | - |
| dialer_mode | character varying | NO | - |
| team_member_id | character varying | YES | - |
| ai_sdr_avatar_id | character varying | YES | - |
| duration | integer | NO | 0 |
| disposition | character varying | YES | - |
| notes | text | YES | - |
| sentiment | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `dialer_contact_id` → `dialer_contacts` (ON DELETE CASCADE)
- `power_dialer_id` → `power_dialers` (ON DELETE CASCADE)
- `team_member_id` → `team_members` (ON DELETE SET NULL)
- `ai_sdr_avatar_id` → `ai_sdr_avatars` (ON DELETE SET NULL)

---

### call_recordings

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| call_history_id | character varying | NO | - |
| sid | character varying | YES | - |
| status | character varying | NO | 'UNKNOWN'::character varying |
| duration | integer | NO | 0 |
| url | character varying | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `call_history_id` → `call_histories` (ON DELETE CASCADE)

---

### campaign_cadences

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| campaign_id | character varying | YES | - |
| cadence_template_id | character varying | YES | - |
| name | character varying | NO | - |
| description | text | YES | - |
| steps | jsonb | NO | - |
| current_step | integer | YES | 0 |
| status | character varying | YES | 'active'::character varying |
| started_at | timestamp without time zone | YES | - |
| completed_at | timestamp without time zone | YES | - |
| is_active | boolean | YES | true |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### campaign_events

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| campaign_id | character varying | NO | - |
| sequence_id | character varying | YES | - |
| lead_id | character varying | NO | - |
| name | character varying | NO | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `campaign_id` → `campaigns` (ON DELETE CASCADE)
- `sequence_id` → `campaign_sequences` (ON DELETE SET NULL)
- `lead_id` → `leads` (ON DELETE CASCADE)

**Indexes:**
- `campaign_events_campaign_id_index`
- `campaign_events_sequence_id_index`
- `campaign_events_lead_id_index`

---

### campaign_executions

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| campaign_id | character varying | NO | - |
| lead_id | character varying | NO | - |
| sequence_id | character varying | NO | - |
| status | character varying | NO | 'PENDING'::character varying |
| failed_reason | text | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `campaign_id` → `campaigns` (ON DELETE CASCADE)
- `lead_id` → `leads` (ON DELETE CASCADE)
- `sequence_id` → `campaign_sequences` (ON DELETE CASCADE)

**Indexes:**
- `campaign_executions_campaign_id_index`
- `campaign_executions_lead_id_index`
- `campaign_executions_sequence_id_index`

---

### campaign_initial_messages

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| campaign_id | character varying | YES | - |
| initial_message_id | character varying | YES | - |
| sequence_order | integer | YES | 0 |
| delay_hours | integer | YES | 0 |
| is_active | boolean | YES | true |
| sent_count | integer | YES | 0 |
| response_count | integer | YES | 0 |
| positive_response_count | integer | YES | 0 |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### campaign_leads

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| campaign_id | character varying | NO | - |
| lead_id | character varying | NO | - |
| current_sequence_position | integer | NO | 1 |
| current_sequence_status | character varying | NO | 'PENDING'::character varying |
| last_sequence_executed_at | timestamp without time zone | YES | - |
| next_sequence_run_at | timestamp without time zone | YES | - |
| status | character varying | NO | 'ACTIVE'::character varying |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `campaign_id` → `campaigns` (ON DELETE CASCADE)
- `lead_id` → `leads` (ON DELETE CASCADE)

**Indexes:**
- `campaign_leads_campaign_id_lead_id_index` (UNIQUE)

---

### campaign_queue

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| campaign_id | character varying | YES | - |
| lead_card_id | character varying | YES | - |
| sequence_step | integer | YES | 0 |
| status | character varying | YES | 'pending'::character varying |
| priority | integer | YES | 0 |
| scheduled_for | timestamp without time zone | YES | - |
| channel | character varying | YES | - |
| message_template_id | character varying | YES | - |
| message_content | text | YES | - |
| attempts | integer | YES | 0 |
| max_attempts | integer | YES | 3 |
| last_attempt_at | timestamp without time zone | YES | - |
| last_error | text | YES | - |
| sent_at | timestamp without time zone | YES | - |
| delivered_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### campaign_sequences

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| campaign_id | character varying | NO | - |
| type | character varying | NO | - |
| name | character varying | NO | - |
| position | integer | NO | - |
| content | text | NO | - |
| subject | character varying | YES | - |
| voice_type | character varying | YES | - |
| delay_days | integer | NO | 0 |
| delay_hours | integer | NO | 0 |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `campaign_id` → `campaigns` (ON DELETE CASCADE)

**Indexes:**
- `campaign_sequences_campaign_id_index`

---

### campaigns

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| sdr_id | character varying | YES | - |
| name | character varying | NO | - |
| description | text | YES | - |
| target_method | character varying | NO | 'SCORE_BASED'::character varying |
| min_score | integer | NO | - |
| max_score | integer | NO | - |
| location | jsonb | YES | - |
| status | character varying | NO | 'DRAFT'::character varying |
| estimated_leads_count | integer | NO | 0 |
| starts_at | timestamp without time zone | NO | - |
| ends_at | timestamp without time zone | YES | - |
| paused_at | timestamp without time zone | YES | - |
| resumed_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `sdr_id` → `ai_sdr_avatars` (ON DELETE SET NULL)

---

### content_categories

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | YES | - |
| name | character varying | NO | - |
| slug | character varying | NO | - |
| description | text | YES | - |
| icon | character varying | YES | - |
| color | character varying | YES | - |
| parent_id | character varying | YES | - |
| sort_order | integer | YES | 0 |
| is_system | boolean | YES | false |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | YES | now() |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

**Indexes:**
- `content_categories_team_id_idx`
- `content_categories_slug_idx`

---

### content_items

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | YES | - |
| category_id | character varying | YES | - |
| title | character varying | NO | - |
| content | text | NO | - |
| description | text | YES | - |
| content_type | character varying | YES | 'text'::character varying |
| tags | ARRAY | YES | '{}'::text[] |
| external_url | text | YES | - |
| variables | jsonb | YES | '[]'::jsonb |
| usage_count | integer | YES | 0 |
| last_used_at | timestamp without time zone | YES | - |
| visibility | character varying | YES | 'team'::character varying |
| created_by_id | character varying | YES | - |
| is_active | boolean | YES | true |
| is_favorite | boolean | YES | false |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | YES | now() |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `category_id` → `content_categories` (ON DELETE SET NULL)

**Indexes:**
- `content_items_team_id_idx`
- `content_items_category_id_idx`

---

### content_usage_logs

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| content_item_id | character varying | NO | - |
| used_by_id | character varying | NO | - |
| used_in_context | character varying | YES | - |
| created_at | timestamp without time zone | NO | now() |
| metadata | jsonb | YES | '{}'::jsonb |

---

### conversation_labels

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| description | text | YES | - |
| color | character varying | YES | '#6366f1'::character varying |
| icon | character varying | YES | - |
| category | character varying | YES | - |
| is_system | boolean | YES | false |
| is_active | boolean | YES | true |
| usage_count | integer | YES | 0 |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### data_sources

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | text | NO | - |
| name | text | NO | - |
| slug | text | NO | - |
| source_type | text | YES | 'csv'::text |
| source_provider | text | YES | - |
| file_name | text | YES | - |
| file_url | text | YES | - |
| status | text | YES | 'pending'::text |
| total_rows | integer | YES | 0 |
| processed_rows | integer | YES | 0 |
| error_message | text | YES | - |
| metadata | jsonb | YES | '{}'::jsonb |
| processed_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### dialer_contacts

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| power_dialer_id | character varying | NO | - |
| lead_id | character varying | YES | - |
| position | integer | NO | - |
| status | character varying | NO | 'PENDING'::character varying |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `power_dialer_id` → `power_dialers` (ON DELETE CASCADE)
- `lead_id` → `leads` (ON DELETE CASCADE)

**Indexes:**
- `dialer_contacts_power_dialer_id_lead_id_index` (UNIQUE)

---

### import_lead_presets

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| config | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

---

### inbox_items

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| lead_id | character varying | YES | - |
| campaign_id | character varying | YES | - |
| bucket_id | character varying | YES | - |
| channel | character varying | NO | - |
| direction | character varying | NO | - |
| from_address | character varying | YES | - |
| to_address | character varying | YES | - |
| subject | character varying | YES | - |
| body | text | YES | - |
| status | character varying | YES | 'unread'::character varying |
| priority | character varying | YES | 'normal'::character varying |
| sentiment | character varying | YES | - |
| sentiment_score | real | YES | - |
| intent | character varying | YES | - |
| is_starred | boolean | YES | false |
| is_archived | boolean | YES | false |
| assigned_to | character varying | YES | - |
| assigned_at | timestamp without time zone | YES | - |
| responded_at | timestamp without time zone | YES | - |
| response_time_seconds | integer | YES | - |
| thread_id | character varying | YES | - |
| parent_id | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### initial_messages

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| name | character varying | NO | - |
| description | text | YES | - |
| category | character varying | YES | - |
| message_type | character varying | NO | - |
| subject | character varying | YES | - |
| body | text | NO | - |
| variables | ARRAY | YES | '{}'::text[] |
| channel | character varying | NO | - |
| tone | character varying | YES | - |
| is_default | boolean | YES | false |
| is_active | boolean | YES | true |
| usage_count | integer | YES | 0 |
| response_rate | real | YES | - |
| positive_response_rate | real | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### integration_fields

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| integration_id | character varying | NO | - |
| module_name | character varying | NO | - |
| source_field | character varying | NO | - |
| target_field | character varying | NO | - |
| sub_field | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `integration_id` → `integrations` (ON DELETE CASCADE)

---

### integration_tasks

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| integration_id | character varying | NO | - |
| module_name | character varying | NO | - |
| status | character varying | NO | 'PENDING'::character varying |
| type | character varying | NO | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `integration_id` → `integrations` (ON DELETE CASCADE)

---

### integrations

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| enabled | boolean | NO | - |
| settings | jsonb | YES | - |
| auth_data | jsonb | YES | - |
| token_expires_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

**Indexes:**
- `integrations_name_team_id_index` (UNIQUE)

---

### intelligence_log

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| lead_id | character varying | YES | - |
| event_type | character varying | NO | - |
| event_subtype | character varying | YES | - |
| description | text | YES | - |
| input_data | jsonb | YES | - |
| output_data | jsonb | YES | - |
| model_used | character varying | YES | - |
| tokens_used | integer | YES | - |
| latency_ms | integer | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### intelligence_metrics

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| metric_type | character varying | NO | - |
| period | character varying | NO | - |
| period_start | timestamp without time zone | NO | - |
| period_end | timestamp without time zone | NO | - |
| total_conversations | integer | YES | 0 |
| total_messages_sent | integer | YES | 0 |
| total_messages_received | integer | YES | 0 |
| positive_responses | integer | YES | 0 |
| negative_responses | integer | YES | 0 |
| neutral_responses | integer | YES | 0 |
| appointments_set | integer | YES | 0 |
| leads_converted | integer | YES | 0 |
| avg_response_time_seconds | integer | YES | - |
| avg_messages_per_conversation | real | YES | - |
| sentiment_score | real | YES | - |
| engagement_rate | real | YES | - |
| conversion_rate | real | YES | - |
| top_objections | jsonb | YES | - |
| top_interests | jsonb | YES | - |
| channel_breakdown | jsonb | YES | - |
| worker_performance | jsonb | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### knowledge_documents

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| title | character varying | NO | - |
| content | text | YES | - |
| document_type | character varying | NO | - |
| category | character varying | YES | - |
| tags | ARRAY | YES | '{}'::text[] |
| source_url | character varying | YES | - |
| file_path | character varying | YES | - |
| file_size | integer | YES | - |
| mime_type | character varying | YES | - |
| embedding_status | character varying | YES | 'pending'::character varying |
| embedding_vector | ARRAY | YES | - |
| chunk_count | integer | YES | 0 |
| is_active | boolean | YES | true |
| last_indexed_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### lead_activities

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| lead_card_id | character varying | YES | - |
| user_id | character varying | YES | - |
| activity_type | character varying | NO | - |
| description | text | YES | - |
| channel | character varying | YES | - |
| direction | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### lead_flags

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| lead_id | character varying | NO | - |
| verified_email | character varying | YES | 'false'::character varying |
| verified_phone | character varying | YES | 'false'::character varying |
| do_not_call | character varying | YES | 'false'::character varying |
| email_bounced | character varying | YES | 'false'::character varying |
| hot_lead | character varying | YES | 'false'::character varying |
| high_value | character varying | YES | 'false'::character varying |
| quick_close | character varying | YES | 'false'::character varying |
| has_equity | character varying | YES | 'false'::character varying |
| high_equity | character varying | YES | 'false'::character varying |
| free_clear | character varying | YES | 'false'::character varying |
| is_investor | character varying | YES | 'false'::character varying |
| is_active_buyer | character varying | YES | 'false'::character varying |
| distressed | character varying | YES | 'false'::character varying |
| pre_foreclosure | character varying | YES | 'false'::character varying |
| vacant | character varying | YES | 'false'::character varying |
| absentee_owner | character varying | YES | 'false'::character varying |
| responded | character varying | YES | 'false'::character varying |
| scheduled | character varying | YES | 'false'::character varying |
| converted | character varying | YES | 'false'::character varying |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `lead_id` → `leads` (ON DELETE CASCADE)

**Indexes:**
- `lead_flags_lead_id_index` (UNIQUE)
- `lead_flags_hot_lead_index`
- `lead_flags_high_value_index`
- `lead_flags_is_investor_index`

---

### lead_label_links

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| lead_id | character varying | NO | - |
| label_id | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |

**Foreign Keys:**
- `lead_id` → `leads` (ON DELETE CASCADE)
- `label_id` → `lead_labels` (ON DELETE CASCADE)

**Indexes:**
- `lead_label_links_lead_id_index`
- `lead_label_links_label_id_index`
- `lead_label_links_lead_id_label_id_index` (UNIQUE)

---

### lead_labels

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| category | USER-DEFINED | NO | - |
| color | character varying | YES | - |
| icon | character varying | YES | - |
| description | character varying | YES | - |
| is_system | character varying | YES | 'false'::character varying |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

**Indexes:**
- `lead_labels_team_id_index`
- `lead_labels_category_index`
- `lead_labels_team_id_name_category_index` (UNIQUE)

---

### lead_phone_numbers

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| lead_id | character varying | NO | - |
| phone | character varying | NO | - |
| label | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `lead_id` → `leads` (ON DELETE CASCADE)

**Indexes:**
- `lead_phone_numbers_lead_id_index`

---

### leaderboard_snapshots

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| period | character varying | NO | - |
| period_start | timestamp without time zone | NO | - |
| period_end | timestamp without time zone | NO | - |
| rankings | jsonb | NO | - |
| created_at | timestamp without time zone | YES | now() |

---

### leads

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| integration_id | character varying | YES | - |
| property_id | character varying | YES | - |
| position | integer | NO | 0 |
| external_id | character varying | YES | - |
| first_name | character varying | YES | - |
| last_name | character varying | YES | - |
| email | character varying | YES | - |
| phone | character varying | YES | - |
| title | character varying | YES | - |
| company | character varying | YES | - |
| status | character varying | YES | - |
| score | integer | NO | 0 |
| tags | ARRAY | YES | - |
| zip_code | character varying | YES | - |
| country | character varying | YES | - |
| state | character varying | YES | - |
| city | character varying | YES | - |
| address | character varying | YES | - |
| source | character varying | YES | - |
| notes | text | YES | - |
| metadata | jsonb | YES | - |
| custom_fields | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `integration_id` → `integrations` (ON DELETE SET NULL)
- `property_id` → `properties` (ON DELETE SET NULL)

**Indexes:**
- `leads_team_id_index`
- `leads_team_id_integration_id_external_id_index` (UNIQUE)
- `leads_score_index`

---

### message_label_links

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| message_id | character varying | NO | - |
| label_id | character varying | NO | - |

**Foreign Keys:**
- `message_id` → `messages` (ON DELETE CASCADE)
- `label_id` → `message_labels` (ON DELETE CASCADE)

---

### message_labels

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| color | character varying | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

---

### message_templates

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| type | character varying | NO | - |
| name | character varying | NO | - |
| data | jsonb | NO | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

---

### messages

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| lead_id | character varying | YES | - |
| campaign_id | character varying | YES | - |
| external_id | character varying | YES | - |
| type | character varying | NO | - |
| direction | character varying | NO | - |
| status | character varying | NO | 'ACTIVE'::character varying |
| to_name | character varying | YES | - |
| to_address | character varying | YES | - |
| from_name | character varying | YES | - |
| from_address | character varying | YES | - |
| subject | character varying | YES | - |
| body | text | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |
| deleted_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `lead_id` → `leads` (ON DELETE CASCADE)
- `campaign_id` → `campaigns` (ON DELETE CASCADE)

---

### outreach_logs

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| lead_id | character varying | YES | - |
| channel | character varying | NO | - |
| direction | character varying | NO | - |
| status | character varying | NO | - |
| message | text | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### persona_addresses

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| address_type | character varying | YES | - |
| is_primary | boolean | YES | false |
| address_line1 | character varying | YES | - |
| address_line2 | character varying | YES | - |
| city | character varying | YES | - |
| state | character varying | YES | - |
| zip | character varying | YES | - |
| zip4 | character varying | YES | - |
| county | character varying | YES | - |
| country | character varying | YES | 'US'::character varying |
| latitude | real | YES | - |
| longitude | real | YES | - |
| is_validated | boolean | YES | false |
| validation_source | character varying | YES | - |
| confidence_score | real | YES | 1.0 |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### persona_demographics

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| marital_status | character varying | YES | - |
| education_level | character varying | YES | - |
| occupation | character varying | YES | - |
| job_title | character varying | YES | - |
| employer | character varying | YES | - |
| income_range | character varying | YES | - |
| estimated_income | integer | YES | - |
| net_worth_range | character varying | YES | - |
| estimated_net_worth | integer | YES | - |
| home_owner_status | character varying | YES | - |
| home_value_range | character varying | YES | - |
| estimated_home_value | integer | YES | - |
| length_of_residence | integer | YES | - |
| presence_of_children | boolean | YES | - |
| number_of_children | integer | YES | - |
| age_of_children | character varying | YES | - |
| household_size | integer | YES | - |
| veteran_status | boolean | YES | - |
| political_affiliation | character varying | YES | - |
| religion | character varying | YES | - |
| ethnicity | character varying | YES | - |
| language_preference | character varying | YES | - |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### persona_emails

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| email | character varying | NO | - |
| email_type | character varying | YES | - |
| is_primary | boolean | YES | false |
| is_valid | boolean | YES | true |
| is_verified | boolean | YES | false |
| bounce_status | character varying | YES | - |
| last_validated_at | timestamp without time zone | YES | - |
| validation_source | character varying | YES | - |
| confidence_score | real | YES | 1.0 |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| domain | character varying | YES | - |
| is_free_email | boolean | YES | - |
| is_disposable | boolean | YES | - |
| is_role_based | boolean | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### persona_merge_history

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| survivor_id | character varying | YES | - |
| merged_id | character varying | NO | - |
| match_score | real | NO | - |
| match_details | jsonb | YES | - |
| merged_by | character varying | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### persona_phones

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| phone_number | character varying | NO | - |
| phone_type | character varying | YES | - |
| carrier | character varying | YES | - |
| line_type | character varying | YES | - |
| is_primary | boolean | YES | false |
| is_valid | boolean | YES | true |
| is_mobile | boolean | YES | - |
| is_dnc | boolean | YES | false |
| last_validated_at | timestamp without time zone | YES | - |
| validation_source | character varying | YES | - |
| confidence_score | real | YES | 1.0 |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### persona_socials

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| platform | character varying | NO | - |
| profile_url | character varying | YES | - |
| username | character varying | YES | - |
| display_name | character varying | YES | - |
| bio | text | YES | - |
| followers_count | integer | YES | - |
| following_count | integer | YES | - |
| is_verified | boolean | YES | false |
| last_activity_at | timestamp without time zone | YES | - |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### personal_access_tokens

**Rows:** 1 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| user_id | character varying | NO | - |
| name | character varying | NO | - |
| expired_at | timestamp without time zone | YES | - |
| last_used_at | timestamp without time zone | YES | - |
| user_agent | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `user_id` → `users` (ON DELETE CASCADE)

**Indexes:**
- `personal_access_tokens_user_id_index`

---

### personas

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| first_name | character varying | NO | - |
| last_name | character varying | NO | - |
| middle_name | character varying | YES | - |
| suffix | character varying | YES | - |
| full_name | character varying | NO | - |
| normalized_first_name | character varying | NO | - |
| normalized_last_name | character varying | NO | - |
| age | integer | YES | - |
| date_of_birth | character varying | YES | - |
| gender | character varying | YES | - |
| confidence_score | real | YES | 1.0 |
| merged_from_ids | ARRAY | YES | '{}'::text[] |
| primary_source | character varying | NO | - |
| skip_trace_completed | boolean | YES | false |
| skip_trace_completed_at | timestamp without time zone | YES | - |
| apollo_completed | boolean | YES | false |
| apollo_completed_at | timestamp without time zone | YES | - |
| last_enriched_at | timestamp without time zone | YES | - |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### power_dialers

**Rows:** 1 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| member_id | character varying | YES | - |
| title | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

---

### prompts

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| type | character varying | NO | - |
| category | character varying | NO | - |
| description | text | YES | - |
| content | text | NO | - |
| tags | ARRAY | YES | '{}'::text[] |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

---

### properties

**Rows:** 156 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| external_id | character varying | YES | - |
| source | character varying | YES | - |
| owner_first_name | character varying | YES | - |
| owner_last_name | character varying | YES | - |
| use_code | character varying | YES | - |
| type | character varying | YES | - |
| owner_occupied | boolean | YES | false |
| lot_square_feet | numeric | YES | - |
| building_square_feet | numeric | YES | - |
| auction_date | timestamp without time zone | YES | - |
| assessed_value | numeric | NO | 0 |
| estimated_value | numeric | NO | 0 |
| year_built | integer | YES | - |
| address | jsonb | YES | - |
| mortgage_info | jsonb | YES | - |
| tags | ARRAY | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |
| occupancy_status | character varying | YES | - |
| last_sale_date | timestamp without time zone | YES | - |
| last_sale_price | numeric | YES | - |
| equity_amount | numeric | YES | - |
| equity_percent | integer | YES | - |
| loan_balance | numeric | YES | - |
| situational_score | integer | YES | 0 |
| priority_level | character varying | YES | - |

**Indexes:**
- `properties_external_id_source_index` (UNIQUE)

---

### property_distress_scores

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| provider | character varying | YES | - |
| external_id | character varying | YES | - |
| uid | character varying | YES | - |
| address | text | YES | - |
| owner_name | character varying | YES | - |
| owner_type | character varying | YES | - |
| equity_percent | integer | YES | - |
| is_vacant | boolean | YES | false |
| loan_maturity_date | date | YES | - |
| reverse_mortgage | boolean | YES | false |
| zoning | character varying | YES | - |
| score | integer | YES | 0 |
| last_signal_update | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Indexes:**
- `property_distress_scores_provider_external_id_index` (UNIQUE)

---

### property_owners

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| persona_id | character varying | YES | - |
| property_id | character varying | YES | - |
| ownership_type | character varying | YES | - |
| ownership_percentage | real | YES | - |
| is_primary_owner | boolean | YES | false |
| mailing_address_line1 | character varying | YES | - |
| mailing_address_line2 | character varying | YES | - |
| mailing_city | character varying | YES | - |
| mailing_state | character varying | YES | - |
| mailing_zip | character varying | YES | - |
| is_absentee | boolean | YES | false |
| acquisition_date | timestamp without time zone | YES | - |
| acquisition_price | integer | YES | - |
| source | character varying | NO | - |
| source_id | character varying | YES | - |
| raw_data | jsonb | YES | - |
| confidence_score | real | YES | 1.0 |
| last_verified_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### property_search_blocks

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| search_id | character varying | YES | - |
| block_type | character varying | NO | - |
| operator | character varying | NO | - |
| field | character varying | YES | - |
| value | jsonb | YES | - |
| order_index | integer | YES | 0 |
| parent_id | character varying | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### property_searches

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | YES | - |
| name | character varying | NO | - |
| description | text | YES | - |
| search_type | character varying | NO | - |
| criteria | jsonb | NO | - |
| status | character varying | YES | 'active'::character varying |
| last_run_at | timestamp without time zone | YES | - |
| result_count | integer | YES | 0 |
| is_automated | boolean | YES | false |
| schedule | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### response_buckets

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| description | text | YES | - |
| color | character varying | YES | '#6366f1'::character varying |
| icon | character varying | YES | - |
| order_index | integer | YES | 0 |
| is_default | boolean | YES | false |
| auto_assign_rules | jsonb | YES | - |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### saved_search_results

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| saved_search_id | character varying | NO | - |
| property_id | character varying | NO | - |
| change_type | character varying | YES | - |
| last_update_date | timestamp without time zone | YES | - |
| lead_id | character varying | YES | - |
| property_data | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `saved_search_id` → `saved_searches` (ON DELETE CASCADE)

**Indexes:**
- `saved_search_results_saved_search_id_index`
- `saved_search_results_property_id_index`
- `saved_search_results_change_type_index`

---

### saved_searches

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| search_name | character varying | NO | - |
| search_query | jsonb | NO | - |
| realestate_search_id | character varying | YES | - |
| last_report_date | timestamp without time zone | YES | - |
| next_report_date | timestamp without time zone | YES | - |
| total_properties | character varying | YES | - |
| added_count | character varying | YES | - |
| deleted_count | character varying | YES | - |
| updated_count | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

**Indexes:**
- `saved_searches_team_id_index`
- `saved_searches_realestate_search_id_index`

---

### scheduled_events

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| event_type | character varying | NO | - |
| title | character varying | NO | - |
| description | text | YES | - |
| scheduled_for | timestamp without time zone | NO | - |
| timezone | character varying | YES | 'UTC'::character varying |
| recurrence_rule | character varying | YES | - |
| recurrence_end | timestamp without time zone | YES | - |
| status | character varying | YES | 'scheduled'::character varying |
| priority | character varying | YES | 'normal'::character varying |
| target_type | character varying | YES | - |
| target_id | character varying | YES | - |
| action_type | character varying | YES | - |
| action_config | jsonb | YES | - |
| notification_config | jsonb | YES | - |
| reminder_sent | boolean | YES | false |
| reminder_sent_at | timestamp without time zone | YES | - |
| executed_at | timestamp without time zone | YES | - |
| execution_result | jsonb | YES | - |
| retry_count | integer | YES | 0 |
| max_retries | integer | YES | 3 |
| last_error | text | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### sdr_campaign_configs

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| campaign_id | character varying | YES | - |
| avatar_id | character varying | YES | - |
| personality_id | character varying | YES | - |
| auto_respond | boolean | YES | true |
| response_delay_min | integer | YES | 30 |
| response_delay_max | integer | YES | 120 |
| max_responses_per_lead | integer | YES | 10 |
| escalation_triggers | ARRAY | YES | '{}'::text[] |
| stop_triggers | ARRAY | YES | '{}'::text[] |
| working_hours_start | character varying | YES | '09:00'::character varying |
| working_hours_end | character varying | YES | '17:00'::character varying |
| working_days | ARRAY | YES | ARRAY['mon'::text, 'tue'::text, 'wed'::t |
| timezone | character varying | YES | 'America/New_York'::character varying |
| is_active | boolean | YES | true |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### sdr_sessions

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| avatar_id | character varying | YES | - |
| status | character varying | YES | 'active'::character varying |
| started_at | timestamp without time zone | YES | now() |
| ended_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |

---

### shared_link_views

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| link_id | character varying | YES | - |
| viewer_ip | character varying | YES | - |
| viewer_user_agent | text | YES | - |
| viewer_country | character varying | YES | - |
| viewer_city | character varying | YES | - |
| referrer | character varying | YES | - |
| viewed_at | timestamp without time zone | YES | now() |

---

### shared_links

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| lead_id | character varying | YES | - |
| link_type | character varying | NO | - |
| token | character varying | NO | - |
| title | character varying | YES | - |
| description | text | YES | - |
| content | jsonb | YES | - |
| password_hash | character varying | YES | - |
| expires_at | timestamp without time zone | YES | - |
| max_views | integer | YES | - |
| view_count | integer | YES | 0 |
| is_active | boolean | YES | true |
| settings | jsonb | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

**Indexes:**
- `shared_links_token_key` (UNIQUE)

---

### skiptrace_jobs

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| name | character varying | NO | - |
| status | character varying | YES | 'pending'::character varying |
| input_type | character varying | NO | - |
| input_source | character varying | YES | - |
| total_records | integer | YES | 0 |
| processed_records | integer | YES | 0 |
| successful_records | integer | YES | 0 |
| failed_records | integer | YES | 0 |
| credits_used | integer | YES | 0 |
| error_message | text | YES | - |
| started_at | timestamp without time zone | YES | - |
| completed_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### skiptrace_results

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| job_id | character varying | YES | - |
| input_type | character varying | NO | - |
| input_data | jsonb | NO | - |
| status | character varying | YES | 'pending'::character varying |
| provider | character varying | YES | - |
| provider_request_id | character varying | YES | - |
| first_name | character varying | YES | - |
| last_name | character varying | YES | - |
| phones | jsonb | YES | - |
| emails | jsonb | YES | - |
| addresses | jsonb | YES | - |
| relatives | jsonb | YES | - |
| associates | jsonb | YES | - |
| age | integer | YES | - |
| date_of_birth | character varying | YES | - |
| deceased | boolean | YES | - |
| bankruptcy | boolean | YES | - |
| foreclosure | boolean | YES | - |
| liens | jsonb | YES | - |
| judgments | jsonb | YES | - |
| raw_response | jsonb | YES | - |
| confidence_score | real | YES | - |
| match_type | character varying | YES | - |
| credits_used | integer | YES | 1 |
| error_message | text | YES | - |
| processed_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### sms_messages

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| lead_id | text | YES | - |
| user_id | text | YES | - |
| direction | text | NO | - |
| from_number | text | NO | - |
| to_number | text | NO | - |
| body | text | NO | - |
| status | text | NO | 'pending'::text |
| error_code | text | YES | - |
| error_message | text | YES | - |
| campaign_id | text | YES | - |
| batch_id | text | YES | - |
| template_id | text | YES | - |
| provider | text | YES | 'signalhouse'::text |
| provider_message_id | text | YES | - |
| provider_status | text | YES | - |
| sent_by_advisor | text | YES | - |
| ai_generated | boolean | YES | false |
| sent_at | timestamp without time zone | YES | - |
| delivered_at | timestamp without time zone | YES | - |
| received_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |

**Foreign Keys:**
- `lead_id` → `leads` (ON DELETE CASCADE)

**Indexes:**
- `sms_messages_lead_id_idx`
- `sms_messages_direction_idx`
- `sms_messages_status_idx`
- `sms_messages_campaign_id_idx`
- `sms_messages_from_number_idx`

---

### suppression_list

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| suppression_type | character varying | NO | - |
| value | character varying | NO | - |
| reason | character varying | YES | - |
| source | character varying | YES | - |
| added_by | character varying | YES | - |
| expires_at | timestamp without time zone | YES | - |
| is_active | boolean | YES | true |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### team_invitations

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| email | character varying | NO | - |
| invited_by | character varying | YES | - |
| role | character varying | NO | 'MEMBER'::character varying |
| expires_at | timestamp without time zone | NO | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `invited_by` → `users` (ON DELETE SET NULL)

**Indexes:**
- `team_invitations_team_id_index`
- `team_invitations_team_id_email_index` (UNIQUE)

---

### team_members

**Rows:** 1 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | YES | - |
| role | character varying | NO | 'MEMBER'::character varying |
| status | character varying | NO | 'PENDING'::character varying |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)
- `user_id` → `users` (ON DELETE CASCADE)

**Indexes:**
- `team_members_team_id_index`
- `team_members_user_id_index`

---

### team_settings

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| value | text | YES | - |
| masked_value | text | YES | - |
| is_masked | boolean | YES | false |
| type | character varying | NO | 'string'::character varying |
| metadata | jsonb | YES | - |
| scope | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

**Indexes:**
- `team_settings_team_id_name_scope_index` (UNIQUE)

---

### teams

**Rows:** 1 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| owner_id | character varying | NO | - |
| name | character varying | NO | - |
| slug | character varying | NO | - |
| description | text | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |
| real_estate_api_key | text | YES | - |
| branding | jsonb | YES | - |

**Foreign Keys:**
- `owner_id` → `users` (ON DELETE CASCADE)

**Indexes:**
- `teams_slug_unique` (UNIQUE)
- `teams_owner_id_index`

---

### unified_lead_cards

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| lead_id | character varying | YES | - |
| persona_id | character varying | YES | - |
| business_id | character varying | YES | - |
| property_id | character varying | YES | - |
| lead_type | character varying | NO | - |
| status | character varying | YES | 'new'::character varying |
| stage | character varying | YES | 'prospect'::character varying |
| priority | character varying | YES | 'normal'::character varying |
| score | integer | YES | 0 |
| first_name | character varying | YES | - |
| last_name | character varying | YES | - |
| full_name | character varying | YES | - |
| company_name | character varying | YES | - |
| job_title | character varying | YES | - |
| primary_phone | character varying | YES | - |
| primary_email | character varying | YES | - |
| primary_address | jsonb | YES | - |
| phones | jsonb | YES | '[]'::jsonb |
| emails | jsonb | YES | '[]'::jsonb |
| addresses | jsonb | YES | '[]'::jsonb |
| social_profiles | jsonb | YES | '[]'::jsonb |
| tags | ARRAY | YES | '{}'::text[] |
| labels | ARRAY | YES | '{}'::text[] |
| custom_fields | jsonb | YES | '{}'::jsonb |
| source | character varying | YES | - |
| source_id | character varying | YES | - |
| campaign_id | character varying | YES | - |
| assigned_to | character varying | YES | - |
| assigned_at | timestamp without time zone | YES | - |
| last_contact_at | timestamp without time zone | YES | - |
| last_response_at | timestamp without time zone | YES | - |
| next_follow_up_at | timestamp without time zone | YES | - |
| total_messages_sent | integer | YES | 0 |
| total_messages_received | integer | YES | 0 |
| total_calls | integer | YES | 0 |
| sentiment | character varying | YES | - |
| sentiment_score | real | YES | - |
| intent | character varying | YES | - |
| objections | ARRAY | YES | '{}'::text[] |
| interests | ARRAY | YES | '{}'::text[] |
| notes | text | YES | - |
| is_dnc | boolean | YES | false |
| is_archived | boolean | YES | false |
| archived_at | timestamp without time zone | YES | - |
| archived_reason | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### user_achievements

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | NO | - |
| achievement_id | character varying | YES | - |
| earned_at | timestamp without time zone | YES | now() |
| current_count | integer | YES | 1 |
| displayed_at | timestamp without time zone | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

---

### user_stats

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| user_id | character varying | NO | - |
| total_points | integer | YES | 0 |
| current_level | integer | YES | 1 |
| points_to_next_level | integer | YES | 100 |
| current_streak | integer | YES | 0 |
| longest_streak | integer | YES | 0 |
| last_activity_date | timestamp without time zone | YES | - |
| numbers_confirmed | integer | YES | 0 |
| positive_responses | integer | YES | 0 |
| leads_converted | integer | YES | 0 |
| campaigns_completed | integer | YES | 0 |
| messages_processed | integer | YES | 0 |
| blacklist_reviewed | integer | YES | 0 |
| avg_response_time | integer | YES | - |
| success_rate | integer | YES | - |
| daily_goal_progress | integer | YES | 0 |
| daily_goal_target | integer | YES | 50 |
| weekly_rank | integer | YES | - |
| monthly_rank | integer | YES | - |
| all_time_rank | integer | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### users

**Rows:** 6 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| role | character varying | NO | 'USER'::character varying |
| name | character varying | NO | - |
| email | character varying | NO | - |
| password | text | NO | - |
| email_verified_at | timestamp without time zone | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Indexes:**
- `users_email_unique` (UNIQUE)

---

### worker_personalities

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| description | text | YES | - |
| worker_type | character varying | NO | - |
| personality_traits | jsonb | YES | - |
| communication_style | character varying | YES | - |
| tone | character varying | YES | - |
| formality_level | character varying | YES | - |
| response_length | character varying | YES | - |
| emoji_usage | character varying | YES | - |
| humor_level | character varying | YES | - |
| empathy_level | character varying | YES | - |
| assertiveness_level | character varying | YES | - |
| system_prompt | text | YES | - |
| example_responses | jsonb | YES | - |
| forbidden_phrases | ARRAY | YES | - |
| required_phrases | ARRAY | YES | - |
| is_default | boolean | YES | false |
| is_active | boolean | YES | true |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### worker_phone_assignments

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| worker_id | character varying | NO | - |
| worker_name | character varying | NO | - |
| phone_number | character varying | NO | - |
| signalhouse_subgroup_id | character varying | YES | - |
| is_active | boolean | NO | true |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |

**Indexes:**
- `worker_phone_assignments_team_id_idx`
- `worker_phone_assignments_worker_id_idx`
- `worker_phone_assignments_phone_number_idx`

---

### worker_voice_configs

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| name | character varying | NO | - |
| description | text | YES | - |
| voice_provider | character varying | NO | - |
| voice_id | character varying | NO | - |
| voice_name | character varying | YES | - |
| language | character varying | YES | 'en-US'::character varying |
| speaking_rate | real | YES | 1.0 |
| pitch | real | YES | 0 |
| volume_gain_db | real | YES | 0 |
| sample_rate_hertz | integer | YES | 24000 |
| audio_encoding | character varying | YES | 'MP3'::character varying |
| ssml_gender | character varying | YES | - |
| is_default | boolean | YES | false |
| is_active | boolean | YES | true |
| preview_audio_url | character varying | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

---

### workflow_fields

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| key | character varying | NO | - |
| label | character varying | NO | - |
| description | text | YES | - |
| resource | character varying | YES | - |
| input_type | character varying | NO | - |
| display_type | character varying | YES | - |
| value_type | character varying | NO | - |
| validations | jsonb | YES | - |
| possible_object_types | ARRAY | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

---

### workflow_links

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| workflow_id | character varying | NO | - |
| source_step_id | character varying | NO | - |
| target_step_id | character varying | NO | - |
| source_port | character varying | NO | - |
| target_port | character varying | NO | - |

**Foreign Keys:**
- `workflow_id` → `workflows` (ON DELETE CASCADE)
- `source_step_id` → `workflow_steps` (ON DELETE CASCADE)
- `target_step_id` → `workflow_steps` (ON DELETE CASCADE)

**Indexes:**
- `workflow_links_workflow_id_index`
- `workflow_links_source_step_id_index`
- `workflow_links_target_step_id_index`

---

### workflow_runs

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| workflow_id | character varying | NO | - |
| started_at | timestamp without time zone | NO | - |
| status | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `workflow_id` → `workflows` (ON DELETE CASCADE)

**Indexes:**
- `workflow_runs_workflow_id_index`

---

### workflow_step_fields

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| workflow_id | character varying | NO | - |
| step_id | character varying | NO | - |
| key | character varying | NO | - |
| is_reference | boolean | NO | false |
| value_ref | character varying | NO | - |
| value | text | YES | - |

**Foreign Keys:**
- `workflow_id` → `workflows` (ON DELETE CASCADE)
- `step_id` → `workflow_steps` (ON DELETE CASCADE)
- `key` → `workflow_fields` (ON DELETE CASCADE)

**Indexes:**
- `workflow_step_fields_workflow_id_index`

---

### workflow_step_runs

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| run_id | character varying | NO | - |
| step_id | character varying | NO | - |
| failures | integer | NO | 0 |
| retries | integer | NO | 0 |
| successes | integer | NO | 0 |
| input_data | jsonb | YES | - |
| output_data | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `run_id` → `workflow_runs` (ON DELETE CASCADE)
- `step_id` → `workflow_steps` (ON DELETE CASCADE)

**Indexes:**
- `workflow_step_runs_run_id_index`
- `workflow_step_runs_step_id_index`

---

### workflow_steps

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| workflow_id | character varying | NO | - |
| task_id | character varying | NO | - |
| task_type | character varying | NO | - |
| position | jsonb | NO | - |
| order | integer | NO | - |
| description | text | YES | - |
| conditions | jsonb | YES | - |
| data | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `workflow_id` → `workflows` (ON DELETE CASCADE)
- `task_id` → `workflow_tasks` (ON DELETE CASCADE)

**Indexes:**
- `workflow_steps_workflow_id_index`
- `workflow_steps_task_id_index`

---

### workflow_task_fields

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| task_id | character varying | NO | - |
| field_key | character varying | NO | - |
| metadata | jsonb | YES | - |

**Foreign Keys:**
- `task_id` → `workflow_tasks` (ON DELETE CASCADE)
- `field_key` → `workflow_fields` (ON DELETE CASCADE)

---

### workflow_tasks

**Rows:** 0 | **Has team_id:** ❌ NO

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| version | character varying | NO | '0.1'::character varying |
| label | character varying | NO | - |
| description | character varying | YES | - |
| categories | ARRAY | NO | - |
| type | character varying | NO | - |
| output_ports | ARRAY | NO | - |
| input_port | character varying | YES | - |
| paths | ARRAY | NO | - |
| object_types | ARRAY | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Indexes:**
- `workflow_tasks_id_unique` (UNIQUE)

---

### workflows

**Rows:** 0 | **Has team_id:** ✅ YES

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | character varying | NO | - |
| team_id | character varying | NO | - |
| active | boolean | NO | false |
| priority | integer | NO | 1 |
| version | character varying | NO | - |
| parent_version | character varying | YES | - |
| name | character varying | NO | - |
| description | text | YES | - |
| data | jsonb | YES | - |
| created_at | timestamp without time zone | NO | - |
| updated_at | timestamp without time zone | YES | - |

**Foreign Keys:**
- `team_id` → `teams` (ON DELETE CASCADE)

**Indexes:**
- `workflows_team_id_index`

---

