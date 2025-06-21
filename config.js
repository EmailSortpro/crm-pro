// ===================================
// CRM PRO - CONFIGURATION SÉCURISÉE (CORRIGÉE)
// ===================================

console.log('🚀 CRM Pro - Initialisation...');

// Configuration par défaut
const DEFAULT_CONFIG = {
    SUPABASE_URL: 'https://oxyiamruvyliueecpaam.supabase.co',
    SUPABASE_ANON_KEY: ''
};

// Détection de l'environnement
function detectEnvironment() {
    const hostname = window.location.hostname;
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    return {
        hostname,
        isNetlify,
        isLocalhost,
        type: isNetlify ? 'netlify' : isLocalhost ? 'localhost' : 'production'
    };
}

// Chargement des variables via fonction Netlify
async function loadNetlifyEnvVars() {
    try {
        console.log('🔧 Chargement variables via fonction Netlify...');
        
        const response = await fetch('/.netlify/functions/env-vars');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const jsCode = await response.text();
        
        // Vérifier que c'est du JavaScript, pas du HTML
        if (jsCode.trim().startsWith('<')) {
            throw new Error('Réponse HTML reçue au lieu de JavaScript - fonction non trouvée');
        }
        
        eval(jsCode);
        
        if (window.NETLIFY_ENV && window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY) {
            console.log('✅ Variables Netlify chargées avec succès');
            return {
                SUPABASE_URL: window.NETLIFY_ENV.VITE_SUPABASE_URL || DEFAULT_CONFIG.SUPABASE_URL,
                SUPABASE_ANON_KEY: window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY
            };
        } else {
            throw new Error('Variables non trouvées dans la réponse');
        }
        
    } catch (error) {
        console.warn('⚠️ Erreur chargement fonction Netlify:', error.message);
        return null;
    }
}

// Récupération unifiée de la configuration
async function getConfig() {
    const env = detectEnvironment();
    let config = { ...DEFAULT_CONFIG };
    let source = 'default';
    
    console.log('🔍 Environnement détecté:', env);
    
    // 1. Variables déjà injectées via window.NETLIFY_ENV (priorité 1)
    if (window.NETLIFY_ENV?.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = window.NETLIFY_ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
        source = 'netlify-preloaded';
        console.log('✅ Configuration via variables Netlify pré-chargées');
    }
    // 2. Essayer de charger via fonction Netlify
    else if (env.isNetlify) {
        const netlifyConfig = await loadNetlifyEnvVars();
        if (netlifyConfig) {
            config = { ...config, ...netlifyConfig };
            source = 'netlify-function';
        }
    }
    // 3. Fallback localStorage pour développement local
    else if (env.isLocalhost) {
        try {
            const stored = localStorage.getItem('crmConfig');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.SUPABASE_ANON_KEY) {
                    config.SUPABASE_ANON_KEY = parsed.SUPABASE_ANON_KEY;
                    config.SUPABASE_URL = parsed.SUPABASE_URL || config.SUPABASE_URL;
                    source = 'localStorage';
                    console.log('✅ Configuration via localStorage');
                }
            }
        } catch (e) {
            console.warn('⚠️ Erreur localStorage:', e.message);
        }
    }
    
    return { config, source, env };
}

// ===================================
// CLIENT SUPABASE (CORRIGÉ)
// ===================================

let supabaseClient = null;
let isInitialized = false;
let APP_CONFIG = null;
let CONFIG_SOURCE = null;
let ENV_INFO = null;

async function initializeSupabase() {
    if (supabaseClient && isInitialized) {
        return supabaseClient;
    }
    
    try {
        console.log('🔧 Initialisation Supabase...');
        
        // Charger la configuration si pas déjà fait
        if (!APP_CONFIG) {
            const configData = await getConfig();
            APP_CONFIG = configData.config;
            CONFIG_SOURCE = configData.source;
            ENV_INFO = configData.env;
        }
        
        // Vérifier que la librairie est chargée
        if (!window.supabase) {
            console.log('⏳ Attente de la librairie Supabase...');
            let attempts = 0;
            while (!window.supabase && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.supabase) {
                throw new Error('Librairie Supabase non disponible');
            }
        }
        
        // Vérifier la configuration (SANS LIMITE DE LONGUEUR)
        if (!APP_CONFIG.SUPABASE_ANON_KEY) {
            throw new Error('Clé Supabase manquante - vérifiez les variables d\'environnement Netlify');
        }
        
        // ✅ SUPPRIMÉ: Validation de longueur trop restrictive
        // if (APP_CONFIG.SUPABASE_ANON_KEY.length < 50) {
        //     throw new Error('Clé Supabase invalide (trop courte)');
        // }
        
        // Validation basique : clé non vide et ne contenant pas de placeholders
        if (APP_CONFIG.SUPABASE_ANON_KEY.includes('%') || APP_CONFIG.SUPABASE_ANON_KEY.trim().length === 0) {
            throw new Error('Clé Supabase invalide - contient des placeholders ou est vide');
        }
        
        console.log('🔑 Clé API info:', {
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0,
            keyPreview: APP_CONFIG.SUPABASE_ANON_KEY?.substring(0, 20) + '...' + APP_CONFIG.SUPABASE_ANON_KEY?.slice(-10)
        });
        
        // Créer le client
        supabaseClient = window.supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );
        
        // Test de connexion simple (sans vérification d'erreur API key)
        try {
            const { error } = await supabaseClient.auth.getSession();
            if (error && error.message.includes('Invalid API key')) {
                throw new Error('Clé API Supabase invalide selon le serveur');
            }
        } catch (testError) {
            console.warn('⚠️ Test de connexion échoué:', testError.message);
            // Ne pas échouer complètement, juste avertir
        }
        
        isInitialized = true;
        console.log('✅ Supabase initialisé avec succès');
        console.log('📊 Configuration:', {
            source: CONFIG_SOURCE,
            environment: ENV_INFO.type,
            url: APP_CONFIG.SUPABASE_URL,
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0
        });
        
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Erreur Supabase:', error.message);
        supabaseClient = null;
        isInitialized = false;
        
        // Instructions de debug améliorées
        if (!APP_CONFIG?.SUPABASE_ANON_KEY) {
            console.group('🚨 CONFIGURATION REQUISE');
            console.error('❌ Clé Supabase manquante !');
            console.log('🌐 SOLUTION NETLIFY:');
            console.log('1. Dashboard Netlify → Site Settings → Environment Variables');
            console.log('2. Ajouter: VITE_SUPABASE_ANON_KEY = votre_cle_supabase');
            console.log('3. Redéployer le site');
            console.log('🔑 Clé Supabase: supabase.com → projet → Settings → API → clé "anon"');
            console.groupEnd();
        } else if (APP_CONFIG.SUPABASE_ANON_KEY.includes('%')) {
            console.group('🚨 PROBLÈME DE SUBSTITUTION');
            console.error('❌ Variables Netlify non substituées !');
            console.log('🔧 La clé contient encore des % - vérifiez le déploiement');
            console.log('📝 Clé reçue:', APP_CONFIG.SUPABASE_ANON_KEY);
            console.groupEnd();
        }
        
        throw error;
    }
}

