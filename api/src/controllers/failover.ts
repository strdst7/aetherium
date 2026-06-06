import express from 'express';
import { setForceFail } from '../adapters/ollama-provider';

const router = express.Router();

router.get('/api/forceFail', (req, res) => {
  const on = req.query.on === "true";
  setForceFail(on);
  res.json({ forcedFailure: on });
});

export default router;
