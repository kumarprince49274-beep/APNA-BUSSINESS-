import { one, all, run } from './db.js';
import { uid, now, fail, text } from './utils.js';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

function checkCompany(db, companyId) {
  const company = one(
    db,
    'SELECT id FROM companies WHERE id=?',
    companyId
  );

  if (!company) {
    fail('Company not found', 404);
  }

  return company;
}

function validBase64(value) {
  return typeof value === 'string' && /^[A-Za-z0-9+/=\r\n]+$/.test(value);
}

function base64Size(contentBase64) {
  const clean = String(contentBase64).replace(/[\r\n\s]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

export function saveDocument(db, companyId, userId, body) {
  checkCompany(db, companyId);

  const name = text(body.name, 'document name', 160);
  const kind = ['Receipt', 'Invoice', 'Bill', 'Document', 'Other'].includes(body.kind)
    ? body.kind
    : 'Document';

  const contentBase64 = String(body.content_base64 || '').trim();

  if (!contentBase64) {
    fail('Document file is required');
  }

  if (!validBase64(contentBase64)) {
    fail('Invalid document file');
  }

  const size = base64Size(contentBase64);

  if (!size) {
    fail('Document file is empty');
  }

  if (size > MAX_DOCUMENT_BYTES) {
    fail('Document is too large. Maximum size is 5 MB');
  }

  const id = uid();

  run(
    db,
    `INSERT INTO documents
     (id,company_id,uploaded_by,name,kind,content_base64,size_bytes,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    id,
    companyId,
    userId,
    name,
    kind,
    contentBase64,
    size,
    now()
  );

  return {
    id,
    name,
    kind,
    size_bytes: size
  };
}

export function listDocuments(db, companyId) {
  checkCompany(db, companyId);

  return all(
    db,
    `SELECT id,name,kind,size_bytes,created_at
     FROM documents
     WHERE company_id=?
     ORDER BY created_at DESC`,
    companyId
  );
}

export function getDocument(db, companyId, documentId) {
  checkCompany(db, companyId);

  const document = one(
    db,
    `SELECT id,name,kind,content_base64,size_bytes,created_at
     FROM documents
     WHERE id=? AND company_id=?`,
    documentId,
    companyId
  );

  if (!document) {
    fail('Document not found', 404);
  }

  return document;
}

export function deleteDocument(db, companyId, documentId) {
  checkCompany(db, companyId);

  const document = one(
    db,
    'SELECT id FROM documents WHERE id=? AND company_id=?',
    documentId,
    companyId
  );

  if (!document) {
    fail('Document not found', 404);
  }

  run(
    db,
    'DELETE FROM documents WHERE id=? AND company_id=?',
    documentId,
    companyId
  );

  return { ok: true };
}
