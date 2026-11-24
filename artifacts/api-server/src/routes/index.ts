import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notesRouter from "./notes";
import openaiRouter from "./openai";
import eventsRouter from "./events";
import storageRouter from "./storage";
import adminRouter from "./admin";
import meRouter from "./me";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Public — no auth required
router.use(healthRouter);
router.use(eventsRouter); // analytics ping, visitor-id based
router.use(storageRouter); // public-objects/* is public; private objects/* checks ACL with Clerk session inside

// Authenticated — require a valid Clerk session
router.use(requireAuth);
router.use(meRouter);
router.use(notesRouter);
router.use(openaiRouter);
router.use(adminRouter);

export default router;
