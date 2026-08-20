const fs=require('fs');const vm=require('vm');
const h=fs.readFileSync('index.html','utf8');
const eng=h.match(/<script type="text\/js-worker" id="wsrc">([\s\S]*?)<\/script>/)[1].replace(/self\.onmessage[\s\S]*$/,'');
const ctx={performance:performance,Math:Math,console:console};vm.createContext(ctx);vm.runInContext(eng,ctx);
const code=`
var b=initialBoard(),pl=1,ok=true,moves=0,t0=Date.now();
for(var i=0;i<30;i++){ var lg=computeLegal(b,pl); var keys=Object.keys(lg.moves); if(!keys.length)break;
  var mv=search(b,pl,300,20); if(!mv){ok=false;break;}
  // verify mv is legal
  var legalset={}; keys.forEach(function(k){var pp=k.split(',');lg.moves[k].forEach(function(m){legalset[pp[0]+','+pp[1]+','+m.r+','+m.c]=1;});});
  if(!legalset[mv.from[0]+','+mv.from[1]+','+mv.to[0]+','+mv.to[1]]){ok=false;console.error('ILLEGAL move at ply '+i);break;}
  b=makeMove(b,mv); pl=pl===1?2:1; moves++;
}
RES=JSON.stringify({ok:ok, moves:moves, ms:Date.now()-t0, ttSize:Object.keys(TT).length});
`;
vm.runInContext(code,ctx);console.log(ctx.RES);
