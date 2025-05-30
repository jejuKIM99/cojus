#!/usr/bin/env node
// scripts/fetch-api-posts.js (ESM 모드)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 환경변수 로드
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되어 있지 않습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ESM 환경에서 __dirname 구현
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.resolve(__dirname, '../data/api_posts.json');

async function main() {
  try {
    // id, npm_command, title 컬럼 조회
    const { data, error } = await supabase
      .from('api_posts')
      .select('id, npm_command, title')
      .or('type.eq.API,type.eq.Quick Start')
      .not('npm_command', 'is', null);

    if (error) throw error;
    if (!data) {
      console.error('Error: Supabase에서 데이터가 반환되지 않았습니다.');
      process.exit(1);
    }

    // JSON 파일에 기록
    await fs.promises.writeFile(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Success: ${OUTPUT_PATH} 파일이 업데이트되었습니다. 총 ${data.length}개 레코드.`);
  } catch (err) {
    console.error(`Error: Supabase 데이터 가져오기 실패 → ${err.message}`);
    process.exit(1);
  }
}

main();