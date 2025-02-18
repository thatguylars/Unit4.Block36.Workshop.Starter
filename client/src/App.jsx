import { useState, useEffect } from "react";
import Register from "./Register";
import Login from "./Login";

function App() {
  const [auth, setAuth] = useState({});
  const [skill, setSkill] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    attemptLoginWithToken();
  }, []);

  const attemptLoginWithToken = async () => {
    const token = window.localStorage.getItem("token");
    if (token) {
      try {
        // Add try-catch for fetch
        const response = await fetch("/api/auth/me", {
          headers: {
            authorization: token,
          },
        });
        if (response.ok) {
          const json = await response.json();
          setAuth(json);
        } else {
          window.localStorage.removeItem("token");
        }
      } catch (error) {
        console.error("Error in attemptLoginWithToken:", error);
        window.localStorage.removeItem("token"); // Clear token on error
      }
    }
  };

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch("/api/skills");
        if (response.ok) {
          const json = await response.json();
          setSkill(json);
        } else {
          console.error(
            "Error fetching skills:",
            response.status,
            response.statusText,
          );
        }
      } catch (error) {
        console.error("Error fetching skills:", error);
      }
    };
    fetchSkills();
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!auth.id) return; // Guard clause: Exit if auth.id is not available

      try {
        const response = await fetch(`/api/users/${auth.id}/favorites`, {
          headers: {
            authorization: window.localStorage.getItem("token"),
          },
        });
        if (response.ok) {
          const json = await response.json();
          setFavorites(json);
        } else {
          console.error(
            "Error fetching favorites:",
            response.status,
            response.statusText,
          );
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    fetchFavorites();
  }, [auth.id]); // auth.id is the correct dependency

  const login = async (credentials) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json();
        window.localStorage.setItem("token", json.token);
        attemptLoginWithToken();
      } else {
        const errorJson = await response.json(); // Get error details from server
        throw new Error(errorJson.error || "Failed to login"); // Use server error or default
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Re-throw the error to be caught by the component
    }
  };

  const register = async (credentials) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json();
        window.localStorage.setItem("token", json.token);
        attemptLoginWithToken();
        setShowRegister(false);
      } else {
        const errorJson = await response.json();
        throw new Error(errorJson.error || "Failed to register");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const addFavorite = async (skill_id) => {
    try {
      const response = await fetch(`/api/users/${auth.id}/favorites`, {
        method: "POST",
        body: JSON.stringify({ skill_id }),
        headers: {
          "Content-Type": "application/json",
          authorization: window.localStorage.getItem("token"),
        },
      });

      if (response.ok) {
        const json = await response.json();
        setFavorites([...favorites, json]);
      } else {
        const errorJson = await response.json();
        console.error("Error adding favorite:", errorJson);
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
    }
  };

  const removeFavorite = async (id) => {
    try {
      const token = window.localStorage.getItem("token");
const userId = auth.id; // Get the user ID directly from state

if (!userId) {
  // Handle the case where auth.id is not available
  console.error("User ID is not available. Cannot remove favorite.");
  return; 
}

const response = await fetch(`/api/users/${userId}/favorites/${id}`, {
  
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      if (response.ok) {
        setFavorites(favorites.filter((favorite) => favorite.id !== id));
      } else {
        const errorJson = await response.json();
        console.error("Error removing favorite:", errorJson);
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    setAuth({});
    setFavorites([]); // Clear favorites on logout
  };

  return (
    <>
      {!auth.id ? (
        <>
          {!showRegister ? (
            <>
              <Login login={login} />
              <button onClick={() => setShowRegister(true)}>Register</button>
            </>
          ) : (
            <>
              <Register register={register} />
              <button onClick={() => setShowRegister(false)}>Login</button>
            </>
          )}
        </>
      ) : (
        <button onClick={logout}>Logout {auth.username}</button>
      )}
      <ul>
        {skill.map((skillItem) => {
          // Renamed skill to skillItem to avoid conflict
          const isFavorite = favorites.find(
            (favorite) => favorite.skill_id === skillItem.id,
          );
          return (
            <li key={skillItem.id} className={isFavorite ? "favorite" : ""}>
              {skillItem.name}
              {auth.id && isFavorite && (
                <button onClick={() => removeFavorite(isFavorite.id)}>-</button>
              )}
              {auth.id && !isFavorite && (
                <button onClick={() => addFavorite(skillItem.id)}>+</button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default App;
