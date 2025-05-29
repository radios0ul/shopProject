import mysql, { Connection } from "mysql2/promise";

export async function initDataBase(): Promise<Connection | null> {
  let connection: Connection | null = null;

  const host = process.env.LOCAL_PATH;
const dbPort = Number(process.env.DB_PORT);
const dbPassword = process.env.DB_PASSWORD;
const dbUserName = process.env.DB_USER_NAME;
const dbName = process.env.DB_NAME;

//const { DB_HOST, DB_PORT, DB_PASSWORD, DB_USER, DB_NAME } = process.env;

  try {
    connection = await mysql.createConnection({
      host: host,
      port: dbPort,
      password: dbPassword,
      user: dbUserName,
      database: dbName, 
    });
  } catch (e) {
    console.error(e.message || e);
    return null;
  }

  console.log(`Connection to DB ProductsApplication established`);

  return connection;
}
