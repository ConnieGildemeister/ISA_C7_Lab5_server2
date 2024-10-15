// Note: ChatGPT was used to generate this code.

require('dotenv').config();
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const database = require('./database');

// Create the patients table if it doesn't exist
const initializeDatabase = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS patients (
            patientId INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            dateOfBirth DATETIME NOT NULL
        ) ENGINE=InnoDB;
    `;

    try {
        await database.query(query);
        console.log('Patient table is ready.');
    } catch (error) {
        console.error('Failed to create table:', error);
    }
};

// Validate incoming SQL queries
const validateSQLQuery = (sql, method) => {
    const upperCaseSQL = sql.toUpperCase().trim();
    if (method === 'POST') {
        return upperCaseSQL.startsWith('INSERT') && !upperCaseSQL.match(/(DROP|DELETE|UPDATE)/);
    }
    if (method === 'GET') {
        return upperCaseSQL.startsWith('SELECT') && !upperCaseSQL.match(/(DROP|DELETE|UPDATE)/);
    }
    return false;
};

// Set CORS headers for the response
const applyCORS = (response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Main request handler function
const handleRequest = async (req, res) => {
    applyCORS(res);

    let body = '';
    // Collect the request body
    req.on('data', chunk => body += chunk);

    // Process the request
    req.on('end', async () => {
        const parsedUrl = url.parse(req.url, true);
        const method = req.method;

        // Handle POST requests for SQL queries
        if (method === 'POST' && parsedUrl.pathname === '/sql') {
            const { sql } = querystring.parse(body);

            // Validate the SQL query
            if (!validateSQLQuery(sql, 'POST')) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Only INSERT queries are allowed via POST' }));
            }

            // Execute the SQL query
            try {
                await database.query(sql);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Row inserted successfully' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'SQL Error: ' + error.message }));
            }

        // Handle GET requests for SQL queries
        } else if (method === 'GET' && parsedUrl.pathname.startsWith('/sql')) {
            const sql = decodeURIComponent(parsedUrl.pathname.split('/sql/')[1]);

            // Validate the SQL query
            if (!validateSQLQuery(sql, 'GET')) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Only SELECT queries are allowed via GET' }));
            }

            // Execute the SQL query
            try {
                const results = await database.query(sql);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(results));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'SQL Error: ' + error.message }));
            }

        // Handle invalid requests
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    });
};

// Create the server and listen on port 3000
const server = http.createServer(handleRequest);
initializeDatabase();
server.listen(3000, async () => {
    console.log('Server is running on port 3000');
    await initializeDatabase(); // Initialize the database when the server starts
});
