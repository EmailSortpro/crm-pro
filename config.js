// ===================================
// CONFIGURATION CRM PRO SÉCURISÉE v5.1
// Compatible navigateur sans modules ES6
// ===================================

// FONCTION DE DÉTECTION DE L'ENVIRONNEMENT
function detectEnvironment() {
    const hostname = window.location.hostname;
    const isNetlify = hostname.includes('netlify.app') ||
                     hostname.includes('netlifyapp.com') ||
                     hostname.includes('.netlify.com');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isProd = !isLocalhost;

    console.log('[CRM CONFIG] Environment detection:', {
        hostname,
        isNetlify,
        isLocalhost,
        isProd,
        origin: window.location.origin
    });

    return {
        type: isNetlify ? 'netlify' : isLocalhost ? 'localhost' : 'other',
        isNetlify,
        isLocalhost,
        isProd,
        hostname
    };
}

// FONCTION DE RÉCUPÉRATION DES VARIABLES D'ENVIRONNEMENT
function getEnvironmentConfig() {
    const env = detectEnvironment();
    
    let SUPABASE_URL = 'https://oxyiamruvyliueecpaam.supabase.co';
    let SUPABASE_ANON_KEY = '';

    // 1. PRODUCTION / NETLIFY - Variables d'environnement
    if (env.isProd && typeof process !== 'undefined' && process.env) {
        // Variables Netlify injectées au build
        SUPABASE_URL = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
        SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
        console.log('[CRM CONFIG] Using Netlify process.env variables');
    }
    
    // 2. Fallback via window.ENV (injection manuelle)
    if (!SUPABASE_ANON_KEY && window.ENV) {
        SUPABASE_URL = window.ENV.VITE_SUPABASE_URL || SUPABASE_URL;
        SUPABASE_ANON_KEY = window.ENV.VITE_SUPABASE_ANON_KEY || '';
        console.log('[CRM CONFIG] Using window.ENV variables');
    }

    // 3. DÉVELOPPEMENT LOCAL - Variables depuis localStorage
    if (env.isLocalhost && !SUPABASE_ANON_KEY) {
        // Essayer de récupérer depuis localStorage pour le dev
        const storedConfig = JSON.parse(localStorage.getItem('crmDevConfig') || '{}');
        SUPABASE_ANON_KEY = storedConfig.SUPABASE_ANON_KEY || '';
        
        if (!SUPABASE_ANON_KEY) {
            console.warn('[CRM CONFIG] Localhost: No Supabase key found. Use localStorage or window.ENV');
        }
    }

    return {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        environment: env
    };
}

// Configuration globale
const CONFIG = getEnvironmentConfig();
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;
const ENVIRONMENT = CONFIG.environment;

// Validation et logs
console.log('[CRM CONFIG] Configuration loaded:', {
    url: SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    keyLength: SUPABASE_ANON_KEY?.length || 0,
    environment: ENVIRONMENT.type
});

// Avertissement si pas de clé
if (!SUPABASE_ANON_KEY) {
    console.group('🚨 CONFIGURATION REQUISE');
    console.error('Variables d\'environnement manquantes : VITE_SUPABASE_ANON_KEY');
    
    if (ENVIRONMENT.isNetlify) {
        console.log('📋 NETLIFY - Étapes à suivre :');
        console.log('1. Dashboard Netlify → Site Settings → Environment Variables');
        console.log('2. Ajouter : VITE_SUPABASE_ANON_KEY=votre_cle_supabase');
        console.log('3. Redéployer le site');
    } else if (ENVIRONMENT.isLocalhost) {
        console.log('📋 LOCALHOST - Options :');
        console.log('1. Ajouter avant config.js: window.ENV = {VITE_SUPABASE_ANON_KEY: "votre_cle"}');
        console.log('2. Ou localStorage: localStorage.setItem("crmDevConfig", JSON.stringify({SUPABASE_ANON_KEY: "votre_cle"}))');
    }
    
    console.log('🔑 Sur Supabase : Dashboard → Settings → API → Copier "anon/public" key');
    console.groupEnd();
}

