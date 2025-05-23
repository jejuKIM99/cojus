// scripts/fetch-api-posts.js
// ==========================
// Supabase의 api_posts 테이블 중
//   - type 컬럼이 'API'
//   - npm_command 컬럼이 null이 아님
// 인 데이터만 select하여 data/api_posts.json에 저장하는 CommonJS 모듈

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 환경 변수
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되어 있지 않습니다.');
  process.exit(1);
}

// Supabase 클라이언트 생성
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// __dirname을 그대로 사용
const OUTPUT_PATH = path.resolve(__dirname, '../data/api_posts.json');

(async () => {
  try {
    // "type"이 'API'이고, "npm_command"가 null이 아닌 레코드만 조회
    const { data, error } = await supabase
      .from('api_posts')
      .select('id,npm_command')
      .eq('type', 'API')
      .not('npm_command', 'is', null);

    if (error) {
      throw error;
    }
    if (!data) {
      console.error('Error: Supabase에서 데이터가 반환되지 않았습니다.');
      process.exit(1);
    }

    // data 예시: [{ id: 101, npm_command: 'npm install xyz' }, ...]
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Success: ${OUTPUT_PATH} 파일이 업데이트되었습니다. 총 ${data.length}개 레코드.`);
  } catch (err) {
    console.error(`Error: Supabase 데이터 가져오기 실패 → ${err.message}`);
    process.exit(1);
  }
})();
