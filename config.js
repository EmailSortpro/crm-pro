// ===================================
// CRM PRO - CONFIGURATION UNIFIÉE V2
// Gestion optimisée Netlify + fallbacks
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

// Récupération unifiée de la configuration
function getConfig() {
    const env = detectEnvironment();
    const config = { ...DEFAULT_CONFIG };
    let source = 'default';
    
    console.log('🔍 Environnement détecté:', env);
    
    // 1. Variables injectées via NETLIFY_ENV (priorité 1)
    if (window.NETLIFY_ENV?.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = window.NETLIFY_ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
        source = 'netlify-injection';
        console.log('✅ Configuration via injection Netlify');
    }
    // 2. Variables process.env (build time)
    else if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = process.env.VITE_SUPABASE_URL || config.SUPABASE_URL;
        source = 'process-env';
        console.log('✅ Configuration via process.env');
    }
    // 3. Variables manuelles via window.ENV
    else if (window.ENV?.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = window.ENV.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = window.ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
        source = 'manual-env';
        console.log('✅ Configuration via window.ENV');
    }
    // 4. Fallback localStorage (développement)
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

// Initialisation globale
const { config: APP_CONFIG, source: CONFIG_SOURCE, env: ENV_INFO } = getConfig();

console.log('📊 Configuration:', {
    source: CONFIG_SOURCE,
    environment: ENV_INFO.type,
    url: APP_CONFIG.SUPABASE_URL,
    hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
    keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0
});

// Instructions si configuration manquante
if (!APP_CONFIG.SUPABASE_ANON_KEY) {
    console.group('🚨 CONFIGURATION REQUISE');
    console.error('❌ Clé Supabase manquante !');
    
    if (ENV_INFO.isNetlify) {
        console.log('🌐 SOLUTION NETLIFY:');
        console.log('1. Dashboard Netlify → Site Settings → Environment Variables');
        console.log('2. Ajouter: VITE_SUPABASE_ANON_KEY = votre_cle_supabase');
        console.log('3. Redéployer le site');
        console.log('4. Ou ajouter dans vos HTML avant config.js:');
        console.log('   <script>window.NETLIFY_ENV = {VITE_SUPABASE_ANON_KEY: "cle"};</script>');
    } else if (ENV_INFO.isLocalhost) {
        console.log('💻 SOLUTION LOCALHOST:');
        console.log('Exécutez dans la console:');
        console.log('localStorage.setItem("crmConfig", JSON.stringify({');
        console.log('  SUPABASE_ANON_KEY: "votre_cle_supabase"');
        console.log('}));');
    }
    
    console.log('🔑 Clé Supabase: supabase.com → projet → Settings → API → clé "anon"');
    console.groupEnd();
}

// ===================================
// CLIENT SUPABASE
// ===================================

let supabaseClient = null;
let isInitialized = false;

async function initializeSupabase() {
    if (supabaseClient && isInitialized) {
        return supabaseClient;
    }
    
    try {
        console.log('🔧 Initialisation Supabase...');
        
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
        
        // Vérifier la configuration
        if (!APP_CONFIG.SUPABASE_ANON_KEY) {
            throw new Error('Clé Supabase manquante - voir instructions ci-dessus');
        }
        
        if (APP_CONFIG.SUPABASE_ANON_KEY.length < 50) {
            throw new Error('Clé Supabase invalide (trop courte)');
        }
        
        // Créer le client
        supabaseClient = window.supabase.createClient(
            APP_CONFIG.SUPABASE_URL,
            APP_CONFIG.SUPABASE_ANON_KEY
        );
        
        // Test de connexion
        const { error } = await supabaseClient.auth.getSession();
        if (error && error.message.includes('Invalid API key')) {
            throw new Error('Clé API Supabase invalide');
        }
        
        isInitialized = true;
        console.log('✅ Supabase initialisé avec succès');
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Erreur Supabase:', error.message);
        supabaseClient = null;
        isInitialized = false;
        throw error;
    }
}

