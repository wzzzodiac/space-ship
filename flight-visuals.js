// Presentation only. No gameplay RNG, physics updates, timers or animation loops.
// Two background plates and weakly held asteroid sprites keep per-frame work small.
const FlightVisuals = (() => {
  const plates = new Map();
  const rocks = new WeakMap();
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const tau = Math.PI * 2;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function path(ctx, points) {
    ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
  }

  function backgroundPlate(mode) {
    if (plates.has(mode)) return plates.get(mode);
    const plate = document.createElement('canvas'); plate.width = 900; plate.height = 620;
    const c = plate.getContext('2d'), hot = mode === 'hardcore';
    c.fillStyle = '#03080e'; c.fillRect(0,0,900,620);
    const nebula = c.createRadialGradient(140,440,0,140,440,720);
    nebula.addColorStop(0, hot ? '#2b191522' : '#16333b70');
    nebula.addColorStop(.5, hot ? '#351b2025' : '#162b432a');
    nebula.addColorStop(1,'#00000000');c.fillStyle=nebula;c.fillRect(0,0,900,620);
    // Small distant points have no relationship to asteroid spawn positions.
    for(let n=0;n<250;n++) {
      c.fillStyle = `rgba(164,187,207,${.08+hash(n+14)*.20})`;
      c.fillRect(hash(n)*900,hash(n+600)*620,hash(n+29)>.98?1.4:.6,.7);
    }
    // A low-contrast planetary limb gives scale without competing with foreground debris.
    c.save();c.translate(710,45);const radius=196;
    const atmosphere=c.createRadialGradient(-14,0,radius-3,0,0,radius+28);
    atmosphere.addColorStop(0,'#00000000');atmosphere.addColorStop(.25,hot?'#b46b371c':'#76a8c125');atmosphere.addColorStop(1,'#00000000');
    c.fillStyle=atmosphere;c.beginPath();c.arc(0,0,radius+28,0,tau);c.fill();
    c.beginPath();c.arc(0,0,radius,0,tau);c.clip();
    const sphere=c.createRadialGradient(-128,-130,6,12,16,310);
    sphere.addColorStop(0,hot?'#795a42':'#617785');sphere.addColorStop(.45,hot?'#3a3028':'#283e4d');sphere.addColorStop(.80,'#070e17');sphere.addColorStop(1,'#03060c');
    c.fillStyle=sphere;c.fillRect(-radius,-radius,radius*2,radius*2);
    for(let n=0;n<450;n++){
      const x=(hash(n+70)*2-1)*radius,y=(hash(n+470)*2-1)*radius,r=2+hash(n+810)*18;
      c.fillStyle=`rgba(1,5,11,${.04+hash(n+66)*.12})`;c.beginPath();c.ellipse(x,y,r,r*.57,-.4,0,tau);c.fill();
    }
    const shadow=c.createLinearGradient(-160,-100,150,110);shadow.addColorStop(0,'#00000000');shadow.addColorStop(.48,'#03081170');shadow.addColorStop(.73,'#03070df8');shadow.addColorStop(1,'#03070d');c.fillStyle=shadow;c.fillRect(-radius,-radius,radius*2,radius*2);
    c.restore();
    // Barely visible reference marks stay outside the central flight path.
    c.strokeStyle='#a1bfd61c';c.lineWidth=1;
    for(let y=36;y<620;y+=45){c.beginPath();c.moveTo(12,y);c.lineTo(17+(y%2)*4,y);c.moveTo(888,y);c.lineTo(881,y);c.stroke();}
    plates.set(mode,plate);return plate;
  }

  function background(ctx,state) {
    ctx.drawImage(backgroundPlate(state.mode),0,0);
    for(const s of state.stars){
      const trail = state.running && !reducedMotion.matches ? 1 + (s.v/65)*Math.min(5,1+state.elapsed/18) : 1;
      ctx.fillStyle=`rgba(192,218,236,${s.a*.64})`;
      ctx.fillRect(s.x,s.y,Math.max(.7,s.s*.65),s.s+trail);
    }
    const vignette=ctx.createRadialGradient(450,280,180,450,310,610);
    vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#00000070');ctx.fillStyle=vignette;ctx.fillRect(0,0,900,620);
  }

  function asteroidSprite(a) {
    if(rocks.has(a))return rocks.get(a);
    const extent=Math.ceil(a.r*1.25+4),size=extent*2;
    const sprite=document.createElement('canvas');sprite.width=size;sprite.height=size;
    const c=sprite.getContext('2d');c.translate(extent,extent);
    const points=a.vertices.map(v=>[Math.cos(v.a)*a.r*v.m,Math.sin(v.a)*a.r*v.m]);
    path(c,points);c.save();c.clip();
    const base=c.createLinearGradient(-a.r,-a.r,a.r,a.r);
    base.addColorStop(0,'#b3a38b');base.addColorStop(.35,'#796f61');base.addColorStop(.72,'#494947');base.addColorStop(1,'#272e32');c.fillStyle=base;c.fillRect(-extent,-extent,size,size);
    const center=[-a.r*.12,a.r*.05];
    points.forEach((p,i)=>{
      path(c,[center,p,points[(i+1)%points.length]]);
      c.fillStyle=i<4?`rgba(7,15,23,${.12+hash(i+a.r)*.20})`:`rgba(234,221,192,${.03+hash(i+a.r)*.17})`;c.fill();
    });
    for(let n=0;n<95;n++){
      const x=(hash(n+a.r)*2-1)*a.r,y=(hash(n+130+a.r)*2-1)*a.r;
      c.fillStyle=`rgba(8,12,16,${.08+hash(n+180)*.17})`;c.fillRect(x,y,.5+hash(n+25)*1.5,.7);
    }
    for(let n=0;n<4;n++){
      const x=(hash(n*7+a.r)*1.1-.55)*a.r,y=(hash(n*9+a.r+80)*1.1-.55)*a.r,r=a.r*(.08+hash(n+30)*.13);
      const crater=c.createRadialGradient(x-r*.2,y-r*.2,r*.05,x,y,r);
      crater.addColorStop(0,'#151b20ad');crater.addColorStop(.7,'#22272866');crater.addColorStop(1,'#cfc0a030');
      c.fillStyle=crater;c.beginPath();c.arc(x,y,r,0,tau);c.fill();
    }
    c.restore();path(c,points);c.strokeStyle='#050a10';c.lineWidth=3.5;c.stroke();
    path(c,points);c.strokeStyle='#b6b0a1';c.lineWidth=1.1;c.stroke();
    const result={canvas:sprite,extent};rocks.set(a,result);return result;
  }
  function asteroid(ctx,a) {const s=asteroidSprite(a);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.rot);ctx.drawImage(s.canvas,-s.extent,-s.extent);ctx.restore();}

  function ship(ctx,state) {
    if(state.invulnerable>0&&Math.floor(state.invulnerable*12)%2===0)return;
    const s=state.ship,hot=state.mode==='hardcore';ctx.save();ctx.translate(s.x,s.y);
    // Cosmetic bank only: original nose, wings and collision circle are unchanged.
    const bank=Math.max(-.10,Math.min(.10,(s.targetX-s.x)*.0018));ctx.rotate(bank);
    const thrust=state.running?14+Math.sin(state.elapsed*31)*2+Math.sin(state.elapsed*19)*1.5:6;
    for(const x of [-8,8]){
      const plume=ctx.createLinearGradient(x,14,x,32+thrust);plume.addColorStop(0,'#f0fff1');plume.addColorStop(.25,hot?'#ffad65':'#8acde9');plume.addColorStop(1,'#5389be00');
      ctx.fillStyle=plume;path(ctx,[[x-2.5,14],[x+2.5,14],[x+1,29+thrust],[x,34+thrust],[x-1,29+thrust]]);ctx.fill();
    }
    const shape=[[0,-24],[18,18],[7,13],[0,21],[-7,13],[-18,18]];
    const hull=ctx.createLinearGradient(-18,-15,20,15);hull.addColorStop(0,'#6d8594');hull.addColorStop(.46,'#e3e9e9');hull.addColorStop(.49,'#8099a8');hull.addColorStop(.78,'#425766');hull.addColorStop(1,'#afc1c9');
    path(ctx,shape);ctx.fillStyle=hull;ctx.fill();ctx.strokeStyle='#020711';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#d4e7ed';ctx.lineWidth=1;ctx.stroke();
    path(ctx,[[0,-19],[-3,-4],[-3,8],[0,10],[3,8],[3,-4]]);ctx.fillStyle=hot?'#cf8065':'#86d9e6';ctx.fill();ctx.strokeStyle='#152d3c';ctx.lineWidth=1;ctx.stroke();
    ctx.strokeStyle='#243849';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*4,-9);ctx.lineTo(side*7,12);ctx.lineTo(side*15,15);ctx.stroke();ctx.fillStyle='#213746';ctx.fillRect(side*8-2,11,4,8);ctx.fillStyle='#e8faf8';ctx.fillRect(side*15,13,2,2);}
    if(state.noclip){ctx.strokeStyle='#cbb8e688';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(0,0,30,0,tau);ctx.stroke();}
    ctx.restore();
  }

  function repair(ctx,r) {
    ctx.save();ctx.translate(r.x,r.y);const pulse=reducedMotion.matches?1:1+Math.sin(r.pulse)*.06;ctx.scale(pulse,pulse);
    path(ctx,[[0,-18],[18,0],[0,18],[-18,0]]);ctx.fillStyle='#081916';ctx.fill();ctx.strokeStyle='#060a0f';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#a6deac';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#d0efd2';ctx.fillRect(-2.5,-8,5,16);ctx.fillRect(-8,-2.5,16,5);ctx.restore();
  }

  function overlay(ctx,state) {
    if(state.running&&!state.paused||state.collapsing)return;
    const x=450,y=300;ctx.save();
    ctx.fillStyle=state.gameOver?'#03070bcc':'#03070b66';ctx.fillRect(0,0,900,620);ctx.textAlign='center';
    ctx.fillStyle='#b0c9d3';ctx.font='10px ui-monospace, monospace';ctx.fillText(state.gameOver?'FLIGHT RECORDER / SIGNAL LOST':state.paused?'SIMULATION / ON HOLD':'ASTEROID AVOIDANCE / FLIGHT LAB',x,y-62);
    ctx.fillStyle='#e0e9ee';ctx.font='300 38px system-ui, sans-serif';ctx.fillText(state.gameOver?'Hull lost.':state.paused?'Flight held.':state.mode==='nohope'?'There is no way out.':'Find your way through.',x,y-10);
    ctx.fillStyle='#99adb9';ctx.font='12px ui-monospace, monospace';ctx.fillText(state.gameOver?`${state.score} DODGED  /  START TO RETRY`:state.paused?'RESUME WHEN READY':'MOVE TO STEER. STAY IN ONE PIECE.',x,y+24);
    ctx.strokeStyle='#7898a05c';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*245,y-42);ctx.lineTo(x+side*255,y-42);ctx.lineTo(x+side*255,y+13);ctx.lineTo(x+side*245,y+13);ctx.stroke();}ctx.restore();
  }
  return {background,asteroid,ship,repair,overlay};
})();
