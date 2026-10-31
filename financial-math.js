// Deterministic integer-paise finance helpers. Never use floating point for posting.
function whole(n, label) {
  if (!Number.isSafeInteger(n)) throw new TypeError(`${label} must be a safe integer`);
  return n;
}
function roundedDivision(numerator, denominator) {
  if (denominator === 0n) throw new RangeError('Cannot divide by zero');
  const negative = (numerator < 0n) !== (denominator < 0n);
  const a = numerator < 0n ? -numerator : numerator;
  const b = denominator < 0n ? -denominator : denominator;
  const q = (a + b / 2n) / b;
  const signed = negative ? -q : q;
  const result = Number(signed);
  if (!Number.isSafeInteger(result)) throw new RangeError('Amount exceeds safe range');
  return result;
}
export function percentBasisPoints(amountPaise, basisPoints) {
  whole(amountPaise, 'amountPaise'); whole(basisPoints, 'basisPoints');
  return roundedDivision(BigInt(amountPaise) * BigInt(basisPoints), 10000n);
}
export function discountAmountPaise(grossPaise, discountBasisPoints) {
  if (whole(grossPaise, 'grossPaise') < 0) throw new RangeError('Gross must be nonnegative');
  if (whole(discountBasisPoints, 'discountBasisPoints') < 0 || discountBasisPoints > 10000) throw new RangeError('Discount out of range');
  return percentBasisPoints(grossPaise, discountBasisPoints);
}
export function invoiceTaxExclusive(grossPaise, discountBasisPoints, gstBasisPoints) {
  if (whole(gstBasisPoints, 'gstBasisPoints') < 0 || gstBasisPoints > 10000) throw new RangeError('GST rate out of range');
  const discountPaise = discountAmountPaise(grossPaise, discountBasisPoints);
  const taxablePaise = grossPaise - discountPaise;
  const gstPaise = percentBasisPoints(taxablePaise, gstBasisPoints);
  return {grossPaise, discountPaise, taxablePaise, gstPaise, totalPaise:taxablePaise + gstPaise};
}
export function profitSummary({revenuePaise,costOfGoodsPaise,operatingExpensesPaise}) {
  for (const [name,value] of Object.entries({revenuePaise,costOfGoodsPaise,operatingExpensesPaise})) whole(value,name);
  const grossProfitPaise = revenuePaise - costOfGoodsPaise;
  const netProfitPaise = grossProfitPaise - operatingExpensesPaise;
  return {grossProfitPaise, netProfitPaise,
    grossMarginBasisPoints:revenuePaise===0?null:roundedDivision(BigInt(grossProfitPaise)*10000n,BigInt(revenuePaise)),
    netMarginBasisPoints:revenuePaise===0?null:roundedDivision(BigInt(netProfitPaise)*10000n,BigInt(revenuePaise))};
}
export function workingCapitalPaise(currentAssetsPaise,currentLiabilitiesPaise) {
  return whole(currentAssetsPaise,'currentAssetsPaise')-whole(currentLiabilitiesPaise,'currentLiabilitiesPaise');
}
export function simpleInterestPaise(principalPaise,annualRateBasisPoints,days,yearDays=365) {
  whole(principalPaise,'principalPaise');whole(annualRateBasisPoints,'annualRateBasisPoints');whole(days,'days');whole(yearDays,'yearDays');
  return roundedDivision(BigInt(principalPaise)*BigInt(annualRateBasisPoints)*BigInt(days),10000n*BigInt(yearDays));
}
