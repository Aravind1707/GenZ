export type TerminalPaymentMethod='UPI'|'CARD';
export type TerminalPaymentRequest={amount:number;reference:string;method:TerminalPaymentMethod};
export type TerminalPaymentResult={supported:boolean;status:'DISABLED'|'UNSUPPORTED'|'PENDING'|'CAPTURED'|'FAILED';reference:string;message:string};

const enabled=(v:string|undefined)=>v==='true';

export function terminalConfig(){return{integrationEnabled:enabled(process.env.GENZ_POS_INTEGRATION_ENABLED),dynamicUpiQrEnabled:enabled(process.env.GENZ_POS_DYNAMIC_UPI_QR_ENABLED),cardTerminalEnabled:enabled(process.env.GENZ_POS_CARD_ENABLED),automaticConfirmationEnabled:enabled(process.env.GENZ_POS_AUTO_CONFIRM_ENABLED),provider:process.env.GENZ_POS_PROVIDER||'NONE'};}

export function createTerminalPayment(input:TerminalPaymentRequest):TerminalPaymentResult{const cfg=terminalConfig();if(!cfg.integrationEnabled)return{supported:false,status:'DISABLED',reference:input.reference,message:'POS integration is disabled.'};if(input.method==='UPI'&&!cfg.dynamicUpiQrEnabled)return{supported:false,status:'UNSUPPORTED',reference:input.reference,message:'Dynamic UPI QR is not enabled for the configured POS.'};if(input.method==='CARD'&&!cfg.cardTerminalEnabled)return{supported:false,status:'UNSUPPORTED',reference:input.reference,message:'Card terminal integration is not enabled for the configured POS.'};return{supported:false,status:'UNSUPPORTED',reference:input.reference,message:'No provider adapter is installed yet. Configure the POS provider adapter before enabling live terminal commands.'};}
