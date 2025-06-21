// ===================================
// CONFIGURATION CRM PRO - VERSION UNIFIÉE
// Gestion automatique des variables Netlify + fallbacks
// ===================================

console.log('🚀 CRM Config - Démarrage unifié...');

// Configuration par défaut
const DEFAULT_CONFIG = {
    SUPABASE_URL: 'https://oxyiamruvyliueecpaam.supabase.co',
    SUPABASE_ANON_KEY: ''
};

// DÉTECTION AUTOMATIQUE DE L'ENVIRONNEMENT ET RÉCUPÉRATION DES VARIABLES
function getUnifiedConfig() {
    const config = { ...DEFAULT_CONFIG };
    const hostname = window.location.hostname;
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    console.log('🔍 Détection environnement:', {
        hostname,
        isNetlify,
        isLocalhost,
        type: isNetlify ? 'netlify' : isLocalhost ? 'localhost' : 'autre'
    });
    
    // 1. NETLIFY - Tentative de récupération via fetch des variables build
    if (isNetlify) {
        console.log('📡 Mode Netlify détecté - recherche variables...');
        
        // Vérifier si les variables ont été injectées via un script de build
        if (window.NETLIFY_ENV && window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY) {
            config.SUPABASE_ANON_KEY = window.NETLIFY_ENV.VITE_SUPABASE_ANON_KEY;
            config.SUPABASE_URL = window.NETLIFY_ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
            console.log('✅ Variables Netlify trouvées via NETLIFY_ENV');
            return { config, source: 'netlify-build' };
        }
        
        // Fallback: essayer de récupérer depuis un fichier env-vars.js
        try {
            if (window.ENV_VARS && window.ENV_VARS.VITE_SUPABASE_ANON_KEY) {
                config.SUPABASE_ANON_KEY = window.ENV_VARS.VITE_SUPABASE_ANON_KEY;
                config.SUPABASE_URL = window.ENV_VARS.VITE_SUPABASE_URL || config.SUPABASE_URL;
                console.log('✅ Variables Netlify trouvées via ENV_VARS');
                return { config, source: 'netlify-vars' };
            }
        } catch (e) {
            console.log('⚠️ Pas de fichier env-vars.js trouvé');
        }
    }
    
    // 2. DÉVELOPPEMENT - Variables manuelles via window.ENV
    if (window.ENV && window.ENV.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = window.ENV.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = window.ENV.VITE_SUPABASE_URL || config.SUPABASE_URL;
        console.log('✅ Variables trouvées via window.ENV (manuel)');
        return { config, source: 'manual-env' };
    }
    
    // 3. PROCESS.ENV - Si disponible (build time)
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
        config.SUPABASE_URL = process.env.VITE_SUPABASE_URL || config.SUPABASE_URL;
        console.log('✅ Variables trouvées via process.env');
        return { config, source: 'process-env' };
    }
    
    // 4. LOCALSTORAGE - Développement local
    const localConfig = localStorage.getItem('crmConfig');
    if (localConfig) {
        try {
            const parsed = JSON.parse(localConfig);
            if (parsed.SUPABASE_ANON_KEY) {
                config.SUPABASE_ANON_KEY = parsed.SUPABASE_ANON_KEY;
                config.SUPABASE_URL = parsed.SUPABASE_URL || config.SUPABASE_URL;
                console.log('✅ Variables trouvées via localStorage');
                return { config, source: 'localStorage' };
            }
        } catch (e) {
            console.warn('⚠️ Erreur lecture localStorage');
        }
    }
    
    // 5. FALLBACK - Tentative de récupération via l'API Supabase elle-même
    // (méthode avancée pour récupérer la clé publique si disponible)
    if (isNetlify) {
        console.log('🔄 Tentative de récupération automatique...');
        // Cette méthode peut être implémentée si nécessaire
    }
    
    console.error('❌ Aucune configuration trouvée');
    return { config, source: 'none' };
}

// Récupération de la configuration unifiée
const { config: APP_CONFIG, source: CONFIG_SOURCE } = getUnifiedConfig();

console.log('📊 Configuration chargée:', {
    source: CONFIG_SOURCE,
    url: APP_CONFIG.SUPABASE_URL,
    hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
    keyLength: APP_CONFIG.SUPABASE_ANON_KEY?.length || 0
});

