import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    console.log("Testing with URL:", SUPABASE_URL);

    const email = `test${Date.now()}@example.com`;
    console.log("Signing up:", email);
    const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password: 'password123'
    });
    
    if (authErr) {
        console.log("Auth Error:", authErr.message);
        return;
    }
    console.log("Signed up user:", authData.user?.id);

    console.log("Query 1: events count");
    const q1 = await supabase.from('events').select('id', { count: 'exact' });
    console.log("Q1 Error:", q1.error?.message, "Details:", q1.error?.details, q1.error?.hint);

    console.log("Query 2: profiles single");
    const q2 = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
    console.log("Q2 Error:", q2.error?.message, "Details:", q2.error?.details, q2.error?.hint);
}

test();
