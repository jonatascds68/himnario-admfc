const fs=require('fs');
const p='assets/base_mestre.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));
const H=d.himnos;
const GT='Gloria y Triunfo',SN='Himnos de Sión';
const gt=n=>H.find(h=>h.himnario===GT&&Number(h.numero)===Number(n));
const sn=n=>H.find(h=>h.himnario===SN&&Number(h.numero)===Number(n));
function unlink(h){
if(!h||h.numero_equivalente==null)return;
const o=H.find(x=>x.himnario===h.himnario_equivalente&&Number(x.numero)===Number(h.numero_equivalente));
if(o&&Number(o.numero_equivalente)===Number(h.numero)&&o.himnario_equivalente===h.himnario){
o.numero_equivalente=null;
o.himnario_equivalente=null;
}
h.numero_equivalente=null;
h.himnario_equivalente=null;
}
const rem=fs.readFileSync('remover_gt.txt','utf8').trim().split(/\s+/).map(Number);
for(const n of rem)unlink(gt(n));
const pares=fs.readFileSync('vinculos_gt_sion.txt','utf8').trim().split(/\s+/);
for(const par of pares){
const [a,b]=par.split(':').map(Number);
const g=gt(a),s=sn(b);
if(!g||!s)throw Error('Hino nao encontrado:'+par);
unlink(g);
unlink(s);
g.numero_equivalente=s.numero;
g.himnario_equivalente=s.himnario;
s.numero_equivalente=g.numero;
s.himnario_equivalente=g.himnario;
}
fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const limparSion=[3,8,9,10,46,166];
for(const n of limparSion){
const s=sn(n);
s.numero_equivalente=null;
s.himnario_equivalente=null;
}
fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');

