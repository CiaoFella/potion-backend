import { UserGlobalValues } from "../models/UserGlobalValues";

export const userGlobalController = {
  async getTaxWriteOffGoal(req, res) {
    try {
      const userId = req.user.userId;
      const record = await UserGlobalValues.findOne({ user: userId }).lean();

      if (!record) {
        return res.status(404).json({ message: "No tax goal found" });
      }

      return res.status(200).json({ taxWriteOffGoal: record.taxWriteOffGoal });
    } catch (error) {
      console.error("Error fetching tax goal:", error);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async setTaxWriteOffGoal(req, res) {
    try {
      const userId = req.user.userId;
      const { taxWriteOffGoal } = req.body;

      if (typeof taxWriteOffGoal !== "number") {
        return res.status(400).json({ message: "Invalid taxWriteOffGoal" });
      }

      const record = await UserGlobalValues.findOneAndUpdate(
        { user: userId },
        { taxWriteOffGoal },
        { new: true, upsert: true }
      );

      return res.status(200).json({ message: "Goal updated", taxWriteOffGoal: record.taxWriteOffGoal });
    } catch (error) {
      console.error("Error updating tax goal:", error);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async updateGlobalValues(req, res) {
    try {
      const userId = req.user.userId;
      const updates = req.body;

      if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const record = await UserGlobalValues.findOneAndUpdate(
        { user: userId },
        { $set: updates },
        { new: true, upsert: true }
      );

      return res.status(200).json({ message: "Global values updated", updatedFields: updates });
    } catch (error) {
      console.error("Error updating global values:", error);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async getGlobalValues(req, res) {
    try {
      let globalValues = await UserGlobalValues.findOne({ user: req.user.userId }).lean();
      if (!globalValues) {
        globalValues = await UserGlobalValues.findOneAndUpdate({ user: req.user.userId },{}, {upsert: true, new: true}).lean();
      };
      return res.status(200).json(globalValues);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};