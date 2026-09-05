// Deployment-only transforms. Original photographs and editable sources stay intact.
import {readdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {transform} from 'esbuild';
const root=resolve(process.argv[2]||'dist');
async function walk(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);result.push(...(e.isDirectory()?await walk(p):[p]))}return result}
const files=await walk(root),replacements=new Map();let before=0,after=0,count=0;
for(const path of files.filter(p=>/\.(png|jpe?g)$/i.test(p))){
  const original=await readFile(path);before+=original.length;
  const encoded=await sharp(original).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:78,effort:4}).toBuffer();
  if(encoded.length>=original.length){after+=original.length;continue}
  const hash=createHash('sha256').update(encoded).digest('hex').slice(0,10);
  const target=path.replace(/\.[^.]+$/,`.${hash}.webp`);
  await writeFile(target,encoded);await unlink(path);
  replacements.set(relative(root,path).split('\\').join('/'),relative(root,target).split('\\').join('/'));
  after+=encoded.length;count++;
}
let codeBefore=0,codeAfter=0;
for(const path of files.filter(p=>/\.(js|css|html|json|webmanifest)$/.test(p))){
  let text=await readFile(path,'utf8');codeBefore+=Buffer.byteLength(text);
  for(const [old,next] of replacements)text=text.split(old).join(next);
  if(/\.(js|css)$/.test(path))text=(await transform(text,{loader:path.endsWith('.css')?'css':'js',minify:true,target:'es2020',legalComments:'none'})).code;
  await writeFile(path,text);codeAfter+=Buffer.byteLength(text);
}
console.log(JSON.stringify({imagesConverted:count,imageBytesBefore:before,imageBytesAfter:after,codeBytesBefore:codeBefore,codeBytesAfter:codeAfter},null,2));
