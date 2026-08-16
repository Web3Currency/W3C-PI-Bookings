import { Router, type IRouter } from "express";
import healthRouter from "./health";
import piAuthRouter from "./pi-auth";
import piPaymentsRouter from "./pi-payments";
import piPayoutsRouter from "./pi-payouts";
import piBookingsRouter from "./pi-bookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(piAuthRouter);
router.use(piPaymentsRouter);
router.use(piPayoutsRouter);
router.use(piBookingsRouter);

export default router;
