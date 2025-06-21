// netlify/functions/env-vars.js
// Fonction pour servir les variables d'environnement de manière sécurisée

exports.handler = async (event, context) => {
  // Log pour debug
  console.log('🔑 Fonction env-vars appelée');
  console.log('Origin:', event.headers.origin);
  console.log('Method:', event.httpMethod);
  
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Vérifier que c'est bien votre domaine (sécurité)
  const origin = event.headers.origin || event.headers.referer;
  const allowedOrigins = [
    'https://your-crm-site.netlify.app', // Remplacez par votre vraie URL
    'http://localhost',
    'http://127.0.0.1',
    'https://localhost'
  ];
  
  const isAllowed = allowedOrigins.some(allowed => 
    origin && (origin.includes(allowed.replace('https://', '').replace('http://', '')) || 
    origin.startsWith(allowed))
  );
  
  // En production, vérifier l'origine
  if (process.env.NODE_ENV === 'production' && !isAllowed) {
    console.warn('❌ Origine non autorisée:', origin);
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*'
      },
      body: JSON.stringify({ error: 'Access denied' })
    };
  }

  // Récupérer les variables d'environnement
  const envVars = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || ''
  };

  // Vérifier que les variables existent
  if (!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Variables d\'environnement manquantes');
    console.log('URL présente:', !!envVars.VITE_SUPABASE_URL);
    console.log('KEY présente:', !!envVars.VITE_SUPABASE_ANON_KEY);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*'
      },
      body: JSON.stringify({ 
        error: 'Variables d\'environnement manquantes',
        hasUrl: !!envVars.VITE_SUPABASE_URL,
        hasKey: !!envVars.VITE_SUPABASE_ANON_KEY
      })
    };
  }

  // Retourner sous forme de script JS
  const jsContent = `
// Variables d'environnement Netlify injectées via fonction
window.NETLIFY_ENV = ${JSON.stringify(envVars)};
console.log('✅ Variables Netlify chargées via fonction serverless');
console.log('🔧 URL présente:', !!window.NETLIFY_ENV.VITE_SUPABASE_URL);
console.log('🔑 Clé présente:', !!window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY);
  `;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    body: jsContent
  };
};