// INSTRUCTIONS DYNAMIQUES SELON LE CONTEXTE
if (!APP_CONFIG.SUPABASE_ANON_KEY) {
    const hostname = window.location.hostname;
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    console.group('🚨 CONFIGURATION REQUISE');
    console.error('Clé Supabase manquante !');
    console.log('');
    
    if (isNetlify) {
        console.log('🌐 SOLUTION NETLIFY (recommandée) :');
        console.log('1. Dashboard Netlify → Site Settings → Environment Variables');
        console.log('2. Ajouter : VITE_SUPABASE_ANON_KEY = votre_cle_supabase');
        console.log('3. Créer _redirects avec :');
        console.log('   /env-vars.js  /.netlify/functions/env-vars  200');
        console.log('4. Ou ajouter avant config.js :');
        console.log('   <script>window.NETLIFY_ENV = {VITE_SUPABASE_ANON_KEY: "cle"};</script>');
        console.log('5. Redéployer le site');
    } else if (isLocalhost) {
        console.log('💻 SOLUTION DÉVELOPPEMENT LOCAL :');
        console.log('Option 1 - localStorage (recommandé) :');
        console.log('localStorage.setItem("crmConfig", JSON.stringify({');
        console.log('  SUPABASE_ANON_KEY: "votre_cle_supabase"');
        console.log('}));');
        console.log('');
        console.log('Option 2 - Script manuel :');
        console.log('<script>window.ENV = {VITE_SUPABASE_ANON_KEY: "cle"};</script>');
    } else {
        console.log('🌍 SOLUTION GÉNÉRALE :');
        console.log('Ajouter avant config.js :');
        console.log('<script>window.ENV = {VITE_SUPABASE_ANON_KEY: "votre_cle"};</script>');
    }
    
    console.log('');
    console.log('🔑 Récupérer votre clé :');
    console.log('supabase.com → votre projet → Settings → API → clé "anon" (pas service_role)');
    console.groupEnd();
} else {
    console.log(`✅ Configuration OK via ${CONFIG_SOURCE}`);
}

// Variables globales
let supabase = null;
let isReady = false;
let initPromise = null;

// ===================================
// INITIALISATION SUPABASE UNIFIÉE
// ===================================

async function initializeSupabase() {
    // Éviter les initialisations multiples
    if (initPromise) return initPromise;
    if (supabase) return supabase;
    
    initPromise = new Promise(async (resolve) => {
        try {
            console.log('🔧 Initialisation Supabase...');
            
            // Attendre que Supabase soit chargé
            if (!window.supabase) {
                console.log('⏳ Attente librairie Supabase...');
                let attempts = 0;
                while (!window.supabase && attempts < 100) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    attempts++;
                }
                
                if (!window.supabase) {
                    throw new Error('Librairie Supabase non chargée après 5s');
                }
            }
            
            // Vérifier la configuration
            if (!APP_CONFIG.SUPABASE_ANON_KEY) {
                throw new Error('Clé Supabase manquante');
            }
            
            if (APP_CONFIG.SUPABASE_ANON_KEY.length < 100) {
                throw new Error('Clé Supabase semble invalide (trop courte)');
            }
            
            // Créer le client
            supabase = window.supabase.createClient(
                APP_CONFIG.SUPABASE_URL,
                APP_CONFIG.SUPABASE_ANON_KEY
            );
            
            console.log('✅ Client Supabase créé');
            
            // Test de connexion
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
                if (error.message.includes('Invalid API key')) {
                    console.error('🚨 Clé API invalide');
                    throw new Error('Clé API invalide - vérifiez votre clé Supabase');
                } else {
                    console.warn('⚠️ Avertissement session:', error.message);
                }
            }
            
            console.log('✅ Connexion Supabase validée');
            isReady = true;
            resolve(supabase);
            
        } catch (error) {
            console.error('❌ Erreur initialisation Supabase:', error.message);
            supabase = null;
            isReady = false;
            resolve(null);
        }
    });
    
    return initPromise;
}

// ===================================
// SERVICES CRM UNIFIÉS
// ===================================

class AuthService {
    static async ensureReady() {
        if (!supabase || !isReady) {
            supabase = await initializeSupabase();
        }
        if (!supabase) {
            throw new Error('Service non disponible. Vérifiez votre configuration Supabase.');
        }
        return supabase;
    }
    
