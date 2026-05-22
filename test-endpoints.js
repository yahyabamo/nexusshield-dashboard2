import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtvbkllefgbcfhutdejg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmJrbGxlZmdiY2ZodXRkZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTUxNTYsImV4cCI6MjA5NDkzMTE1Nn0.WkbObpCoVl-evIZocb2q0QSTPZo17EV6cFun5NXwDf0';

async function testPostgrest() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    console.log("PostgREST status:", res.status);
    console.log("PostgREST body:", await res.text());
}

async function testAuth() {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'admin@example.com', password: 'wrongpassword' })
    });
    console.log("Auth status:", res.status);
    console.log("Auth body:", await res.text());
}

async function testRealtime() {
    // just check if we can get the schema
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    console.log("Root OpenAPI status:", res.status);
    console.log("Root OpenAPI body start:", (await res.text()).substring(0, 100));
}

testPostgrest();
testAuth();
testRealtime();
