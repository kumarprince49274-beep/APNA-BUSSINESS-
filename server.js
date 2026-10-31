import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDatabase, one, all, run, transaction } from './db.js';
import { uid, now, today, fail, text, state, date, nonnegative, positive, csv } from './utils.js';
import { register, login, changePassword, getSession, clearSession, cookie, clearCookie, assertRole } from './auth.js';
import { createCompany, listCompanies, checkOwnRecord, companyGstType, getCompanyTaxConfig, updateCompanyTaxConfig } from './companies.js';
import { createJournal, reverseVoucher, voucherDetails, balanceAccount } from './ledger.js';
import { issueInvoice, receivePayment, listInvoices, invoiceDetails } from './invoices.js';
import { issueFullReturn, listReturns, returnDetails } from './returns.js';
import { trialBalance, profitLoss, balanceSheet, stockReport, gstReport, outstandingReport, dashboard, daybook, ledgerReport } from './reports.js';
import { localAssistant } from './assistant.js';
import { aiChat } from './ai.js';
import { computeWorkbook } from './spreadsheet.js';
import { PLANS, PLAN_NOTICE } from './subscriptions.js';
import { importBankLines, listBankLines, matchBankLine, reconciliationCandidates, unmatchBankLine } from './banking.js';
import { businessReminders } from './reminders.js';
import { createDraft, listDrafts, approveDraft, rejectDraft } from './drafts.js';
import { saveDocument, listDocuments, getDocument, deleteDocument } from './documents.js';
import { requestPasswordReset, resetPassword } from './password-reset.js';
import { sendResetEmail, hasResetEmailProvider } from './email-service.js';

const root = path.dirname(fileURLToPath(import.meta.url));

const roles = {
  read: ['OWNER', 'ACCOUNTANT', 'MANAGER', 'SALES', 'VIEWER'],
  sale: ['OWNER', 'ACCOUNTANT', 'MANAGER', 'SALES'],
  books: ['OWNER', 'ACCOUNTANT'],
  manager: ['OWNER', 'ACCOUNTANT', 'MANAGER'],
  owner: ['OWNER']
};

const methods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

function safeJson(res, status, data, moreHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...moreHeaders
  });
  res.end(JSON.stringify(data));
}

function parseCookie(req) {
  const c = req.headers.cookie || '';
  const entry = c.split(';').map(x => x.trim()).find(x => x.startsWith('ab_session='));
  return entry?.slice('ab_session='.length) || '';
}

function inputBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;

    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return reject(Object.assign(new Error('Send application/json'), { status: 415 }));
    }

    req.on('data', chunk => {
      bytes += chunk.length;

      if (bytes > limit) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
      } else {
        data += chunk;
      }
    });

    req.on('end', () => {
      try {
        const value = JSON.parse(data || '{}');

        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          fail('Body must be a JSON object');
        }

        resolve(value);
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);

  if (!['index.html', 'app.js', 'style.css', 'favicon.svg', 'manifest.webmanifest'].includes(relative)) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const p = path.join(root, relative);

  const type = relative.endsWith('.js')
    ? 'text/javascript; charset=utf-8'
    : relative.endsWith('.css')
      ? 'text/css; charset=utf-8'
      : relative.endsWith('.svg')
        ? 'image/svg+xml'
        : relative.endsWith('.webmanifest')
          ? 'application/manifest+json'
          : 'text/html; charset=utf-8';

  try {
    if (!fs.statSync(p).isFile()) {
      throw new Error('Missing static file');
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store'
    });

    const stream = fs.createReadStream(p);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Missing static resource');
  }
}

