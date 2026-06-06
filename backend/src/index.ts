import express from 'express';
import cors from 'cors';
import { router } from './routes.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});