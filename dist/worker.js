import {trace} from './trace.mjs';
self.onmessage=e=>{try{const {mask,w,h,options,id}=e.data;self.postMessage({id,paths:trace(mask,w,h,options)});}catch(err){self.postMessage({id,error:err.message});}};
