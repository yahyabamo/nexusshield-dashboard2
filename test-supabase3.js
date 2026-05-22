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

    // Try logging in with the credentials from LoginPage
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'password123' // guess, or maybe not needed
    });
    console.log("Auth:", authErr ? authErr.message : "Success");

    console.log("Query 1: events count");
    const q1 = await supabase.from('events').select('id', { count: 'exact' });
    console.log("Q1 Error:", q1.error, "Data:", q1.data);

    console.log("Query 2: events with joins");
    const q3 = await supabase.from('events').select('*, devices(name), snapshots(image_url)').limit(1);
    console.log("Q3 Error:", q3.error, "Data:", q3.data);

    console.log("Query 3: system_logs with joins");
    const q4 = await supabase.from('system_logs').select('*, devices(name)').limit(1);
    console.log("Q4 Error:", q4.error, "Data:", q4.data);
}

test();
