import type { Request, Response, NextFunction } from 'express';
import {
  customerProvisioningService,
  CustomerProvisioningService,
} from '../service/provisioning.service.js';
import { validateCustomerProvisioning } from '../validation/provisioning.schema.js';

export class CustomerProvisioningController {
  constructor(private readonly service: CustomerProvisioningService = customerProvisioningService) {}

  validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCustomerProvisioning(req.body);
      const result = await this.service.validatePreflight(dto);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  provision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCustomerProvisioning(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.provisionCustomer(dto, actor);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const customerProvisioningController = new CustomerProvisioningController();
