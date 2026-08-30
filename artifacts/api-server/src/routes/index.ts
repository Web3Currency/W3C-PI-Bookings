import { Router, type IRouter } from "express";
import healthRouter from "./health";
import piAuthRouter from "./pi-auth";
import piPaymentsRouter from "./pi-payments";
import piPayoutsRouter from "./pi-payouts";
import piBookingsRouter from "./pi-bookings";
import piDeliveryRouter from "./pi-delivery";
import piServicesRouter from "./pi-services";
import piChatRouter from "./pi-chat";
import feedbackRouter from "./feedback";
import piPricingRouter from "./pi-pricing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(piAuthRouter);
router.use(piPaymentsRouter);
router.use(piPayoutsRouter);
router.use(piBookingsRouter);
router.use(piDeliveryRouter);
router.use(piServicesRouter);
router.use(piPricingRouter);
router.use(piChatRouter);
router.use(feedbackRouter);

export default router;