export function createServer(
  db,
  { resetEmailSender = sendResetEmail, resetEmailReady = hasResetEmailProvider } = {}
) {
  const attempts = new Map();
  const resetAttempts = new Map();

  const loginWindowMs = 15 * 60 * 1000;
  const maxFailedLogins = 20;

  function attemptFor(ip) {
    const current = attempts.get(ip);

    if (!current || Date.now() - current.time > loginWindowMs) {
      const fresh = { count: 0, time: Date.now() };
      attempts.set(ip, fresh);
      return fresh;
    }

    return current;
  }

  const routes = [];

  const add = (method, pattern, scope, handler) => {
    const keys = [];

    const regexp = new RegExp(
      '^' +
        pattern.replace(/:([A-Za-z]+)/g, (_, name) => {
          keys.push(name);
          return '([^/]+)';
        }) +
        '/?$'
    );

    routes.push({ method, regexp, keys, scope, handler, pattern });
  };

  add('POST', '/api/auth/register', 'public', ({ body }) => register(db, body));
  add('POST', '/api/auth/login', 'public', ({ body }) => login(db, body));
  add('POST', '/api/auth/forgot-password', 'public', ({ body }) =>
    requestPasswordReset(db, body, resetEmailSender, resetEmailReady())
  );
  add('POST', '/api/auth/reset-password', 'public', ({ body }) => resetPassword(db, body));

  add('GET', '/api/auth/me', 'auth', ({ session }) => ({
    user: session.user,
    csrf: session.csrf
  }));

  add('POST', '/api/auth/logout', 'auth', ({ session }) => {
    clearSession(db, session);
    return { ok: true };
  });

  add('POST', '/api/auth/change-password', 'auth', ({ session, body }) =>
    changePassword(db, session.user.id, body, session.token_hash)
  );

  add('GET', '/api/companies', 'auth', ({ session }) =>
    listCompanies(db, session.user.id)
  );

  add('POST', '/api/companies', 'auth', ({ session, body }) =>
    createCompany(db, session.user.id, body)
  );

  add('GET', '/api/companies/:companyId', 'read', ({ params }) =>
    getCompanyTaxConfig(db, params.companyId)
  );

  add('PATCH', '/api/companies/:companyId', 'owner', ({ params, body, session }) =>
    updateCompanyTaxConfig(db, params.companyId, session.user.id, body)
  );

  add('GET', '/api/companies/:companyId/members', 'owner', ({ params }) =>
    all(
      db,
      `SELECT u.id,u.name,u.email,m.role
       FROM company_users m
       JOIN users u ON u.id=m.user_id
       WHERE m.company_id=?`,
      params.companyId
    )
  );

  add('POST', '/api/companies/:companyId/members', 'owner', ({ params, body }) =>
    transaction(db, () => {
      const role = body.role;

      if (!['ACCOUNTANT', 'MANAGER', 'SALES', 'VIEWER'].includes(role)) {
        fail('Invalid staff role');
      }

      const u = one(
        db,
        'SELECT id FROM users WHERE email=?',
        text(body.email, 'email').toLowerCase()
      );

      if (!u) {
        fail('Staff member must first create their own login account');
      }

      run(
        db,
        'INSERT INTO company_users VALUES (?,?,?) ON CONFLICT(company_id,user_id) DO UPDATE SET role=excluded.role',
        params.companyId,
        u.id,
        role
      );

      return { ok: true };
    })
  );

  add('GET', '/api/companies/:companyId/contacts', 'read', ({ params, query }) =>
    all(
      db,
      "SELECT * FROM contacts WHERE company_id=? AND (?='' OR kind=?) ORDER BY name",
      params.companyId,
      query.get('kind') || '',
      query.get('kind') || ''
    )
  );

  add('POST', '/api/companies/:companyId/contacts', 'sale', ({ params, body }) => {
    if (!['CUSTOMER', 'SUPPLIER'].includes(body.kind)) {
      fail('Contact kind must be CUSTOMER or SUPPLIER');
    }

    const id = uid();
    const stateCode = body.state_code ? state(body.state_code) : null;

    run(
      db,
      'INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)',
      id,
      params.companyId,
      body.kind,
      text(body.name, 'contact name', 120),
      stateCode,
      String(body.gstin || '').slice(0, 15),
      String(body.phone || '').slice(0, 30),
      String(body.email || '').slice(0, 200),
      now()
    );

    return { id };
  });

  add('GET', '/api/companies/:companyId/products', 'read', ({ params }) =>
    all(
      db,
      `SELECT p.*,COALESCE(SUM(l.qty_remaining),0) stock_qty
       FROM products p
       LEFT JOIN stock_layers l
       ON l.product_id=p.id AND l.company_id=p.company_id
       WHERE p.company_id=?
       GROUP BY p.id
       ORDER BY p.name`,
      params.companyId
    )
  );

  add('POST', '/api/companies/:companyId/products', 'manager', ({ params, body }) => {
    const id = uid();
    const gst = nonnegative(body.gst_bps ?? 0, 'GST rate', 10000);

    run(
      db,
      'INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)',
      id,
      params.companyId,
      text(body.sku, 'SKU', 60),
      text(body.name, 'product name', 120),
      String(body.hsn || '').slice(0, 20),
      gst,
      nonnegative(body.sale_price_paise ?? 0),
      nonnegative(body.cost_price_paise ?? 0),
      nonnegative(body.reorder_level ?? 0, 'reorder level', 1000000),
      1
    );

    return { id };
  });

  add('GET', '/api/companies/:companyId/accounts', 'read', ({ params }) =>
    all(db, 'SELECT * FROM accounts WHERE company_id=? ORDER BY code', params.companyId)
  );

  add('POST', '/api/companies/:companyId/accounts', 'books', ({ params, body }) => {
    if (!['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(body.type)) {
      fail('Invalid account type');
    }

    const id = uid();

    run(
      db,
      'INSERT INTO accounts VALUES (?,?,?,?,?,0)',
      id,
      params.companyId,
      text(body.code, 'account code', 20),
      text(body.name, 'account name', 120),
      body.type
    );

    return { id };
  });

  add('GET', '/api/companies/:companyId/vouchers', 'read', ({ params }) =>
    daybook(db, params.companyId)
  );

  add('GET', '/api/companies/:companyId/vouchers/:voucherId', 'read', ({ params }) =>
    voucherDetails(db, params.companyId, params.voucherId)
  );

  add('POST', '/api/companies/:companyId/vouchers', 'books', ({ params, body, session }) =>
    createJournal(db, params.companyId, session.user.id, body)
  );

  add('POST', '/api/companies/:companyId/vouchers/:voucherId/reverse', 'books', ({ params, session }) =>
    reverseVoucher(db, params.companyId, session.user.id, params.voucherId)
  );

  add('POST', '/api/companies/:companyId/capital', 'books', ({ params, session, body }) => {
    const a = one(
      db,
      'SELECT id FROM accounts WHERE company_id=? AND code=?',
      params.companyId,
      body.method === 'BANK' ? '1010' : '1000'
    );

    const b = one(
      db,
      'SELECT id FROM accounts WHERE company_id=? AND code=?',
      params.companyId,
      '3000'
    );

    const amount = positive(body.amount_paise, 'capital');

    return createJournal(db, params.companyId, session.user.id, {
      date: body.date || today(),
      memo: 'Owner capital introduced',
      reference: 'CAPITAL',
      idempotency_key: body.idempotency_key,
      lines: [
        { account_id: a.id, debit_paise: amount, credit_paise: 0 },
        { account_id: b.id, debit_paise: 0, credit_paise: amount }
      ]
    });
  });

  add('GET', '/api/companies/:companyId/invoices', 'read', ({ params, query }) =>
    listInvoices(db, params.companyId, query.get('kind'))
  );

  add('GET', '/api/companies/:companyId/invoices/:invoiceId', 'read', ({ params }) =>
    invoiceDetails(db, params.companyId, params.invoiceId)
  );

  add('POST', '/api/companies/:companyId/invoices', 'sale', ({ params, body, session }) =>
    issueInvoice(db, params.companyId, session.user.id, body)
  );

  add('POST', '/api/companies/:companyId/invoices/:invoiceId/payments', 'sale', ({ params, body, session }) =>
    receivePayment(db, params.companyId, session.user.id, params.invoiceId, body)
  );

  add('GET', '/api/companies/:companyId/returns', 'read', ({ params }) =>
    listReturns(db, params.companyId)
  );

  add('GET', '/api/companies/:companyId/returns/:returnId', 'read', ({ params }) =>
    returnDetails(db, params.companyId, params.returnId)
  );

  add('POST', '/api/companies/:companyId/invoices/:invoiceId/full-return', 'books', ({ params, body, session }) =>
    issueFullReturn(db, params.companyId, session.user.id, params.invoiceId, body)
  );

  add('GET', '/api/companies/:companyId/drafts', 'read', ({ params }) =>
    listDrafts(db, params.companyId)
  );

  add('POST', '/api/companies/:companyId/drafts', 'books', ({ params, body, session }) =>
    createDraft(db, params.companyId, session.user.id, body)
  );

  add('POST', '/api/companies/:companyId/drafts/:draftId/approve', 'books', ({ params, session }) =>
    approveDraft(db, params.companyId, session.user.id, params.draftId)
  );

  add('POST', '/api/companies/:companyId/drafts/:draftId/reject', 'books', ({ params, session }) =>
    rejectDraft(db, params.companyId, session.user.id, params.draftId)
  );

  add('GET', '/api/companies/:companyId/documents', 'read', ({ params }) =>
    listDocuments(db, params.companyId)
  );

  add('POST', '/api/companies/:companyId/documents', 'sale', ({ params, session, body }) =>
    saveDocument(db, params.companyId, session.user.id, body)
  );

  add('GET', '/api/companies/:companyId/documents/:documentId', 'read', ({ params }) =>
    getDocument(db, params.companyId, params.documentId)
  );

  add('DELETE', '/api/companies/:companyId/documents/:documentId', 'manager', ({ params }) =>
    deleteDocument(db, params.companyId, params.documentId)
  );

  add('GET', '/api/companies/:companyId/reminders', 'read', ({ params }) =>
    businessReminders(db, params.companyId)
  );

  add('GET', '/api/companies/:companyId/banking/:accountId/candidates', 'read', ({ params }) =>
    reconciliationCandidates(db, params.companyId, params.accountId)
  );

  add('GET', '/api/companies/:companyId/banking/:accountId/statement', 'read', ({ params }) =>
    listBankLines(db, params.companyId, params.accountId)
  );

  add('POST', '/api/companies/:companyId/banking/:accountId/statement', 'books', ({ params, body }) =>
    importBankLines(db, params.companyId, params.accountId, body.lines)
  );

  add('POST', '/api/companies/:companyId/banking/:accountId/match', 'books', ({ params, body, session }) => {
    const statement = one(
      db,
      'SELECT account_id FROM bank_statement_lines WHERE id=? AND company_id=?',
      body.statement_id,
      params.companyId
    );

    if (!statement || statement.account_id !== params.accountId) {
      fail('Statement line does not belong to account');
    }

    return matchBankLine(
      db,
      params.companyId,
      body.statement_id,
      body.journal_line_id,
      session.user.id
    );
  });

  add('POST', '/api/companies/:companyId/banking/:accountId/unmatch', 'books', ({ params, body, session }) =>
    unmatchBankLine(db, params.companyId, params.accountId, body.statement_id, session.user.id)
  );

  add('GET', '/api/companies/:companyId/dashboard', 'read', ({ params }) =>
    dashboard(db, params.companyId)
  );

  add('GET', '/api/companies/:companyId/reports/:report', 'read', ({ params, query }) => {
    const companyId = params.companyId;
    const from = query.get('from') || '2000-01-01';
    const to = query.get('to') || today();

    switch (params.report) {
      case 'trial-balance':
        return trialBalance(db, companyId, to);
      case 'profit-loss':
        return profitLoss(db, companyId, from, to);
      case 'balance-sheet':
        return balanceSheet(db, companyId, to);
      case 'stock':
        return stockReport(db, companyId);
      case 'gst':
        return gstReport(db, companyId, from, to);
      case 'outstanding':
        return outstandingReport(db, companyId);
      case 'daybook':
        return daybook(db, companyId, from, to);
      case 'ledger':
        return ledgerReport(db, companyId, text(query.get('account_id'), 'account ID'), from, to);
      default:
        fail('Report not found', 404);
    }
  });

  add('POST', '/api/companies/:companyId/assistant', 'read', ({ params, body }) =>
    localAssistant(db, params.companyId, body.message)
  );

  add('POST', '/api/companies/:companyId/chat', 'read', ({ params, body, session }) =>
    aiChat(db, params.companyId, session.user.id, body)
  );

  add('GET', '/api/companies/:companyId/subscription', 'read', ({ params }) => ({
    subscription: one(db, 'SELECT * FROM subscriptions WHERE company_id=?', params.companyId),
    plans: PLANS,
    notice: PLAN_NOTICE
  }));

  add('GET', '/api/companies/:companyId/workbooks', 'read', ({ params }) =>
    all(db, 'SELECT id,title,updated_at FROM workbooks WHERE company_id=? ORDER BY updated_at DESC', params.companyId)
  );

  add('POST', '/api/companies/:companyId/workbooks', 'manager', ({ params, body }) => {
    const id = uid();
    const cells = body.cells ?? {};

    computeWorkbook(cells);

    run(
      db,
      'INSERT INTO workbooks VALUES (?,?,?,?,?)',
      id,
      params.companyId,
      text(body.title, 'workbook title', 120),
      JSON.stringify(cells),
      now()
    );

    return { id };
  });

  add('GET', '/api/companies/:companyId/workbooks/:workbookId', 'read', ({ params }) => {
    const w = checkOwnRecord(db, 'workbooks', params.workbookId, params.companyId);
    const cells = JSON.parse(w.cells_json);

    return {
      id: w.id,
      title: w.title,
      cells,
      results: computeWorkbook(cells)
    };
  });

  add('PATCH', '/api/companies/:companyId/workbooks/:workbookId', 'manager', ({ params, body }) => {
    checkOwnRecord(db, 'workbooks', params.workbookId, params.companyId);

    const cells = body.cells;
    computeWorkbook(cells);

    run(
      db,
      'UPDATE workbooks SET cells_json=?,updated_at=? WHERE id=?',
      JSON.stringify(cells),
      now(),
      params.workbookId
    );

    return {
      id: params.workbookId,
      results: computeWorkbook(cells)
    };
  });

  add('GET', '/api/companies/:companyId/export/:resource', 'read', ({ params }) => {
    if (params.resource === 'invoices') {
      return {
        __csv: csv(listInvoices(db, params.companyId), [
          'number',
          'kind',
          'date',
          'contact_name',
          'subtotal_paise',
          'gst_paise',
          'total_paise',
          'paid_paise',
          'outstanding_paise'
        ])
      };
    }

    if (params.resource === 'products') {
      return {
        __csv: csv(
          all(db, 'SELECT * FROM products WHERE company_id=?', params.companyId),
          ['sku', 'name', 'hsn', 'gst_bps', 'sale_price_paise', 'cost_price_paise']
        )
      };
    }

    if (params.resource === 'stock') {
      return {
        __csv: csv(stockReport(db, params.companyId), [
          'sku',
          'name',
          'qty',
          'stock_value_paise'
        ])
      };
    }

    fail('Export not found', 404);
  });

  add('GET', '/api/platform/owner', 'admin', () => {
    const users = one(db, 'SELECT COUNT(*) n FROM users').n;
    const companies = one(db, 'SELECT COUNT(*) n FROM companies').n;
    const paying = one(
      db,
      "SELECT COUNT(*) n FROM subscriptions WHERE status='ACTIVE' AND plan!='FREE'"
    ).n;

    return {
      users,
      companies,
      paying_users: paying,
      mrr_paise: 0,
      arr_paise: 0,
      verified_subscription_payments: 0,
      notice: 'No provider or payment records configured. Financial SaaS revenue is not calculated; zero means no verified payments in this prototype.'
    };
  });

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    );

    const pathName = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`
    ).pathname;

    if (!pathName.startsWith('/api/')) {
      return serveStatic(req, res, pathName);
    }

    try {
      if (!methods.has(req.method)) {
        fail('Method not allowed', 405);
      }

      const found = routes.find(
        r => r.method === req.method && r.regexp.test(pathName)
      );

      if (!found) {
        fail('API route not found', 404);
      }

      const match = pathName.match(found.regexp);

      const params = Object.fromEntries(
        found.keys.map((k, i) => [k, match[i + 1]])
      );

      const session = getSession(db, parseCookie(req));

      if (found.scope !== 'public' && !session) {
        fail('Login required', 401);
      }

      if (found.scope === 'admin') {
        if (
          !process.env.PLATFORM_ADMIN_EMAIL ||
          session.user.email !== process.env.PLATFORM_ADMIN_EMAIL.toLowerCase()
        ) {
          fail('Admin access denied', 403);
        }
      }

      if (roles[found.scope]) {
        assertRole(db, params.companyId, session.user.id, roles[found.scope]);
      }

      let body = {};

      if (req.method !== 'GET') {
        if (found.scope !== 'public' && req.headers['x-csrf-token'] !== session.csrf) {
          fail('CSRF token missing', 403);
        }

        body = await inputBody(
          req,
          found.pattern?.endsWith('/documents') ? 7 * 1024 * 1024 : 1024 * 1024
        );
      }

      if (pathName === '/api/auth/forgot-password') {
        const ip = req.socket.remoteAddress || 'unknown';
        const stamp = Date.now();
        const record = resetAttempts.get(ip);

        const item =
          !record || stamp - record.start > 3600000
            ? { start: stamp, count: 0 }
            : record;

        if (item.count >= 5) {
          fail('Too many reset requests. Retry in an hour.', 429);
        }

        item.count++;
        resetAttempts.set(ip, item);
      }

      if (
        pathName === '/api/auth/login' &&
        attemptFor(req.socket.remoteAddress || 'unknown').count >= maxFailedLogins
      ) {
        fail('Too many failed login attempts. Retry later', 429);
      }

      let result;

      try {
        result = await found.handler({
          body,
          params,
          session,
          query: new URL(req.url, 'http://localhost').searchParams
        });
      } catch (handlerError) {
        if (pathName === '/api/auth/login' && handlerError.status === 401) {
          attemptFor(req.socket.remoteAddress || 'unknown').count++;
        }

        throw handlerError;
      }

      if (pathName === '/api/auth/login') {
        attempts.delete(req.socket.remoteAddress || 'unknown');

        const secure = process.env.NODE_ENV === 'production';

        return safeJson(
          res,
          200,
          {
            user: result.user,
            csrf: result.csrf,
            expires: result.expires
          },
          {
            'Set-Cookie': cookie(result.token, secure)
          }
        );
      }

      if (pathName === '/api/auth/logout') {
        return safeJson(res, 200, result, {
          'Set-Cookie': clearCookie
        });
      }

      if (result?.__csv !== undefined) {
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="apna-business-export.csv"',
          'Cache-Control': 'no-store'
        });

        return res.end(result.__csv);
      }

      safeJson(res, 200, result);
    } catch (error) {
      const status = Number.isInteger(error.status)
        ? error.status
        : /constraint failed|UNIQUE constraint/.test(error.message)
          ? 409
          : 400;

      const safeMessage =
        status === 409
          ? (error.status === 409 ? error.message : 'Duplicate entry or conflicting data')
          : status >= 500
            ? 'Server error'
            : /SQLITE|constraint failed|FOREIGN KEY/.test(error.message)
              ? 'Invalid or duplicate database entry'
              : error.message;

      safeJson(res, status, { error: safeMessage });

      if (process.env.NODE_ENV !== 'production' && status >= 500) {
        console.error(error);
      }
    }
  });

  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const db = openDatabase();
  const host = '0.0.0.0';
  const port = Number(process.env.PORT || 10000);

  createServer(db).listen(port, host, () => {
    console.log(`Apna Business server listening on ${host}:${port}`);
  });
}
