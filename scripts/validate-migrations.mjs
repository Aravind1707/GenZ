import fs from 'node:fs';
import path from 'node:path';
const dir=path.join(process.cwd(),'db','migrations');
const files=fs.readdirSync(dir).filter(x=>/^\d+_.+\.sql$/.test(x));
const seen=new Map();
for(const file of files){const version=Number(file.split('_',1)[0]);if(seen.has(version))throw new Error(`Duplicate migration version ${version}: ${seen.get(version)}, ${file}`);seen.set(version,file);const sql=fs.readFileSync(path.join(dir,file),'utf8');const recordsSchema=/schema_migrations/i.test(sql);if(recordsSchema&&!new RegExp(`VALUES\\s*\\(\\s*${version}\\s*,`,'i').test(sql))throw new Error(`Migration ${file} records schema_migrations but not version ${version}`);}
const versions=[...seen.keys()].sort((a,b)=>a-b);if(!versions.length)throw new Error('No migrations found');for(let i=1;i<versions.length;i++)if(versions[i]===versions[i-1])throw new Error(`Duplicate migration version ${versions[i]}`);console.log(`Validated ${versions.length} migrations; versions ${versions[0]}-${versions.at(-1)}.`);
