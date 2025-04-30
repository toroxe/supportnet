//------------------------------------------------------
// ES6-konvertering: Grundstruktur för my.supportnet.se
//-------------------------------------------------------

//-------------------------------------------------------
// myconfig.js (ligger i frontend/)
//--------------------------------------------------------
export const BASE_URL = "https://my.supportnet.se";

export const ENDPOINTS = {
    industries: `${BASE_URL}/api/industries/`,  // <--- med avslutande /
    contracts: `${BASE_URL}/api/contracts`,
    allUsers: `${BASE_URL}/api/users`,
    users: `${BASE_URL}/api/contracts/:id/users`,
    addUser: `${BASE_URL}/api/users`,
    updateUser: (userId) => `${BASE_URL}/api/users/${userId}`,
    deleteUser: (userId) => `${BASE_URL}/api/users/${userId}`,
    login: `${BASE_URL}/userapi/login`,
    cookie: `${BASE_URL}/cookie`, // ev. senare: logout, cookies, survey, etc.    
    checkEmail: `${BASE_URL}/api/check-email`,
    submitService: `${BASE_URL}/api/submit-service`,
    updateService: `${BASE_URL}/api/update-service`,
    blogList: `${BASE_URL}/api/blogposts`,
    likePost: (id) => `${BASE_URL}/api/blogposts/${id}/like`,
    sendContact: `${BASE_URL}/api/send_contact_email`,
    registerUser: `${BASE_URL}/api/users`,
    sendWelcome: `${BASE_URL}/api/send_welcome_email`,
    ecoSettingsGet: `${BASE_URL}/api/eco/settings/1`,
    ecoSettingsUpdate: `${BASE_URL}/api/eco/settings/1`,
    ecoTransactions: `${BASE_URL}/api/eco/transactions`,
    ecoUpdateTransaction: (id) => `${BASE_URL}/api/eco/update-transaction/${id}`,
    ecoAddTransaction: `${BASE_URL}/api/eco/add-transaction`,
    ecoBalance: `${BASE_URL}/api/eco/balance`,
    ecoVatSummary: `${BASE_URL}/api/eco/vat-summary`,
    ecoVatTransactions: (page, limit) => `${BASE_URL}/api/eco/vat-transactions?page=${page}&limit=${limit}`,
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

