APNA BUSINESS - SAB FILES REPLACE KARNE KE LIYE

1. public/app.js - purani file pura replace karo
2. public/style.css - purani file pura replace karo
3. src/chat-upload.js - nayi file banao
4. public/favicon.svg - nayi file banao

index.html ke <head> mein jodo:
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

Server main file mein jodo:
import chatUpload from './chat-upload.js';
app.use('/api', chatUpload);
app.use('/uploads', express.static('uploads'));

package.json dependencies mein:
"multer": "^1.4.5-lts.1"

Mic Chrome mein try karo. Brave/Firefox mein voice support kam hota hai.
Mic permission Allow karna zaroori hai.
