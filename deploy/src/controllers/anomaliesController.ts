import { Request, Response } from "express";
import { Anomalies } from "../models/Anomalies";

export const anomaliesController = {
    async createAnomaly(req: Request, res: Response) {
        try {
            const { title, description, severity, status } = req.body;
            const userId = req.user?.userId;

            const anomaly = new Anomalies({
                title,
                description,
                severity,
                status,
                isResolved: status === "resolved",
                userId,
            });
            await anomaly.save();
            res.status(201).json(anomaly);
        } catch (error) {
            res.status(500).json({ message: "Server error", error });
        }
    },

    async getAnomalies(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const anomalies = await Anomalies.find({ userId });
            res.json(anomalies);
        } catch (error) {
            res.status(500).json({ message: "Server error", error });
        }
    },
};
