import test from 'node:test';
import assert from 'node:assert/strict';
import {percentBasisPoints,invoiceTaxExclusive,profitSummary,workingCapitalPaise,simpleInterestPaise} from '../src/financial-math.js';
test('GST, round-half-up and discount in integer paise',()=>{
  assert.equal(percentBasisPoints(100000,1800),18000);
  assert.deepEqual(invoiceTaxExclusive(100000,1000,1800),{grossPaise:100000,discountPaise:10000,taxablePaise:90000,gstPaise:16200,totalPaise:106200});
  assert.equal(percentBasisPoints(3,5000),2);
});
test('profit margins, zero-revenue and working capital',()=>{
  assert.deepEqual(profitSummary({revenuePaise:100000,costOfGoodsPaise:65000,operatingExpensesPaise:15000}),{grossProfitPaise:35000,netProfitPaise:20000,grossMarginBasisPoints:3500,netMarginBasisPoints:2000});
  assert.equal(profitSummary({revenuePaise:0,costOfGoodsPaise:0,operatingExpensesPaise:0}).netMarginBasisPoints,null);
  assert.equal(workingCapitalPaise(125000,50000),75000);
});
test('simple interest and input safety',()=>{
  assert.equal(simpleInterestPaise(100000,1000,365),10000);
  assert.throws(()=>percentBasisPoints(1.5,1800),/safe integer/);
  assert.throws(()=>invoiceTaxExclusive(10000,15000,1800),/Discount/);
});
