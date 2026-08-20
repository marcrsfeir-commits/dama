const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script type="text\/js-worker" id="wsrc">([\s\S]*?)<\/script>/);
let eng=m[1].replace(/self\.onmessage[\s\S]*$/,'');
const ctx={performance:performance,Math:Math,console:console};
vm.createContext(ctx);vm.runInContext(eng,ctx);
ctx.RAW=[];
['pA.json','pB.json','pC.json','pD.json','puzzles.json'].forEach(f=>{try{ctx.RAW=ctx.RAW.concat(JSON.parse(fs.readFileSync(f)));}catch(e){}});
const code=`
function fenToBoard(f){var b=[];for(var r=0;r<8;r++){var row=[];for(var c=0;c<8;c++){var ch=f[r*8+c];row.push(ch==='.'?null:{player:(ch==='l'||ch==='L')?1:2,king:(ch==='L'||ch==='D')});}b.push(row);}return b;}
function keyset(b,pl){var lg=computeLegal(b,pl);var s={};for(var k in lg.moves){lg.moves[k].forEach(function(mm){s[k+','+mm.r+','+mm.c]=1;});}return s;}
var seen={},out=[];
RAW.forEach(function(p){ if(seen[p.fen])return; seen[p.fen]=1;
  var b=fenToBoard(p.fen); var ks=keyset(b,p.side);
  var acc=p.acc.filter(function(k){return ks[k];});
  if(!acc.length)return;                        // solution not legal in this position → drop
  // also make sure there are at least 2 legal moves (a real choice)
  var lg=computeLegal(b,p.side),cnt=0;for(var k in lg.moves)cnt+=lg.moves[k].length;
  if(cnt<2)return;
  out.push({fen:p.fen,side:p.side,acc:acc,theme:p.theme,diff:p.diff,swing:p.swing});
});
var rank={easy:0,medium:1,hard:2};
out.sort(function(a,b){ if(rank[a.diff]!==rank[b.diff])return rank[a.diff]-rank[b.diff]; return a.swing-b.swing; });
var by={easy:0,medium:0,hard:0};out.forEach(function(p){by[p.diff]++;});
console.error('merged='+RAW.length+' valid='+out.length+' '+JSON.stringify(by));
RES=JSON.stringify(out);`;
vm.runInContext(code,ctx);
fs.writeFileSync('puzzles_final.json',ctx.RES);
console.error('wrote puzzles_final.json '+ctx.RES.length+' bytes');
