import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import parseRoutes from './routes/parse.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large Figma JSON payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/parse', parseRoutes);

// Error Handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});