/**
 * FastGPT Connection Test Script
 * 
 * Usage: 
 * 1. Set FASTGPT_BASE_URL and FASTGPT_API_KEY in .env.local
 * 2. Run: npx tsx scripts/test-fastgpt.ts
 */

import { queryFastGPT } from '../lib/ai/fastgpt-client';

async function testFastGPT() {
  console.log('=== FastGPT Connection Test ===\n');

  // Check environment variables
  console.log('1. Checking environment variables...');
  const baseUrl = process.env.FASTGPT_BASE_URL;
  const apiKey = process.env.FASTGPT_API_KEY;

  if (!baseUrl) {
    console.error('❌ FASTGPT_BASE_URL is not set');
    process.exit(1);
  }
  if (!apiKey) {
    console.error('❌ FASTGPT_API_KEY is not set');
    process.exit(1);
  }

  console.log(`✅ FASTGPT_BASE_URL: ${baseUrl}`);
  console.log(`✅ FASTGPT_API_KEY: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}\n`);

  // Test query
  console.log('2. Testing FastGPT query...');
  const testQuery = '毛泽东思想的活的灵魂包括什么？请分点回答。';
  console.log(`Query: ${testQuery}\n`);

  try {
    const result = await queryFastGPT(testQuery, { timeoutMs: 30000 });
    
    console.log('✅ Query successful!\n');
    console.log('Answer:');
    console.log('---');
    console.log(result.answer);
    console.log('---\n');
    console.log(`Answer length: ${result.answer.length} characters`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testFastGPT();
