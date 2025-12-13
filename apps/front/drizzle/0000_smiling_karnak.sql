CREATE TABLE "auto_tag_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"description" text,
	"field" text NOT NULL,
	"operator" text NOT NULL,
	"value" text NOT NULL,
	"tag_id" uuid NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"apply_to_existing" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bucket_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'real-estate' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_leads" integer DEFAULT 0,
	"enriched_leads" integer DEFAULT 0,
	"queued_leads" integer DEFAULT 0,
	"contacted_leads" integer DEFAULT 0,
	"enrichment_status" text DEFAULT 'pending',
	"enrichment_progress" jsonb,
	"queued_at" timestamp,
	"last_enriched_at" timestamp,
	"campaign_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid,
	"user_id" text NOT NULL,
	"external_id" text,
	"ein" text,
	"duns" text,
	"company_name" text NOT NULL,
	"dba" text,
	"legal_name" text,
	"entity_type" text,
	"address" text,
	"address_2" text,
	"city" text,
	"state" text,
	"zip" text,
	"zip_4" text,
	"county" text,
	"country" text DEFAULT 'US',
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"phone" text,
	"phone_alt" text,
	"fax" text,
	"email" text,
	"website" text,
	"sic_code" text,
	"sic_code_2" text,
	"sic_code_3" text,
	"sic_description" text,
	"naics_code" text,
	"naics_description" text,
	"employee_count" integer,
	"employee_range" text,
	"annual_revenue" integer,
	"revenue_range" text,
	"sales_volume" text,
	"year_established" integer,
	"years_in_business" integer,
	"is_headquarters" boolean DEFAULT true,
	"parent_company" text,
	"franchise_flag" boolean DEFAULT false,
	"owner_name" text,
	"owner_first_name" text,
	"owner_last_name" text,
	"owner_title" text,
	"owner_gender" text,
	"owner_phone" text,
	"owner_email" text,
	"executive_name" text,
	"executive_title" text,
	"executive_phone" text,
	"executive_email" text,
	"primary_sector_id" text,
	"secondary_sector_ids" jsonb DEFAULT '[]'::jsonb,
	"sector_category" text,
	"enrichment_status" text DEFAULT 'pending',
	"apollo_matched" boolean DEFAULT false,
	"apollo_org_id" text,
	"skip_traced" boolean DEFAULT false,
	"skip_traced_at" timestamp,
	"status" text DEFAULT 'new',
	"score" integer DEFAULT 0,
	"last_contacted_at" timestamp,
	"notes" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"user_id" text,
	"direction" text NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"duration" integer,
	"disposition" text,
	"disposition_notes" text,
	"campaign_id" text,
	"dialer_workspace_id" text,
	"provider" text DEFAULT 'signalhouse',
	"provider_call_id" text,
	"provider_status" text,
	"recording_url" text,
	"recording_duration" integer,
	"transcription_url" text,
	"transcription_text" text,
	"is_auto_dial" boolean DEFAULT false,
	"auto_dial_session_id" text,
	"ai_summary" text,
	"sentiment_score" integer,
	"start_time" timestamp,
	"answer_time" timestamp,
	"end_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"data_source_id" uuid,
	"business_id" uuid,
	"property_id" uuid,
	"lead_id" uuid,
	"first_name" text,
	"last_name" text,
	"full_name" text,
	"title" text,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"phone" text,
	"phone_type" text,
	"phone_verified" boolean DEFAULT false,
	"phone_alt" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"linkedin_url" text,
	"facebook_url" text,
	"twitter_url" text,
	"source_type" text,
	"confidence_score" integer,
	"status" text DEFAULT 'active',
	"opted_out" boolean DEFAULT false,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"source_type" text NOT NULL,
	"source_provider" text,
	"file_name" text,
	"file_size" integer,
	"file_hash" text,
	"column_mapping" jsonb DEFAULT '{}'::jsonb,
	"original_headers" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0,
	"processed_rows" integer DEFAULT 0,
	"error_rows" integer DEFAULT 0,
	"error_log" jsonb DEFAULT '[]'::jsonb,
	"primary_sector_id" text,
	"sector_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "deal_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"url" text NOT NULL,
	"storage_key" text,
	"status" text DEFAULT 'pending',
	"signed_at" timestamp,
	"signed_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"lead_id" uuid,
	"property_id" uuid,
	"business_id" uuid,
	"type" text NOT NULL,
	"stage" text DEFAULT 'discovery' NOT NULL,
	"priority" text DEFAULT 'medium',
	"name" text NOT NULL,
	"description" text,
	"estimated_value" integer DEFAULT 0,
	"asking_price" integer,
	"final_price" integer,
	"monetization" jsonb DEFAULT '{}'::jsonb,
	"commission_rate" numeric(5, 2),
	"advisory_fee" integer,
	"referral_fee" integer,
	"equity_percentage" numeric(5, 2),
	"seller" jsonb,
	"buyer" jsonb,
	"assigned_to" text,
	"property_data" jsonb,
	"business_data" jsonb,
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"last_activity_at" timestamp,
	"stage_changed_at" timestamp,
	"closed_reason" text,
	"closed_notes" text,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dialer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"dial_mode" text DEFAULT 'preview',
	"total_leads" integer DEFAULT 0,
	"dialed_leads" integer DEFAULT 0,
	"connected_calls" integer DEFAULT 0,
	"appointments_set" integer DEFAULT 0,
	"assigned_advisor" text,
	"campaign_id" text,
	"bucket_id" uuid,
	"started_at" timestamp,
	"paused_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"data_source_id" uuid,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_items" integer DEFAULT 0,
	"processed_items" integer DEFAULT 0,
	"success_items" integer DEFAULT 0,
	"error_items" integer DEFAULT 0,
	"config" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb,
	"error_log" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer DEFAULT 0,
	"discount" integer DEFAULT 0,
	"total" integer NOT NULL,
	"amount_paid" integer DEFAULT 0,
	"amount_due" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"stripe_invoice_id" text,
	"stripe_payment_intent_id" text,
	"invoice_pdf" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "lead_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"is_auto_tag" boolean DEFAULT false,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"applied_by" text
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"source" text DEFAULT 'real-estate' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"secondary_phone" text,
	"property_id" text,
	"apn" text,
	"fips" text,
	"legal_description" text,
	"subdivision" text,
	"tract" text,
	"block" text,
	"lot" text,
	"property_address" text,
	"property_address_2" text,
	"property_city" text,
	"property_state" text,
	"property_zip" text,
	"property_zip_4" text,
	"property_county" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"census_tract" text,
	"congressional_district" text,
	"property_type" text,
	"property_subtype" text,
	"property_class" text,
	"property_use" text,
	"zoning" text,
	"zoning_description" text,
	"land_use_code" text,
	"units" integer,
	"building_count" integer,
	"bedrooms" integer,
	"bathrooms" numeric(3, 1),
	"sqft" integer,
	"lot_size_sqft" integer,
	"lot_size_acres" numeric(10, 4),
	"year_built" integer,
	"stories" integer,
	"pool" boolean,
	"garage" boolean,
	"garage_spaces" integer,
	"estimated_value" integer,
	"assessed_value" integer,
	"tax_amount" integer,
	"estimated_equity" integer,
	"equity_percent" numeric(5, 2),
	"mtg1_amount" integer,
	"mtg1_date" date,
	"mtg1_loan_type" text,
	"mtg1_interest_rate" numeric(5, 3),
	"mtg1_term" integer,
	"mtg1_lender" text,
	"mtg1_due_date" date,
	"mtg2_amount" integer,
	"mtg2_date" date,
	"mtg2_loan_type" text,
	"mtg2_interest_rate" numeric(5, 3),
	"mtg2_term" integer,
	"mtg2_lender" text,
	"total_mortgage_balance" integer,
	"combined_ltv" numeric(5, 2),
	"lien_amount" integer,
	"lien_type" text,
	"lien_date" date,
	"lien_holder" text,
	"last_sale_date" date,
	"last_sale_amount" integer,
	"last_sale_type" text,
	"last_sale_seller" text,
	"last_sale_buyer" text,
	"last_sale_doc_number" text,
	"prior_sale_date" date,
	"prior_sale_amount" integer,
	"prior_sale_type" text,
	"appreciation_since_last_sale" integer,
	"appreciation_percent" numeric(5, 2),
	"days_on_market" integer,
	"years_owned" numeric(4, 1),
	"owner1_first_name" text,
	"owner1_last_name" text,
	"owner2_first_name" text,
	"owner2_last_name" text,
	"owner_type" text,
	"owner_occupied" boolean,
	"absentee_owner" boolean,
	"mailing_address" text,
	"mailing_city" text,
	"mailing_state" text,
	"mailing_zip" text,
	"pre_foreclosure" boolean DEFAULT false,
	"pre_foreclosure_date" date,
	"foreclosure" boolean DEFAULT false,
	"foreclosure_date" date,
	"foreclosure_auction_date" date,
	"reo" boolean DEFAULT false,
	"reo_date" date,
	"bankruptcy" boolean DEFAULT false,
	"bankruptcy_date" date,
	"bankruptcy_chapter" text,
	"tax_lien" boolean DEFAULT false,
	"tax_lien_amount" integer,
	"tax_lien_date" date,
	"tax_delinquent" boolean DEFAULT false,
	"tax_delinquent_year" integer,
	"inherited" boolean DEFAULT false,
	"inherited_date" date,
	"probate" boolean DEFAULT false,
	"probate_date" date,
	"divorce" boolean DEFAULT false,
	"vacant" boolean DEFAULT false,
	"vacant_indicator" text,
	"tired" boolean DEFAULT false,
	"cash_buyer" boolean DEFAULT false,
	"investor" boolean DEFAULT false,
	"out_of_state" boolean DEFAULT false,
	"out_of_county" boolean DEFAULT false,
	"senior_owner" boolean DEFAULT false,
	"high_equity" boolean DEFAULT false,
	"low_equity" boolean DEFAULT false,
	"negative_equity" boolean DEFAULT false,
	"free_clear" boolean DEFAULT false,
	"listed_for_sale" boolean DEFAULT false,
	"listed_date" date,
	"listing_price" integer,
	"mls_number" text,
	"dom" integer,
	"price_reduced" boolean DEFAULT false,
	"needs_repair" boolean DEFAULT false,
	"code_violation" boolean DEFAULT false,
	"permit_pulled" boolean DEFAULT false,
	"apollo_person_id" text,
	"apollo_org_id" text,
	"apollo_title" text,
	"apollo_company" text,
	"apollo_company_domain" text,
	"apollo_industry" text,
	"apollo_revenue" integer,
	"apollo_revenue_range" text,
	"apollo_employee_count" integer,
	"apollo_employee_range" text,
	"apollo_linkedin_url" text,
	"apollo_intent_score" integer,
	"apollo_signals" jsonb DEFAULT '[]'::jsonb,
	"apollo_founded_year" integer,
	"apollo_technologies" jsonb DEFAULT '[]'::jsonb,
	"apollo_keywords" jsonb DEFAULT '[]'::jsonb,
	"apollo_enriched_at" timestamp,
	"apollo_data" jsonb,
	"enrichment_status" text DEFAULT 'pending',
	"enriched_at" timestamp,
	"enrichment_error" text,
	"skip_traced_at" timestamp,
	"last_activity_at" timestamp,
	"last_activity_type" text,
	"activity_count" integer DEFAULT 0,
	"notes" text,
	"paused_at" timestamp,
	"pause_reason" text,
	"suppressed_at" timestamp,
	"suppress_reason" text,
	"rethink_at" timestamp,
	"rethink_reason" text,
	"revisit_at" timestamp,
	"revisit_reason" text,
	"assigned_advisor" text,
	"assigned_number" text,
	"dialer_workspace_id" text,
	"dialer_loaded_at" timestamp,
	"last_contact_date" timestamp,
	"assigned_to" text,
	"lead_type" text,
	"priority" text DEFAULT 'Medium',
	"company_name" text,
	"industry" text,
	"company_size" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid,
	"subscription_id" uuid,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd',
	"status" text NOT NULL,
	"payment_method" text,
	"card_last4" text,
	"card_brand" text,
	"stripe_payment_id" text,
	"stripe_charge_id" text,
	"refunded_amount" integer DEFAULT 0,
	"refunded_at" timestamp,
	"refund_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer,
	"setup_fee" integer DEFAULT 0,
	"max_users" integer DEFAULT 1,
	"max_leads_per_month" integer DEFAULT 1000,
	"max_property_searches" integer DEFAULT 500,
	"max_sms_per_month" integer DEFAULT 500,
	"max_skip_traces" integer DEFAULT 50,
	"max_campaigns" integer DEFAULT 3,
	"max_ai_sdr_avatars" integer DEFAULT 1,
	"features" jsonb DEFAULT '[]'::jsonb,
	"has_power_dialer" boolean DEFAULT false,
	"has_email_campaigns" boolean DEFAULT false,
	"has_api_access" boolean DEFAULT false,
	"has_priority_support" boolean DEFAULT false,
	"has_white_label" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"is_popular" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"stripe_price_id_monthly" text,
	"stripe_price_id_yearly" text,
	"stripe_product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid,
	"user_id" text NOT NULL,
	"realestate_api_id" text,
	"apn" text,
	"fips" text,
	"address" text,
	"address_2" text,
	"city" text,
	"state" text,
	"zip" text,
	"zip_4" text,
	"county" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"property_type" text,
	"property_subtype" text,
	"property_class" text,
	"zoning" text,
	"bedrooms" integer,
	"bathrooms" numeric(3, 1),
	"sqft" integer,
	"lot_size_sqft" integer,
	"lot_size_acres" numeric(10, 4),
	"year_built" integer,
	"stories" integer,
	"units" integer,
	"owner_name" text,
	"owner1_first_name" text,
	"owner1_last_name" text,
	"owner2_first_name" text,
	"owner2_last_name" text,
	"owner_type" text,
	"owner_occupied" boolean,
	"absentee_owner" boolean,
	"mailing_address" text,
	"mailing_city" text,
	"mailing_state" text,
	"mailing_zip" text,
	"estimated_value" integer,
	"assessed_value" integer,
	"tax_amount" integer,
	"estimated_equity" integer,
	"equity_percent" numeric(5, 2),
	"mtg1_amount" integer,
	"mtg1_loan_type" text,
	"mtg1_lender" text,
	"mtg1_date" date,
	"free_clear" boolean DEFAULT false,
	"pre_foreclosure" boolean DEFAULT false,
	"foreclosure" boolean DEFAULT false,
	"tax_lien" boolean DEFAULT false,
	"tax_delinquent" boolean DEFAULT false,
	"bankruptcy" boolean DEFAULT false,
	"inherited" boolean DEFAULT false,
	"probate" boolean DEFAULT false,
	"vacant" boolean DEFAULT false,
	"high_equity" boolean DEFAULT false,
	"reverse_mortgage" boolean DEFAULT false,
	"compulink_lender" boolean DEFAULT false,
	"phones" jsonb DEFAULT '[]'::jsonb,
	"emails" jsonb DEFAULT '[]'::jsonb,
	"skip_traced" boolean DEFAULT false,
	"skip_traced_at" timestamp,
	"primary_sector_id" text,
	"secondary_sector_ids" jsonb DEFAULT '[]'::jsonb,
	"sector_category" text,
	"lead_types" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'new',
	"score" integer DEFAULT 0,
	"last_contacted_at" timestamp,
	"notes" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_search_id" uuid NOT NULL,
	"property_id" text NOT NULL,
	"event_type" text NOT NULL,
	"property_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_search_property_ids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_search_id" uuid NOT NULL,
	"property_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query" jsonb NOT NULL,
	"result_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"notify_on_changes" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_run_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sector_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"sector_id" text NOT NULL,
	"sector_category" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"confidence" integer DEFAULT 100,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"user_id" text,
	"direction" text NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_message" text,
	"campaign_id" text,
	"batch_id" text,
	"template_id" text,
	"provider" text DEFAULT 'signalhouse',
	"provider_message_id" text,
	"provider_status" text,
	"sent_by_advisor" text,
	"ai_generated" boolean DEFAULT false,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"team_id" text,
	"plan_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"trial_ends_at" timestamp,
	"canceled_at" timestamp,
	"current_period_start" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"custom_pricing" integer,
	"custom_limits" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#6366f1',
	"description" text,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"leads_created" integer DEFAULT 0,
	"property_searches" integer DEFAULT 0,
	"sms_sent" integer DEFAULT 0,
	"skip_traces" integer DEFAULT 0,
	"apollo_enrichments" integer DEFAULT 0,
	"voice_minutes" integer DEFAULT 0,
	"emails_sent" integer DEFAULT 0,
	"ai_generations" integer DEFAULT 0,
	"overage_leads" integer DEFAULT 0,
	"overage_sms" integer DEFAULT 0,
	"overage_skip_traces" integer DEFAULT 0,
	"overage_voice_minutes" integer DEFAULT 0,
	"overage_cost" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit_cost" integer DEFAULT 0,
	"total_cost" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auto_tag_rules" ADD CONSTRAINT "auto_tag_rules_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_tags" ADD CONSTRAINT "bucket_tags_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_tags" ADD CONSTRAINT "bucket_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_sessions" ADD CONSTRAINT "dialer_sessions_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_change_events" ADD CONSTRAINT "property_change_events_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_property_ids" ADD CONSTRAINT "saved_search_property_ids_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bucket_tags_bucket_tag_idx" ON "bucket_tags" USING btree ("bucket_id","tag_id");--> statement-breakpoint
