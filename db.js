import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || 'apna-business.db';

let db;

export function openDatabase() {
  if (db) return db;

  fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });

  db = new DatabaseSync(DB_PATH);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  migrate(db);

  return db;
}

function migrate(db) {
  resetMismatchedTables(db);
  fixOldJournalLines(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      csrf TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state_code TEXT,
      gstin TEXT,
      address TEXT,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_users (
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY(company_id,user_id),
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      state_code TEXT,
      gstin TEXT,
      phone TEXT,
      email TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      hsn TEXT,
      gst_bps INTEGER NOT NULL DEFAULT 0,
      sale_price_paise INTEGER NOT NULL DEFAULT 0,
      cost_price_paise INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      date TEXT NOT NULL,
      memo TEXT,
      reference TEXT,
      created_by TEXT NOT NULL,
      reversed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      reference TEXT,
      date TEXT NOT NULL,
      memo TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reversal_of TEXT,
      idempotency_key TEXT,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      debit_paise INTEGER NOT NULL DEFAULT 0,
      credit_paise INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      number TEXT NOT NULL,
      kind TEXT NOT NULL,
      date TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      subtotal_paise INTEGER NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      cgst_paise INTEGER NOT NULL DEFAULT 0,
      sgst_paise INTEGER NOT NULL DEFAULT 0,
      igst_paise INTEGER NOT NULL DEFAULT 0,
      gst_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL DEFAULT 0,
      paid_paise INTEGER NOT NULL DEFAULT 0,
      outstanding_paise INTEGER NOT NULL DEFAULT 0,
      journal_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(contact_id) REFERENCES contacts(id),
      FOREIGN KEY(journal_id) REFERENCES journal_entries(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty REAL NOT NULL,
      unit_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      taxable_paise INTEGER NOT NULL,
      gst_bps INTEGER NOT NULL DEFAULT 0,
      cgst_paise INTEGER NOT NULL DEFAULT 0,
      sgst_paise INTEGER NOT NULL DEFAULT 0,
      igst_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_layers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      invoice_id TEXT,
      qty REAL NOT NULL,
      qty_remaining REAL NOT NULL,
      unit_cost_paise INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      method TEXT,
      voucher_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoice_returns (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      number TEXT,
      date TEXT NOT NULL,
      subtotal_paise INTEGER NOT NULL DEFAULT 0,
      gst_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL DEFAULT 0,
      voucher_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      number TEXT NOT NULL,
      date TEXT NOT NULL,
      total_paise INTEGER NOT NULL DEFAULT 0,
      journal_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(journal_id) REFERENCES journal_entries(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      content_base64 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS private_documents (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      content BLOB NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payload TEXT NOT NULL,
      preview TEXT NOT NULL,
      document_id TEXT,
      created_at TEXT NOT NULL,
      decided_at TEXT,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id),
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS posting_drafts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      date TEXT NOT NULL,
      memo TEXT NOT NULL,
      lines_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      posted_voucher_id TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bank_statement_lines (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      amount_paise INTEGER NOT NULL,
      journal_line_id TEXT,
      matched_by TEXT,
      matched_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(account_id) REFERENCES accounts(id),
      FOREIGN KEY(journal_line_id) REFERENCES journal_lines(id),
      FOREIGN KEY(matched_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workbooks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      cells_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      company_id TEXT PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT 'FREE',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      amount_paise INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      renews_at TEXT,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      company_id TEXT PRIMARY KEY,
      gst_type TEXT NOT NULL DEFAULT 'UNREGISTERED',
      business_type TEXT,
      business_state TEXT,
      tax_setup_confirmed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
    CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_log(company_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
    CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
    CREATE INDEX IF NOT EXISTS idx_journal_company ON journal_entries(company_id);
    CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_idem ON vouchers(company_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_journal_lines_voucher ON journal_lines(voucher_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_returns_invoice ON invoice_returns(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_stock_company_product ON stock_layers(company_id,product_id);
    CREATE INDEX IF NOT EXISTS idx_returns_company ON returns(company_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_company ON drafts(company_id);
    CREATE INDEX IF NOT EXISTS idx_posting_drafts_company ON posting_drafts(company_id);
    CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
    CREATE INDEX IF NOT EXISTS idx_private_documents_company ON private_documents(company_id);
    CREATE INDEX IF NOT EXISTS idx_bank_lines_company ON bank_statement_lines(company_id);
    CREATE INDEX IF NOT EXISTS idx_workbooks_company ON workbooks(company_id);
  `);
}

function fixOldJournalLines(db) {
  const cols = db.prepare('PRAGMA table_info(journal_lines)').all();
  if (!cols.length) return;
  if (cols.some((c) => c.name === 'voucher_id')) return;

  const count = db.prepare('SELECT COUNT(*) n FROM journal_lines').get().n;
  if (count > 0) return;

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS journal_lines');
  db.exec('PRAGMA foreign_keys = ON;');
}

function resetMismatchedTables(db) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'").get();
  if (!exists) return;

  const cols = db.prepare('PRAGMA table_info(companies)').all();
  if (cols.some((c) => c.name === 'state_code')) return;

  const count = db.prepare('SELECT COUNT(*) n FROM companies').get().n;
  if (count > 0) return;

  db.exec('PRAGMA foreign_keys = OFF;');
  for (const t of ['company_settings', 'subscriptions', 'audit_logs', 'audit_log', 'companies']) {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
  }
  db.exec('PRAGMA foreign_keys = ON;');
}

export function one(database, sql, ...params) {
  const connection = database || db;
  if (!connection) throw new Error('Database is not initialized');
  return connection.prepare(sql).get(...params);
}

export function all(database, sql, ...params) {
  const connection = database || db;
  if (!connection) throw new Error('Database is not initialized');
  return connection.prepare(sql).all(...params);
}

export function run(database, sql, ...params) {
  const connection = database || db;
  if (!connection) throw new Error('Database is not initialized');
  return connection.prepare(sql).run(...params);
}

export function transaction(database, callback) {
  const connection = database || db;
  if (!connection) throw new Error('Database is not initialized');

  connection.exec('BEGIN');
  try {
    const result = callback();
    connection.exec('COMMIT');
    return result;
  } catch (error) {
    connection.exec('ROLLBACK');
    throw error;
  }
}
