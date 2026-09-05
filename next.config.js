/** @type {import('next').NextConfig} */
const isProduction=process.env.NODE_ENV==='production';
const securityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'no-referrer'},
  {key:'Permissions-Policy',value:'camera=(),microphone=(),geolocation=(),payment=(self)'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
  {key:'Cross-Origin-Resource-Policy',value:'same-origin'},
  {key:'Origin-Agent-Cluster',value:'?1'},
  {key:'X-DNS-Prefetch-Control',value:'off'},
  {key:'X-Permitted-Cross-Domain-Policies',value:'none'},
  {key:'Content-Security-Policy',value:`default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${isProduction?'':' \'unsafe-eval\''}; connect-src 'self'; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'; form-action 'self';`},
  ...(isProduction?[{key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains'}]:[])
];
module.exports={
  reactStrictMode:true,
  poweredByHeader:false,
  async headers(){return[{source:'/(.*)',headers:securityHeaders}]}
};
