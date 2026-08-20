const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script type="text\/js-worker" id="wsrc">([\s\S]*?)<\/script>/);
let eng=m[1].replace(/self\.onmessage[\s\S]*$/,'');
const ctx={performance:performance,Math:Math,console:console};
vm.createContext(ctx);vm.runInContext(eng,ctx);
const TARGET=+process.argv[2]||60, BUDGET=(+process.argv[3]||250)*1000, OUT=process.argv[4]||'p.json';
ctx.TARGET=TARGET;ctx.BUDGET=BUDGET;ctx.OUT=OUT;
const gen=`
function keyOf(m){return m.from[0]+','+m.from[1]+','+m.to[0]+','+m.to[1];}
function fenOf(b){let s='';for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];s+=p?(p.player===1?(p.king?'L':'l'):(p.king?'D':'d')):'.';}return s;}
function rootEval(b,pl,depth){const o=pl===1?2:1;const mv=allMoves(b,pl);
  const out=mv.map(x=>({mv:x,val:-nega(makeMove(b,x),o,depth-1,-Infinity,Infinity,Infinity)}));
  out.sort((a,b)=>b.val-a.val);return out;}
function selfPlay(maxPlies){let b=initialBoard(),pl=1;const pos=[];
  for(let ply=0;ply<maxPlies;ply++){const mv=allMoves(b,pl);if(!mv.length)break;
    const forced=mv[0].captured!=null;
    if(!forced&&Math.random()<0.35)pos.push({board:clone(b),player:pl});   // sample ~35% of quiet positions
    let pick=forced?mv[Math.floor(Math.random()*mv.length)]:(Math.random()<0.3?rootEval(b,pl,2)[0].mv:mv[Math.floor(Math.random()*mv.length)]);
    b=makeMove(b,pick);pl=pl===1?2:1;}
  return pos;}
function themeOf(b,mv,best){const p=b[mv.from[0]][mv.from[1]];const cap=mv.captured?mv.captured.length:0;
  if(best>=90000)return'Winning shot';if(cap>=3)return'Grand slam';if(cap===2)return'Combination';if(cap===1)return'Win material';
  const bk=p.player===1?0:7;if(!p.king&&mv.to[0]===bk)return'Promotion';return'Squeeze';}
const seen=new Set(),puz=[],t0=Date.now();let games=0;
while(puz.length<TARGET&&(Date.now()-t0)<BUDGET){games++;const pos=selfPlay(50);
  for(const P of pos){ if((Date.now()-t0)>BUDGET)break;
    const fen=fenOf(P.board);if(seen.has(fen))continue;seen.add(fen);
    const mv=allMoves(P.board,P.player);if(mv.length<2)continue;
    const pre=rootEval(P.board,P.player,2);if(pre[0].val-pre[1].val<45)continue;   // cheap depth-2 prefilter
    const sc=rootEval(P.board,P.player,5);const best=sc[0].val,second=sc[1].val,swing=best-second;
    if(swing<110)continue;
    const bm=sc[0].mv,cap=bm.captured?bm.captured.length:0,p=P.board[bm.from[0]][bm.from[1]],bk=p.player===1?0:7,promo=!p.king&&bm.to[0]===bk;
    if(cap===0&&!promo&&best<90000&&swing<360)continue;
    const acc=Array.from(new Set(sc.filter(x=>x.val>=best-22).map(x=>keyOf(x.mv))));
    if(acc.length>3)continue;
    let d;if(best>=90000)d='hard';else if(swing<250)d='easy';else if(swing<540)d='medium';else d='hard';
    puz.push({fen,side:P.player,acc,theme:themeOf(P.board,bm,best),diff:d,swing:Math.round(Math.min(swing,9999))});
    if(puz.length>=TARGET)break;}
  if(games%40===0)console.error(OUT+' g='+games+' puz='+puz.length+' t='+Math.round((Date.now()-t0)/1000));}
console.error(OUT+' DONE g='+games+' puz='+puz.length);RES=JSON.stringify(puz);`;
vm.runInContext(gen,ctx);fs.writeFileSync(OUT,ctx.RES);
