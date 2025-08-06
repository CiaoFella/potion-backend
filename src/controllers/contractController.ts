import { Request, Response } from 'express';
import { Contract } from '../models/Contract';
import { Client } from '../models/Client';
import { getSignedDownloadUrl } from '../services/storageService';
import { sendEmail } from '../services/emailService';
import { reactEmailService } from '../services/reactEmailService';
import { Project } from '../models/Project';
import { config } from '../config/config';

// Email service functions
const sendContractShareEmail = async (
  emails: string[],
  contractType: string,
  contractUrl: string,
  senderName?: string,
) => {
  try {
    const props = {
      contractType,
      contractUrl,
      senderName: senderName || 'Your business partner',
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'contract-share',
      props,
    );

    // Send to each email individually to ensure delivery
    for (const email of emails) {
      await sendEmail({
        to: email,
        subject,
        html,
      });
    }
  } catch (error) {
    console.error('Error sending contract share email:', error);

    // Fallback to basic email
    for (const email of emails) {
      await sendEmail({
        to: email,
        subject: `You have received a ${contractType} contract`,
        text: `Use this link to view the contract ${contractUrl}`,
      });
    }
  }
};

export const contractController = {
  async createContract(req: Request, res: Response): Promise<any> {
    try {
      const {
        name,
        type,
        documentName,
        recipients,
        contractEmail,
        project,
        client,
        amount,
        status,
        issueDate,
        dueDate,
        responsibilities,
        clientResponsibilities,
        deliverables,
        exclusions,
        estimate,
        party,
        logo,
        clientAddress,
        rawContent,
      } = req.body;
      const userId = req.user?.userId;

      let contract = new Contract({
        type,
        documentName,
        recipients,
        contractEmail,
        project,
        client,
        amount,
        status,
        issueDate,
        dueDate,
        responsibilities,
        clientResponsibilities,
        deliverables,
        exclusions,
        estimate,
        party,
        logo,
        clientAddress,
        rawContent,
        createdBy: userId,
      });

      await contract.save();

      // Update client with new contract
      let client_ = await Client.findById(client);
      if (client) {
        client_?.contracts.push(contract._id);
        await client_?.save(); // Fixed to save the correct client instance

        contract.clientAddress = client_?.address;
        await contract.save();
      }

      res.status(201).json({
        message: 'Contract created successfully',
        contract: await Contract.findById(contract._id)
          .populate('client')
          .populate('project'),
      });
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async sendToEmail(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params;
      const contract = await Contract.findById(contractId);

      if (!contract) {
        return res.status(404);
      }

      // console.log(req.body);
      let { emails } = req.body;

      if (contract) {
        // let client = await Client.findById(contract.client);
        await sendContractShareEmail(
          emails,
          contract.type,
          `${req?.headers?.origin}/p/contract/${contract._id}`,
          'Your business partner', // You can get this from user context if available
        );
      }

      res.status(201).json({
        message: 'contract created successfully',
        contract: await Contract.findByIdAndUpdate(contract._id, {
          status: 'Sent',
        })
          .populate('client')
          .populate('project'),
      });
    } catch (error) {
      console.error('Invoice creation error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async updateContract(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params;
      const {
        name,
        type,
        documentName,
        recipients,
        contractEmail,
        project,
        client,
        amount,
        status,
        issueDate,
        dueDate,
        responsibilities,
        clientResponsibilities,
        deliverables,
        exclusions,
        estimate,
        party,
        clientAddress,
        deleted = false,
        rawContent,
      } = req.body; // Updated to include new fields

      const contract = await Contract.findById(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      if (type) contract.type = type;
      if (documentName) contract.documentName = documentName;
      if (recipients) contract.recipients = recipients;
      if (contractEmail) contract.contractEmail = contractEmail;
      if (project) contract.project = project;
      if (client) contract.client = client;
      if (amount) contract.amount = amount;
      if (status)
        contract.status =
          contract?.status === 'Completed' &&
          contract?.party &&
          contract.clientSign
            ? contract?.status
            : status;
      if (issueDate) contract.issueDate = issueDate;
      if (dueDate) contract.dueDate = dueDate;
      if (responsibilities) contract.responsibilities = responsibilities;
      if (clientResponsibilities)
        contract.clientResponsibilities = clientResponsibilities;
      if (deliverables) contract.deliverables = deliverables;
      if (exclusions) contract.exclusions = exclusions;
      if (estimate) contract.estimate = estimate;
      if (party) contract.party = party;
      if (clientAddress) contract.clientAddress = clientAddress;
      if (rawContent) contract.rawContent = rawContent;
      contract.deleted = !!deleted;

      await contract.save();

      // Update client with new contract
      let client_ = await Client.findById(client);
      if (client) {
        contract.clientAddress = client_?.address;
        await contract.save();
      }

      res.json({
        message: 'Contract updated successfully',
      });
    } catch (error) {
      console.error('Contract update error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getContracts(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId;
      const contracts = await Contract.find({
        createdBy: userId,
        deleted: { $ne: true },
      })
        .sort({ updatedAt: -1 })
        .populate('client')
        .populate('project');

      res.json(contracts);
    } catch (error) {
      console.error('Get contracts error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getContractsByID(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId;
      const contractId = req.params.contractId;

      if (!contractId) {
        return res.status(400).json({ message: 'Contract ID is required' });
      }
      const contract = await Contract.findOne({
        createdBy: userId,
        _id: contractId,
      }).populate('client');

      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      let uri = contract?.logo?.fileName
        ? await getSignedDownloadUrl(
            contract!.logo!.fileName || '',
            contract!.logo!.fileType || '',
          )
        : '';

      res.json({ ...contract.toObject(), logo: { uri } });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getContractByIDPublic(req: Request, res: Response): Promise<any> {
    try {
      const contractId = req.params.contractId;

      if (!contractId) {
        return res.status(400).json({ message: 'Contract ID is required' });
      }
      const contract = await Contract.findById(contractId).populate('client');

      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      let uri = contract?.logo?.fileName
        ? await getSignedDownloadUrl(
            contract!.logo!.fileName || '',
            contract!.logo!.fileType || '',
          )
        : '';

      res.json({ ...contract.toObject(), logo: { uri } });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async duplicateContract(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params; // Get the contract ID from the request parameters
      const userId = req.user?.userId; // Get the user ID from the request

      // Find the original contract
      const originalContract = await Contract.findById(contractId)
        .populate('client')
        .populate('project');
      if (!originalContract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      // Create a new contract with the same details
      const newContract = new Contract({
        type: originalContract.type,
        documentName: originalContract.documentName
          ? 'Copy of ' + originalContract.documentName
          : 'Copy of ' + originalContract?.party?.name + '-' + ' NDA',
        recipients: originalContract.recipients,
        contractEmail: originalContract.contractEmail,
        project: originalContract.project,
        client: originalContract.client,
        amount: originalContract.amount,
        status: 'Draft',
        issueDate: originalContract.issueDate,
        dueDate: originalContract.dueDate,
        responsibilities: originalContract.responsibilities,
        clientResponsibilities: originalContract.clientResponsibilities,
        deliverables: originalContract.deliverables,
        exclusions: originalContract.exclusions,
        estimate: originalContract.estimate,
        party: originalContract.party,
        createdBy: userId, // Set to the current user
      });

      await newContract.save(); // Save the new contract to the database

      // Update client with the new contract
      let client_ = await Client.findById(originalContract.client);
      if (client_) {
        client_.contracts.push(newContract._id); // Add the new contract ID to the client's contracts
        await client_.save(); // Save the updated client
      }

      res.status(201).json({
        message: 'Contract duplicated successfully',
        contract: await Contract.findById(newContract._id)
          .populate('client')
          .populate('project'),
      });
    } catch (error) {
      console.error('Contract duplication error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async deleteContract(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params;
      const userId = req.user?.userId;

      // Find the project and mark it as deleted
      const contract = await Contract.findOneAndUpdate(
        { _id: contractId, createdBy: userId },
        { deleted: true },
        { new: true },
      );

      if (!contract) {
        return res
          .status(404)
          .json({ message: 'contract not found or already deleted' });
      }

      // delete from project
      // Remove the contract from the associated project
      await Project.findOneAndUpdate(
        { contracts: contractId },
        { $pull: { contracts: contractId } },
      );

      res.json({
        message: 'contract deleted successfully',
        contract,
      });
    } catch (error) {
      console.error('contract deletion error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async undoDeleteContract(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params;
      const userId = req.user?.userId;

      // Find the project and mark it as deleted
      const contract = await Contract.findOneAndUpdate(
        { _id: contractId, createdBy: userId },
        { deleted: false },
        { new: true },
      );

      if (!contract) {
        return res
          .status(404)
          .json({ message: 'contract not found or already deleted' });
      }

      res.json({
        message: 'contract deleted successfully',
        contract,
      });
    } catch (error) {
      console.error('contract deletion error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getDeletedContract(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId;

      const contracts = await Contract.find({
        createdBy: userId,
        deleted: true,
      });

      // Check if the contracts array is empty
      if (contracts.length === 0) {
        return res.status(404).json({ message: 'Deleted contracts not found' });
      }

      res.json({ contracts, type: 'contract' }); // Return the array of projects
    } catch (error) {
      console.error('Get deleted project error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async uploadImage(
    req: Request & { filesInfo?: any[]; user?: { userId: string } },
    res: Response,
  ): Promise<any> {
    try {
      const filesInfo: any = req.filesInfo;

      if (!filesInfo) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      let uri = await getSignedDownloadUrl(
        filesInfo[0]?.fileName,
        filesInfo[0]?.fileType,
      );

      res.json({
        message: 'Contract logo updated successfully',
        file: filesInfo[0],
        uri,
      });
    } catch (error) {
      console.error('Update contract logo error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async signContract(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params;
      const { signature } = req.body;

      // Find the project and mark it as deleted
      const contract = await Contract.findOne({ _id: contractId });

      if (!contract) {
        // Handle case where contract is not found
        return null;
      }

      contract.partySign = signature;

      // Check if clientSign exists to determine if status should be updated
      if (contract.clientSign) {
        contract.status = 'Completed';
      } else {
        contract.status = 'Awaiting Client Signature';
      }

      // Save the updated document
      const updatedContract = await contract.save();

      if (!contract) {
        return res
          .status(404)
          .json({ message: 'contract not found or already signed' });
      }

      res.json({
        message: 'contract signed successfully',
        contract,
      });
    } catch (error) {
      console.error('contract deletion error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async signClientContract(req: Request, res: Response): Promise<any> {
    try {
      const { contractId } = req.params;
      const { signature } = req.body;

      // Find the project and mark it as deleted
      const contract = await Contract.findOne({ _id: contractId });

      if (!contract) {
        // Handle case where contract is not found
        return null;
      }

      contract.clientSign = signature;

      // Check if partySign exists to determine if status should be updated
      if (contract.partySign) {
        contract.status = 'Completed';
      } else {
        contract.status = 'Awaiting Your Signature';
      }

      // Save the updated document
      const updatedContract = await contract.save();

      if (!contract) {
        return res
          .status(404)
          .json({ message: 'contract not found or already signed' });
      }

      res.json({
        message: 'contract signed successfully',
        contract,
      });
    } catch (error) {
      console.error('contract deletion error:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },
};
