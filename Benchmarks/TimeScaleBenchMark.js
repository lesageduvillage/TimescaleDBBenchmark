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

async function waitForDatabase(){
    try {
        await db.connect();
        console.log('Connected to DB');
    } catch (error) {
        console.log('Waiting for TimeScaleDB to start');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForDatabase();
    }
}

async function insertDataIntoTimeScale(){
    await waitForDatabase();
    const start = Date.now();
    var date = new Date();
    for(let dayIndex = 0; dayIndex < 365; dayIndex++){
        //Declare the date and increment it every dayIndex
        date.setDate(date.getDate() + 1);
        for (let companyIndex = 0; companyIndex < 10; companyIndex++){
            for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++){
                await db.none('INSERT INTO stocks (time, symbol, category, value) VALUES ($1, $2, $3, $4)', [date, companies[companyIndex], categories[categoryIndex], Math.random() * 1000]);
            }
        }
    }
    const end = Date.now();
    console.log(`Time it took to insert one year of data for 10 companies into timescaleDB: ${end-start}ms`);
}

async function insertDataIntoPostgres() {
    await waitForDatabase();
    const start = Date.now();
    var date = new Date();
    for (let companyIndex = 0; companyIndex < 10; companyIndex++) {
        for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++) {
            await db.none('INSERT INTO old_stocks (category, values, symbol) VALUES ($1, $2, $3)', [categories[categoryIndex],{},companies[companyIndex]]);

            for(let dayIndex = 0; dayIndex < 365; dayIndex++) {
                //Declare the date and increment it every dayIndex
                date.setDate(date.getDate() + 1);
                //get the current values for the company and category
                const currentValues = await db.one('SELECT values FROM old_stocks WHERE symbol = $1 AND category = $2', [companies[companyIndex], categories[categoryIndex]]);
                //add the new value to the current values
                currentValues.values[date.toISOString().split('T')[0]] = Math.random()*1000;
                await db.none('UPDATE old_stocks SET values = $1', [currentValues.values]);

            }
        }
    }
    const end = Date.now();
    console.log(`Time it took to insert one year of data for 10 companies into postgres: ${end-start}ms`);


}
insertDataIntoTimeScale();
insertDataIntoPostgres();