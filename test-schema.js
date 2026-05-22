import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtvbkllefgbcfhutdejg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmJrbGxlZmdiY2ZodXRkZWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTUxNTYsImV4cCI6MjA5NDkzMTE1Nn0.WkbObpCoVl-evIZocb2q0QSTPZo17EV6cFun5NXwDf0';

async function fetchSchema() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`);
    const spec = await res.json();
    
    if (spec.definitions && spec.definitions.profiles) {
        console.log("Profiles schema:", JSON.stringify(spec.definitions.profiles.properties, null, 2));
    } else {
        console.log("Profiles not found in OpenAPI spec");
    }
}

fetchSchema();
