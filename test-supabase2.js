import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mtvbkllefgbcfhutdejg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmJrbGxlZmdiY2ZodXRkZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTUxNTYsImV4cCI6MjA5NDkzMTE1Nn0.WkbObpCoVl-evIZocb2q0QSTPZo17EV6cFun5NXwDf0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    console.log("Testing device_config");
    const q1 = await supabase.from('device_config').select('*').limit(1);
    console.log("device_config:", q1.error);

    console.log("Testing profiles");
    const q2 = await supabase.from('profiles').select('*').limit(1);
    console.log("profiles:", q2.error);

    console.log("Testing system_logs");
    const q3 = await supabase.from('system_logs').select('*').limit(1);
    console.log("system_logs:", q3.error);
    
    console.log("Testing snapshots");
    const q4 = await supabase.from('snapshots').select('*').limit(1);
    console.log("snapshots:", q4.error);
}

test();
