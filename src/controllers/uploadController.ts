import { Request, Response } from "express";

export const uploadFileController = (
  req: Request & { filesInfo?: any[]; user?: { userId: string } },
  res: Response
): Promise<any> => {
  try {
    const filesInfo: any = req.filesInfo;

    if (!filesInfo || filesInfo?.length == 0) {
      res.status(400).json({ message: "No file uploaded" })
      return;
    }

    res.json({
      message: "File updated successfully",
      data: [...filesInfo],
    });
  } catch (error) {
    console.error("Update file upload error:", error);
    res.status(500).json({ message: "Server error", error });
  }
}