    static async getCurrentUser() {
        try {
            const client = await this.ensureReady();
            const { data: { user }, error } = await client.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('❌ Erreur getCurrentUser:', error);
            return null;
        }
    }
    
    static async login(email, password) {
        try {
            const client = await this.ensureReady();
            
            console.log('🔐 Tentative de connexion pour:', email);
            
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
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
                sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
                console.log('✅ Connexion réussie:', data.user.email);
            }
            
            return { success: true, user: data.user };
            
        } catch (error) {
            console.error('❌ Erreur de connexion:', error);
            return { 
                success: false, 
                error: error.message || 'Erreur de connexion' 
            };
        }
    }
    
    static async logout() {
        try {
            if (supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            }
            
            sessionStorage.removeItem('userInfo');
            console.log('✅ Déconnexion réussie');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            // Forcer la déconnexion même en cas d'erreur
            sessionStorage.removeItem('userInfo');
            window.location.href = 'index.html';
        }
    }
    
    static getUserInfo() {
        const userInfo = sessionStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }
    
    static isAdmin() {
        const userInfo = this.getUserInfo();
        return userInfo && userInfo.role === 'admin';
    }
    
    static async requireAuth() {
        const user = await this.getCurrentUser();
        if (!user) {
            console.log('⚠️ Accès non autorisé - redirection');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

class CRMService {
    static async ensureReady() {
        if (!supabase || !isReady) {
            supabase = await initializeSupabase();
        }
        if (!supabase) {
            throw new Error('Base de données non disponible');
        }
        return supabase;
    }
    
    static async getCompanies() {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('companies')
                .select(`
                    *,
                    company_contacts (
                        id,
                        first_name,
                        last_name,
                        email,
                        position,
                        phone,
                        contact_type,
                        is_admin_contact,
                        is_payment_contact,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getCompanies:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createCompany(companyData) {
        try {
            const client = await this.ensureReady();
            
            if (!companyData.name) {
                throw new Error('Le nom de la société est obligatoire');
            }
            
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
            console.error('❌ Erreur createCompany:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateCompany(id, companyData) {
        try {
            const client = await this.ensureReady();
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
            console.error('❌ Erreur updateCompany:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteCompany(id) {
        try {
            const client = await this.ensureReady();
            
            // Vérifier les licences associées
            const { data: licenses } = await client
                .from('company_licenses')
                .select('id')
                .eq('company_id', id);
                
            if (licenses && licenses.length > 0) {
                throw new Error('Impossible de supprimer une société qui a des licences actives');
            }
            
            const { error } = await client
                .from('companies')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur deleteCompany:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getContacts(companyId = null) {
        try {
            const client = await this.ensureReady();
            
            let query = client
                .from('company_contacts')
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (companyId) {
                query = query.eq('company_id', companyId);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getContacts:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createContact(contactData) {
        try {
            const client = await this.ensureReady();
            
            if (!contactData.company_id || !contactData.first_name || !contactData.last_name) {
                throw new Error('Société, prénom et nom sont obligatoires');
            }
            
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
            console.error('❌ Erreur createContact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateContact(id, contactData) {
        try {
            const client = await this.ensureReady();
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
            console.error('❌ Erreur updateContact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteContact(id) {
        try {
            const client = await this.ensureReady();
            const { error } = await client
                .from('company_contacts')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur deleteContact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicenses() {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('company_licenses')
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    ),
                    license_plans (
                        id,
                        name,
                        price_per_user,
                        features
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getLicenses:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createLicense(licenseData) {
        try {
            const client = await this.ensureReady();
            
            if (!licenseData.company_id || !licenseData.plan_id || !licenseData.license_count) {
                throw new Error('Société, plan et nombre de licences sont obligatoires');
            }
            
            const { data, error } = await client
                .from('company_licenses')
                .insert([{
                    ...licenseData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    ),
                    license_plans (
                        id,
                        name,
                        price_per_user,
                        features
                    )
                `);
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur createLicense:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateLicense(id, licenseData) {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('company_licenses')
                .update({
                    ...licenseData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        status
                    ),
                    license_plans (
                        id,
                        name,
                        price_per_user,
                        features
                    )
                `);
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur updateLicense:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteLicense(id) {
        try {
            const client = await this.ensureReady();
            
            // Supprimer d'abord les utilisateurs associés
            await client
                .from('license_users')
                .delete()
                .eq('company_license_id', id);
            
            const { error } = await client
                .from('company_licenses')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur deleteLicense:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async getLicensePlans() {
        try {
            const client = await this.ensureReady();
            const { data, error } = await client
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur getLicensePlans:', error);
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
            console.error('❌ Erreur getStats:', error);
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
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Date invalide';
    }
}

function formatDateShort(dateString) {
    if (!dateString) return 'Non défini';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    } catch (error) {
        return 'Date invalide';
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
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

function showError(message, duration = 5000) {
    console.error('🔴 Erreur:', message);
    
    let container = document.getElementById('error-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'error-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: #fee2e2;
        color: #dc2626;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #dc2626;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    errorDiv.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: 0.5rem;
        color: inherit;
    `;
    closeBtn.onclick = () => errorDiv.remove();
    
    errorDiv.appendChild(closeBtn);
    container.appendChild(errorDiv);
    
    if (duration > 0) {
        setTimeout(() => errorDiv.remove(), duration);
    }
}

function showSuccess(message, duration = 3000) {
    console.log('🟢 Succès:', message);
    
    let container = document.getElementById('success-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'success-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        background: #d1fae5;
        color: #065f46;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #10b981;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    successDiv.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: 0.5rem;
        color: inherit;
    `;
    closeBtn.onclick = () => successDiv.remove();
    
    successDiv.appendChild(closeBtn);
    container.appendChild(successDiv);
    
    if (duration > 0) {
        setTimeout(() => successDiv.remove(), duration);
    }
}

function showLoading(show = true) {
    let loader = document.getElementById('global-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 3rem;
                height: 3rem;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            
            loader.appendChild(spinner);
            
            if (!document.getElementById('spinner-styles')) {
                const style = document.createElement('style');
                style.id = 'spinner-styles';
                style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// ===================================
// INITIALISATION ET EXPOSITION GLOBALE
// ===================================

async function initCRMUnified() {
    console.log('🔧 Initialisation CRM unifiée...');
    
    // Initialiser Supabase
    await initializeSupabase();
    
    // Exposer les services globalement
    window.AuthService = AuthService;
    window.CRMService = CRMService;
    window.formatDate = formatDate;
    window.formatDateShort = formatDateShort;
    window.formatCurrency = formatCurrency;
    window.getInitials = getInitials;
    window.showError = showError;
    window.showSuccess = showSuccess;
    window.showLoading = showLoading;
    
    // Diagnostic unifié
    window.testConfig = function() {
        console.group('🔍 Diagnostic CRM Unifié');
        console.log('Source config:', CONFIG_SOURCE);
        console.log('Supabase URL:', APP_CONFIG.SUPABASE_URL);
        console.log('Has Key:', !!APP_CONFIG.SUPABASE_ANON_KEY);
        console.log('Key Length:', APP_CONFIG.SUPABASE_ANON_KEY?.length || 0);
        console.log('Supabase Library:', !!window.supabase);
        console.log('Supabase Client:', !!supabase);
        console.log('AuthService:', !!window.AuthService);
        console.log('CRMService:', !!window.CRMService);
        console.log('Is Ready:', isReady);
        console.groupEnd();
        
        if (!APP_CONFIG.SUPABASE_ANON_KEY) {
            console.warn('❌ Pas de clé Supabase - suivez les instructions ci-dessus');
        } else if (!supabase) {
            console.warn('❌ Client Supabase non initialisé');
        } else {
            console.log('✅ Configuration complète OK !');
        }
        
        return {
            configSource: CONFIG_SOURCE,
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            isReady: isReady,
            servicesAvailable: !!window.AuthService && !!window.CRMService
        };
    };
    
    // Signaler que tout est prêt
    window.dispatchEvent(new CustomEvent('crmConfigReady', {
        detail: {
            source: CONFIG_SOURCE,
            supabase: !!supabase,
            hasKey: !!APP_CONFIG.SUPABASE_ANON_KEY,
            ready: isReady
        }
    }));
    
    console.log('✅ CRM unifié prêt - Utilisez testConfig() pour diagnostiquer');
}

// Initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCRMUnified);
} else {
    initCRMUnified();
}

// Gestion des erreurs
window.addEventListener('error', (e) => {
    console.error('❌ Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promise rejetée:', e.reason);
    e.preventDefault();
});

console.log('📋 CRM Config Unifié chargé - Instructions adaptées à votre environnement ci-dessus');
