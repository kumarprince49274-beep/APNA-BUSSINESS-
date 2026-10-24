# APNA BUSINESS

APNA BUSINESS is a local accounting and business-management application with one codebase for both GST and Non-GST businesses.

## Start

Requirements: Node.js 22.13+ with the built-in SQLite support.

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`. For development with file watching use `npm run dev`.

Run tests with:

```bash
npm test
```

## GST / Non-GST company creation

1. Business name — required.
2. Business type — selected from the built-in list.
3. Business state / UT — selected by name; the backend derives the GST state code.
4. GST registration — `UNREGISTERED`, `REGULAR`, `COMPOSITION`, or `OTHER`.
5. GSTIN is required only for the registered types.

For an unregistered business, GSTIN is not required and normal sales do not automatically add CGST, SGST, or IGST.

For a Regular GST business, valid GSTIN plus the selected state are required. Intra-state transactions use CGST + SGST and inter-state transactions use IGST.

Composition is stored separately and is not silently converted into Regular GST.

## Important

- Accounting data is stored in `data/apna-business.sqlite`; `data/` is ignored by Git.
- Do not commit `.env`, database files, backups, passwords, or API keys.
- This is a local development accounting application, not a certified GST filing system or independent production security audit.
- See `docs/MASTER_REQUIREMENTS.txt` for the supplied master requirements and `docs/IMPLEMENTATION_STATUS.md` for the current implementation status.
