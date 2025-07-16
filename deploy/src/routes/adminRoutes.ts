import { config } from "../config/config";
import { adminAuth } from "../middleware/admin";
import { Admin } from "../models/Admin";
import { MetricsService } from "../services/metricsService";
import express from "express";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/emailService";
const router = express.Router();
const metricsService = new MetricsService();

const generateRandomOTP = () => {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
};

router.post("/get-otp", async (req, res) => {
    let otp = String(generateRandomOTP());
    let email = req.body.email?.toLowerCase();
    let d = await Admin.findOneAndUpdate({email}, {otp}).lean().exec();
    if(d){
        sendEmail({
            to: email,
            subject: "Admin Sign-In OTP",
            text: `Your OTP for sign-in: ${otp}.`,
        })
    }
    else{
        res.status(400).json({message: "User not recognized!"});
        return;
    }
    res.status(200).json({message: "OTP sent to your email!"});
})

router.post("/sign-in", async (req, res) => {
    let email = req.body.email?.toLowerCase();
    let otp = req.body.otp;
    if(!email || !otp) {
        res.status(400).json({message: "Email and OTP are required!"});
        return;
    }
    const admin = await Admin.findOne({email, otp}).lean().exec();
    if(!admin) {
        res.status(401).json({message: "Invalid credentials!"});
        return;
    }
    const accessToken = jwt.sign({ adminId: admin._id }, config.jwtSecret!, {
        expiresIn: "1d",
    });
    res.json({ accessToken, data: {email: admin?.email} });
})

router.get("/metrics", adminAuth, async (req, res) => {
    try {
        const metrics = await metricsService.getAllMetrics();
        res.json(metrics);
    } catch (error) {
        console.error("Failed to fetch metrics:", error);
        res.status(500).json({ error: "Failed to load metrics" });
    }
});

export default router;
