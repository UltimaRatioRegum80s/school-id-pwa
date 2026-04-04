import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import scanRouter from "./scan";
import dashboardRouter from "./dashboard";
import activitiesRouter from "./activities";
import behaviorRouter from "./behavior";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(scanRouter);
router.use(dashboardRouter);
router.use(activitiesRouter);
router.use(behaviorRouter);
router.use(settingsRouter);

export default router;
