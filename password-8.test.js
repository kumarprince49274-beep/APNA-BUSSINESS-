import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {register} from '../src/auth.js';
test('8 character password allowed, 7 rejected',()=>{
 const db=openDatabase(':memory:');
 assert.ok(register(db,{name:'A',email:'a8@example.com',password:'abcd1234'}));
 assert.throws(()=>register(db,{name:'B',email:'b7@example.com',password:'abc1234'}),/8/);
 db.close();
});
