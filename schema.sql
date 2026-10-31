PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS companies (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, state_code TEXT NOT NULL,
 gstin TEXT, address TEXT, owner_id TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS company_users (
 company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('OWNER','ACCOUNTANT','MANAGER','SALES','VIEWER')),
 PRIMARY KEY(company_id,user_id)
);
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 code TEXT NOT NULL, name TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
 is_system INTEGER NOT NULL DEFAULT 0, UNIQUE(company_id,code)
);
CREATE TABLE IF NOT EXISTS contacts (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 kind TEXT NOT NULL CHECK(kind IN ('CUSTOMER','SUPPLIER')),
 name TEXT NOT NULL, state_code TEXT, gstin TEXT, phone TEXT, email TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 sku TEXT NOT NULL, name TEXT NOT NULL, hsn TEXT,
 gst_bps INTEGER NOT NULL DEFAULT 0 CHECK(gst_bps>=0 AND gst_bps<=10000),
 sale_price_paise INTEGER NOT NULL DEFAULT 0 CHECK(sale_price_paise>=0),
 cost_price_paise INTEGER NOT NULL DEFAULT 0 CHECK(cost_price_paise>=0),
 reorder_level INTEGER NOT NULL DEFAULT 0 CHECK(reorder_level>=0),
 active INTEGER NOT NULL DEFAULT 1,
 UNIQUE(company_id,sku)
);
CREATE TABLE IF NOT EXISTS vouchers (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 kind TEXT NOT NULL, reference TEXT, date TEXT NOT NULL, memo TEXT,
 created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL,
 reversal_of TEXT REFERENCES vouchers(id),
 idempotency_key TEXT, UNIQUE(company_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS ix_vouchers_company_date ON vouchers(company_id,date);
CREATE TABLE IF NOT EXISTS journal_lines (
 id TEXT PRIMARY KEY, voucher_id TEXT NOT NULL REFERENCES vouchers(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 debit_paise INTEGER NOT NULL DEFAULT 0 CHECK(debit_paise>=0),
 credit_paise INTEGER NOT NULL DEFAULT 0 CHECK(credit_paise>=0),
 CHECK((debit_paise>0 AND credit_paise=0) OR (credit_paise>0 AND debit_paise=0))
);
CREATE INDEX IF NOT EXISTS ix_lines_voucher ON journal_lines(voucher_id);
CREATE TABLE IF NOT EXISTS invoices (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 kind TEXT NOT NULL CHECK(kind IN ('SALE','PURCHASE')),
 number TEXT NOT NULL, date TEXT NOT NULL, contact_id TEXT NOT NULL REFERENCES contacts(id),
 party_state TEXT NOT NULL, subtotal_paise INTEGER NOT NULL, gst_paise INTEGER NOT NULL,
 total_paise INTEGER NOT NULL, voucher_id TEXT NOT NULL REFERENCES vouchers(id),
 created_at TEXT NOT NULL,
 UNIQUE(company_id,kind,number)
);
CREATE TABLE IF NOT EXISTS invoice_items (
 id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id),
 product_id TEXT NOT NULL REFERENCES products(id), qty INTEGER NOT NULL CHECK(qty>0),
 unit_paise INTEGER NOT NULL CHECK(unit_paise>=0), discount_paise INTEGER NOT NULL DEFAULT 0,
 taxable_paise INTEGER NOT NULL CHECK(taxable_paise>=0), gst_bps INTEGER NOT NULL,
 cgst_paise INTEGER NOT NULL DEFAULT 0, sgst_paise INTEGER NOT NULL DEFAULT 0,
 igst_paise INTEGER NOT NULL DEFAULT 0, total_paise INTEGER NOT NULL,
 cogs_paise INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payments (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 invoice_id TEXT NOT NULL REFERENCES invoices(id), voucher_id TEXT NOT NULL REFERENCES vouchers(id),
 amount_paise INTEGER NOT NULL CHECK(amount_paise>0), method TEXT NOT NULL,
 date TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_layers (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 product_id TEXT NOT NULL REFERENCES products(id),
 source_voucher_id TEXT NOT NULL REFERENCES vouchers(id),
 qty_original INTEGER NOT NULL CHECK(qty_original>0),
 qty_remaining INTEGER NOT NULL CHECK(qty_remaining>=0),
 unit_cost_paise INTEGER NOT NULL CHECK(unit_cost_paise>=0), created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_layers_product ON stock_layers(company_id,product_id,created_at,id);
CREATE TABLE IF NOT EXISTS stock_moves (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 product_id TEXT NOT NULL REFERENCES products(id), voucher_id TEXT NOT NULL REFERENCES vouchers(id),
 qty_signed INTEGER NOT NULL, cost_paise INTEGER NOT NULL, date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions (
 company_id TEXT PRIMARY KEY REFERENCES companies(id), plan TEXT NOT NULL DEFAULT 'FREE',
 status TEXT NOT NULL DEFAULT 'FREE', ai_used INTEGER NOT NULL DEFAULT 0,
 started_at TEXT NOT NULL, ends_at TEXT
);
CREATE TABLE IF NOT EXISTS workbooks (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 title TEXT NOT NULL, cells_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
 id TEXT PRIMARY KEY, company_id TEXT, actor_id TEXT, action TEXT NOT NULL,
 entity_id TEXT, details TEXT, created_at TEXT NOT NULL
);

-- Non-posting bank reconciliation register. Each record belongs to exactly one company.
CREATE TABLE IF NOT EXISTS bank_statement_lines (
 id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),external_id TEXT NOT NULL,
 date TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
 amount_paise INTEGER NOT NULL CHECK(amount_paise<>0),
 matched_journal_line_id TEXT UNIQUE REFERENCES journal_lines(id),created_at TEXT NOT NULL,
 UNIQUE(company_id,account_id,external_id)
);
CREATE INDEX IF NOT EXISTS ix_bank_company_account ON bank_statement_lines(company_id,account_id,date);

-- Approval-only accounting drafts; input is never automatically posted.
CREATE TABLE IF NOT EXISTS posting_drafts (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id),
 created_by TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL,
 memo TEXT NOT NULL,lines_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('PENDING','POSTED','REJECTED')),
 created_at TEXT NOT NULL,posted_voucher_id TEXT REFERENCES vouchers(id),
 reviewed_by TEXT REFERENCES users(id),reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_draft_company_status ON posting_drafts(company_id,status);

-- Posted, full-invoice returns ONLY. One note per original unpaid invoice.
-- Applied as a new reversing voucher: the original posted voucher is never edited.
CREATE TABLE IF NOT EXISTS invoice_returns (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL REFERENCES companies(id),
 invoice_id TEXT NOT NULL UNIQUE REFERENCES invoices(id),
 kind TEXT NOT NULL CHECK(kind IN ('CREDIT_NOTE','DEBIT_NOTE')),
 number TEXT NOT NULL,
 date TEXT NOT NULL,
 subtotal_paise INTEGER NOT NULL CHECK(subtotal_paise>=0),
 gst_paise INTEGER NOT NULL CHECK(gst_paise>=0),
 total_paise INTEGER NOT NULL CHECK(total_paise>0),
 voucher_id TEXT NOT NULL UNIQUE REFERENCES vouchers(id),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL,
 UNIQUE(company_id,number)
);
CREATE INDEX IF NOT EXISTS ix_invoice_returns_company_date ON invoice_returns(company_id,date);

-- Private, company-scoped local library. File contents are saved in the SQLite database.
CREATE TABLE IF NOT EXISTS private_documents (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('Document','Invoice','Receipt','Voice note')),
 mime_type TEXT NOT NULL,
 size_bytes INTEGER NOT NULL CHECK(size_bytes>0 AND size_bytes<=5242880),
 content BLOB NOT NULL,
 uploaded_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_private_documents_company ON private_documents(company_id,created_at);

-- Email password reset, never store plaintext reset tokens.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_password_resets_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS company_settings (
 company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
 gst_type TEXT NOT NULL DEFAULT 'UNREGISTERED' CHECK (gst_type IN ('UNREGISTERED','REGULAR','COMPOSITION','OTHER')),
 business_type TEXT,
 business_state TEXT,
 tax_setup_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (tax_setup_confirmed IN (0,1))
);
