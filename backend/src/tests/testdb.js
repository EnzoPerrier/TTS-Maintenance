const db = require("../config/db.js");

async function test() {
    try {
        const [rows] = await db.query("SELECT 1 + 1 AS result");
        console.log("Connexion OK ! Test SQL:", rows[0].result);
    } catch (err) {
        console.error("Erreur de connexion:", err);
    } finally {
        db.end();
    }
}

test();
