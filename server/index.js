const {
  client,
  createTables,
  createUser,
  createSkill,
  createFavorite,
  fetchUsers,
  fetchSkills,
  fetchFavorites,
  destroyFavorite,
  authenticate,
  findUserByToken,
} = require("./db");

const express = require("express");
const app = express();
app.use(express.json());
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "shhh";

//for deployment only
const path = require("path");
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/dist/index.html")),
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "../client/dist/assets")),
);

const isLoggedIn = async (req, res, next) => {
  try {
    req.user = await findUserByToken(req.headers.authorization);
    next();
  } catch (ex) {
    next(ex);
  }
};

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Check if the username already exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE username = $1",
      [username],
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const { rows } = await client.query(
      "INSERT INTO users (id, username, password) VALUES ($1, $2, $3) RETURNING id",
      [uuid.v4(), username, hashedPassword],
    );

    const newUserId = rows[0].id;

    // Generate a token for the new user
    const token = jwt.sign({ id: newUserId }, JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ token });
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }
    res.send(await findUserWithToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth/me", isLoggedIn,  async(req, res, next) => {
  try {
    res.send( await findUserByToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    res.send(await fetchUsers());
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users/:id/favorites", isLoggedIn, async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      const error = Error("not authorized");
      error.status = 401;
      throw error;
    }
    res.send(await fetchFavorites(req.params.id));
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/users/:id/favorites", isLoggedIn, async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      const error = Error("not authorized");
      error.status = 401;
      throw error;
    }
    res.status(201).send(
      await createFavorite({
        user_id: req.params.id,
        skill_id: req.body.skill_id,
      }),
    );
  } catch (ex) {
    next(ex);
  }
});

app.delete(
  "/api/users/:user_id/favorites/:id",
  isLoggedIn,
  async (req, res, next) => {
    try {
      if (req.params.user_id !== req.user.id) {
        const error = Error("not authorized");
        error.status = 401;
        throw error;
      }
      await destroyFavorite({ user_id: req.params.user_id, id: req.params.id });
      res.sendStatus(204);
    } catch (ex) {
      next(ex);
    }
  },
);

app.get("/api/skills", async (req, res, next) => {
  try {
    res.send(await fetchSkills());
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res
    .status(err.status || 500)
    .send({ error: err.message ? err.message : err });
});

const init = async () => {
  const port = process.env.PORT || 3000;
  await client.connect();
  console.log("connected to database");

  await createTables();
  console.log("tables created");

  const [moe, lucy, ethyl, curly, foo, bar, bazz, quq, fip] = await Promise.all(
    [
      createUser({ username: "moe", password: "m_pw" }),
      createUser({ username: "lucy", password: "l_pw" }),
      createUser({ username: "ethyl", password: "e_pw" }),
      createUser({ username: "curly", password: "c_pw" }),
      createSkill({ name: "foo" }),
      createSkill({ name: "bar" }),
      createSkill({ name: "bazz" }),
      createSkill({ name: "quq" }),
      createSkill({ name: "fip" }),
    ],
  );

  console.log(await fetchUsers());
  console.log(await fetchSkills());

  console.log(await fetchFavorites(moe.id));
  const favorite = await createFavorite({
    user_id: moe.id,
    skill_id: foo.id,
  });
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();
