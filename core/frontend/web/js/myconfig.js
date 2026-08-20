//------------------------------------------------------
// ES6-konvertering: Grundstruktur för my.supportnet.se
//-------------------------------------------------------

//-------------------------------------------------------
// myconfig.js (ligger i frontend/)
//--------------------------------------------------------
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
export const BASE_URL = LOCAL_HOSTS.has(window.location.hostname)
    ? ""
    : "https://my.supportnet.se";

export const ENDPOINTS = {
    // ====================== 📁 Användare ======================
    allUsers: `${BASE_URL}/api/users`,                           // Hämtar alla användare
    users: `${BASE_URL}/api/contracts/:id/users`,               // Hämtar användare för kontrakt
    addUser: `${BASE_URL}/api/users`,                            // Lägger till ny användare
    adminAddUser: `${BASE_URL}/api/admin/users`,                 // Admin skapar användare
    updateUser: (userId) => `${BASE_URL}/api/users/${userId}`,  // Uppdaterar användare
    deleteUser: (userId) => `${BASE_URL}/api/users/${userId}`,  // Tar bort användare
    login: `${BASE_URL}/userapi/login`,                          // Inloggning
    registerUser: `${BASE_URL}/api/users`,                       // Registrerar användare
    sendWelcome: `${BASE_URL}/api/send_welcome_email`,          // Skickar välkomstmail

// ====================== 📁 Kontrakt & Bransch ======================
    contracts: `${BASE_URL}/api/contracts`,                     // Hämtar alla kontrakt

    industries: `${BASE_URL}/api/industries/`,                  // Hämtar alla branscher
    addIndustry: `${BASE_URL}/api/industries/`,                 // Skapar ny bransch
    updateIndustry: (id) => `${BASE_URL}/api/industries/${id}`, // Uppdaterar bransch
    deleteIndustry: (id) => `${BASE_URL}/api/industries/${id}`, // Raderar bransch

    // ====================== 📁 Ekonomi – Transaktioner ======================
    ecoTransactions: `${BASE_URL}/api/eco/transactions`,         // Hämtar alla transaktioner
    ecoTransactionById: (id) => `${BASE_URL}/api/eco/transactions/${id}`, // Hämtar en transaktion
    ecoAddTransaction: `${BASE_URL}/api/eco/add-transaction`,    // Lägger till transaktion
    ecoUpdateTransaction: (id) => `${BASE_URL}/api/eco/update-transaction/${id}`, // Uppdaterar transaktion

    // ====================== 📁 Ekonomi – Moms & Skatt ======================
    ecoVatSummary: `${BASE_URL}/api/eco/vat-summary`,            // Lägger till moms/skatt-avstämning
    ecoBalance: `${BASE_URL}/api/eco/balance`,                   // Hämtar saldo
    ecoVatTransactions: (page, limit) => `${BASE_URL}/api/eco/vat-transactions?page=${page}&limit=${limit}`, // (❌ ej implementerad)

    // ====================== 📁 Ekonomi – Inställningar ======================
    ecoSettingsGet: `${BASE_URL}/api/eco/settings/1`,           // Hämtar inställningar för kontrakt 1
    ecoSettingsUpdate: `${BASE_URL}/api/eco/settings/1`,        // Uppdaterar inställningar för kontrakt 1

    // ====================== 📁 Tjänster ======================
    submitService: `${BASE_URL}/api/submit-service`,             // Lägger till ny tjänst
    updateService: `${BASE_URL}/api/update-service`,             // Uppdaterar tjänst

    // ====================== 📁 Blogg ======================
    blogList: `${BASE_URL}/api/blogposts`,                       // Hämtar alla blogginlägg
    likePost: (id) => `${BASE_URL}/api/blogposts/${id}/like`,   // Gillar blogginlägg

    // ====================== 📁 Kontakt & System ======================
    sendContact: `${BASE_URL}/api/send_contact_email`,           // Skickar kontaktformulär
    checkEmail: `${BASE_URL}/api/check-email`,                   // Kollar om e-post finns
    cookie: `${BASE_URL}/cookie`,                                // Hantering av cookies (kan byggas ut)

};

export const API_VERSION = "v1";


//===========================================================================================================
// Alla JS-filer ska ha type="module" i HTML
// <script type="module" src="../jscripts/filnamn.js"></script>

// Alla tidigare BASE_URL-varianter ska bytas till import från myconfig.js
// Alla andra globala config-värden (headers, version, env) kan samlas här

// Plan: Gå igenom alla HTML och JS under frontend/jscripts/ och frontend/pages/
// - Säkra att endast "type=module" används
// - Ta bort alla window.BASE_URL
// - Byt till import/export där det behövs
// - Testa varje modul separat

// Detta är version 1.0 – hålls uppdaterad under konvertering
