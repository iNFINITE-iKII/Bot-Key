import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkRouter from "./check";
import getKeyRouter from "./getKey";
import checkpointRouter from "./checkpoint";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkRouter);
router.use(getKeyRouter);
router.use(checkpointRouter);

export default router;
