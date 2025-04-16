// Koda

function tPlus3Cipher(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // För versaler (A-Z) och gemener (a-z)
        if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 + 3) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            return String.fromCharCode(((code - 97 + 3) % 26) + 97);
        // Hantera å, ä, ö genom att flytta tecknen
        } else if (char === 'å') {
            return 'ä';
        } else if (char === 'ä') {
            return 'ö';
        } else if (char === 'ö') {
            return 'å';
        } else {
            return char; // Lämnar andra tecken som de är
        }
    }).join('');
}


//Avkoda
function tMinus3Decipher(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        // För versaler (A-Z) och gemener (a-z)
        if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 - 3 + 26) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            return String.fromCharCode(((code - 97 - 3 + 26) % 26) + 97);
        // Hantera å, ä, ö genom att backa tecknen
        } else if (char === 'å') {
            return 'ö';
        } else if (char === 'ä') {
            return 'å';
        } else if (char === 'ö') {
            return 'ä';
        } else {
            return char; // Lämnar andra tecken som de är
        }
    }).join('');
}

const meddelande = "älskar dig mitt hjärta och tack för att du finns i mitt liv varje dag med dig känns underbart bara du";
const krypterat = tPlus3Cipher(meddelande);
const avkodat = tMinus3Decipher(krypterat);

console.log("🍏 Krypterat: " + krypterat);
console.log("🔓 Avkodat: " + avkodat);