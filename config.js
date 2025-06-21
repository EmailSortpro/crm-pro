// ===================================
// CONFIGURATION SUPABASE SÉCURISÉE
// ===================================

// Configuration sécurisée avec variables d'environnement
// Utilisation de window.ENV pour les variables d'environnement en production
const SUPABASE_URL = window.ENV?.VITE_SUPABASE_URL || 'https://oxyiamruvyliueecpaam.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.VITE_SUPABASE_ANON_KEY || '';

// Validation des variables d'environnement
if (!SUPABASE_ANON_KEY) {
    console.error('🚨 ERREUR: VITE_SUPABASE_ANON_KEY manquante dans les variables d\'environnement');
    console.warn('Veuillez configurer les variables d\'environnement sur Netlify');
}

// Initialisation du client Supabase avec gestion d'erreur
let supabase = null;

// Attendre que Supabase soit chargé
function initializeSupabase() {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.supabase && SUPABASE_ANON_KEY) {
            try {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Connexion Supabase initialisée');
                
                // Test de connexion sécurisé
                supabase.auth.getSession().then(({ data, error }) => {
                    if (error && error.message.includes('Invalid API key')) {
                        console.error('🚨 Clé API Supabase invalide');
                    } else {
                        console.log('✅ Connexion Supabase validée');
                    }
                    resolve(supabase);
                }).catch(err => {
                    console.warn('⚠️ Test de connexion Supabase échoué:', err.message);
                    resolve(supabase);
                });
            } catch (error) {
                console.error('❌ Erreur initialisation Supabase:', error.message);
                resolve(null);
            }
        } else {
            console.warn('⚠️ Supabase client non disponible ou clé manquante');
            resolve(null);
        }
    });
}

// ===================================
// GESTION DE L'AUTHENTIFICATION
// ===================================

class AuthService {
    static async getCurrentUser() {
        try {
            if (!supabase) {
                await initializeSupabase();
                if (!supabase) {
                    throw new Error('Supabase non initialisé');
                }
            }
            
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            return null;
        }
    }
    
    static async login(email, password) {
        try {
            if (!supabase) {
                await initializeSupabase();
                if (!supabase) {
                    throw new Error('Service non disponible');
                }
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
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
            showError('Erreur lors de la déconnexion');
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
// SERVICE DE DONNÉES CRM
// ===================================

class CRMService {
    // Méthode utilitaire pour les logs
    static log(action, data = null) {
        console.log(`🔄 CRM Service - ${action}`, data ? data : '');
    }

    // Méthode utilitaire pour valider la connexion
    static async validateConnection() {
        if (!supabase) {
            await initializeSupabase();
            if (!supabase) {
                throw new Error('Base de données non disponible. Vérifiez votre configuration.');
            }
        }
    }

    // ========== SOCIÉTÉS ==========
    
    static async getCompanies() {
        try {
            this.log('Récupération des sociétés');
            await this.validateConnection();
            
            const { data, error } = await supabase
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
            await this.validateConnection();

            // Validation des données
            if (!companyData.name) {
                throw new Error('Le nom de la société est obligatoire');
            }
            
            const { data, error } = await supabase
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
            await this.validateConnection();
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            const { data, error } = await supabase
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
            await this.validateConnection();
            
            if (!id) {
                throw new Error('ID de société manquant');
            }
            
            // Vérifier s'il y a des licences associées
            const { data: licenses } = await supabase
                .from('company_licenses')
                .select('id')
                .eq('company_id', id);
                
            if (licenses && licenses.length > 0) {
                throw new Error('Impossible de supprimer une société qui a des licences actives');
            }
            
            const { error } = await supabase
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
    
    // ... (reste du code CRMService identique)
}

// ===================================
// UTILITAIRES GÉNÉRAUX
// ===================================

// Formatage des dates
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

// Formatage des montants
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
    
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Génération d'initiales
function getInitials(firstName, lastName) {
    if (!firstName && !lastName) return '??';
    
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

// Gestion des erreurs
function showError(message, duration = 5000) {
    console.error('Erreur:', message);
    
    // Créer ou réutiliser le conteneur d'erreurs
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
    
    // Créer le message d'erreur
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
    
    // Ajouter les keyframes d'animation
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
    
    // Ajouter le bouton de fermeture
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
    
    // Auto-suppression
    if (duration > 0) {
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, duration);
    }
}

// Gestion des succès
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

// Loading overlay
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
            
            // Ajout des keyframes pour l'animation
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

// Gestion des timeouts pour éviter les blocages
function withTimeout(promise, timeoutMs = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
    ]);
}

// ===================================
// INITIALISATION
// ===================================

// Initialiser Supabase au chargement
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSupabase();
    
    // Rendre les services disponibles globalement
    window.AuthService = AuthService;
    window.CRMService = CRMService;
    window.formatDate = formatDate;
    window.formatDateShort = formatDateShort;
    window.formatCurrency = formatCurrency;
    window.getInitials = getInitials;
    window.showError = showError;
    window.showSuccess = showSuccess;
    window.showLoading = showLoading;
    window.withTimeout = withTimeout;
    
    console.log('🚀 Configuration CRM Pro sécurisée chargée');
});

// Gestion globale des erreurs
window.addEventListener('error', (e) => {
    console.error('Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejetée:', e.reason);
    e.preventDefault();
});

// Message d'avertissement si pas de clé
if (!SUPABASE_ANON_KEY) {
    console.warn(`
🚨 CONFIGURATION REQUISE 🚨

Variables d'environnement manquantes :
- VITE_SUPABASE_ANON_KEY

📋 ÉTAPES POUR CORRIGER :

1. Sur Netlify :
   Dashboard → Site Settings → Environment Variables
   Ajouter : VITE_SUPABASE_ANON_KEY=votre_nouvelle_cle

2. En local :
   Créer un fichier .env avec :
   VITE_SUPABASE_ANON_KEY=votre_nouvelle_cle

3. Sur Supabase :
   Dashboard → Settings → API → Régénérer "anon" key
    `);
}
