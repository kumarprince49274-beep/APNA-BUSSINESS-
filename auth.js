import crypto from 'node:crypto';
import { uid, now, fail, text } from './utils.js';
import { one, run } from './db.js';

const hashToken = x => crypto.createHash('sha256').update(x).digest('hex');
const pwdHash = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');

function checkPassword(user, password) {
  if (!user || typeof password !== 'string') return false;

  const [salt, stored] = String(user.password_hash).split(':');

  if (!salt || !stored || !/^[a-f0-9]{128}$/.test(stored)) return false;

  const actual = pwdHash(password, salt);

  return crypto.timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(actual, 'hex'));
}

export function changePassword(db, userId, { current_password, new_password }, currentTokenHash) {
  if (typeof new_password !== 'string' || new_password.length < 6 || new_password.length > 256) {
    fail('New password must be 6–256 characters');
  }

  const user = one(db, 'SELECT * FROM users WHERE id=?', userId);

  if (!checkPassword(user, current_password)) {
    fail('Current password is incorrect', 403);
  }

  if (new_password === current_password) {
    fail('New password must differ from current password');
  }

  const salt = crypto.randomBytes(24).toString('hex');

  run(
    db,
    'UPDATE users SET password_hash=? WHERE id=?',
    `${salt}:${pwdHash(new_password, salt)}`,
    userId
  );

  run(
    db,
    'DELETE FROM sessions WHERE user_id=? AND token_hash<>?',
    userId,
    currentTokenHash
  );

  return { ok: true, other_sessions_signed_out: true };
}

export function register(db, { name, email, password }) {
  name = text(name, 'name', 100);
  email = text(email, 'email', 254).trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail('Invalid email');
  }

  if (typeof password !== 'string' || password.length < 6 || password.length > 256) {
    fail('Password must be 6-256 characters');
  }

  if (one(db, 'SELECT id FROM users WHERE email=?', email)) {
    fail('Email already registered', 409);
  }

  const salt = crypto.randomBytes(24).toString('hex');
  const id = uid();

  run(
    db,
    'INSERT INTO users VALUES (?,?,?,?,?)',
    id,
    name,
    email,
    `${salt}:${pwdHash(password, salt)}`,
    now()
  );

  return { id, name, email };
}

export function login(db, { email, password }) {
  const user = one(
    db,
    'SELECT * FROM users WHERE email=?',
    String(email || '').trim().toLowerCase()
  );

  if (!user || typeof password !== 'string') {
    fail('Invalid email or password', 401);
  }

  if (!checkPassword(user, password)) {
    fail('Invalid email or password', 401);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const csrf = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 3600000).toISOString();

  run(
    db,
    'INSERT INTO sessions VALUES (?,?,?,?,?)',
    hashToken(token),
    user.id,
    csrf,
    expires,
    now()
  );

  return {
    token,
    csrf,
    user: { id: user.id, email: user.email, name: user.name },
    expires
  };
}

export function getSession(db, token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const session = one(
    db,
    `SELECT s.*,u.name,u.email
     FROM sessions s
     JOIN users u ON u.id=s.user_id
     WHERE token_hash=? AND expires_at>?`,
    hashToken(token),
    now()
  );

  return session
    ? {
        user: { id: session.user_id, name: session.name, email: session.email },
        csrf: session.csrf,
        token_hash: session.token_hash
      }
    : null;
}

export function clearSession(db, session) {
  if (session) {
    run(db, 'DELETE FROM sessions WHERE token_hash=?', session.token_hash);
  }
}

export function assertRole(
  db,
  companyId,
  userId,
  allowed = ['OWNER', 'ACCOUNTANT', 'MANAGER', 'SALES', 'VIEWER']
) {
  const row = one(
    db,
    'SELECT role FROM company_users WHERE company_id=? AND user_id=?',
    companyId,
    userId
  );

  if (!row || !allowed.includes(row.role)) {
    fail('Company access denied', 403);
  }

  return row.role;
}

export function cookie(token, secure = false) {
  return `ab_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure ? '; Secure' : ''}`;
}

export const clearCookie = 'ab_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';
