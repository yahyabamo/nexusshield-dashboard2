import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtvbkllefgbcfhutdejg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmJrbGxlZmdiY2ZodXRkZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTUxNTYsImV4cCI6MjA5NDkzMTE1Nn0.WkbObpCoVl-evIZocb2q0QSTPZo17EV6cFun5NXwDf0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery() {
    const { data, error } = await supabase.from('totally_fake_table').select('*');
    console.log("Error:", error);
}

testQuery();
