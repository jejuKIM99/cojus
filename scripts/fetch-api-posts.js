// scripts/fetch-api-posts.js
// =================================
// Supabase의 api_posts 테이블 중
//   - type 컬럼이 'API'
//   - npm_command 컬럼이 null이 아님
// 을 select하여 data/api_posts.json에 저장

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되어 있지 않습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OUTPUT_PATH = path.resolve(__dirname, '../data/api_posts.json');

(async () => {
  try {
    // title 컬럼도 함께 조회하도록 수정
    const { data, error } = await supabase
      .from('api_posts')
      .select('id, npm_command, title')
      .eq('type', 'API')
      .not('npm_command', 'is', null);

    if (error) throw error;
    if (!data) {
      console.error('Error: Supabase에서 데이터가 반환되지 않았습니다.');
      process.exit(1);
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Success: ${OUTPUT_PATH} 파일이 업데이트되었습니다. 총 ${data.length}개 레코드.`);
  } catch (err) {
    console.error(`Error: Supabase 데이터 가져오기 실패 → ${err.message}`);
    process.exit(1);
  }
})();
