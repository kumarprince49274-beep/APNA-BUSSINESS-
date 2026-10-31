import {all} from './db.js';
export function businessReminders(db,companyId){
 const lowStock=all(db,`SELECT p.id,p.sku,p.name,p.reorder_level,COALESCE(SUM(l.qty_remaining),0) quantity FROM products p LEFT JOIN stock_layers l ON l.product_id=p.id AND l.company_id=p.company_id WHERE p.company_id=? AND p.active=1 GROUP BY p.id HAVING quantity<=p.reorder_level ORDER BY p.name`,companyId);
 const unpaid=all(db,`SELECT i.id,i.number,i.kind,i.date,i.total_paise,COALESCE(SUM(p.amount_paise),0) paid_paise FROM invoices i LEFT JOIN payments p ON p.invoice_id=i.id AND p.company_id=i.company_id WHERE i.company_id=? GROUP BY i.id HAVING paid_paise<i.total_paise AND NOT EXISTS (SELECT 1 FROM invoice_returns r WHERE r.invoice_id=i.id) ORDER BY i.date`,companyId);
 return {low_stock:lowStock,unpaid_invoices:unpaid,note:'Invoices have no due-date field in the current schema; overdue status cannot be calculated accurately.'};
}
