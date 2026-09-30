const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('scripts/eko-fallback-efficient.js', 'utf8').split('// Daily price cards')[0];
const row = (location, date, price = 1.8, fuel = 'Дизел') => ({station:'ЕКО', city:'София', location, fuel, price, created_at:date});
const old = '2026-09-29T10:00:00Z';
const older = '2026-09-28T10:00:00Z';
const today = '2026-09-30T10:00:00Z';
async function run(current, history, responseRows = current, offset = 0) {
  const nativeFetch = async input => {
    const url = new URL(input);
    const data = url.searchParams.has('station')
      ? (url.searchParams.getAll('created_at').some(x => x.startsWith('gte.')) ? current : history)
      : responseRows;
    const pageOffset = url.searchParams.has('station') ? Number(url.searchParams.get('offset') || 0) : 0;
    return new Response(JSON.stringify(data.slice(pageOffset, pageOffset + 1000)));
  };
  const window = {fetch:nativeFetch, location:{href:'https://goriva.online/', origin:'https://goriva.online'}};
  vm.runInNewContext(source, {window, document:{getElementById:()=>({})}, Headers, Response, URL, Intl, Date, console});
  const url = new URL('https://example.supabase.co/rest/v1/fuel_prices');
  url.search = new URLSearchParams({created_at:'gte.2026-09-29T21:00:00Z', limit:'1000', offset:String(offset)});
  url.searchParams.append('created_at', 'lt.2026-09-30T21:00:00Z');
  return (await window.fetch(url.href, {headers:{apikey:'test'}})).json();
}
test('partial import retains missing objects without replacing current prices', async () => {
  const result = await run([row('1001',today,2)], [row('1001',old),row('1002',old),row('1002',older,1.6),row('1003',older)]);
  assert.deepEqual(result.map(x=>[x.location,x.price]), [['1001',2],['1002',1.8],['1003',1.8]]);
  assert.equal(result[1]._source_created_at,old);
  assert.equal(result[2]._eko_fallback_date,'2026-09-28');
});
test('no upload today retains latest prices per object and fuel across history pages', async () => {
  const history = [...Array.from({length:1000},()=>row('1001',old)),row('1002',older),row('1002',older,0.8,'LPG')];
  const result = await run([],history);
  assert.equal(result.length,3);
  assert.ok(result.every(x=>x._eko_fallback));
});
test('current objects on earlier pages do not get historical duplicates', async () => {
  const current = [...Array.from({length:1000},()=>row('1001',today)),row('1002',today,2)];
  const result = await run(current,[row('1001',old),row('1002',old),row('1003',older)],[],2000);
  assert.deepEqual(result.map(x=>x.location),['1003']);
});
test('empty history leaves current prices intact', async () => {
  assert.equal((await run([row('1001',today)],[])).length,1);
});
