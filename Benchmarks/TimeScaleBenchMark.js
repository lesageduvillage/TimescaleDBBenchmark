//This file is made to benchmark the time scale DB
//It will connect to the DB and insert data into it and log the time it takes to insert the data
const pgp = require('pg-promise')();

//Connect to the Docker hosted TimeScaleDB (You might need to change the host and ports)
const connection = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};

const db = pgp(connection);

const categories = ['open', 'high', 'low', 'close', 'volume', 'adj_close'];
const companies = ['AAPL', 'GOOG', 'MSFT', 'AMZN', 'FB', 'TSLA', 'NVDA', 'INTC', 'CSCO', 'CMCSA'];
async function insertDataIntoTimeScale(){
    const start = Date.now();
    for(let dayIndex = 0; dayIndex < 365; dayIndex++){
        for (let companyIndex = 0; companyIndex < 10; companyIndex++){
            for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++){
                await db.none('INSERT INTO stocks (time, symbol, category, value) VALUES ($1, $2, $3, $4)', [new Date(), companies[companyIndex], categories[categoryIndex], Math.random() * 1000]);
            }
        }
    }
    const end = Date.now();
    console.log(`Time it took to insert one year of data for 10 companies into timescaleDB: ${end-start}ms`);
}

insertDataIntoTimeScale();