import { randomBytes } from 'node:crypto';
import { Router, raw, type Request, type Response, type NextFunction } from 'express';
import { requireUser, type AuthenticatedRequest } from './auth.js';
import { getPool } from './database.js';

export const profileRouter = Router();
const photoLimit = 150_000;

profileRouter.put('/profile/photo', requireUser, raw({ type: 'image/jpeg', limit: photoLimit }),
  async (req: AuthenticatedRequest, res: Response) => {
    const image = req.body;
    if (!Buffer.isBuffer(image) || image.length < 4 || image[0] !== 255 || image[1] !== 216 ||
        image[2] !== 255 || image[image.length - 2] !== 255 || image[image.length - 1] !== 217) {
      res.status(400).json({ error: 'Envie uma imagem JPEG válida.' });
      return;
    }
    try {
      const revision = randomBytes(16).toString('hex');
      const result = await getPool().query(
        'UPDATE app_users SET avatar_image=$2, avatar_revision=$3 WHERE id=$1 AND active RETURNING id',
        [req.user!.id, image, revision],
      );
      if (!result.rowCount) { res.sendStatus(404); return; }
      res.json({ avatar_url: '/api/profile/photo/' + revision });
    } catch {
      res.status(503).json({ error: 'Não foi possível salvar a foto.' });
    }
  },
  (error: { status?: number }, _req: Request, res: Response, next: NextFunction) => {
    if (error.status !== 413) { next(error); return; }
    res.status(413).json({ error: 'A foto deve ter até 150 kB após a compactação.' });
  },
);

profileRouter.get('/profile/photo/:revision', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { rows } = await getPool().query<{ avatar_image: Buffer }>(
      'SELECT avatar_image FROM app_users WHERE id=$1 AND avatar_revision=$2 AND active',
      [req.user!.id, req.params.revision],
    );
    if (!rows[0]?.avatar_image) { res.sendStatus(404); return; }
    res.type('jpeg').send(rows[0].avatar_image);
  } catch {
    res.sendStatus(503);
  }
});

profileRouter.delete('/profile/photo', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    await getPool().query(
      'UPDATE app_users SET avatar_image=NULL, avatar_revision=NULL WHERE id=$1',
      [req.user!.id],
    );
    res.sendStatus(204);
  } catch {
    res.status(503).json({ error: 'Não foi possível remover a foto.' });
  }
});
