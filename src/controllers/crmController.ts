import { Request, Response } from "express";
import { Client } from "../models/Client";
import { Project } from "../models/Project";
import { CRMCategory } from "../models/CRMCategory";
import { CRMItem, predictAction } from "../models/CRMItem";
import { myEmitter } from "../services/eventEmitter";

export const crmController = {
  // CRM Categories Controllers
  async createCategory(req: Request, res: Response): Promise<any> {
    try {
      const { name } = req.body;
      const userId = req.user?.userId;

      const category = new CRMCategory({
        name,
        createdBy: userId,
      });
      await category.save();

      res.status(201).json({
        message: "CRM category created successfully",
        category,
      });
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async updateCategory(req: Request, res: Response): Promise<any> {
    try {
      const { categoryId } = req.params;
      const updateData = req.body;

      const category = await CRMCategory.findOne({
        _id: categoryId,
        createdBy: req.user?.userId,
        deleted: false,
      });

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      Object.keys(updateData).forEach((key) => {
        if (category[key] !== undefined) {
          category[key] = updateData[key];
        }
      });

      const updatedCategory = await category.save();
      res.json({
        message: "Category updated successfully",
        category: updatedCategory,
      });
    } catch (error) {
      console.error("Category update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getCategories(req: Request, res: Response): Promise<any> {
    try {
      const categories = await CRMCategory.find({
        createdBy: req.user?.userId,
        deleted: false,
      }).sort({ createdAt: 1 });

      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async deleteCategory(req: Request, res: Response): Promise<any> {
    try {
      const { categoryId } = req.params;
      const userId = req.user?.userId;

      const category = await CRMCategory.findOneAndUpdate(
        { _id: categoryId, createdBy: userId },
        { deleted: true },
        { new: true }
      );

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({
        message: "Category deleted successfully",
        category,
      });
    } catch (error) {
      console.error("Category deletion error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getDeletedCategories(req: Request, res: Response): Promise<any> {
    try {
      const categories = await CRMCategory.find({
        createdBy: req.user?.userId,
        deleted: true,
      });

      if (categories.length === 0) {
        return res.status(404).json({ message: "No deleted categories found" });
      }

      res.json(categories);
    } catch (error) {
      console.error("Get deleted categories error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // CRM Items Controllers
  async createItem(req: Request, res: Response): Promise<any> {
    try {
      const { name, companyName, email, description, lastContact, category } = req.body;
      const userId = req.user?.userId;

      const item = new CRMItem({
        name,
        email,
        companyName,
        description,
        lastContact,
        category,
        createdBy: userId,
      });
      await item.save();

      myEmitter.emit('new-item', item)

      res.status(201).json({
        message: "CRM item created successfully",
        item,
      });
    } catch (error) {
      console.error("Item creation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async updateItem(req: Request, res: Response): Promise<any> {
    try {
      const { itemId } = req.params;
      const updateData = req.body;

      const item = await CRMItem.findOne({
        _id: itemId,
        createdBy: req.user?.userId,
        deleted: false,
      });

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (updateData.category || updateData?.description) {
        await predictAction(item);
      }

      Object.keys(updateData).forEach((key) => {
        if (item[key] !== undefined) {
          item[key] = updateData[key];
        }
      });

      const updatedItem = await item.save();
      res.json({
        message: "Item updated successfully",
        item: updatedItem,
      });
    } catch (error) {
      console.error("Item update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getItems(req: Request, res: Response): Promise<any> {
    try {
      const items = await CRMItem.find({
        createdBy: req.user?.userId,
        deleted: false,
      })
        .sort({ lastContact: -1 })

      res.json(items);
    } catch (error) {
      console.error("Get items error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async deleteItem(req: Request, res: Response): Promise<any> {
    try {
      const { itemId } = req.params;
      const userId = req.user?.userId;

      const item = await CRMItem.findOneAndUpdate(
        { _id: itemId, createdBy: userId },
        { deleted: true },
        { new: true }
      );

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({
        message: "Item deleted successfully",
        item,
      });
    } catch (error) {
      console.error("Item deletion error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getDeletedItems(req: Request, res: Response): Promise<any> {
    try {
      const items = await CRMItem.find({
        createdBy: req.user?.userId,
        deleted: true,
      });

      if (items.length === 0) {
        return res.status(404).json({ message: "No deleted items found" });
      }

      res.json(items);
    } catch (error) {
      console.error("Get deleted items error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getItemById(req: Request, res: Response): Promise<any> {
    try {
      const { itemId } = req.params;
      const userId = req.user?.userId;

      const item = await CRMItem.findOne({
        _id: itemId,
        createdBy: userId,
        deleted: false,
      }).populate("category");

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Get item by ID error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
};