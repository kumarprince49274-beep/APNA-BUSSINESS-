// Plan list Plan / Billing tab ke liye.
// Paid plans ki keemat abhi tay nahi hai, isliye koi bhi keemat yahan nahi likhi gayi.
// "available:false" ka matlab hai ki ye plan abhi kharid nahi sakte (UI me "Jaldi aa raha hai" dikhao).
export const PLANS=[
  {code:'FREE',title:'Free',monthly_paise:0,ai_credits:0,companies:1,team:1,available:true},
  {code:'STARTER',title:'Starter',monthly_paise:null,ai_credits:null,companies:null,team:null,available:false},
  {code:'BUSINESS_PRO',title:'Business Pro',monthly_paise:null,ai_credits:null,companies:null,team:null,available:false},
  {code:'ACCOUNTANT',title:'Accountant',monthly_paise:null,ai_credits:null,companies:null,team:null,available:false},
  {code:'ENTERPRISE',title:'Enterprise',monthly_paise:null,ai_credits:null,companies:null,team:null,available:false}
];
export const PLAN_NOTICE='Only FREE is active. Paid plan prices and payment processing need verified provider integration; no fake checkout or subscription activation.';
export const PLAN_NOTICE_HI='अभी सिर्फ़ Free प्लान चालू है। पेड प्लान की कीमत और पेमेंट तभी शुरू होंगे जब असली पेमेंट सेवा जुड़ जाएगी। तब तक कोई नकली चेकआउट नहीं है।';
