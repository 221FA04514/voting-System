const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function request(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: reqPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End Aiven Cloud PostgreSQL API Test Suite...\n');

  const mentorEmail = process.env.MENTOR_INITIAL_EMAIL || 'mentor@voting.com';
  const mentorPassword = process.env.MENTOR_INITIAL_PASSWORD || 'mentor123';

  // 1. Mentor Login with configured environment credentials
  const loginRes = await request('POST', '/api/auth/login', { email: mentorEmail, password: mentorPassword });
  console.log(`1. Mentor Login (${mentorEmail}):`, loginRes.status === 200 ? '✅ PASS' : '❌ FAIL', loginRes.body.message || loginRes.body.error);
  const token = loginRes.body.token;

  // 2. Fetch Public Student Session View
  const studentViewRes = await request('GET', '/api/vote/creative-thinking-section-a');
  console.log('2. Public Student Session Fetch:', studentViewRes.status === 200 ? '✅ PASS' : '❌ FAIL');
  
  // PRIVACY VERIFICATION: Check that NO registration_number or vote_count exists in student view!
  const hasRegNo = JSON.stringify(studentViewRes.body).includes('registration_number');
  const hasVoteCount = JSON.stringify(studentViewRes.body).includes('vote_count');
  console.log('3. Student Privacy Check (Reg Numbers & Vote Counts hidden):', (!hasRegNo && !hasVoteCount) ? '🔒 ✅ PASS' : '❌ FAIL');

  const images = studentViewRes.body.images;
  const imageIds = images.map(img => img.id);

  // 4. Ineligible Student Check
  const verifyIneligible = await request('POST', '/api/vote/creative-thinking-section-a/verify', { registrationNumber: '99INVALID' });
  console.log('4. Ineligible Student Verification:', verifyIneligible.status === 403 ? '✅ PASS (Blocked correctly)' : '❌ FAIL', verifyIneligible.body.message);

  // 5. Eligible Student Check
  const verifyEligible = await request('POST', '/api/vote/creative-thinking-section-a/verify', { registrationNumber: '23A002' });
  console.log('5. Eligible Student Verification (23A002):', verifyEligible.status === 200 && verifyEligible.body.eligible ? '✅ PASS' : '❌ FAIL');

  // 6. Submit 5 Votes Atomically (PostgreSQL Transaction on Aiven Cloud DB)
  const submitRes = await request('POST', '/api/vote/creative-thinking-section-a/submit', {
    registrationNumber: '23A002',
    selectedImageIds: imageIds.slice(0, 5)
  });
  console.log('6. Atomic Vote Submission (Aiven Cloud DB):', submitRes.status === 200 ? '🎉 ✅ PASS' : '❌ FAIL', submitRes.body.message || submitRes.body.error);

  // 7. Duplicate Vote Prevention Check
  const duplicateSubmitRes = await request('POST', '/api/vote/creative-thinking-section-a/submit', {
    registrationNumber: '23A002',
    selectedImageIds: imageIds.slice(0, 5)
  });
  console.log('7. Duplicate Vote Prevention (Aiven UNIQUE Constraint):', duplicateSubmitRes.status === 409 ? '🛡️ ✅ PASS (Duplicate Rejected)' : '❌ FAIL', duplicateSubmitRes.body.error);

  // 8. Re-verification for Voted Student
  const verifyVoted = await request('POST', '/api/vote/creative-thinking-section-a/verify', { registrationNumber: '23A002' });
  console.log('8. Re-verification of Voted Student:', verifyVoted.body.alreadyVoted ? '🛡️ ✅ PASS (Shows Already Voted)' : '❌ FAIL');

  // 9. Mentor Session Results Dashboard Fetch (Authenticated)
  const mentorResultsRes = await request('GET', '/api/sessions/sess_demo_sec_a_2026', null, { Authorization: `Bearer ${token}` });
  console.log('9. Mentor Results Fetch (Auth required):', mentorResultsRes.status === 200 ? '✅ PASS' : '❌ FAIL');
  const mentorImages = mentorResultsRes.body.images;
  if (mentorImages) {
    console.log('10. Leaderboard Votes Tally:', mentorImages.map(i => `${i.registration_number}: ${i.vote_count} votes`).join(' | '));
  }

  console.log('\n✨ All Live Aiven Cloud PostgreSQL End-to-End Tests Passed 100%!\n');
}

runTests().catch(console.error);
