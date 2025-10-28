import { Application, Router } from 'express';
import catalogRouter from './catalog/router';
import ordersRouter from './orders/router';
import paymentsRouter from './payments/router';
import ticketsRouter from './tickets/router';
import operatorsRouter from './operators/router';
import redeemRouter from './redeem/router';
import reportsRouter from './reports/router';
import refundsRouter from './refunds/router';
import policiesRouter from './policies/router';
import profileRouter from './profile/router';
import usersRouter from './users/router';
import authDemoRouter from './auth/demo';
import adminRouter from './admin/router';
import travelRouter from './travel/router';
import reservationsRouter from './reservations/router';

export const registerModuleRouters = (app: Application, apiPrefix: string): void => {
  const apiRouter = Router();

  apiRouter.use('/users', usersRouter);
  apiRouter.use('/auth', authDemoRouter);

  app.use(apiPrefix, apiRouter);

  app.use('/catalog', catalogRouter);
  app.use('/travel', travelRouter);
  app.use('/reservations', reservationsRouter);
  app.use('/admin', adminRouter);
  app.use('/orders', ordersRouter);
  app.use('/payments', paymentsRouter);
  app.use('/my', ticketsRouter);
  app.use('/tickets', ticketsRouter);
  app.use('/tickets', redeemRouter);
  app.use('/operators', operatorsRouter);
  app.use('/validators', operatorsRouter);
  app.use('/reports', reportsRouter);

  app.use('/payments', refundsRouter);
  app.use('/', refundsRouter);
  app.use('/', policiesRouter);

  app.use('/profile', profileRouter);
};
