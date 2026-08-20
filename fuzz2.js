const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const eng=html.match(/<script type="text\/js-worker" id="wsrc">([\s\S]*?)<\/script>/)[1].replace(/self\.onmessage[\s\S]*$/,'');
const ctx={performance:performance,Math:Math,console:console};
vm.createContext(ctx);vm.runInContext(eng,ctx);
const test=`
var realBugs=[], benign=0, pathBugs=0;
function keyC(cap){return cap.r+','+cap.c;}
var t0=Date.now();
while(Date.now()-t0<30000 && realBugs.length<5){
  var b=initialBoard(),pl=1,steps=0;
  while(steps<400){
    var lg=computeLegal(b,pl);var keys=Object.keys(lg.moves);if(!keys.length)break;
    var list=[];keys.forEach(function(k){var pp=k.split(',').map(Number);lg.moves[k].forEach(function(m){list.push({from:pp,to:[m.r,m.c],captured:m.captured,path:m.path});});});
    list.forEach(function(mv){
      if(!mv.captured)return;
      var capSet={};mv.captured.forEach(function(cp){capSet[keyC(cp)]=1;});
      var occ=b[mv.to[0]][mv.to[1]];
      if(occ){
        if(capSet[mv.to[0]+','+mv.to[1]]){ /* landing on a square that WILL be captured this chain? that'd be landing on a captured piece = illegal in most rules */ realBugs.push({type:'land-on-captured',from:mv.from,to:mv.to,captured:mv.captured}); }
        else if(mv.from[0]===mv.to[0]&&mv.from[1]===mv.to[1]){ benign++; } // returned to own start (king loop) - fine
        else { realBugs.push({type:'land-on-uncaptured-piece',from:mv.from,to:mv.to,captured:mv.captured,occ:occ}); }
      }
      // verify makeMove keeps piece count sane
      var nb=makeMove(b,mv);
      var n1=0,n2=0;for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=nb[r][c];if(p){if(p.player===1)n1++;else n2++;}}
      // moving side should lose 0 pieces; other side loses captured.length
      // (rough) just ensure piece on destination exists
      if(!nb[mv.to[0]][mv.to[1]]) pathBugs++;
    });
    var mv=list[Math.floor(Math.random()*list.length)];b=makeMove(b,mv);pl=pl===1?2:1;steps++;
  }
}
RESULT=JSON.stringify({realBugs:realBugs, benignStartReturns:benign, destPieceMissingAfterMove:pathBugs});
`;
vm.runInContext(test,ctx);
console.log(ctx.RESULT);
