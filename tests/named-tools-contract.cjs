const assert=require('node:assert/strict'),fs=require('node:fs'),core=require('../js/live-core.js');
const data=JSON.parse(fs.readFileSync('mock-data.json','utf8'));
const names=['prepare_rcf_application','validate_management_accounts','validate_signed_contract','get_application_status','submit_for_credit_review','resume_application'];
for(const name of names)for(const turn of data.turns){
 const output={Response:{result:{canonical_text:turn.events.map(e=>e.text).join('\n'),rich_content:turn.rich_content}}};
 const event=n=>[{speaker:'system',data:{type:'function_call',function_call:{name:n,output}}},{speaker:'agent',data:{type:'text',text:'paraphrase'}}];
 assert.deepEqual(core.eventsToTurn(event(name)),core.eventsToTurn(event('lending_step')));
}
console.log('PASS all six names preserve every baseline text/widget payload');
