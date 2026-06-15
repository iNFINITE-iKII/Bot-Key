import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkRouter from "./check";
import getKeyRouter from "./getKey";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkRouter);
router.use(getKeyRouter);

export default router;