// ===================================
// INITIALISATION SUPABASE
// ===================================

let supabase = null;
let initializationPromise = null;

// Fonction d'initialisation Supabase (singleton)
function initializeSupabase() {
    // Si déjà en cours d'initialisation, retourner la promesse existante
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = new Promise((resolve) => {
        const attemptInit = () => {
            try {
                // Vérifier que Supabase est chargé et qu'on a une clé
                if (!window.supabase) {
                    throw new Error('Supabase library not loaded');
                }
                
                if (!SUPABASE_ANON_KEY) {
                    throw new Error('Supabase key not configured');
                }

                // Créer le client Supabase
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase client initialized');
                
                // Test de connexion
                supabase.auth.getSession()
                    .then(({ data, error }) => {
                        if (error && error.message.includes('Invalid API key')) {
                            console.error('🚨 Invalid Supabase API key');
                            if (typeof showError === 'function') {
                                showError('Configuration Supabase invalide. Vérifiez votre clé API.');
                            }
                        } else {
                            console.log('✅ Supabase connection validated');
                        }
                        resolve(supabase);
                    })
                    .catch(err => {
                        console.warn('⚠️ Supabase connection test failed:', err.message);
                        resolve(supabase); // Résoudre quand même pour permettre l'utilisation
                    });
            } catch (error) {
                console.error('❌ Supabase initialization failed:', error.message);
                resolve(null);
            }
        };

        // Si Supabase n'est pas encore chargé, attendre
        if (!window.supabase) {
            let attempts = 0;
            const checkSupabase = () => {
                attempts++;
                if (window.supabase) {
                    attemptInit();
                } else if (attempts < 50) { // 5 secondes max
                    setTimeout(checkSupabase, 100);
                } else {
                    console.error('❌ Supabase library failed to load');
                    resolve(null);
                }
            };
            checkSupabase();
        } else {
            attemptInit();
        }
    });

    return initializationPromise;
}

// ===================================
// SERVICE D'AUTHENTIFICATION
// ===================================

class AuthService {
    static async ensureSupabase() {
        if (!supabase) {
            supabase = await initializeSupabase();
            if (!supabase) {
                throw new Error('Supabase non disponible. Vérifiez votre configuration.');
            }
        }
        return supabase;
    }

    static async getCurrentUser() {
        try {
            const client = await this.ensureSupabase();
            const { data: { user }, error } = await client.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            return null;
        }
    }
    