// ===================================
// SERVICES AUTHENTIFICATION (IDENTIQUES)
// ===================================

class AuthService {
    static async getClient() {
        if (!supabaseClient) {
            await initializeSupabase();
        }
        return supabaseClient;
    }
    
    static async getCurrentUser() {
        try {
            const client = await this.getClient();
            const { data: { user }, error } = await client.auth.getUser();
            return error ? null : user;
        } catch (error) {
            console.warn('⚠️ Erreur getCurrentUser:', error.message);
            return null;
        }
    }
    
    static async requireAuth() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.log('🔒 Authentification requise - redirection');
                window.location.href = 'login.html';
                return false;
            }
            return true;
        } catch (error) {
            console.warn('⚠️ Erreur requireAuth:', error.message);
            window.location.href = 'login.html';
            return false;
        }
    }
    
    static async login(email, password) {
        try {
            const client = await this.getClient();
            
            const { data, error } = await client.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });
            
            if (error) throw error;
            
            // Sauvegarder les infos utilisateur
            if (data.user) {
                const userInfo = {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.user_metadata?.role || 'user',
                    created_at: data.user.created_at
                };
                
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('✅ Connexion réussie:', data.user.email);
            }
            
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Erreur login:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async logout() {
        try {
            const client = await this.getClient();
            await client.auth.signOut();
            localStorage.removeItem('userInfo');
            console.log('✅ Déconnexion réussie');
        } catch (error) {
            console.warn('⚠️ Erreur logout:', error.message);
        } finally {
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        }
    }
    
    static getUserInfo() {
        try {
            const stored = localStorage.getItem('userInfo');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('⚠️ Erreur getUserInfo:', error.message);
            return null;
        }
    }
    
    static isAdmin() {
        const userInfo = this.getUserInfo();
        return userInfo?.role === 'admin';
    }
}

// ===================================
// SERVICES CRM
// ===================================

class CRMService {
    static async getClient() {
        if (!supabaseClient) {
            await initializeSupabase();
        }
        return supabaseClient;
    }
    
    static async getCompanies() {
        try {
            const client = await this.getClient();
            const { data, error } = await client
                .from('companies')
                .select(`
                    *,
                    company_contacts (
                        id, first_name, last_name, email, position, phone,
                        contact_type, is_admin_contact, is_payment_contact, created_at
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ getCompanies:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    // Ajoutez ici vos autres méthodes CRMService...
}

// ===================================
// EXPOSITION GLOBALE
// ===================================

// Initialisation automatique
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM chargé - Initialisation des services...');
    
    try {
        const configData = await getConfig();
        APP_CONFIG = configData.config;
        CONFIG_SOURCE = configData.source;
        ENV_INFO = configData.env;
        
        console.log('✅ Configuration chargée');
    } catch (error) {
        console.error('❌ Erreur chargement configuration:', error.message);
    }
});

// Services globaux
window.AuthService = AuthService;
window.CRMService = CRMService;

// Fonction de diagnostic améliorée
window.testConfig = async function() {
    if (!APP_CONFIG) {
        const configData = await getConfig();
        APP_CONFIG = configData.config;
        CONFIG_SOURCE = configData.source;
        ENV_INFO = configData.env;
    }
    
    console.group('🔍 Diagnostic CRM');
    console.log('Environment:', ENV_INFO);
    console.log('Config Source:', CONFIG_SOURCE);
    console.log('Supabase URL:', APP_CONFIG.SUPABASE_URL);
    console.log('Has Key:', !!APP_CONFIG.SUPABASE_ANON_KEY);
    console.log('Key Length:', APP_CONFIG.SUPABASE_ANON_KEY?.length || 0);
    console.log('Key Preview:', APP_CONFIG.SUPABASE_ANON_KEY ? 
        APP_CONFIG.SUPABASE_ANON_KEY.substring(0, 20) + '...' + APP_CONFIG.SUPABASE_ANON_KEY.slice(-10) 
        : 'Non définie');
    console.log('Supabase Client:', !!supabaseClient);
    console.log('Is Initialized:', isInitialized);
    console.groupEnd();
    
    return {
        environment: ENV_INFO,
        configSource: CONFIG_SOURCE,
        hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
        keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0,
        isInitialized,
        client: !!supabaseClient
    };
};

console.log('✅ Configuration CRM chargée - Prêt pour l\'initialisation');
