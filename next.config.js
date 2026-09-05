/** @type {import('next').NextConfig} */
const isProduction=process.env.NODE_ENV==='production';
const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(),microphone=(),geolocation=()'},
  {key:'Content-Security-Policy',value:`default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${isProduction?'':' \'unsafe-eval\''}; connect-src 'self'; form-action 'self';`},
  ...(isProduction?[{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}]:[])
];
module.exports={reactStrictMode:true,async headers(){return[{source:'/(.*)',headers:securityHeaders}]}};
