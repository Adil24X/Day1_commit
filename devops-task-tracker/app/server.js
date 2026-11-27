const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tasks';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    // Exit so the container restart policy retries until the database is ready
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
