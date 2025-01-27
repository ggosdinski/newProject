require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importa CORS
const Movie = require('./models/movieModel');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Inicializa la app
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
const corsOptions = {
  origin: '*', // Permite cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
};
app.use(cors(corsOptions)); // Aplica la configuración de CORS

// Carga el archivo de Swagger
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware
app.use(bodyParser.json());

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Rutas de la API

// GET all movies
app.get('/movies', async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving movies' });
  }
});

// GET a single movie by id
app.get('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a new movie
app.post('/movies', async (req, res) => {
  const { title, director, releaseDate, genre, rating, duration } = req.body;

  if (!title || !director || !releaseDate || !genre || !rating || !duration) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const newMovie = new Movie({
    title,
    director,
    releaseDate,
    genre,
    rating,
    duration,
  });

  try {
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (err) {
    res.status(500).json({ message: 'Error saving movie' });
  }
});

// PUT update a movie by id
app.put('/movies/:id', async (req, res) => {
  const { title, director, releaseDate, genre, rating, duration } = req.body;

  if (!title || !director || !releaseDate || !genre || !rating || !duration) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      { title, director, releaseDate, genre, rating, duration },
      { new: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.json(updatedMovie);
  } catch (err) {
    res.status(500).json({ message: 'Error updating movie' });
  }
});

// DELETE a movie by id
app.delete('/movies/:id', async (req, res) => {
  try {
    const deletedMovie = await Movie.findByIdAndDelete(req.params.id);

    if (!deletedMovie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.json({ message: 'Movie deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting movie' });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