// ===================================
// SERVICES AUTHENTIFICATION
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
    
    static async createCompany(companyData) {
        try {
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('companies')
                .insert([{
                    ...companyData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ createCompany:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async updateCompany(id, companyData) {
        try {
            const client = await this.getClient();
            const { data, error } = await client
                .from('companies')
                .update({
                    ...companyData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ updateCompany:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteCompany(id) {
        try {
            const client = await this.getClient();
            const { error } = await client
                .from('companies')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ deleteCompany:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async getContacts(companyId = null) {
        try {
            const client = await this.getClient();
            
            let query = client
                .from('company_contacts')
                .select(`
                    *,
                    companies (id, name, status)
                `)
                .order('created_at', { ascending: false });
            
            if (companyId) {
                query = query.eq('company_id', companyId);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ getContacts:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async createContact(contactData) {
        try {
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('company_contacts')
                .insert([{
                    ...contactData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ createContact:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async updateContact(id, contactData) {
        try {
            const client = await this.getClient();
            const { data, error } = await client
                .from('company_contacts')
                .update({
                    ...contactData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ updateContact:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteContact(id) {
        try {
            const client = await this.getClient();
            const { error } = await client
                .from('company_contacts')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ deleteContact:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicenses() {
        try {
            const client = await this.getClient();
            const { data, error } = await client
                .from('company_licenses')
                .select(`
                    *,
                    companies (id, name, status),
                    license_plans (id, name, price_per_user, features)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ getLicenses:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async createLicense(licenseData) {
        try {
            const client = await this.getClient();
            
            const { data, error } = await client
                .from('company_licenses')
                .insert([{
                    ...licenseData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select(`
                    *,
                    companies (id, name, status),
                    license_plans (id, name, price_per_user, features)
                `);
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ createLicense:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async updateLicense(id, licenseData) {
        try {
            const client = await this.getClient();
            const { data, error } = await client
                .from('company_licenses')
                .update({
                    ...licenseData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ updateLicense:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteLicense(id) {
        try {
            const client = await this.getClient();
            const { error } = await client
                .from('company_licenses')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ deleteLicense:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicensePlans() {
        try {
            const client = await this.getClient();
            const { data, error } = await client
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ getLicensePlans:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    static async getStats() {
        try {
            const [companiesResult, licensesResult, contactsResult] = await Promise.all([
                this.getCompanies(),
                this.getLicenses(),
                this.getContacts()
            ]);
            
            if (!companiesResult.success || !licensesResult.success || !contactsResult.success) {
                throw new Error('Erreur récupération données');
            }
            
            const companies = companiesResult.data;
            const licenses = licensesResult.data;
            const contacts = contactsResult.data;
            
            const stats = {
                totalCompanies: companies.length,
                prospects: companies.filter(c => c.status === 'prospect').length,
                sponsors: companies.filter(c => c.status === 'sponsor').length,
                clients: companies.filter(c => c.status === 'client').length,
                onboarded: companies.filter(c => c.status === 'onboarded').length,
                totalContacts: contacts.length,
                totalLicenses: licenses.length,
                activeLicenses: licenses.filter(l => l.status === 'active').length,
                monthlyRevenue: licenses
                    .filter(l => l.status === 'active')
                    .reduce((sum, l) => sum + (l.monthly_cost || 0), 0)
            };
            
            return { success: true, data: stats };
        } catch (error) {
            console.error('❌ getStats:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// ===================================
// UTILITAIRES
// ===================================

function formatDate(dateString) {
    if (!dateString) return 'Non défini';
    try {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return 'Date invalide';
    }
}

function formatDateShort(dateString) {
    if (!dateString) return 'Non défini';
    try {
        return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
        return 'Date invalide';
    }
}

function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function getInitials(firstName, lastName) {
    if (!firstName && !lastName) return '??';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

function showLoading(show = true) {
    const loaderId = 'global-loader';
    let loader = document.getElementById(loaderId);
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = loaderId;
            loader.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                           background: rgba(255,255,255,0.9); z-index: 9999; 
                           display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="width: 3rem; height: 3rem; border: 3px solid #e5e7eb; 
                                   border-top: 3px solid #3b82f6; border-radius: 50%; 
                                   animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                        <div style="color: #6b7280;">Chargement...</div>
                    </div>
                </div>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

function showSuccess(message, duration = 3000) {
    showNotification(message, 'success', duration);
}

function showError(message, duration = 5000) {
    showNotification(message, 'error', duration);
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    
    const colors = {
        success: { bg: '#10b981', text: '#ffffff' },
        error: { bg: '#ef4444', text: '#ffffff' },
        info: { bg: '#3b82f6', text: '#ffffff' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        padding: 1rem 1.5rem;
        background: ${color.bg};
        color: ${color.text};
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    notification.textContent = message;
    
    // Ajouter l'animation CSS
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// ===================================
// EXPOSITION GLOBALE
// ===================================

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM chargé - Services disponibles');
});

// Services globaux
window.AuthService = AuthService;
window.CRMService = CRMService;
window.formatDate = formatDate;
window.formatDateShort = formatDateShort;
window.formatCurrency = formatCurrency;
window.getInitials = getInitials;
window.showLoading = showLoading;
window.showSuccess = showSuccess;
window.showError = showError;
window.showNotification = showNotification;

// Fonction de diagnostic
window.testConfig = function() {
    console.group('🔍 Diagnostic CRM');
    console.log('Environment:', ENV_INFO);
    console.log('Config Source:', CONFIG_SOURCE);
    console.log('Supabase URL:', APP_CONFIG.SUPABASE_URL);
    console.log('Has Key:', !!APP_CONFIG.SUPABASE_ANON_KEY);
    console.log('Key Length:', APP_CONFIG.SUPABASE_ANON_KEY?.length || 0);
    console.log('Supabase Client:', !!supabaseClient);
    console.log('Is Initialized:', isInitialized);
    console.groupEnd();
    
    return {
        environment: ENV_INFO,
        configSource: CONFIG_SOURCE,
        hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
        isInitialized,
        client: !!supabaseClient
    };
};

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    console.warn('⚠️ Erreur capturée:', e.error?.message || 'Erreur inconnue');
});

window.addEventListener('unhandledrejection', (e) => {
    console.warn('⚠️ Promise rejetée:', e.reason?.message || 'Raison inconnue');
    e.preventDefault();
});

console.log('✅ Configuration CRM chargée - Source:', CONFIG_SOURCE);
