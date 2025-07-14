import { NextFunction } from "express";
import { body, validationResult } from "express-validator";

export const validateProject = [
  body("name").trim().notEmpty().withMessage("Project name is required"),

  (req: any, res: any, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export const validateClient = [
  body("name").trim().notEmpty().withMessage("Client name is required"),
  body("contacts.*.email")
    .isEmail()
    .withMessage("Valid email is required for each contact"),
  body("contacts.*.phone").optional().isMobilePhone("any"),

  (req: any, res: any, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), data: req.body });
    }
    next();
  },
];

export const validateInvoice = [
  body("client").isMongoId().withMessage("Valid client ID is required"),
  body("project").isMongoId().withMessage("Valid project ID is required"),
  body("invoiceNumber")
    .trim()
    .notEmpty()
    .withMessage("Invoice number is required"),
  body("items.*.quantity").isNumeric().withMessage("Quantity must be a number"),
  body("items.*.unitPrice")
    .isNumeric()
    .withMessage("Unit price must be a number"),
  body("issueDate").isISO8601().withMessage("Valid issue date is required"),
  body("dueDate").isISO8601().withMessage("Valid due date is required"),

  (req: any, res: any, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
