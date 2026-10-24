# APNA BUSINESS — Current Implementation Status

## Project structure

There is one project root only:

```text
APNA-BUSSINESS/
├── package.json
├── public/
├── src/
├── test/
├── scripts/
└── docs/
```

No nested `APNA-BUSSINESS/APNA-BUSSINESS`, duplicate `src/`, or embedded source ZIP is included.

## GST / Non-GST

- Business state is selected by name; the server derives the GST state code.
- Registration types: `UNREGISTERED`, `REGULAR`, `COMPOSITION`, `OTHER`.
- `UNREGISTERED` does not require GSTIN and does not automatically collect GST.
- `REGULAR` requires a valid GSTIN and uses product GST rates with intra-state CGST+SGST or inter-state IGST.
- `COMPOSITION` requires GSTIN and is stored separately; normal Regular GST collection is not applied.
- `OTHER` is not silently treated as Regular GST.
- Invoice tax treatment is recorded as `NON_GST`, `CGST_SGST`, `IGST`, `BILL_OF_SUPPLY_COMPOSITION`, or `TAX_SETUP_REQUIRED` as applicable.
- Changing tax setup is owner-only through the existing company permission layer and creates an audit event.

## Migration safety

Older company records without a reliable current tax configuration are migrated to an explicit `OTHER` / unconfirmed setup. The invoice engine therefore does not silently start collecting Regular GST for them. The owner can confirm the correct tax setup from Business Tax Setup.

## Verification

`npm test` currently passes all tests in the cleaned repository.

`npm start` was also verified to start the server and serve `/`. An unauthenticated request to `/api/auth/me` correctly returns `401 Login required`.

This remains a local accounting development application and is not a claim of legal, tax, security, or production compliance.
