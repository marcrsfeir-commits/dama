const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const eng=html.match(/<script type="text\/js-worker" id="wsrc">([\s\S]*?)<\/script>/)[1].replace(/self\.onmessage[\s\S]*$/,'');
const ctx={performance:performance,Math:Math,console:console};
vm.createContext(ctx);vm.runInContext(eng,ctx);
const test=`
var errors=[];
function E(msg){ if(errors.length<40) errors.push(msg); }
function validBoard(b){var n1=0,n2=0;for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=b[r][c];if(!p)continue;
  if(p.player!==1&&p.player!==2)E('bad player');
  if(!p.king&&((p.player===1&&r===0)||(p.player===2&&r===7)))E('man on promo row not king @'+r+','+c);
  if(p.player===1)n1++;else n2++;}
  if(n1>16||n2>16)E('too many pieces '+n1+'/'+n2);}
var games=0,plies=0,capChecks=0;
var t0=Date.now();
while(Date.now()-t0<45000){games++;var b=initialBoard(),pl=1,steps=0;
  var posc={};
  while(steps<400){
    var lg=computeLegal(b,pl);
    var keys=Object.keys(lg.moves);
    if(!keys.length)break;                       // terminal
    // invariant: mandatory capture
    var anyCapExists=false;
    for(var r=0;r<8;r++)for(var c=0;c<8;c++){var p=b[r][c];if(p&&p.player===pl){if(captureSequences(b,r,c).length){anyCapExists=true;}}}
    if(anyCapExists && !lg.mustCapture) E('capture available but mustCapture false');
    if(!anyCapExists && lg.mustCapture) E('mustCapture true but no capture');
    // build move list
    var list=[];keys.forEach(function(k){var pp=k.split(',').map(Number);lg.moves[k].forEach(function(m){list.push({from:pp,to:[m.r,m.c],captured:m.captured,path:m.path});});});
    // if mustCapture, every listed move must be a capture; else none are
    list.forEach(function(mv){
      if(lg.mustCapture && !mv.captured) E('non-capture listed under mustCapture');
      if(!lg.mustCapture && mv.captured) E('capture listed under non-capture');
      // dest must be empty & on board
      if(mv.to[0]<0||mv.to[0]>7||mv.to[1]<0||mv.to[1]>7) E('dest offboard');
      else if(b[mv.to[0]][mv.to[1]]) E('dest occupied');
      // captured cells must be enemy
      if(mv.captured)mv.captured.forEach(function(cp){var q=b[cp.r][cp.c];if(!q)E('capture empty');else if(q.player===pl)E('capture own piece');});
    });
    // king-capture priority
    if(lg.mustCapture){
      var canTakeKing=false;
      keys.forEach(function(k){lg.moves[k].forEach(function(m){if(m.captured&&m.captured.some(function(cp){var q=b[cp.r][cp.c];return q&&q.king;}))canTakeKing=true;});});
      if(canTakeKing){ keys.forEach(function(k){lg.moves[k].forEach(function(m){ if(!(m.captured&&m.captured.some(function(cp){var q=b[cp.r][cp.c];return q&&q.king;}))) E('king-capture available but non-king-capture offered'); });}); capChecks++; }
    }
    // pick a move, apply, validate
    var mv=list[Math.floor(Math.random()*list.length)];
    b=makeMove(b,mv); validBoard(b);
    pl=pl===1?2:1; steps++; plies++;
  }
}
RESULT=JSON.stringify({games:games,plies:plies,kingPriorityChecks:capChecks,errors:errors});
`;
vm.runInContext(test,ctx);
console.log(ctx.RESULT);
