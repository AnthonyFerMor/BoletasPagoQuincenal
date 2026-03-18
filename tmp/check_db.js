const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('planilla_empleados').select('count', { count: 'exact' });
  if (error) {
    console.error("Error checking employees:", error.message);
  } else {
    console.log(`✓ Encontrados ${data[0]?.count || 0} empleados en planilla_empleados.`);
  }

  const { data: vales } = await supabase.from('planilla_vales').select('count', { count: 'exact' });
  console.log(`✓ Encontrados ${vales?.[0]?.count || 0} vales.`);
}

check();
