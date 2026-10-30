import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const crc = bytes => {let c=4294967295;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?3988292384:0);}return (c^4294967295)>>>0;};
const chunk=(name,data)=>{const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([length,type,data,checksum]);};
function icon(size){
 const data=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=x/size,py=y/size;
  const ellipse=(cx,cy,rx,ry)=>((px-cx)/rx)**2+((py-cy)/ry)**2<1;
  let color=[222,239,214];
  if(ellipse(.3,.3,.12,.12)||ellipse(.7,.3,.12,.12))color=[66,58,54];
  if(ellipse(.5,.51,.29,.28))color=[255,249,235];
  if(ellipse(.39,.48,.075,.1)||ellipse(.61,.48,.075,.1))color=[66,58,54];
  if(ellipse(.4,.46,.025,.032)||ellipse(.6,.46,.025,.032))color=[255,255,250];
  if(ellipse(.5,.58,.045,.03))color=[66,58,54];
  if(ellipse(.5,.66,.065,.035)&&py>.66)color=[206,121,115];
  const i=y*(size*4+1)+1+x*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(data,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
mkdirSync('public/icons',{recursive:true});
for(const [name,size] of [['192',192],['512',512],['maskable-512',512]])writeFileSync(`public/icons/opencadkid-${name}.png`,icon(size));
