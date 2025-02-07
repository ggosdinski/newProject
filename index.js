// Requires necessary packages
require('dotenv').config();  // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const GitHubStrategy  = require('passport-github2').Strategy;
const swaggerUi = require('swagger-ui-express');
const yamljs = require('yamljs');

// Load Swagger documentation
const swaggerDocument = yamljs.load('./swagger.yaml');

// Initialize Express application
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration to maintain authentication state
app.use(session({
  secret: 'secret', 
  resave: false,
  saveUninitialized: true
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection (make sure MongoDB is running)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.log('Error connecting to MongoDB', err));

// Define movie schema
const movieSchema = new mongoose.Schema({
  title: String,
  director: String,
  releaseDate: String,
  genre: String,
  rating: Number,
  duration: Number
});

const Movie = mongoose.model('Movie', movieSchema);

// GitHub OAuth Passport strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "https://newproject-dlxk.onrender.com/auth/github/callback"
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Store user profile in session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Retrieve user profile from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// GitHub authentication route
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

// Callback after GitHub authentication
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/api-docs');  // Redirect to Swagger documentation
  });

// Logout route
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out', err });
    }
    res.redirect('/');  // Redirect to the main page after logout
  });
});

// Authentication middleware for protected routes
// Middleware para verificar la autenticación
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated. Logging in Github." });
}

// Protected endpoints
// Get all movies
app.get('/movies', async (req, res) => {  // No authentication required
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching movies', error });
  }
});

// Create a new movie
app.post('/movies',  isAuthenticated, async (req, res) => {
  try {
    const { title, director, releaseDate, genre, rating, duration } = req.body;

    // Validaciones
    if (!title || !director || !releaseDate || !genre || rating === undefined || duration === undefined) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({ error: "Rating must a number between 0 and 10." });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
      return res.status(400).json({ error: "Invalid format. Use YYYY-MM-DD." });
    }

    const newMovie = await Movie.create(req.body);
    res.status(201).json(newMovie);

  } catch (error) {
    res.status(500).json({ error: "Server Error." });
  }
});


// Update a movie by ID
app.put('/movies/:id', isAuthenticated, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const { title, director, releaseDate, genre, rating, duration } = req.body;

    // Validaciones
    if (!title || !director || !releaseDate || !genre || rating === undefined || duration === undefined) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Validar rating
    if (typeof rating !== 'number' || rating < 0 || rating > 10) {
      return res.status(400).json({ error: "Rating must be a number between 0 and 10." });
    }

    // Validar formato de fecha (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(releaseDate)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    // Validar si la fecha tiene un formato válido (comprobación adicional con Date)
    const dateObj = new Date(releaseDate);
    if (dateObj.toString() === "Invalid Date") {
      return res.status(400).json({ error: "Invalid date." });
    }

    // Si las validaciones pasan, actualizar la película
    const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedMovie);

  } catch (error) {
    res.status(500).json({ error: "Server Error." });
  }
});



// Delete a movie by ID
app.delete('/movies/:id',  isAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMovie = await Movie.findByIdAndDelete(id);
    if (!deletedMovie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting movie', error });
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Main route
app.get('/', (req, res) => {
  res.send('Welcome to the Movie API');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
