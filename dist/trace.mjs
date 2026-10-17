// Independent binary skeleton tracing, distance field, and path simplification.
export function distanceField(mask,w,h){
 const f=new Float64Array(w*h),tmp=new Float64Array(w*h),out=new Float64Array(w*h);for(let i=0;i<f.length;i++)f[i]=mask[i]?1e12:0;
 function edt(a,n){const v=new Int32Array(n),z=new Float64Array(n+1),d=new Float64Array(n);let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;for(let q=1;q<n;q++){let s;do{s=((a[q]+q*q)-(a[v[k]]+v[k]*v[k]))/(2*(q-v[k]));if(s<=z[k])k--;else break;}while(k>=0);if(k<0){k=0;v[0]=q;z[0]=-Infinity;z[1]=Infinity;}else{k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}}k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])**2+a[v[k]];}return d;}
 for(let y=0;y<h;y++)tmp.set(edt(f.subarray(y*w,(y+1)*w),w),y*w);for(let x=0;x<w;x++){const a=new Float64Array(h);for(let y=0;y<h;y++)a[y]=tmp[y*w+x];const d=edt(a,h);for(let y=0;y<h;y++)out[y*w+x]=Math.sqrt(d[y]);}return out;
}
export function thin(input,w,h){const a=Uint8Array.from(input);let changed=true,iteration=0;while(changed&&iteration++<Math.max(w,h)){changed=false;for(let phase=0;phase<2;phase++){const remove=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!a[i])continue;const p=[a[i-w],a[i-w+1],a[i+1],a[i+w+1],a[i+w],a[i+w-1],a[i-1],a[i-w-1]];const b=p.reduce((s,v)=>s+v,0);if(b<2||b>6)continue;let transitions=0;for(let j=0;j<8;j++)if(!p[j]&&p[(j+1)%8])transitions++;if(transitions!==1)continue;if(phase===0?(p[0]*p[2]*p[4]||p[2]*p[4]*p[6]):(p[0]*p[2]*p[6]||p[0]*p[4]*p[6]))continue;remove.push(i);}for(const i of remove)a[i]=0;if(remove.length)changed=true;}}return a;}
export function simplify(pts,tolerance){if(pts.length<3)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const stack=[[0,pts.length-1]];while(stack.length){const [a,b]=stack.pop(),p=pts[a],q=pts[b];let max=tolerance*tolerance,index=-1;const dx=q[0]-p[0],dy=q[1]-p[1],den=dx*dx+dy*dy;for(let i=a+1;i<b;i++){const r=pts[i],t=den?Math.max(0,Math.min(1,((r[0]-p[0])*dx+(r[1]-p[1])*dy)/den)):0;const d=(r[0]-p[0]-t*dx)**2+(r[1]-p[1]-t*dy)**2;if(d>max){max=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}return pts.filter((_,i)=>keep[i]);}
export function trace(mask,w,h,{cleanup=1,tolerance=.7,pen=1.18}={}){
 const radius=distanceField(mask,w,h),skeleton=thin(mask,w,h),adj=new Map();
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!skeleton[i])continue;const ns=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const j=i+dy*w+dx;if(!skeleton[j])continue;if(dx&&dy&&(skeleton[i+dx]||skeleton[i+dy*w]))continue;ns.push(j);}adj.set(i,ns);}
 const used=new Set(),raw=[],key=(a,b)=>a<b?a+':'+b:b+':'+a;
 function walk(start,next){const path=[start];let prev=start,cur=next;used.add(key(prev,cur));let guard=0;while(guard++<w*h){path.push(cur);const ns=adj.get(cur)||[];if(cur===start||ns.length!==2)break;const n=ns[0]===prev?ns[1]:ns[0];if(used.has(key(cur,n)))break;used.add(key(cur,n));prev=cur;cur=n;}return path;}
 for(const [i,ns]of adj){if(ns.length!==2)for(const n of ns)if(!used.has(key(i,n)))raw.push(walk(i,n));if(ns.length===0)raw.push([i]);}
 for(const [i,ns]of adj)for(const n of ns)if(!used.has(key(i,n)))raw.push(walk(i,n));
 const build=(indices,terminal)=>{let length=0;const pts=indices.map(i=>[i%w,Math.floor(i/w)]);for(let j=1;j<pts.length;j++)length+=Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]);return {indices,points:simplify(pts,tolerance),length,width:indices.reduce((max,i)=>Math.max(max,radius[i]),0)*2+3,terminal};};
 let paths=raw.map(indices=>build(indices,(()=>{const a=(adj.get(indices[0])||[]).length,b=(adj.get(indices.at(-1))||[]).length;return (a<=1||b<=1)&&!(a<=1&&b<=1);})()));
 // Only a spur (one free end, one end at a junction) is cleaned up; a stroke with two free ends is a whole shape, such as an i-dot.
 const kept=paths.filter(p=>!p.terminal||p.length>=cleanup*p.width*.5);if(kept.length)paths=kept;else if(paths.length)paths=[paths.reduce((a,b)=>a.length>b.length?a:b)];
 paths=addSpurs(paths,mask,w,h,pen,build,i=>(adj.get(i)||[]).length<=1);
 paths=assignReach(paths,mask,w,h);
 return paths.map(p=>({...p,points:p.points.length===1?[p.points[0],[p.points[0][0]+.01,p.points[0][1]]]:p.points}));
}
// Distance from every pixel to the nearest stroke pixel, and which stroke that is (two-pass chamfer propagation).
function nearestStroke(paths,w,h){const n=w*h,dist=new Float32Array(n).fill(Infinity),label=new Int32Array(n).fill(-1),d2=Math.SQRT2;paths.forEach((p,k)=>{for(const i of p.indices){dist[i]=0;label[i]=k;}});
const relax=(i,j,step)=>{const d=dist[j]+step;if(d<dist[i]){dist[i]=d;label[i]=label[j];}};
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(x>0)relax(i,i-1,1);if(y>0){relax(i,i-w,1);if(x>0)relax(i,i-w-1,d2);if(x<w-1)relax(i,i-w+1,d2);}}
for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(x<w-1)relax(i,i+1,1);if(y<h-1){relax(i,i+w,1);if(x<w-1)relax(i,i+w+1,d2);if(x>0)relax(i,i+w-1,d2);}}
return {dist,label};}
// Thinning never grows a branch into a convex corner, so a pen of the stroke's width leaves every corner and sharp tip uncovered until the shape is completed in one go.
// For each pocket of pixels the pen cannot reach, the nearest stroke is made to go there itself: a free end is extended straight on when that covers the pocket (the end of a bar),
// otherwise a spur runs from the nearest stroke pixel to the pocket's farthest pixel (a sharp tip), splitting the stroke there so the spur stays attached.
function addSpurs(paths,mask,w,h,pen,build,free,limit=24){if(!paths.length||!(pen>0))return paths;const n=w*h,{dist,label}=nearestStroke(paths,w,h),seen=new Uint8Array(n),pockets=[];
const need=k=>paths[k].width*pen/2,margin=k=>Math.max(1.5,paths[k].width*.03),xy=i=>[i%w,Math.floor(i/w)],far=(i,j)=>{const a=xy(i),b=xy(j);return Math.hypot(a[0]-b[0],a[1]-b[1]);};
for(let s=0;s<n;s++){if(seen[s]||!mask[s]||label[s]<0||dist[s]<=need(label[s])+margin(label[s]))continue;const stack=[s],cells=[];seen[s]=1;let top=s;while(stack.length){const i=stack.pop();cells.push(i);if(dist[i]>dist[top])top=i;const [x,y]=xy(i);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx;if(seen[j]||!mask[j]||label[j]<0||dist[j]<=need(label[j])+margin(label[j]))continue;seen[j]=1;stack.push(j);}}
if(cells.length>=3)pockets.push({far:top,excess:dist[top]-need(label[top])});}
if(!pockets.length)return paths;pockets.sort((a,b)=>b.excess-a.excess);
const splits=paths.map(()=>new Set()),extend=paths.map(()=>[0,0]),spurs=[];// {k, end|pixel, far}
for(const pocket of pockets.slice(0,limit)){const k=label[pocket.far],p=paths[k],indices=p.indices,r=need(k),[fx,fy]=xy(pocket.far);let at=0,best=Infinity;indices.forEach((i,j)=>{const d=(i%w-fx)**2+(Math.floor(i/w)-fy)**2;if(d<best){best=d;at=j;}});
// Attach to a free end when the nearest pixel is within a pen radius of it; a split so close to an end would leave a stub.
let arc=0;for(let j=1;j<=at;j++)arc+=far(indices[j],indices[j-1]);let tail=0;for(let j=at+1;j<indices.length;j++)tail+=far(indices[j],indices[j-1]);
const end=arc<=r?0:tail<=r?1:-1;
if(end>=0){const e=end?indices.length-1:0,pts=p.points,[ex,ey]=xy(indices[e]),from=end?pts[Math.max(0,pts.length-2)]:pts[Math.min(1,pts.length-1)];let dx=ex-from[0],dy=ey-from[1];const len=Math.hypot(dx,dy);
// Extending the end straight on covers the pocket when it lies within the pen's sweep; extend just far enough that the pen's cap holds the farthest pixel.
if(free(indices[e])&&len){dx/=len;dy/=len;const along=(fx-ex)*dx+(fy-ey)*dy,perp=Math.abs((fx-ex)*dy-(fy-ey)*dx),cover=r-margin(k);if(perp<=cover){const t=along-Math.sqrt(cover*cover-perp*perp);if(t>0)extend[k][end]=Math.max(extend[k][end],t);continue;}}
spurs.push({k,end,far:pocket.far});continue;}
splits[k].add(at);spurs.push({k,pixel:indices[at],far:pocket.far});}
const out=[];paths.forEach((p,k)=>{const cuts=[...splits[k]].sort((a,b)=>a-b),segments=[];let from=0;for(const cut of [...cuts,p.indices.length-1]){if(cut>from)segments.push(p.indices.slice(from,cut+1));from=cut;}if(!segments.length)segments.push(p.indices);
const grow=(indices,end,t)=>{const e=end?indices.length-1:0,[ex,ey]=xy(indices[e]),pts=p.points,from=end?pts[Math.max(0,pts.length-2)]:pts[Math.min(1,pts.length-1)],len=Math.hypot(ex-from[0],ey-from[1]);if(!len)return indices;const tx=Math.max(0,Math.min(w-1,Math.round(ex+(ex-from[0])/len*t))),ty=Math.max(0,Math.min(h-1,Math.round(ey+(ey-from[1])/len*t))),ext=line(indices[e],ty*w+tx,w).slice(1);return end?indices.concat(ext):ext.reverse().concat(indices);};
if(extend[k][0]>0)segments[0]=grow(segments[0],0,extend[k][0]);if(extend[k][1]>0)segments[segments.length-1]=grow(segments[segments.length-1],1,extend[k][1]);
// A spur hanging off a free end starts at the extended end, so it stays attached to its stroke.
for(const s of spurs)if(s.k===k&&s.end>=0)s.pixel=s.end?segments.at(-1).at(-1):segments[0][0];
for(const s of segments)out.push(segments.length>1||s!==p.indices?build(s,segments.length>1?false:p.terminal):p);});
// The spur is drawn by the same pen as its stroke, so it is at least as wide.
for(const s of spurs){const px=line(s.pixel,s.far,w);if(px.length<2)continue;const spur=build(px,true);spur.width=Math.max(spur.width,paths[s.k].width);out.push(spur);}return out;}
function line(a,b,w){const x0=a%w,y0=(a-x0)/w,x1=b%w,y1=(b-x1)/w,steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)),out=[];for(let s=0;s<=steps;s++){const t=steps?s/steps:0,i=Math.round(y0+(y1-y0)*t)*w+Math.round(x0+(x1-x0)*t);if(i!==out.at(-1))out.push(i);}return out;}
// How far each stroke's pen must reach to cover every pixel closest to it (corners, flares, sharp tips).
function assignReach(paths,mask,w,h){const n=w*h,{dist,label}=nearestStroke(paths,w,h);
const reach=new Float32Array(paths.length);for(let i=0;i<n;i++)if(mask[i]&&label[i]>=0&&dist[i]>reach[label[i]])reach[label[i]]=dist[i];
return paths.map((p,k)=>{const {indices,...rest}=p;return {...rest,reach:reach[k]+1.5};});}
