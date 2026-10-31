// Optional external email provider. No credentials are bundled into the source.
export function hasResetEmailProvider(){
 return Boolean(process.env.RESEND_API_KEY&&process.env.RESET_EMAIL_FROM&&process.env.APP_BASE_URL);
}
export async function sendResetEmail({email,token}){
 if(!hasResetEmailProvider())throw new Error('Reset email provider not configured');
 const url=new URL(process.env.APP_BASE_URL);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('APP_BASE_URL must use HTTPS');
 const resetUrl=new URL(url.origin+url.pathname);
 // Fragment is never sent to the web server in HTTP requests.
 resetUrl.hash='reset='+encodeURIComponent(token);
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const res=await fetch('https://api.resend.com/emails',{
   method:'POST',signal:controller.signal,
   headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({from:process.env.RESET_EMAIL_FROM,to:[email],subject:'APNA BUSINESS password reset',
    text:`Someone requested a password reset for APNA BUSINESS. Open this link within 20 minutes: ${resetUrl}\n\nIf you did not request it, ignore this email.`})
  });
  if(!res.ok)throw new Error(`Email provider returned ${res.status}`);
 }finally{clearTimeout(timeout);}
}
