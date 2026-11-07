import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.BCRYPT_COST = '4';
process.env.ALLOW_DRAW_BEFORE_CLOSE = 'true';
process.env.REGISTRATION_DEADLINE = '2099-01-01T00:00:00+01:00';
process.env.EMAIL_PROVIDER = 'mock';

let mongod;
let uri = process.env.MONGODB_TEST_URI;
let skipReason = null;

try {
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('kingsville_test');
  }
} catch (err) {
  skipReason = `No MongoDB available (${String(err.message).split('\n')[0]})`;
}

describe('Kingsville API (real MongoDB)', { skip: skipReason ?? false }, () => {
  let server;
  let base;
  let token;
  let mongoose;

  const post = (path, body, headers = {}) =>
    fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const get = (path, headers = {}) => fetch(`${base}${path}`, { headers });

  const person = (i) => ({
    name: `Person${String.fromCharCode(65 + (i % 26))} Tester${String.fromCharCode(65 + ((i * 7) % 26))}`,
    phone: `080${String(10000000 + i)}`,
    email: `person${i}@example.com`,
    consent: true,
  });

  before(async () => {
    const { connectDB } = await import('../src/config/db.js');
    const { createApp } = await import('../src/app.js');
    const { Admin } = await import('../src/models/Admin.js');
    const { Participant } = await import('../src/models/Participant.js');
    const { Draw } = await import('../src/models/Draw.js');
    const { Prize } = await import('../src/models/Prize.js');
    const { syncPrizes } = await import('../src/services/prizeService.js');
    const bcrypt = (await import('bcryptjs')).default;
    mongoose = (await import('mongoose')).default;

    await connectDB(uri);
    await Promise.all([Participant.init(), Draw.init(), Prize.init(), Admin.init()]);
    await syncPrizes();
    await Admin.create({ email: 'admin@test.dev', passwordHash: await bcrypt.hash('correct-horse-battery', 4) });

    server = createApp().listen(0);
    base = `http://127.0.0.1:${server.address().port}/api`;
  });

  after(async () => {
    server?.close();
    await mongoose?.disconnect();
    await mongod?.stop();
  });

  test('registers a participant and sends a verification code', async () => {
    const payload = person(1);
    const res = await post('/register', payload);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.requiresVerification, true);
    assert.equal(body.email, payload.email);

    const participant = await (await import('../src/models/Participant.js')).Participant.findOne({ email: payload.email }).lean();
    assert.equal(participant.status, 'pending_verification');
    assert.match(participant.verificationCode, /^\d{4}$/);
  });

  test('rejects a duplicate phone number and duplicate email', async () => {
    const p = person(2);
    await post('/register', p);

    const phoneDup = await post('/register', { ...person(3), phone: p.phone, email: 'new-email-1@example.com' });
    assert.equal(phoneDup.status, 409);
    assert.equal((await phoneDup.json()).errors.phone, 'This phone number has already been used.');

    const emailDup = await post('/register', { ...person(4), phone: '08098765432', email: p.email });
    assert.equal(emailDup.status, 409);
    assert.equal((await emailDup.json()).errors.email, 'This email address has already been used.');
  });

  test('verification endpoint confirms the email and assigns a ticket', async () => {
    const p = person(5);
    const register = await post('/register', p);
    assert.equal(register.status, 201);

    const participant = await (await import('../src/models/Participant.js')).Participant.findOne({ email: p.email }).lean();
    const verify = await post('/register/verify', { email: p.email, code: participant.verificationCode });
    assert.equal(verify.status, 201);
    const body = await verify.json();
    assert.match(body.ticketNumber, /^KV-\d{3,}$/);
    assert.equal(body.name, p.name);
  });

  test('recovers from a stale ticket counter and still assigns a fresh ticket', async () => {
    const p = person(91);
    const register = await post('/register', p);
    assert.equal(register.status, 201);

    const participant = await (await import('../src/models/Participant.js')).Participant.findOne({ email: p.email }).lean();
    const { Counter } = await import('../src/models/Counter.js');
    const maxTicket = await (await import('../src/models/Participant.js')).Participant.findOne({ ticketSeq: { $exists: true, $ne: null } })
      .sort({ ticketSeq: -1 })
      .select('ticketSeq')
      .lean();

    await Counter.findOneAndUpdate({ _id: 'ticket' }, { $set: { seq: (maxTicket?.ticketSeq ?? 0) - 1 } }, { upsert: true, returnDocument: 'after' });

    const verify = await post('/register/verify', { email: p.email, code: participant.verificationCode });
    assert.equal(verify.status, 201);
    const body = await verify.json();
    assert.match(body.ticketNumber, /^KV-\d{3,}$/);
  });

  test('admin can reset participant status and delete participants', async () => {
    const p = person(88);
    const register = await post('/register', p);
    assert.equal(register.status, 201);

    const participant = await (await import('../src/models/Participant.js')).Participant.findOne({ email: p.email }).lean();
    const verify = await post('/register/verify', { email: p.email, code: participant.verificationCode });
    assert.equal(verify.status, 201);

    const winner = await (await import('../src/models/Participant.js')).Participant.findOneAndUpdate(
      { email: p.email },
      { $set: { status: 'won', prizeName: 'Test Prize', wonAt: new Date() } },
      { new: true },
    );

    const login = await post('/admin/login', { email: 'admin@test.dev', password: 'correct-horse-battery' });
    token = (await login.json()).token;
    const auth = { Authorization: `Bearer ${token}` };

    const resetRes = await fetch(`${base}/admin/participants/${winner._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ status: 'eligible' }),
    });
    assert.equal(resetRes.status, 200);
    assert.equal((await resetRes.json()).participant.status, 'eligible');

    const deleteRes = await fetch(`${base}/admin/participants/${winner._id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.equal(deleteRes.status, 200);
    assert.equal((await deleteRes.json()).deletedCount, 1);
  });

  test('admin endpoints require a token and expose email in CSV', async () => {
    const p = person(77);
    const register = await post('/register', p);
    assert.equal(register.status, 201);

    const participant = await (await import('../src/models/Participant.js')).Participant.findOne({ email: p.email }).lean();
    const verify = await post('/register/verify', { email: p.email, code: participant.verificationCode });
    assert.equal(verify.status, 201);

    assert.equal((await get('/admin/stats')).status, 401);
    assert.equal((await post('/admin/login', { email: 'admin@test.dev', password: 'nope' })).status, 401);

    const res = await post('/admin/login', { email: 'admin@test.dev', password: 'correct-horse-battery' });
    assert.equal(res.status, 200);
    token = (await res.json()).token;
    const auth = { Authorization: `Bearer ${token}` };

    const page = await (await get('/admin/participants?limit=10&sort=ticket&order=asc', auth)).json();
    assert.ok(page.data.length >= 1);
    assert.ok(page.data[0].email);

    const csv = await get('/admin/participants/export', auth);
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /Ticket,Name,Phone,Email/);
  });
});
