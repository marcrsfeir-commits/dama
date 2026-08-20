const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script type="text\/js-worker" id="wsrc">([\s\S]*?)<\/script>/);
let eng=m[1].replace(/self\.onmessage[\s\S]*$/,'');   // drop the worker message handler
const ctx={performance:performance,Math:Math,console:console};
vm.createContext(ctx);
vm.runInContext(eng,ctx);
// generator code runs in same context so it sees engine funcs
const gen=`
function keyOf(mv){return mv.from[0]+','+mv.from[1]+','+mv.to[0]+','+mv.to[1];}
function fenOf(b){let s='';for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];s+=p?(p.player===1?(p.king?'L':'l'):(p.king?'D':'d')):'.';}return s;}
function rootEval(b,player,depth){const other=player===1?2:1;const moves=allMoves(b,player);
  const out=moves.map(mv=>({mv,val:-nega(makeMove(b,mv),other,depth-1,-Infinity,Infinity,Infinity)}));
  out.sort((a,b)=>b.val-a.val);return out;}
function pickTopK(b,player,depth,k){const sc=rootEval(b,player,depth);const kk=Math.min(k,sc.length);return sc[Math.floor(Math.random()*kk)].mv;}
function selfPlay(maxPlies){let b=initialBoard(),player=1;const pos=[];
  for(let ply=0;ply<maxPlies;ply++){const moves=allMoves(b,player);if(!moves.length)break;
    const forced=moves[0].captured!=null;
    if(!forced)pos.push({board:clone(b),player});
    let mv;const rr=Math.random();
    if(forced){mv=moves[Math.floor(Math.random()*moves.length)];}
    else if(rr<0.5){mv=rootEval(b,player,5)[0].mv;}
    else if(rr<0.82){mv=pickTopK(b,player,4,3);}
    else{mv=moves[Math.floor(Math.random()*moves.length)];}
    b=makeMove(b,mv);player=player===1?2:1;}
  return pos;}
function themeOf(b,mv,best){const p=b[mv.from[0]][mv.from[1]];const cap=mv.captured?mv.captured.length:0;
  if(best>=90000)return'Winning shot';
  if(cap>=3)return'Grand slam';
  if(cap===2)return'Combination';
  if(cap===1)return'Win material';
  const backRow=p.player===1?0:7;if(!p.king&&mv.to[0]===backRow)return'Promotion';
  return'Squeeze';}
const DEPTH=7, SWING_MIN=115, MAXACC=3, TARGET=120;
const seen=new Set();const puzzles=[];const t0=Date.now();let games=0;
while(puzzles.length<TARGET && (Date.now()-t0)<500000){
  games++;const pos=selfPlay(46);
  for(const P of pos){
    if((Date.now()-t0)>500000)break;
    const fen=fenOf(P.board);if(seen.has(fen+P.player))continue;seen.add(fen+P.player);
    const moves=allMoves(P.board,P.player);if(moves.length<2)continue;
    // quick shallow prefilter to skip obviously flat positions
    const sh=rootEval(P.board,P.player,4);if(sh[0].val-sh[1].val<60)continue;
    const sc=rootEval(P.board,P.player,DEPTH);
    const best=sc[0].val, second=sc[1].val, swing=best-second;
    if(swing<SWING_MIN)continue;
    const bestMv=sc[0].mv; const cap=bestMv.captured?bestMv.captured.length:0;
    const p=P.board[bestMv.from[0]][bestMv.from[1]];const backRow=p.player===1?0:7;
    const isPromo=!p.king&&bestMv.to[0]===backRow;
    if(cap===0 && !isPromo && best<90000 && swing<380)continue; // require a real point unless a big squeeze
    const acc=sc.filter(x=>x.val>=best-22).map(x=>keyOf(x.mv));
    if(acc.length>MAXACC)continue;
    let diff;if(best>=90000)diff='hard';else if(swing<260)diff='easy';else if(swing<560)diff='medium';else diff='hard';
    puzzles.push({fen,side:P.player,acc:Array.from(new Set(acc)),theme:themeOf(P.board,bestMv,best),diff,swing:Math.round(Math.min(swing,9999))});
    if(puzzles.length>=TARGET)break;
  }
  if(games%15===0)console.error('games='+games+' puzzles='+puzzles.length+' t='+Math.round((Date.now()-t0)/1000)+'s');
}
const byd={easy:0,medium:0,hard:0};puzzles.forEach(p=>byd[p.diff]++);
console.error('DONE games='+games+' puzzles='+puzzles.length+' '+JSON.stringify(byd));
GLOBAL_RESULT=JSON.stringify(puzzles);
`;
vm.runInContext(gen,ctx);
fs.writeFileSync('puzzles.json',ctx.GLOBAL_RESULT);
console.error('wrote puzzles.json '+ctx.GLOBAL_RESULT.length+' bytes');
