/**
 * GET /sigil.yaml — serves the raw YAML manifest file as text/yaml.
 * The file path is resolved relative to the project root so it works
 * both in local dev (tsx from src/) and in production (node from dist/).
 */
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Router, type Request, type Response } from 'express';

export const yamlRouter: Router = Router();

// The YAML file lives at the repo root, one level up from src/ or dist/.
const YAML_PATH = resolve(process.cwd(), 'sigil.yaml');

yamlRouter.get('/sigil.yaml', (_req: Request, res: Response) => {
  if (!existsSync(YAML_PATH)) {
    res.status(404).json({
      error_code: 'NOT_FOUND',
      error_detail: 'sigil.yaml has not been generated yet.',
    });
    return;
  }
  res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  createReadStream(YAML_PATH).pipe(res);
});
