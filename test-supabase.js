import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mtvbkllefgbcfhutdejg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmJrbGxlZmdiY2ZodXRkZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTUxNTYsImV4cCI6MjA5NDkzMTE1Nn0.WkbObpCoVl-evIZocb2q0QSTPZo17EV6cFun5NXwDf0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    console.log("Query 1: events count");
    const q1 = await supabase.from('events').select('id', { count: 'exact' }).gte('created_at', today.toISOString());
    console.log("Q1 Error:", q1.error);

    console.log("Query 2: devices");
    const q2 = await supabase.from('devices').select('*');
    console.log("Q2 Error:", q2.error);

    console.log("Query 3: events with devices and snapshots");
    const q3 = await supabase.from('events').select('*, devices(name), snapshots(image_url)').order('created_at', { ascending: false }).limit(8);
    console.log("Q3 Error:", q3.error);

    console.log("Query 4: high severity events");
    const q4 = await supabase.from('events').select('id', { count: 'exact' }).eq('severity', 'high').gte('created_at', today.toISOString());
    console.log("Q4 Error:", q4.error);
}

test();
