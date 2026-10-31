import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db.js';
import { register } from '../src/auth.js';
import { createCompany } from '../src/companies.js';
import { uid } from '../src/utils.js';
import { issueInvoice } from '../src/invoices.js';
import { localAssistant } from '../src/assistant.js';

function setup() {
  const db = openDatabase(':memory:');

  const user = register(db, {
    name: 'GST Test User',
    email: `gst-${uid()}@example.com`,
    password: 'a-very-strong-test-password'
  });

  return { db, user };
}

test('unregistered business can be created without GSTIN', () => {
  const { db, user } = setup();

  try {
    const company = createCompany(db, user.id, {
      name: 'Small Retail Shop',
      state_code: '27',
      gst_registration_type: 'UNREGISTERED',
      gstin: ''
    });

    assert.equal(company.name, 'Small Retail Shop');
    assert.equal(company.gstin, null);
    assert.equal(
      company.gst_registration_type,
      'UNREGISTERED'
    );
  } finally {
    db.close();
  }
});

test('regular GST registration requires a valid-format GSTIN', () => {
  const { db, user } = setup();

  try {
    assert.throws(() =>
      createCompany(db, user.id, {
        name: 'Regular GST Business',
        state_code: '27',
        gst_registration_type: 'REGULAR',
        gstin: ''
      })
    );

    const company = createCompany(db, user.id, {
      name: 'Registered Business',
      state_code: '27',
      gst_registration_type: 'REGULAR',
      gstin: '27ABCDE1234F1Z5'
    });

    assert.equal(company.gst_registration_type, 'REGULAR');
    assert.equal(company.gstin, '27ABCDE1234F1Z5');
  } finally {
    db.close();
  }
});

test('composition registration requires a valid-format GSTIN', () => {
  const { db, user } = setup();

  try {
    assert.throws(() =>
      createCompany(db, user.id, {
        name: 'Composition Business',
        state_code: '27',
        gst_registration_type: 'COMPOSITION',
        gstin: ''
      })
    );

    const company = createCompany(db, user.id, {
      name: 'Composition Business',
      state_code: '27',
      gst_registration_type: 'COMPOSITION',
      gstin: '27ABCDE1234F1Z5'
    });

    assert.equal(
      company.gst_registration_type,
      'COMPOSITION'
    );
  } finally {
    db.close();
  }
});

test('non-GST sale never invents GST', () => {
  const { db, user } = setup();
  try {
    const company = createCompany(db, user.id, {
      name: 'Non GST Shop', state_code: '09', business_type: 'Retail / Shop',
      gst_registration_type: 'UNREGISTERED'
    });
    const productId = uid();
    db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)').run(productId, company.id, 'N1', 'Item', '1001', 1800, 100000, 50000, 1, 1);
    const supplierId = uid();
    db.prepare('INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)').run(supplierId, company.id, 'SUPPLIER', 'Supplier', '09', null, null, null, new Date().toISOString());
    const customerId = uid();
    db.prepare('INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)').run(customerId, company.id, 'CUSTOMER', 'Customer', '09', null, null, null, new Date().toISOString());
    issueInvoice(db, company.id, user.id, {kind:'PURCHASE', contact_id:supplierId, items:[{product_id:productId, qty:1, unit_paise:50000}]});
    const invoice = issueInvoice(db, company.id, user.id, {kind:'SALE', contact_id:customerId, items:[{product_id:productId, qty:1, unit_paise:100000}]});
    assert.equal(invoice.gst_paise, 0);
  } finally { db.close(); }
});

test('composition sale uses zero regular GST collection', () => {
  const { db, user } = setup();
  try {
    const company = createCompany(db, user.id, {
      name: 'Composition Shop', state_code: '27', business_type: 'Retail / Shop',
      gst_registration_type: 'COMPOSITION', gstin: '27ABCDE1234F1Z5'
    });
    const productId = uid();
    db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)').run(productId, company.id, 'C1', 'Item', '1001', 1800, 100000, 50000, 1, 1);
    const supplierId = uid();
    db.prepare('INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)').run(supplierId, company.id, 'SUPPLIER', 'Supplier', '27', null, null, null, new Date().toISOString());
    const customerId = uid();
    db.prepare('INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?)').run(customerId, company.id, 'CUSTOMER', 'Customer', '27', null, null, null, new Date().toISOString());
    issueInvoice(db, company.id, user.id, {kind:'PURCHASE', contact_id:supplierId, items:[{product_id:productId, qty:1, unit_paise:50000}]});
    const invoice = issueInvoice(db, company.id, user.id, {kind:'SALE', contact_id:customerId, items:[{product_id:productId, qty:1, unit_paise:100000}]});
    assert.equal(invoice.gst_paise, 0);
  } finally { db.close(); }
});


test('AI accountant does not invent GST for non-GST company', () => {
  const { db, user } = setup();
  try {
    const company = createCompany(db, user.id, {name:'AI Non GST Shop',state_code:'09',business_type:'Retail / Shop',gst_registration_type:'UNREGISTERED'});
    const answer = localAssistant(db, company.id, 'gst tax');
    assert.match(answer.reply, /UNREGISTERED|does not invent Regular GST/i);
  } finally { db.close(); }
});

