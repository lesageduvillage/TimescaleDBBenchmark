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
        //delete all the data from the table
        console.log('Connected to DB');
    } catch (error) {
        console.log('Waiting for TimeScaleDB to start');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForDatabase();
    }
}

async function insertDataIntoTimeScale(){
    await waitForDatabase();
    await db.none('TRUNCATE stocks')
    console.log('Inserting data into TimeScaleDB');
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
    await db.none('TRUNCATE old_stocks')
    console.log('Inserting data into Postgres');
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
                currentValues.values[date.toISOString().split('T')[0]] = Math.random()*1000;
                await db.none('UPDATE old_stocks SET values = $1 WHERE symbol = $2 AND category = $3', [currentValues.values, companies[companyIndex], categories[categoryIndex]]);

            }
        }
    }
    const end = Date.now();
    console.log(`Time it took to insert one year of data for 10 companies into postgres: ${end-start}ms`);
}

async function insertDataIntoPostgresWithJsonB() {
    await waitForDatabase();
    console.log('Inserting data into Postgres with jsonb');
    await db.none('TRUNCATE jsonb_stocks');
    const start = Date.now();

    for (let companyIndex = 0; companyIndex < 10; companyIndex++) {
        for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++) {
            await db.none('INSERT INTO jsonb_stocks (category, values, symbol) VALUES ($1, $2, $3)', [categories[categoryIndex],[],companies[companyIndex]]);
            var date = new Date();
            for(let dayIndex = 0; dayIndex < 365; dayIndex++) {
                date.setDate(date.getDate() + 1);
                // add the new value to the current values
                await db.none('UPDATE jsonb_stocks SET values = values || $1::jsonb WHERE symbol = $2 AND category = $3', [JSON.stringify([{date: date.toISOString().split('T')[0], value: Math.random()*1000}]), companies[companyIndex], categories[categoryIndex]]);
            }
        }
    }
    const end = Date.now();
    console.log(`Time it took to insert one year of data for 10 companies into postgres with jsonb: ${end-start}ms`);

}

// Now we will be testing the time it takes to update a single day of data for a single company
async function updateDataInTimeScale(){
    await insertDataIntoTimeScale();
    console.log('Updating data in TimeScaleDB');
    // add a date to the database to update
    var date = new Date().toISOString().split('T')[0];
    for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++){
        await db.none('INSERT INTO stocks (time, symbol, category, value) VALUES ($1, $2, $3, $4)', [date, companies[0], categories[categoryIndex], Math.random() * 1000]);
    }
    const start = Date.now();
    for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++){
            await db.none('UPDATE stocks SET value = $1 WHERE time = $2 AND symbol = $3 AND category = $4', [Math.random() * 1000, date, companies[0], categories[categoryIndex]]);
    }

    const end = Date.now();
    console.log(`Time it took to update one day of data for one company in timescaleDB: ${end-start}ms`);
}

async function updateDataInPostgres(){
    await insertDataIntoPostgres();
    console.log('Updating data in Postgres');
    // add a date to the database to update
    var date = new Date().toISOString().split('T')[0];
    const start = Date.now();
    for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++){
        const currentValues = await db.one('SELECT values FROM old_stocks WHERE symbol = $1 AND category = $2', [companies[0], categories[categoryIndex]]);
        currentValues.values[date] = Math.random()*1000;
        await db.none('UPDATE old_stocks SET values = $1 WHERE symbol = $2 AND category = $3', [currentValues.values, companies[0], categories[categoryIndex]]);
    }
    const end = Date.now();
    console.log(`Time it took to update one day of data for one company in postgres: ${end-start}ms`);
}

async function updateDataInPostgresWithJsonB(){
    console.log('Updating data in Postgres with jsonb');
    // add a date to the database to update
    var date = "2024-02-10";
    const start = Date.now();
    const query = `
  UPDATE jsonb_stocks
  SET values = (
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'date' = '${date}' THEN jsonb_set(elem, '{value}', $1::jsonb)
        ELSE elem
      END
    )
    FROM jsonb_array_elements(jsonb_stocks.values) AS elem
  ) WHERE symbol = $2 AND category = $3
`;
    for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++) {
        await db.none(query, [JSON.stringify(69.445), companies[0], categories[categoryIndex]]);

    }

    const end = Date.now();
    console.log(`Time it took to update one day of data for one company in postgres with jsonb: ${end-start}ms`);
}

//insertDataIntoPostgres();
//insertDataIntoTimeScale();
//insertDataIntoPostgresWithJsonB();
//Wait for the data to be inserted before updating it

async function runAllTests(){
    //await updateDataInTimeScale();
    //await updateDataInPostgres();
    await updateDataInPostgresWithJsonB();
}

runAllTests();

