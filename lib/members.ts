export type MemberTier='REGULAR'|'GOLD'|'VIP';
export type Member={id:string;name:string;tier:MemberTier;expiresAt:string;walletBalance:number;active:boolean};

const members:Member[]=[
 {id:'1042',name:'Demo Member',tier:'GOLD',expiresAt:'2027-06-30',walletBalance:850,active:true},
 {id:'1180',name:'Demo VIP',tier:'VIP',expiresAt:'2027-03-31',walletBalance:1400,active:true},
];

export function findMember(id:string){ const member=members.find(m=>m.id===id.trim()); if(!member) return null; const active=member.active && new Date(member.expiresAt+'T23:59:59')>=new Date(); return {...member,active}; }
export function memberPrice(base:number,tier:MemberTier){ const discount={REGULAR:0,GOLD:.10,VIP:.15}[tier]; return Math.round(base*(1-discount)); }
export function listMembers(){ return members.map(m=>({...m,active:!!findMember(m.id)?.active})); }
