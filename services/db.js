const pg = require('pg');

const config = {
  user: 'postgres', //this is the db user credential
  database: 'QuickCredit',
  password: 'admin',
  port: 5555,
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000,
};

const pool = new pg.Pool(config);

const createTables = () => {

  // users table
  const userTable = `CREATE TABLE IF NOT EXISTS users
                      (   id SERIAL PRIMARY KEY    NOT NULL,
                          firstName         VARCHAR(255)     NOT NULL,
                          lastName          VARCHAR(255)     NOT NULL,
                          email             VARCHAR(255)     NOT NULL,
                          password          VARCHAR(255)     NOT NULL,
                          status VARCHAR(100)  DEFAULT 'unverified',
                          isAdmin           BOOLEAN    NOT NULL           
                          )`;

// loans table
const loanTable = `CREATE TABLE IF NOT EXISTS loans
      (   id SERIAL PRIMARY KEY    NOT NULL,
          user         VARCHAR(255)     NOT NULL,
          tenor        INTEGER   NOT NULL,
          amount       INTEGER   NOT NULL,
          interest     INTEGER   NOT NULL,
          paymentInstallment     INTEGER   NOT NULL,
          balance     INTEGER   NOT NULL,
          repaid VARCHAR(100)  DEFAULT false,
          status VARCHAR(100)  DEFAULT 'pending',          
          createdOn TIMESTAMP DEFAULT NOW()
          )`

// repayments table

const loanRepaymentTable = `CREATE TABLE IF NOT EXISTS repayments
      (   id SERIAL PRIMARY KEY    NOT NULL,
          userId       INTEGER     NOT NULL,
          amount       INTEGER   NOT NULL,
          loanId     INTEGER   NOT NULL,         
          createdOn     DATE     NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
          FOREIGN KEY (loanId) REFERENCES loans (id)
          ON UPDATE CASCADE ON DELETE CASCADE
        )`;
  const createTablesQuery = `${userTable};${loanTable};${loanRepaymentTable};`
  pool.query(createTablesQuery)
  .then((res) => {
  console.log(res);
  pool.end();
  })
  .catch((err) => {
  console.log(err);
  pool.end();
  });
}

pool.on('remove', () => {
  console.log('client removed');
  process.exit(0);
});


//export pool and createTables to be accessible  from an where within the application
module.exports = {
  createTables,
  pool,
};

require('make-runnable');