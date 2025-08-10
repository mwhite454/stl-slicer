import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.env.ROOT_PATH ?? "", "public/uploads");

export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const uploadedFiles: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value;
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.resolve(UPLOAD_DIR, file.name);

        fs.writeFileSync(filePath, buffer);
        uploadedFiles.push(file.name); // Track uploaded file names
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No files uploaded.",
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json({
      success: false,
      message: (error as Error).message || "Unknown error occurred",
    });
  }
};
