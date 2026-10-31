import test from 'node:test';
import assert from 'node:assert/strict';
import { inferProjectSiteUrl, selectRepos } from './build.mjs';
test('homepage URLs only permit HTTP(S)', () => {
  assert.equal(inferProjectSiteUrl({name:'test',homepage:'javascript:alert(1)',html_url:'https://github.com/org/test'},'org'),'https://github.com/org/test');
  assert.equal(inferProjectSiteUrl({name:'test',homepage:'https://example.com'},'org'),'https://example.com/');
});
test('successful API results do not resurrect removed curated entries', () => {
  assert.deepEqual(selectRepos([], [{name:'old'}], 'self', false), []);
  assert.deepEqual(selectRepos([{name:'archived',archived:true}], [{name:'archived'}], 'self', false), []);
});
test('failed API uses curated entries while excluding the current repository', () => {
  assert.deepEqual(selectRepos([], [{name:'self'},{name:'other'}], 'self', true).map(r=>r.name), ['other']);
});
