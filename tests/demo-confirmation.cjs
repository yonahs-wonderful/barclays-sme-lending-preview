const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
async function test(){
 let current={reference:'RCF-TEST',approved:false,entry_completed:false};let now=0;const jobs=[],messages=[];
 const scope={window:{},Map,Set,Date:{now:()=>now},setTimeout(fn,delay){const job={fn,delay};jobs.push(job);return job;},clearTimeout(job){if(job)job.cancelled=true;}};
 vm.runInNewContext(fs.readFileSync('js/milestone-confirmation.js','utf8'),scope);
 const timer=scope.window.createMilestoneConfirmation(m=>messages.push(m),async()=>{if(current instanceof Error)throw current;return {data:current};});
 const flush=()=>new Promise(setImmediate);const tick=async()=>{now+=3000;const job=jobs.shift();if(job&&!job.cancelled)await job.fn();await flush();};
 const card={type:'claim_lodged',data:{submitted_at:123,claim_ref:'RCF-TEST'}};
 timer.schedule(card);timer.schedule(card);await flush();assert.equal(jobs.length,1);assert.equal(messages.length,0);
 current=new Error('network');await tick();assert.equal(messages.length,0);
 current={reference:'wrong',approved:true,entry_completed:true};await tick();assert.equal(messages.length,0);
 current={reference:'RCF-TEST',approved:false,entry_completed:true};await tick();assert.equal(messages.length,0);
 current={reference:'RCF-TEST',approved:true,entry_completed:false};await tick();assert.equal(messages.length,1);assert.match(messages[0].text,/approved/);
 await tick();assert.equal(messages.length,1);
 current.entry_completed=true;await tick();assert.equal(messages.length,2);assert.match(messages[1].text,/entry in CoreBank is complete/);assert.equal(jobs.length,0);
 timer.schedule(card);await flush();assert.equal(messages.length,2);timer.dispose();
 console.log('PASS: approval then completion; no timer success; network retry; wrong reference blocked; dedupe; polling stops.');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