    static async login(email, password) {
        try {
            const client = await this.ensureSupabase();
            
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Sauvegarder les infos utilisateur (sans données sensibles)
            if (data.user) {
                const userInfo = {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.user_metadata?.role || 'user',
                    created_at: data.user.created_at
                };
                sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Erreur connexion:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async logout() {
        try {
            if (supabase) {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
            }
            
            // Nettoyer le sessionStorage
            sessionStorage.removeItem('userInfo');
            
            // Rediriger vers la page de connexion
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            if (typeof showError === 'function') {
                showError('Erreur lors de la déconnexion');
            }
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
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

// ===================================
// SERVICE CRM
// ===================================

class CRMService {
    static log(action, data = null) {
        console.log(`🔄 CRM Service - ${action}`, data ? data : '');
    }

    static async ensureSupabase() {
        if (!supabase) {
            supabase = await initializeSupabase();
            if (!supabase) {
                throw new Error('Base de données non disponible. Vérifiez votre configuration.');
            }
        }
        return supabase;
    }

    // ========== SOCIÉTÉS ==========
    
    static async getCompanies() {
        try {
            this.log('Récupération des sociétés');
            const client = await this.ensureSupabase();
            
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
            
            if (error) {
                console.error('❌ Erreur Supabase getCompanies:', error);
                throw error;
            }
            
            this.log('Sociétés récupérées', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération sociétés:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createCompany(companyData) {
        try {
            this.log('Création société', companyData);
            const client = await this.ensureSupabase();

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
            
            if (error) {
                console.error('❌ Erreur création société:', error);
                throw error;
            }
            
            this.log('Société créée avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création société:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateCompany(id, companyData) {
        try {
            this.log('Mise à jour société', { id, data: companyData });
            const client = await this.ensureSupabase();
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            const { data, error } = await client
                .from('companies')
                .update({
                    ...companyData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) {
                console.error('❌ Erreur mise à jour société:', error);
                throw error;
            }
            
            if (!data || data.length === 0) {
                throw new Error('Société non trouvée');
            }
            
            this.log('Société mise à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour société:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteCompany(id) {
        try {
            this.log('Suppression société', { id });
            const client = await this.ensureSupabase();
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            // Vérifier s'il y a des licences associées
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
            
            if (error) {
                console.error('❌ Erreur suppression société:', error);
                throw error;
            }
            
            this.log('Société supprimée avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression société:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== CONTACTS ==========
    
    static async getContacts(companyId = null) {
        try {
            this.log('Récupération des contacts', { companyId });
            const client = await this.ensureSupabase();
            
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
            
            if (error) {
                console.error('❌ Erreur Supabase getContacts:', error);
                throw error;
            }
            
            this.log('Contacts récupérés', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération contacts:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createContact(contactData) {
        try {
            this.log('Création contact', contactData);
            const client = await this.ensureSupabase();

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
            
            if (error) {
                console.error('❌ Erreur création contact:', error);
                throw error;
            }
            
            this.log('Contact créé avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async updateContact(id, contactData) {
        try {
            this.log('Mise à jour contact', { id, data: contactData });
            const client = await this.ensureSupabase();
            
            const { data, error } = await client
                .from('company_contacts')
                .update({
                    ...contactData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();
            
            if (error) {
                console.error('❌ Erreur mise à jour contact:', error);
                throw error;
            }
            
            this.log('Contact mis à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour contact:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async deleteContact(id) {
        try {
            this.log('Suppression contact', { id });
            const client = await this.ensureSupabase();
            
            const { error } = await client
                .from('company_contacts')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression contact:', error);
                throw error;
            }
            
            this.log('Contact supprimé avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression contact:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== LICENCES ==========
    
    static async getLicenses() {
        try {
            this.log('Récupération des licences');
            const client = await this.ensureSupabase();
            
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
            
            if (error) {
                console.error('❌ Erreur Supabase getLicenses:', error);
                throw error;
            }
            
            this.log('Licences récupérées', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération licences:', error);
            return { success: false, error: error.message };
        }
    }

    static async createLicense(licenseData) {
        try {
            this.log('Création licence', licenseData);
            const client = await this.ensureSupabase();

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
            
            if (error) {
                console.error('❌ Erreur création licence:', error);
                throw error;
            }
            
            this.log('Licence créée avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur création licence:', error);
            return { success: false, error: error.message };
        }
    }

    static async updateLicense(id, licenseData) {
        try {
            this.log('Mise à jour licence', { id, data: licenseData });
            const client = await this.ensureSupabase();
            
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
            
            if (error) {
                console.error('❌ Erreur mise à jour licence:', error);
                throw error;
            }
            
            this.log('Licence mise à jour avec succès', data[0]);
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('❌ Erreur mise à jour licence:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteLicense(id) {
        try {
            this.log('Suppression licence', { id });
            const client = await this.ensureSupabase();
            
            // Supprimer d'abord les utilisateurs associés
            await client
                .from('license_users')
                .delete()
                .eq('company_license_id', id);
            
            const { error } = await client
                .from('company_licenses')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('❌ Erreur suppression licence:', error);
                throw error;
            }
            
            this.log('Licence supprimée avec succès');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression licence:', error);
            return { success: false, error: error.message };
        }
    }

    static async getLicensePlans() {
        try {
            this.log('Récupération des plans de licence');
            const client = await this.ensureSupabase();
            
            const { data, error } = await client
                .from('license_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_per_user', { ascending: true });
            
            if (error) {
                console.error('❌ Erreur Supabase getLicensePlans:', error);
                throw error;
            }
            
            this.log('Plans de licence récupérés', `${data?.length || 0} entrées`);
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ Erreur récupération plans de licence:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== STATISTIQUES ==========
    
    static async getStats() {
        try {
            this.log('Calcul des statistiques');
            
            const [companiesResult, licensesResult, contactsResult] = await Promise.all([
                this.getCompanies(),
                this.getLicenses(),
                this.getContacts()
            ]);
            
            if (!companiesResult.success || !licensesResult.success || !contactsResult.success) {
                throw new Error('Erreur récupération données pour statistiques');
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
            
            this.log('Statistiques calculées', stats);
            return { success: true, data: stats };
        } catch (error) {
            console.error('❌ Erreur calcul statistiques:', error);
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
    console.error('Erreur:', message);
    
    let errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'error-container';
        errorContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(errorContainer);
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification error';
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
        pointer-events: auto;
        animation: slideIn 0.3s ease;
    `;
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
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
        opacity: 0.8;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => errorDiv.remove();
    
    errorDiv.appendChild(closeBtn);
    errorContainer.appendChild(errorDiv);
    
    if (duration > 0) {
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, duration);
    }
}

function showSuccess(message, duration = 3000) {
    console.log('Succès:', message);
    
    let successContainer = document.getElementById('success-container');
    if (!successContainer) {
        successContainer = document.createElement('div');
        successContainer.id = 'success-container';
        successContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(successContainer);
    }
    
    const successDiv = document.createElement('div');
    successDiv.className = 'notification success';
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
        pointer-events: auto;
        animation: slideIn 0.3s ease;
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
        opacity: 0.8;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => successDiv.remove();
    
    successDiv.appendChild(closeBtn);
    successContainer.appendChild(successDiv);
    
    if (duration > 0) {
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, duration);
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
                backdrop-filter: blur(3px);
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
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
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

// Fonction de diagnostic
function diagnoseCRMConfig() {
    console.group('🔍 CRM Config Diagnostic');
    console.log('Environment:', ENVIRONMENT.type);
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Has Supabase Key:', !!SUPABASE_ANON_KEY);
    console.log('Key Length:', SUPABASE_ANON_KEY?.length || 0);
    console.log('Supabase Client:', !!supabase);
    console.log('Window Supabase Library:', !!window.supabase);
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('💡 Pour configurer temporairement:');
        console.warn('window.ENV = {VITE_SUPABASE_ANON_KEY: "votre_cle"}');
    }
    
    console.groupEnd();
}

// ===================================
// INITIALISATION GLOBALE
// ===================================

// Fonction d'initialisation qui attend le DOM et Supabase
async function initializeCRMConfig() {
    console.log('🚀 CRM Pro Config v5.1 - Initializing...');
    
    // Attendre que Supabase soit disponible
    let attempts = 0;
    while (!window.supabase && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabase) {
        console.error('❌ Supabase library not loaded');
        return;
    }
    
    // Initialiser Supabase
    await initializeSupabase();
    
    // Exposer les services et utilitaires globalement
    window.AuthService = AuthService;
    window.CRMService = CRMService;
    window.formatDate = formatDate;
    window.formatDateShort = formatDateShort;
    window.formatCurrency = formatCurrency;
    window.getInitials = getInitials;
    window.showError = showError;
    window.showSuccess = showSuccess;
    window.showLoading = showLoading;
    window.diagnoseCRMConfig = diagnoseCRMConfig;
    
    // Signaler que la configuration est prête
    window.dispatchEvent(new CustomEvent('crmConfigReady', {
        detail: {
            supabase: !!supabase,
            environment: ENVIRONMENT.type,
            hasKey: !!SUPABASE_ANON_KEY
        }
    }));
    
    console.log('✅ CRM Pro Config ready!');
    
    // Diagnostic automatique en dev
    if (ENVIRONMENT.isLocalhost) {
        setTimeout(diagnoseCRMConfig, 1000);
    }
}

// Attendre le chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCRMConfig);
} else {
    // DOM déjà chargé
    initializeCRMConfig();
}

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    console.error('Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejetée:', e.reason);
    e.preventDefault();
});

console.log('📝 CRM Pro Config v5.1 loaded - Use diagnoseCRMConfig() for troubleshooting');
