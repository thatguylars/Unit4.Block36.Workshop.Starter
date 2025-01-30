const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL ||
    "postgres://postgres:123@localhost:5432/acme_auth_store_db",
);
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "shhh";

const createTables = async () => {
  const SQL = `
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS skill;
    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE skill(
      id UUID PRIMARY KEY,
      name VARCHAR(20)
    );
    CREATE TABLE favorites(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      skill_id UUID REFERENCES skill(id) NOT NULL,
      CONSTRAINT unique_user_id_and_skill_id UNIQUE (user_id, skill_id)
    );
  `;
  await client.query(SQL);
};

const createUser = async ({ username, password }) => {
  const SQL = `
    INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING *
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    await bcrypt.hash(password, 5),
  ]);
  return response.rows[0];
};

const createSkill = async ({ name }) => {
  const SQL = `
    INSERT INTO skill(id, name) VALUES($1, $2) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), name]);
  return response.rows[0];
};

const createFavorite = async ({ user_id, skill_id }) => {
  const SQL = `
    INSERT INTO favorites(id, user_id, skill_id) VALUES($1, $2, $3) RETURNING *
  `;
  const response = await client.query(SQL, [uuid.v4(), user_id, skill_id]);
  return response.rows[0];
};

const destroyFavorite = async ({ user_id, id }) => {
  const SQL = `
    DELETE FROM favorites WHERE user_id=$1 AND id=$2
  `;
  await client.query(SQL, [user_id, id]);
};

const authenticate = async ({ username, password }) => {
  const SQL = `
    SELECT id, password
    FROM users
    WHERE username = $1
  `;
  const response = await client.query(SQL, [username]);

  if (!response.rows.length) {
    const error = new Error("User not found");
    error.status = 401;
    throw error;
  }

  const storedHash = response.rows[0].password;

  try {
    const match = await bcrypt.compare(password, storedHash);
    if (!match) {
      throw new Error("Invalid password");
    }

    const token = await jwt.sign({ id: response.rows[0].id }, JWT_SECRET);
    return { token };
  } catch (error) {
    throw new Error("Authentication failed");
  }
};

const findUserByToken = async (token) => {
  console.log(token);
  let id;
  try {
    const tokenWithoutBearer = token.replace("Bearer ", "");

    const payload = await jwt.verify(tokenWithoutBearer, JWT_SECRET);
    console.log("Decoded payload:", payload);
    id = payload.id;
  } catch (ex) {
    console.error("Error verifying token:", ex);
    throw new Error("Unauthorized");
  }

  const SQL = `
    SELECT id, username
    FROM users
    WHERE id = $1
  `;
  const response = await client.query(SQL, [id]);
  if (!response.rows.length) {
    throw new Error("User not found");
  }
  return response.rows[0];
};

const fetchUsers = async () => {
  const SQL = `
    SELECT id, username FROM users;
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchSkills = async () => {
  const SQL = `
    SELECT * FROM skill;
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchFavorites = async (user_id) => {
  const SQL = `
    SELECT * FROM favorites where user_id = $1
  `;
  const response = await client.query(SQL, [user_id]);
  return response.rows;
};

module.exports = {
  client,
  createTables,
  createUser,
  createSkill,
  fetchUsers,
  fetchSkills,
  fetchFavorites,
  createFavorite,
  destroyFavorite,
  authenticate,
  findUserByToken,
};
