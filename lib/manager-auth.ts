import {getStaffByToken} from './staff-auth';

export async function requireManager(token?:string|null){const staff=await getStaffByToken(token);if(!staff)throw Error('STAFF_UNAUTHORIZED');if(staff.role!=='OWNER'&&staff.role!=='MANAGER')throw Error('STAFF_FORBIDDEN');return staff;}
