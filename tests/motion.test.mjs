import assert from 'node:assert/strict';
import {makeSchedule,moveItem,eased,animationKeys,makePath} from '../dist/motion.mjs';
import {trace} from '../dist/trace.mjs';
const chains=[{id:0,length:1000},{id:1,length:20},{id:2,length:10},{id:3,length:40}];
const groups=[{id:'b',strokes:[0],together:false},{id:'a',strokes:[1,2],together:true},{id:'c',strokes:[3],together:false}];
for(const overlap of [0,.2,.9]){const timeline=makeSchedule(groups,chains,overlap);assert.equal(Math.max(...timeline.map(t=>t.end)),1);assert.ok(timeline.every(t=>t.start>=0&&t.end<=1));assert.equal(timeline[1].start,timeline[2].start);assert.equal(timeline[1].end,timeline[2].end);for(const t of timeline)for(const hold of [0,1]){const keys=animationKeys(t,4,hold);assert.equal(keys.times.length,keys.values.length);assert.equal(keys.times[0],0);assert.equal(keys.times.at(-1),1);assert.ok(keys.times.every((v,i)=>i===0||v>=keys.times[i-1]));}}
const schedule=makeSchedule(groups,chains,0);assert.ok(schedule[2].end<=schedule[3].start);
const moved=moveItem(groups,'a',0);assert.equal(moved[0].id,'a');assert.deepEqual(moved[0].strokes,[1,2]);assert.equal(groups[0].id,'b');
assert.ok(Math.abs(eased(.5,'ease')-.5)<1e-5);assert.ok(eased(.1,'ease')<.1);assert.ok(eased(.9,'ease')>.9);
assert.match(makePath([[0,0],[10,10],[20,0]],.5),/Q/);
const w=80,h=80,mask=new Uint8Array(w*h);for(let y=10;y<70;y++)for(let x=30;x<46;x++)mask[y*w+x]=1;assert.equal(trace(mask,w,h).length,1);
// A very long one-pixel stroke used to exceed the function argument limit.
const n=720,snake=new Uint8Array(n*n);for(let row=2;row<n-2;row+=3){for(let x=2;x<n-2;x++)snake[row*n+x]=1;const x=((row-2)/3)%2===0?n-3:2;for(let y=row+1;y<=Math.min(row+3,n-3);y++)snake[y*n+x]=1;}assert.ok(trace(snake,n,n,{cleanup:0}).length>0);
console.log('PASS: grouped a timing, high-overlap completion, stable reordering, export keyframes, easing, curved paths, tracing, long-stroke recovery.');
