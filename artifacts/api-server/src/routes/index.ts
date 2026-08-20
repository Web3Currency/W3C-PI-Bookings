import { Router, type IRouter } from "express";
import healthRouter from "./health";
import piAuthRouter from "./pi-auth";
import piPaymentsRouter from "./pi-payments";
import piPayoutsRouter from "./pi-payouts";
import piBookingsRouter from "./pi-bookings";
import piServicesRouter from "./pi-services";

const router: IRouter = Router();

router.use(healthRouter);
router.use(piAuthRouter);
router.use(piPaymentsRouter);
router.use(piPayoutsRouter);
router.use(piBookingsRouter);
router.use(piServicesRouter);

export default router;
