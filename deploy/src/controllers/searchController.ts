import { Client } from "../models/Client";
import { Contract } from "../models/Contract";
import { Invoice } from "../models/Invoice";
import { Project } from "../models/Project";

export const searchItems = async (query) => {
  if (!query) return [];

  const searchRegex = new RegExp(query, "i"); // Case-insensitive search

  // Searching across different collections
  const [clients, contracts, invoices, projects] = await Promise.all([
    Client.find({
      deleted: false,
      $or: [
        { name: searchRegex },
        { companyName: searchRegex },
        { address: searchRegex },
        { state: searchRegex },
        { "contacts.name": searchRegex },
        { "contacts.email": searchRegex },
      ],
    }).lean(),

    Contract.find({
      deleted: false,
      $or: [
        { documentName: searchRegex },
        { type: searchRegex },
        { contractEmail: searchRegex },
        { "party.name": searchRegex },
        { "party.address": searchRegex },
        { rawText: searchRegex }, // Searching inside contract details
      ],
    }).lean(),

    Invoice.find({
      deleted: false,
      $or: [
        { invoiceNumber: searchRegex },
        { currency: searchRegex },
        { "items.name": searchRegex },
        { rawText: searchRegex }, // Searching invoice details
      ],
    }).lean(),

    Project.find({
      deleted: false,
      $or: [{ name: searchRegex }, { description: searchRegex }],
    }).lean(),
  ]);

  // Format results with type identifiers
  return [
    ...clients.map((c) => ({ type: "Client", ...c })),
    ...contracts.map((c) => ({ type: "Contract", ...c })),
    ...invoices.map((c) => ({ type: "Invoice", ...c })),
    ...projects.map((c) => ({ type: "Project", ...c })),
  ];
};
