import { Router } from 'express';
import { authRouter } from './authRoutes.js';
import { departmentsRouter } from './departmentsRoutes.js';
import { requestsRouter } from './requestsRoutes.js';
import { invitationsRouter } from './invitationsRoutes.js';
import { usersRouter } from './usersRoutes.js';
import { profileRouter } from './profileRoutes.js';

export {
  publicUser,
  normalizeEmail,
  validPassword,
  validCredentials,
  validEmailAndPassword,
  readSessionCookie,
  sessionHash,
  isRoleAuthorized,
  requireUser,
  requireAdmin,
  canAccessAdmin,
  type AuthenticatedRequest,
} from './auth.js';

export const apiRouter = Router();
apiRouter.use(authRouter);
apiRouter.use(profileRouter);
apiRouter.use(invitationsRouter);
apiRouter.use(usersRouter);
apiRouter.use(departmentsRouter);
apiRouter.use(requestsRouter);