CREATE INDEX "buckets_user_id_idx" ON "buckets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "buckets_source_idx" ON "buckets" USING btree ("source");--> statement-breakpoint
CREATE INDEX "buckets_enrichment_status_idx" ON "buckets" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX "businesses_user_id_idx" ON "businesses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "businesses_data_source_idx" ON "businesses" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "businesses_company_name_idx" ON "businesses" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "businesses_sic_code_idx" ON "businesses" USING btree ("sic_code");--> statement-breakpoint
CREATE INDEX "businesses_state_idx" ON "businesses" USING btree ("state");--> statement-breakpoint
CREATE INDEX "businesses_city_idx" ON "businesses" USING btree ("city");--> statement-breakpoint
CREATE INDEX "businesses_sector_idx" ON "businesses" USING btree ("primary_sector_id");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "call_logs_lead_id_idx" ON "call_logs" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "call_logs_direction_idx" ON "call_logs" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "call_logs_status_idx" ON "call_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "call_logs_disposition_idx" ON "call_logs" USING btree ("disposition");--> statement-breakpoint
CREATE INDEX "call_logs_campaign_id_idx" ON "call_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_business_id_idx" ON "contacts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "contacts_property_id_idx" ON "contacts" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_sources_user_id_idx" ON "data_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_sources_slug_idx" ON "data_sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "data_sources_status_idx" ON "data_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_sources_sector_idx" ON "data_sources" USING btree ("primary_sector_id");--> statement-breakpoint
CREATE INDEX "deal_activities_deal_id_idx" ON "deal_activities" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_activities_type_idx" ON "deal_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "deal_activities_created_at_idx" ON "deal_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deal_documents_deal_id_idx" ON "deal_documents" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_documents_type_idx" ON "deal_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "deals_team_id_idx" ON "deals" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "deals_user_id_idx" ON "deals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deals_lead_id_idx" ON "deals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "deals_type_idx" ON "deals" USING btree ("type");--> statement-breakpoint
CREATE INDEX "deals_assigned_to_idx" ON "deals" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "dialer_sessions_workspace_id_idx" ON "dialer_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "dialer_sessions_user_id_idx" ON "dialer_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dialer_sessions_status_idx" ON "dialer_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_jobs_user_id_idx" ON "import_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_jobs_data_source_idx" ON "import_jobs" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "import_jobs_status_idx" ON "import_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_subscription_id_idx" ON "invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "invoices_user_id_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "lead_tags_lead_tag_idx" ON "lead_tags" USING btree ("lead_id","tag_id");--> statement-breakpoint
CREATE INDEX "leads_bucket_id_idx" ON "leads" USING btree ("bucket_id");--> statement-breakpoint
CREATE INDEX "leads_user_id_idx" ON "leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leads_property_id_idx" ON "leads" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_property_state_idx" ON "leads" USING btree ("property_state");--> statement-breakpoint
CREATE INDEX "leads_enrichment_status_idx" ON "leads" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_id_idx" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_user_id_idx" ON "properties" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "properties_data_source_idx" ON "properties" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "properties_realestate_api_id_idx" ON "properties" USING btree ("realestate_api_id");--> statement-breakpoint
CREATE INDEX "properties_apn_idx" ON "properties" USING btree ("apn");--> statement-breakpoint
CREATE INDEX "properties_state_idx" ON "properties" USING btree ("state");--> statement-breakpoint
CREATE INDEX "properties_county_idx" ON "properties" USING btree ("county");--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree ("city");--> statement-breakpoint
CREATE INDEX "properties_property_type_idx" ON "properties" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "properties_sector_idx" ON "properties" USING btree ("primary_sector_id");--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sector_assignments_user_id_idx" ON "sector_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sector_assignments_entity_idx" ON "sector_assignments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "sector_assignments_sector_idx" ON "sector_assignments" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "sector_assignments_category_idx" ON "sector_assignments" USING btree ("sector_category");--> statement-breakpoint
CREATE INDEX "sms_messages_lead_id_idx" ON "sms_messages" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "sms_messages_direction_idx" ON "sms_messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "sms_messages_status_idx" ON "sms_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sms_messages_campaign_id_idx" ON "sms_messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "sms_messages_from_number_idx" ON "sms_messages" USING btree ("from_number");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_team_id_idx" ON "subscriptions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_subscription_id_idx" ON "usage" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "usage_user_id_idx" ON "usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_period_idx" ON "usage" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "usage_events_subscription_id_idx" ON "usage_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "usage_events_user_id_idx" ON "usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_events_event_type_idx" ON "usage_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "usage_events_created_at_idx" ON "usage_events" USING btree ("created_at");